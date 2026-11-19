import type { SnippetContent, SnippetUpdateInput } from '@shared/schema';
import DefaultTemplate from './default';

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
  templates: { value: string; label: string }[];
};

// Add a complete card component here to make it available in the template selector.
const templates = [{ id: 'default', label: 'default', component: DefaultTemplate }];
const templateOptions = templates.map(({ id, label }) => ({ value: id, label }));

export function SnippetCard({ templateId = 'default', ...props }: SnippetCardProps) {
  const template = templates.find(({ id }) => id === templateId) ?? templates[0];
  const Template = template.component;
  return <Template {...props} templateId={template.id} templates={templateOptions} />;
}
