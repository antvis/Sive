import { useI18n } from '../../../i18n';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow } from '@xyflow/react';
import type { Edge, Node, NodeProps, OnNodesChange, XYPosition } from '@xyflow/react';
import '@xyflow/react/style.css';
import { LayersIcon, TerminalIcon, WorkflowIcon } from 'lucide-react';
import { useCallback, useId, useMemo } from 'react';
import { cn } from '../../../lib/utils';

export type TraceFlowEvent = {
  id: string;
  parentIds: string[];
  kind: 'analysis' | 'step' | 'operation';
  label: string;
  summary: string;
  failed: boolean;
};

type TraceNode = Node<
  Pick<TraceFlowEvent, 'kind' | 'label' | 'summary' | 'failed'> & { grouped: boolean },
  'trace'
>;

const nodeWidth = 152;
const nodeHeight = 58;
const groupWidth = 184;
const groupHeader = 54;
const groupInset = 16;
const operationGap = 24;
const nodeIcons = { analysis: WorkflowIcon, step: LayersIcon, operation: TerminalIcon };
const fitOptions = { padding: 0.14, maxZoom: 1 };
const proOptions = { hideAttribution: true };

function layoutEvents(events: TraceFlowEvent[]) {
  const [root, ...descendants] = events.filter(({ kind }) => kind !== 'operation');
  if (!root) return { nodes: [], edges: [] };

  const operations = new Map<string, TraceFlowEvent[]>();
  for (const event of events) {
    if (event.kind !== 'operation') continue;
    const stepId = event.parentIds[0];
    const group = operations.get(stepId) ?? [];
    group.push(event);
    operations.set(stepId, group);
  }

  const labels = new Map(events.map(({ id, label }) => [id, label]));
  const children = new Map<string, TraceFlowEvent[]>();
  const positions = new Map<string, XYPosition>();
  const levels = new Map([[root.id, 0]]);
  const heights = new Map([[root.id, nodeHeight]]);
  const layerHeights = [nodeHeight];
  const edges: Edge[] = [];

  function connect(source: string, target: string) {
    edges.push({
      id: JSON.stringify([source, target]),
      source,
      target,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--muted-foreground)', width: 13, height: 13 },
      selectable: false,
      focusable: false,
      ariaLabel: `${labels.get(source)} → ${labels.get(target)}`,
    });
  }

  children.set(root.id, []);
  for (const event of descendants) {
    // Place the step once and preserve every recorded dependency as an edge.
    const parent = event.parentIds.find((id) => children.has(id)) ?? root.id;
    const level = Math.max(0, ...event.parentIds.map((id) => levels.get(id) ?? 0)) + 1;
    const group = operations.get(event.id) ?? [];
    const height = group.length
      ? groupHeader + groupInset * 2 + group.length * nodeHeight + (group.length - 1) * operationGap
      : nodeHeight;

    children.get(parent)?.push(event);
    children.set(event.id, []);
    levels.set(event.id, level);
    heights.set(event.id, height);
    layerHeights[level] = Math.max(layerHeights[level] ?? 0, height);
    for (const source of event.parentIds) connect(source, event.id);
    for (const [index, operation] of group.entries()) {
      positions.set(operation.id, {
        x: groupInset,
        y: groupHeader + groupInset + index * (nodeHeight + operationGap),
      });
      if (index > 0) connect(group[index - 1].id, operation.id);
    }
  }

  const layerOffsets = [0];
  for (const height of layerHeights) layerOffsets.push(layerOffsets.at(-1)! + height + 40);

  let nextLeaf = 0;

  function place(event: TraceFlowEvent): number {
    const childPositions = children.get(event.id)?.map(place) ?? [];
    const first = childPositions[0];
    const last = childPositions.at(-1);
    const x = first === undefined || last === undefined ? nextLeaf++ * (groupWidth + 32) : (first + last) / 2;
    positions.set(event.id, { x, y: layerOffsets[levels.get(event.id) ?? 0] });
    return x;
  }

  place(root);

  const nodes: TraceNode[] = events.map(({ id, kind, label, summary, failed, parentIds }) => ({
    id,
    type: 'trace',
    position: positions.get(id) ?? { x: 0, y: 0 },
    width: kind === 'operation' ? nodeWidth : groupWidth,
    height: heights.get(id) ?? nodeHeight,
    ...(kind === 'operation' && { parentId: parentIds[0], extent: 'parent' as const }),
    data: { kind, label, summary, failed, grouped: operations.has(id) },
    ariaRole: 'button',
    ariaLabel: `${label}，${summary}`,
    deletable: false,
  }));

  return { nodes, edges };
}

function EventNode({ data, selected }: NodeProps<TraceNode>) {
  const Icon = nodeIcons[data.kind];

  return (
    <div
      className={cn(
        'size-full rounded-lg border text-left shadow-xs',
        selected
          ? 'border-focus/40 bg-selected text-selected-foreground'
          : data.grouped
            ? 'border-border bg-secondary/40 hover:border-focus/60'
            : 'border-border bg-card hover:border-focus/60',
      )}
      data-flow-group={data.grouped || undefined}
    >
      {data.kind !== 'analysis' && <Handle type="target" position={Position.Top} className="opacity-0" />}
      <div
        className={cn(
          'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-2.5',
          data.grouped ? 'h-13 border-b border-border/70 px-3' : 'h-full',
        )}
      >
        <span
          className={cn(
            'grid size-7 place-items-center rounded-md',
            selected ? 'bg-ink/10 text-selected-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="grid min-w-0">
          <span className="truncate text-sm font-semibold">{data.label}</span>
          <span
            className={cn(
              'truncate text-xs tabular-nums',
              data.failed ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {data.summary}
          </span>
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { trace: EventNode };

export function AnalysisTraceFlowchart({
  events,
  selectedId,
  onSelect,
  fullscreen,
}: {
  events: TraceFlowEvent[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  fullscreen: boolean;
}) {
  const i18n = useI18n();
  const ariaLabels = {
    'edge.a11yDescription.default': i18n('analysis.flowchart.edgeInstructions'),
    'controls.ariaLabel': i18n('analysis.flowchart.controlsLabel'),
    'handle.ariaLabel': i18n('analysis.flowchart.connectionHandle'),
    'node.a11yDescription.default': i18n('analysis.flowchart.nodeInstructions'),
    'node.a11yDescription.keyboardDisabled': i18n('analysis.flowchart.nodeInstructions'),
    'controls.zoomIn.ariaLabel': i18n('analysis.flowchart.zoomIn'),
    'controls.zoomOut.ariaLabel': i18n('analysis.flowchart.zoomOut'),
    'controls.fitView.ariaLabel': i18n('analysis.flowchart.fitView'),
  };
  const canvasId = useId();
  const { nodes, edges } = useMemo(() => layoutEvents(events), [events]);
  const selectedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedId,
        domAttributes: { 'aria-pressed': node.id === selectedId },
      })),
    [nodes, selectedId],
  );
  const selectNode = useCallback<OnNodesChange<TraceNode>>(
    (changes) => {
      const selected = changes.getByType('select').find((change) => change.selected);
      if (selected) onSelect(selected.id);
    },
    [onSelect],
  );

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 overflow-hidden bg-muted/20 [--xy-background-color:transparent] [--xy-edge-stroke:var(--muted-foreground)] [--xy-edge-stroke-width:1.25]',
        fullscreen ? 'h-full' : 'h-72',
      )}
      role="region"
      aria-label={i18n('analysis.flowchart.regionLabel')}
    >
      <ReactFlow
        id={canvasId}
        nodes={selectedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={selectNode}
        onPaneClick={() => onSelect(undefined)}
        nodesDraggable={false}
        nodesConnectable={false}
        multiSelectionKeyCode={null}
        zIndexMode="auto"
        minZoom={0.08}
        zoomOnScroll={fullscreen}
        preventScrolling={fullscreen}
        fitView
        fitViewOptions={fitOptions}
        ariaLabelConfig={ariaLabels}
        proOptions={proOptions}
        className="[&_.react-flow__node:focus-visible]:rounded-lg [&_.react-flow__node:focus-visible]:outline-1 [&_.react-flow__node:focus-visible]:outline-offset-3 [&_.react-flow__node:focus-visible]:outline-focus"
      >
        <Background gap={18} size={1.5} color="var(--border)" />
        <Controls
          orientation="horizontal"
          showInteractive={false}
          fitViewOptions={fitOptions}
          aria-label={i18n('analysis.flowchart.controlsLabel')}
          className="m-3 overflow-hidden rounded-md border border-border [&_button]:size-8 [&_button_svg]:size-3.5"
        />
      </ReactFlow>
    </div>
  );
}
