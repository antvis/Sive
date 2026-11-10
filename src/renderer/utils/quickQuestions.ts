import type { Dataset } from '@shared/contracts';
type QuickQuestion = { id: string; label: string; question: string };
export function quickQuestions(dataset: Dataset, tableName?: string): QuickQuestion[] {
  const model = tableName
    ? dataset.schema.models.find((model) => model.name === tableName)
    : dataset.schema.models[0];
  if (!model) return [];
  const quote = (name: string) => JSON.stringify(name);
  const table = quote(model.name);
  const definedMetric = dataset.metrics?.find((metric) => metric.table === model.name);
  const profile = dataset.profile.models.find((m) => m.name === model.name);
  const columns = new Map(profile?.columns.map((column) => [column.name, column]));
  const logical = (name: string) => columns.get(name)?.properties.logicalType;
  const stats = (name: string) => columns.get(name)?.metrics;
  const count = Number(profile?.metrics.row_count);
  const varying = (name: string) => Number(stats(name)?.distinct_count ?? 2) > 1;
  const date = model.columns.find((c) => logical(c.name) === 'date' || /DATE|TIMESTAMP/i.test(c.type));
  const numeric = model.columns.filter(
    (c) =>
      (logical(c.name) === 'numeric' || /INT|DECIMAL|DOUBLE|FLOAT|NUMERIC|REAL/i.test(c.type)) &&
      !/(^id$|_id$|编号|编码|序号|主键|year|年份|年度)/i.test(c.name) &&
      varying(c.name),
  );
  const metric =
    numeric.find((c) => /amount|revenue|sales|金额|收入|销售额|销量/i.test(c.name)) || numeric[0];
  const dimensions = model.columns.filter(
    (c) =>
      (logical(c.name) === 'string' || /VARCHAR|TEXT|STRING|BOOL/i.test(c.type)) &&
      !/(^id$|_id$|编号|编码|序号|主键|姓名|名称|备注|说明|来源|网址)/i.test(c.name) &&
      varying(c.name) &&
      Number(stats(c.name)?.distinct_count ?? Infinity) <=
        Math.min(50, (count - Number(stats(c.name)?.null_count || 0)) * 0.8),
  );
  const dimension =
    dimensions.find((c) => /region|category|channel|地区|区域|分类|类别|渠道/i.test(c.name)) ||
    dimensions.find((c) => !/(^id$|_id$|编号|编码|名称|姓名)/i.test(c.name));
  const prefix = `分析数据表 ${table}，遵循已保存业务口径中的过滤规则和指标定义。`;
  const out: QuickQuestion[] = [
    {
      id: 'overview',
      label: '数据概览',
      question: `${prefix}统计记录总数${date ? `、日期字段 ${quote(date.name)} 的最早和最晚日期` : ''}，简要说明这份数据覆盖的范围。不要推测未计算的信息。`,
    },
    {
      id: 'quality',
      label: '数据质量',
      question: `${prefix}统计各字段的空值数量和占比，按空值占比降序排列，指出需要关注的字段。空值指 NULL，不把数值 0 当作缺失。`,
    },
  ];
  const aggregation = /amount|revenue|sales|金额|收入|销售额|数量|销量/i.test(metric?.name || '')
    ? '求和'
    : '求平均值';
  let calculation = metric ? `对数值字段 ${quote(metric.name)} ${aggregation}` : undefined;
  if (definedMetric)
    calculation = `计算已定义指标 ${quote(definedMetric.name)}，公式为 ${definedMetric.expression}${definedMetric.unit ? `，单位为 ${definedMetric.unit}` : ''}`;
  if (date && calculation) {
    out.push({
      id: 'trend',
      label: '时间趋势',
      question: `${prefix}按日期字段 ${quote(date.name)} 分组，${calculation}。根据实际日期跨度选择能看清变化的时间粒度，不要固定按月；按时间升序返回数据，并用折线图展示。明确指标和单位。`,
    });
  }
  if (!date && definedMetric)
    out.push({
      id: 'metric',
      label: '指标汇总',
      question: `${prefix}计算已定义指标 ${quote(definedMetric.name)}，使用公式 ${definedMetric.expression}，说明结果${definedMetric.unit ? `与单位 ${definedMetric.unit}` : ''}。`,
    });
  if (dimension)
    out.push({
      id: 'ranking',
      label: '分类排行',
      question: `${prefix}按字段 ${quote(dimension.name)} 分组统计记录数量，按数量降序取前 10 类，用条形图展示。仅描述计算得到的分布，不推断因果。`,
    });
  if (metric)
    out.push({
      id: 'distribution',
      label: '数值分布',
      question: `${prefix}将字段 ${quote(metric.name)} 的非空值划分为最多 10 个等宽区间，统计各区间记录数并按区间升序返回。若所有值相同，合并为一个区间。用柱状图展示分布，并说明数值范围。`,
    });
  return out;
}
