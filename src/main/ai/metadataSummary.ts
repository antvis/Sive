import type { Profile, Schema } from '@antv/ava';

export function schemaSummary(schema: Schema) {
  const tables = schema.models.slice(0, 8).map((model) => {
    const fields = model.columns.slice(0, 12).map((column) => `${column.name}: ${column.type}`);
    return `${model.name}（${model.columns.length} 个字段）：${fields.join(' · ')}${model.columns.length > 12 ? ' …' : ''}`;
  });
  return [
    `共 ${schema.models.length} 张表`,
    ...tables,
    ...(schema.models.length > 8 ? ['其余表已省略。'] : []),
  ].join('\n');
}

export function profileSummary(profile: Profile) {
  return (
    profile.models
      .slice(0, 8)
      .map((model) => {
        const count = model.metrics.row_count;
        const rows = typeof count === 'number' ? `${count} 行记录` : '未统计行数';
        const columns = model.columns.slice(0, 12).map((column) => {
          const metrics = column.metrics;
          const facts: string[] = [];
          if (typeof metrics.null_count === 'number') facts.push(`缺失 ${metrics.null_count}`);
          if (typeof metrics.distinct_count === 'number') facts.push(`不同值 ${metrics.distinct_count}`);
          const value = (input: unknown) => {
            if (
              column.properties.logicalType === 'date' &&
              typeof input === 'number' &&
              Number.isFinite(new Date(input).getTime())
            )
              return new Date(input).toISOString();
            return String(input).slice(0, 120);
          };
          if (metrics.min != null && metrics.max != null)
            facts.push(`范围 ${value(metrics.min)} 至 ${value(metrics.max)}`);
          return `${column.name}：${facts.join(' · ') || '未统计分布'}`;
        });
        return [
          `${model.name} · ${rows}`,
          ...columns,
          ...(model.columns.length > 12 ? ['其余字段统计已省略。'] : []),
        ].join('\n');
      })
      .concat(profile.models.length > 8 ? ['其余表统计已省略。'] : [])
      .join('\n\n') || '暂无字段统计。'
  );
}
