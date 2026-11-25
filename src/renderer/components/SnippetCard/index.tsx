import type { SnippetContent, SnippetUpdateInput } from '@shared/schema';
import { PencilIcon, PinIcon, ShareIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { THEME_PRESETS } from '@antv/gpt-vis/dist/esm/theme/presets';
import { ChartThemeContext } from '../../theme';
import { cn } from '../../lib/utils';
import { IconButton } from '../IconButton';
import { TemplatePicker } from './TemplatePicker';
import { useSnippetCard } from './useSnippetCard';
import DefaultTemplate from './templates/default';
import PopTemplate from './templates/pop';
import CircuitTemplate from './templates/circuit';

export type SnippetCardProps = {
  data: SnippetContent;
  templateId?: string;
  createdAt?: string;
  saved?: boolean;
  onSave?: () => Promise<void>;
  onUpdate?: (input: SnippetUpdateInput) => Promise<void>;
  onDelete?: () => void;
  onShare?: () => void;
  mode?: 'view' | 'export';
};

export type SnippetTemplateProps = Pick<SnippetCardProps, 'data' | 'createdAt' | 'mode'> & {
  card: ReturnType<typeof useSnippetCard>;
};

// Add a complete card component here to make it available in the template selector.
const templates = [
  { id: 'default', label: 'default', component: DefaultTemplate, theme: undefined },
  { id: 'pop', label: 'pop', component: PopTemplate, theme: THEME_PRESETS.find(({ id }) => id === 'pop') },
  {
    id: 'circuit',
    label: 'circuit',
    component: CircuitTemplate,
    theme: THEME_PRESETS.find(({ id }) => id === 'neon-circuit'),
  },
];

export const templateOptions = templates.map(({ id, label, theme }) => ({ value: id, label, theme }));

export function SnippetCard({
  data,
  templateId = 'default',
  createdAt,
  saved,
  onSave,
  onUpdate,
  onDelete,
  onShare,
  mode = 'view',
}: SnippetCardProps) {
  const template = templates.find(({ id }) => id === templateId) ?? templates[0];
  const Template = template.component;
  const card = useSnippetCard(data, onUpdate, template.theme);
  const { editing, busy, run, startEditing } = card;
  const showActions = mode !== 'export' && !editing && (onSave || onUpdate || onDelete || onShare);
  const templateButtonRef = useRef<HTMLButtonElement>(null);
  const previousTemplate = useRef(template.id);

  useEffect(() => {
    if (!busy && previousTemplate.current !== template.id) {
      templateButtonRef.current?.focus({ preventScroll: true });
      previousTemplate.current = template.id;
    }
  }, [busy, template.id]);

  return (
    <div
      className={cn(
        'group/snippet relative w-full min-w-0 [--accent:var(--client-accent)]',
        showActions &&
          (onUpdate || onDelete || onShare ? '[&>article>header]:pr-36' : '[&>article>header]:pr-8'),
      )}
    >
      <ChartThemeContext value={template.theme}>
        <Template data={data} createdAt={createdAt} mode={mode} card={card} />
      </ChartThemeContext>
      {showActions && (
        <div
          role="group"
          aria-label="Snippet 操作"
          className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-focus-within/snippet:pointer-events-auto group-focus-within/snippet:opacity-100 group-hover/snippet:pointer-events-auto group-hover/snippet:opacity-100 has-[[data-state=open]]:pointer-events-auto has-[[data-state=open]]:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-accent"
        >
          {onUpdate && (
            <>
              <TemplatePicker
                buttonRef={templateButtonRef}
                value={template.id}
                templates={templateOptions}
                disabled={busy}
                onChange={(value) => void run(() => onUpdate({ templateId: value }))}
              />
              <IconButton icon={PencilIcon} label="编辑 Snippet" disabled={busy} onClick={startEditing} />
            </>
          )}
          {onShare && <IconButton icon={ShareIcon} label="分享与导出" disabled={busy} onClick={onShare} />}
          {onDelete && (
            <IconButton
              icon={Trash2Icon}
              label="删除 Snippet"
              disabled={busy}
              className="hover:text-danger"
              onClick={onDelete}
            />
          )}
          {onSave && (
            <IconButton
              icon={PinIcon}
              iconClassName={saved ? 'fill-current' : undefined}
              label={saved ? '已保存 Snippet' : busy ? '保存中…' : '保存 Snippet'}
              disabled={saved || busy}
              className={saved ? 'text-accent disabled:opacity-100' : undefined}
              onClick={() => void run(onSave)}
            />
          )}
        </div>
      )}
    </div>
  );
}
