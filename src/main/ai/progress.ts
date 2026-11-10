import type { Progress } from '@shared/contracts';

export const PROGRESS_LABELS: Record<string, string> = {
  sourcestart: '读取数据',
  sourceend: '数据已就绪',
  schemastart: '读取表结构和字段',
  schemaend: '表结构已就绪',
  profilestart: '准备数据画像',
  profileend: '数据画像已完成',
  semanticstart: '应用业务口径',
  semanticend: '业务口径已就绪',
  translatestart: '将问题转为查询',
  translateend: '查询已生成',
  querystart: '执行只读查询',
  queryend: '计算已完成',
  summarizestart: '整理分析结论',
  summarizeend: '分析结论已生成',
  stepstart: '探索数据与验证假设',
  stepend: '本轮探索已完成',
  visualizestart: '选择图表并生成配置',
  visualizeend: '图表阶段已结束',
  suggeststart: '寻找值得分析的问题',
  suggestend: '推荐问题已生成',
};

const ACTION_LABELS: Record<string, string> = {
  EXPLORE: '探索查询已结束',
  REFINE: '调整分析方向',
  SQL: '结果查询已结束',
  CONFIRM: '核对分析结果',
};

export function analysisProgress(stage: string, data?: Record<string, unknown> | null): Progress {
  const error = !!data?.error;
  let label = PROGRESS_LABELS[stage];
  if (error) label = `${PROGRESS_LABELS[stage.replace(/end$/, 'start')] || label}失败`;
  let detail: string | undefined;
  let observation: Progress['observation'];
  if (error) {
    const raw =
      typeof data?.error === 'object' && data.error && 'message' in data.error
        ? String(data.error.message)
        : '';
    if (/timeout|timed out/i.test(raw)) detail = '执行超时，请缩小查询范围或检查模型服务。';
    else if (/column|binder|catalog|table.*not|syntax|parser/i.test(raw))
      detail = '查询中的字段、表或语法未通过校验，请核对下方 SQL 与数据结构。';
    else if (/401|403|unauthor|api.?key|invalid.*key/i.test(raw))
      detail = '模型服务认证失败，请在设置中重新验证模型。';
    else if (/429|rate.limit|quota/i.test(raw)) detail = '模型服务限流或额度不足，请稍后重试或切换模型。';
    else detail = '本阶段执行失败，请核对连接、查询与业务口径。';
    const diagnostic = raw.split('\n')[0].slice(0, 300);
    if (
      stage === 'queryend' &&
      /^(Binder|Parser|Catalog|Conversion|Out of Memory) Error:/i.test(diagnostic) &&
      !/password|api.?key|authorization|bearer|host=|ATTACH/i.test(diagnostic)
    )
      detail += ` ${diagnostic}`;
  }
  if (stage === 'queryend' && !error && Array.isArray(data?.data)) {
    detail = `返回 ${data.data.length} 行结果${data.truncated || data.truncatedBy ? '（结果已截断）' : ''}`;
    if (Array.isArray(data.schema)) {
      const fields = data.schema.map((field) => field?.name).filter((name) => typeof name === 'string');
      if (fields.length)
        detail += ` · ${fields.length} 列：${fields.slice(0, 6).join('、')}${fields.length > 6 ? '…' : ''}`;
      const columns = fields.slice(0, 12);
      if (columns.length && data.data.length)
        observation = {
          columns,
          rowCount: data.data.length,
          columnCount: fields.length,
          rows: data.data.slice(0, 20).map((row) =>
            columns.map((column) => {
              const value = row?.[column];
              const text =
                value == null ? '空值' : typeof value === 'object' ? JSON.stringify(value) : String(value);
              return text.length > 160 ? text.slice(0, 160) + '…' : text;
            }),
          ),
        };
    }
  }
  if (stage === 'stepend' && !error && typeof data?.action === 'string') {
    label = ACTION_LABELS[data.action] || label;
    // These are AVA's explicit findings/verification outputs, not provider reasoning traces.
    if (['REFINE', 'CONFIRM'].includes(data.action) && typeof data.text === 'string') {
      const text = data.text.trim();
      detail =
        text.length > 3000 ? text.slice(0, 3000) + '\n（说明过长，已省略后续内容）' : text || undefined;
    } else detail = '本轮实际取得的数据见查询结果。';
  }
  if (typeof data?.step === 'number') label = `第 ${data.step + 1} 轮 · ${label}`;
  if (typeof data?.attempt === 'number' && data.attempt > 0) label = `第 ${data.attempt} 次纠错 · ${label}`;
  return {
    at: new Date().toISOString(),
    stage,
    label,
    error,
    detail,
    observation,
    recovery: error
      ? stage === 'queryend'
        ? '将尝试修正查询；若仍失败，可调整问题或核对字段后重试。'
        : '请检查数据连接与模型设置；重试将重新执行分析。'
      : undefined,
    sql:
      ['querystart', 'translateend'].includes(stage) && typeof data?.dsl === 'string' ? data.dsl : undefined,
  };
}
