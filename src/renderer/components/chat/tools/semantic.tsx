import type { Translator } from '@shared/i18n';
import { useI18n } from '../../../i18n';
import type { Semantic } from '@antv/ava';

function semanticSummary(i18n: Translator, semantic: Semantic) {
  if (semantic.description) return semantic.description;
  const models = semantic.models?.length ?? 0;
  const fields = semantic.models?.reduce((count, model) => count + (model.columns?.length ?? 0), 0) ?? 0;
  const cubes = semantic.cubes?.length ?? 0;
  const relationships = semantic.relationships?.length ?? 0;
  const summaries = [
    models ? i18n('semantics.summary.modelCount', [models]) : '',
    fields ? i18n('semantics.summary.columnCount', [fields]) : '',
    cubes ? i18n('semantics.summary.metricCount', [cubes]) : '',
    relationships ? i18n('semantics.summary.relationshipCount', [relationships]) : '',
  ].filter(Boolean);
  return summaries.length
    ? i18n('semantics.summary.applied', [summaries.join('、')])
    : i18n('semantics.summary.empty');
}

export function SemanticTool({ semantic }: { semantic: Semantic }) {
  const i18n = useI18n();
  return <p className="m-0 text-sm leading-6 text-muted-foreground">{semanticSummary(i18n, semantic)}</p>;
}
