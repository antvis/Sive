import type { Semantic } from '@antv/ava';

function semanticSummary(semantic: Semantic) {
  if (semantic.description) return semantic.description;
  const models = semantic.models?.length ?? 0;
  const fields = semantic.models?.reduce((count, model) => count + (model.columns?.length ?? 0), 0) ?? 0;
  const cubes = semantic.cubes?.length ?? 0;
  const relationships = semantic.relationships?.length ?? 0;
  const summaries = [
    models ? `${models} 个数据模型` : '',
    fields ? `${fields} 个语义字段` : '',
    cubes ? `${cubes} 个业务指标` : '',
    relationships ? `${relationships} 个数据关系` : '',
  ].filter(Boolean);
  return summaries.length
    ? `已应用业务语义层，包含 ${summaries.join('、')}。`
    : '当前数据集未配置额外业务描述。';
}

export function SemanticTool({ semantic }: { semantic: Semantic }) {
  return (
    <p className="m-0 text-sm leading-6 text-muted-foreground">{semanticSummary(semantic)}</p>
  );
}
