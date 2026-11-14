import { useState } from 'react';
import clsx from 'clsx';
import { SidebarSimple } from '@phosphor-icons/react';
import { Group, Panel } from 'react-resizable-panels';
import { ResizeHandle } from '../../components/ResizeHandle';
import { IconButton } from '../../components/IconButton';
import { usePanelLayout } from '../../hooks/usePanelLayout';
import { readWidth, saveWidth } from '../../utils';
import type { ModelProfile, Preferences } from '../../types';
import { ConversationPanel } from './ConversationPanel';
import { DatasetPanel } from './DatasetPanel';

type Props = {
  datasetId: string;
  datasetUpdatedAt?: string;
  conversationId: string | null;
  question: string;
  onQuestionChange: (question: string) => void;
  savedMessageIds: string[];
  onConversationChange: (id: string, submitted: string) => void;
  onBack: () => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

export function AnalysisPage({
  datasetId,
  datasetUpdatedAt,
  conversationId,
  question,
  onQuestionChange,
  savedMessageIds,
  onConversationChange,
  onBack,
  models,
  activeModelId,
  preferences,
}: Props) {
  const [conversationWidth] = useState(() => readWidth('sive.conversation-width', 380));
  const datasetPanel = usePanelLayout('sive.dataset-width', 450);
  return (
    <Group
      orientation="horizontal"
      className={clsx('h-full min-h-0 overflow-hidden', datasetPanel.transitionClassName)}
      onPointerDownCapture={datasetPanel.finishTransition}
    >
      <Panel
        id="conversation"
        defaultSize={conversationWidth}
        minSize={280}
        className="h-full min-h-0"
        onResize={(size) => {
          if (!datasetPanel.collapsed) saveWidth('sive.conversation-width', size.inPixels);
        }}
      >
        <ConversationPanel
          datasetId={datasetId}
          datasetUpdatedAt={datasetUpdatedAt}
          conversationId={conversationId}
          question={question}
          onQuestionChange={onQuestionChange}
          savedMessageIds={savedMessageIds}
          onConversationChange={onConversationChange}
          onBack={onBack}
          models={models}
          activeModelId={activeModelId}
          preferences={preferences}
          toolbar={
            datasetPanel.collapsed && (
              <IconButton
                icon={SidebarSimple}
                className="ml-auto"
                label="展开数据面板"
                ref={datasetPanel.toggleButtonRef}
                tooltip
                aria-expanded={false}
                onClick={datasetPanel.toggle}
              />
            )
          }
        />
      </Panel>
      {!datasetPanel.collapsed && <ResizeHandle />}
      <Panel
        id="dataset"
        panelRef={datasetPanel.panelRef}
        collapsible
        collapsedSize={0}
        defaultSize={datasetPanel.defaultSize}
        onResize={datasetPanel.onResize}
        minSize="40%"
        className="h-full min-h-0 min-w-0 flex-1"
      >
        <div inert={datasetPanel.collapsed} className="h-full min-w-0">
          <DatasetPanel
            key={datasetId}
            datasetId={datasetId}
            defaultPageSize={preferences.previewPageSize}
            toolbar={
              <IconButton
                icon={SidebarSimple}
                label="收起数据面板"
                ref={datasetPanel.collapsed ? undefined : datasetPanel.toggleButtonRef}
                tooltip
                aria-expanded
                onClick={datasetPanel.toggle}
              />
            }
          />
        </div>
      </Panel>
    </Group>
  );
}
