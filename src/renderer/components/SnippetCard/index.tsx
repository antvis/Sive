import type { SnippetContent, SnippetUpdateInput } from '@shared/schema';
import { PencilIcon, PinIcon, ShareIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { THEME_PRESETS } from '@antv/gpt-vis/dist/esm/theme/presets';
import { ChartThemeContext } from '../../theme';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
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
  const saveLabel = saved ? '已保存 Snippet' : busy ? '保存中…' : '保存 Snippet';
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
          className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-focus-within/snippet:pointer-events-auto group-focus-within/snippet:opacity-100 group-hover/snippet:pointer-events-auto group-hover/snippet:opacity-100 has-[[data-state=open]]:pointer-events-auto has-[[data-state=open]]:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100 [&_button]:bg-surface [&_button]:text-ink [&_button]:shadow-sm [&_button]:ring-1 [&_button]:ring-ink/10"
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
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="编辑 Snippet"
                title="编辑 Snippet"
                className="text-black/50 dark:text-white/50"
                disabled={busy}
                onClick={startEditing}
              >
                <PencilIcon className="size-[14px]" aria-hidden />
              </Button>
            </>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="分享与导出"
              title="分享与导出"
              className="text-black/50 dark:text-white/50"
              disabled={busy}
              onClick={onShare}
            >
              <ShareIcon className="size-[14px]" aria-hidden />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="删除 Snippet"
              title="删除 Snippet"
              disabled={busy}
              className="text-black/50 dark:text-white/50 hover:text-danger"
              onClick={onDelete}
            >
              <Trash2Icon className="size-[14px]" aria-hidden />
            </Button>
          )}
          {onSave && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={saveLabel}
              title={saveLabel}
              disabled={saved || busy}
              className={saved ? 'text-ink disabled:opacity-100' : 'text-black/50 dark:text-white/50'}
              onClick={() => void run(onSave)}
            >
              <PinIcon className={cn('size-[14px]', saved && 'fill-current')} aria-hidden />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
