import { useI18n } from '../../../i18n';
import type { Schema } from '@antv/ava';
import { Columns3Icon, GitMergeIcon, KeyRoundIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from '../../ui/collapsible';

function SchemaFields({ model }: { model: Schema['models'][number] }) {
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);
  const fieldsId = useId();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const primaryKey = typeof model.primaryKey === 'string' ? [model.primaryKey] : (model.primaryKey ?? []);
  const columns = expanded ? model.columns : model.columns.slice(0, 5);

  if (!model.columns.length)
    return <p className="m-0 text-xs text-muted-foreground">{i18n('schema.empty.columns')}</p>;

  return (
    <div ref={fieldsRef} className="min-w-0 rounded-lg bg-muted/50 p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Columns3Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{i18n('schema.columns.title')}</span>
        </h4>
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {i18n('profile.summary.columnCount', [model.columns.length])}
        </span>
      </div>
      <Table className="table-fixed" aria-label={i18n('schema.columns.tableLabel', [model.name])}>
        <thead>
          <tr>
            <th scope="col" className="w-[53%]">
              {i18n('common.labels.columns')}
            </th>
            <th scope="col" className="w-[24%]">
              {i18n('common.labels.type')}
            </th>
            <th scope="col" className="w-[23%]">
              {i18n('schema.columns.constraints')}
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
                      {primaryKey.length > 1
                        ? i18n('schema.columns.compositePrimaryKey')
                        : i18n('schema.columns.primaryKey')}
                    </span>
                  )}
                  {column.notNull && (
                    <span className="text-muted-foreground">{i18n('schema.columns.notNull')}</span>
                  )}
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
          {expanded
            ? i18n('profile.nulls.collapseColumns')
            : i18n('profile.nulls.showRemainingColumns', [model.columns.length - 5])}
        </Button>
      )}
    </div>
  );
}

export function SchemaTool({ schema }: { schema: Schema }) {
  const i18n = useI18n();
  const { models, relationships = [] } = schema;
  const [expandedModel, setExpandedModel] = useState<string>();
  const columnCount = models.reduce((total, model) => total + model.columns.length, 0);

  if (!models.length)
    return <p className="m-0 text-sm leading-6 text-muted-foreground">{i18n('schema.empty.tables')}</p>;

  return (
    <div className="grid min-w-0 gap-4 text-sm leading-[1.6] text-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{i18n('profile.summary.tableCount', [models.length])}</Badge>
        <Badge variant="secondary">{i18n('profile.summary.columnCount', [columnCount])}</Badge>
        {relationships.length > 0 && (
          <Badge variant="secondary">{i18n('schema.relationships.count', [relationships.length])}</Badge>
        )}
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
                    {i18n('profile.summary.columnCount', [model.columns.length])}
                  </span>
                  {primaryKey.length > 0 && (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground max-[520px]:basis-full max-[520px]:pl-[22px]">
                      <KeyRoundIcon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="sr-only">{i18n('schema.columns.primaryKeyPrefix')}</span>
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
        <section
          className="grid min-w-0 gap-2.5 rounded-lg bg-muted/50 p-3"
          aria-label={i18n('schema.relationships.title')}
        >
          <h4 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <GitMergeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{i18n('schema.relationships.title')}</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {i18n('schema.relationships.countLabel', [relationships.length])}
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
                      {relationship.joinType === 'ONE_TO_ONE'
                        ? i18n('schema.relationships.oneToOne')
                        : i18n('schema.relationships.manyToOne')}
                    </span>
                  </div>
                  <code className="mt-[3px] block whitespace-pre-wrap break-words text-sm leading-[1.7] text-muted-foreground">
                    {relationship.condition}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-xs text-muted-foreground">{i18n('schema.empty.relationships')}</p>
          )}
        </section>
      )}
    </div>
  );
}
