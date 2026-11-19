import type { SnippetContent, SnippetUpdateInput } from '@shared/schema';
import type { ThemeSpec } from '@antv/gpt-vis';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { THEME_PRESETS } from '@antv/gpt-vis/dist/esm/theme/presets';
import { ChartThemeContext } from '../../theme';
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
};

export type SnippetTemplateProps = SnippetCardProps & {
  templateId: string;
  templateButtonRef: RefObject<HTMLButtonElement | null>;
  templates: { value: string; label: string; theme?: ThemeSpec }[];
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
const templateOptions = templates.map(({ id, label, theme }) => ({ value: id, label, theme }));

export function SnippetCard({ templateId = 'default', ...props }: SnippetCardProps) {
  const template = templates.find(({ id }) => id === templateId) ?? templates[0];
  const Template = template.component;
  const templateButtonRef = useRef<HTMLButtonElement>(null);
  const previousTemplate = useRef(template.id);

  useEffect(() => {
    if (previousTemplate.current !== template.id) {
      templateButtonRef.current?.focus({ preventScroll: true });
      previousTemplate.current = template.id;
    }
  }, [template.id]);

  return (
    <ChartThemeContext value={template.theme}>
      <Template
        {...props}
        templateId={template.id}
        templates={templateOptions}
        templateButtonRef={templateButtonRef}
      />
    </ChartThemeContext>
  );
}
