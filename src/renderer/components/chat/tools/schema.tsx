import type { Schema } from '@antv/ava';
import { Columns3Icon, GitMergeIcon, KeyRoundIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from '../../ui/collapsible';

function SchemaFields({ model }: { model: Schema['models'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const fieldsId = useId();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const primaryKey = typeof model.primaryKey === 'string' ? [model.primaryKey] : (model.primaryKey ?? []);
  const columns = expanded ? model.columns : model.columns.slice(0, 5);

  if (!model.columns.length) return <p className="m-0 text-xs text-muted-foreground">未返回字段信息。</p>;

  return (
    <div ref={fieldsRef} className="min-w-0 rounded-lg bg-muted/50 p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Columns3Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span>字段结构</span>
        </h4>
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {model.columns.length} 个字段
        </span>
      </div>
      <Table className="table-fixed" aria-label={`${model.name} 的字段`}>
        <thead>
          <tr>
            <th scope="col" className="w-[53%]">
              字段
            </th>
            <th scope="col" className="w-[24%]">
              类型
            </th>
            <th scope="col" className="w-[23%]">
              约束
            </th>
          </tr>
        </thead>
        <tbody id={fieldsId}>
          {columns.map((column) => (
            <tr key={column.name}>
              <td className="break-words">
                <code>{column.name}</code>
              </td>
              <td className="break-words text-muted-foreground">
                <code>{column.type}</code>
              </td>
              <td>
                <span className="flex flex-wrap gap-x-1.5 gap-y-[3px]">
                  {primaryKey.includes(column.name) && (
                    <span className="font-medium text-foreground">
                      {primaryKey.length > 1 ? '联合主键' : '主键'}
                    </span>
                  )}
                  {column.notNull && <span className="text-muted-foreground">非空</span>}
                  {!primaryKey.includes(column.name) && !column.notNull && (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {model.columns.length > 5 && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="mt-[9px] mb-3"
          aria-expanded={expanded}
          aria-controls={fieldsId}
          onClick={() => {
            setExpanded((value) => !value);
            if (expanded) {
              requestAnimationFrame(() => {
                fieldsRef.current
                  ?.closest('[data-schema-table]')
                  ?.scrollIntoView({ block: 'start', behavior: 'instant' });
              });
            }
          }}
        >
          {expanded ? '收起字段' : `查看其余 ${model.columns.length - 5} 个字段`}
        </Button>
      )}
    </div>
  );
}

export function SchemaTool({ schema }: { schema: Schema }) {
  const { models, relationships = [] } = schema;
  const [expandedModel, setExpandedModel] = useState<string>();
  const columnCount = models.reduce((total, model) => total + model.columns.length, 0);

  if (!models.length) return <p className="m-0 text-sm leading-6 text-muted-foreground">未识别到数据表。</p>;

  return (
    <div className="grid min-w-0 gap-4 text-sm leading-[1.6] text-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{models.length} 张表</Badge>
        <Badge variant="secondary">{columnCount} 个字段</Badge>
        {relationships.length > 0 && <Badge variant="secondary">{relationships.length} 条关联</Badge>}
      </div>
      {models.length === 1 ? (
        <div data-schema-table={models[0].name} className="grid min-w-0 scroll-mt-4 gap-2">
          <p className="m-0 text-sm font-semibold">
            <code>{models[0].name}</code>
          </p>
          <SchemaFields model={models[0]} />
        </div>
      ) : (
        <div className="min-w-0 divide-y divide-border">
          {models.map((model) => {
            const primaryKey =
              typeof model.primaryKey === 'string' ? [model.primaryKey] : (model.primaryKey ?? []);

            return (
              <Collapsible
                key={model.name}
                data-schema-table={model.name}
                open={expandedModel === model.name}
                onOpenChange={(open) => setExpandedModel(open ? model.name : undefined)}
                className="scroll-mt-4"
              >
                <CollapsibleRowTrigger>
                  <code className="min-w-0 break-words text-sm font-semibold">{model.name}</code>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {model.columns.length} 个字段
                  </span>
                  {primaryKey.length > 0 && (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground max-[520px]:basis-full max-[520px]:pl-[22px]">
                      <KeyRoundIcon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="sr-only">主键：</span>
                      <span className="break-words">{primaryKey.join(' + ')}</span>
                    </span>
                  )}
                </CollapsibleRowTrigger>
                <CollapsibleContent>
                  <SchemaFields model={model} />
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
      {(models.length > 1 || relationships.length > 0) && (
        <section className="grid min-w-0 gap-2.5 rounded-lg bg-muted/50 p-3" aria-label="表间关联">
          <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <GitMergeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>表间关联</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {relationships.length} 条
            </span>
          </h4>
          {relationships.length ? (
            <ul className="m-0 list-none divide-y divide-border/40 bg-card px-3">
              {relationships.map((relationship) => (
                <li key={relationship.name} className="min-w-0 py-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <code className="break-words">{relationship.models[0]}</code>
                    <span aria-hidden="true">{relationship.joinType === 'ONE_TO_ONE' ? '↔' : '→'}</span>
                    <code className="break-words">{relationship.models[1]}</code>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {relationship.joinType === 'ONE_TO_ONE' ? '一对一' : '多对一'}
                    </span>
                  </div>
                  <code className="mt-[3px] block whitespace-pre-wrap break-words text-sm leading-[1.7] text-muted-foreground">
                    {relationship.condition}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-xs text-muted-foreground">未返回表间关联信息。</p>
          )}
        </section>
      )}
    </div>
  );
}
