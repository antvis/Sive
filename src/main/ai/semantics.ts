import type { Semantic } from '@antv/ava';
import type { BusinessMetric } from '@shared/contracts';

function metricDescription(metrics: BusinessMetric[] = []) {
  return metrics
    .map(
      (metric) =>
        `${metric.name}（表：${metric.table}${metric.unit ? `，单位：${metric.unit}` : ''}）：${metric.expression}${metric.description ? `；${metric.description}` : ''}`,
    )
    .join('\n');
}

export function businessSemantic(description: string, metrics: BusinessMetric[] = []): Semantic {
  return {
    description: [description, metrics.length ? `已定义指标：\n${metricDescription(metrics)}` : '']
      .filter(Boolean)
      .join('\n\n'),
    cubes: [...new Set(metrics.map((metric) => metric.table))].map((table, index) => {
      const [first, ...rest] = metrics
        .filter((metric) => metric.table === table)
        .map((metric) => ({
          name: metric.name,
          type: 'DOUBLE',
          expression: metric.expression,
          description: metric.description,
          properties: { unit: metric.unit },
        }));
      return { name: `business_metrics_${index + 1}`, baseObject: table, measures: [first, ...rest] };
    }),
  };
}
