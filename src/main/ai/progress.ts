import type { Progress } from '@shared/contracts';

export const progressLabels: Record<string, string> = {
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
  reasonstart: '探索数据与验证假设',
  reasonend: '本轮探索已完成',
  visualizestart: '选择图表并生成配置',
  visualizeend: '图表阶段已结束',
  suggeststart: '寻找值得分析的问题',
  suggestend: '推荐问题已生成',
};

// AVA's end event does not distinguish a chart from null. Only the caller,
// after receiving the actual result, can label this stage as generated/skipped.
export function visualizationOutcome(
  generated: boolean,
  hasData: boolean,
  selection?: string,
): Pick<Progress, 'chartOutcome' | 'label' | 'detail' | 'error' | 'recovery'> {
  if (generated)
    return {
      chartOutcome: 'generated',
      label: '图表配置已生成',
      detail: selection ? `模型选择图表类型：${selection}` : undefined,
    };
  if (!hasData)
    return {
      chartOutcome: 'empty-data',
      label: '已跳过图表：查询结果为空',
      detail: '未调用模型选择图表，也未生成配置。',
    };
  if (selection === 'none')
    return {
      chartOutcome: 'not-needed',
      label: '已跳过图表：模型建议无需绘图',
      detail: '类型选择返回 none，未进入配置生成。可以明确指定图表类型后重新提问。',
    };
  return {
    chartOutcome: 'invalid-response',
    error: true,
    label: '图表类型选择失败',
    detail:
      selection === ''
        ? '模型返回了空的图表类型，未进入配置生成。'
        : selection === undefined
          ? '未获得可确认的图表类型或配置，无法判断跳过原因。'
          : `模型返回的图表类型未被 AVA 接受：${JSON.stringify(selection)}（最多记录 80 字符）。未进入配置生成。`,
    recovery: '计算结果已保留，请明确指定图表类型后重试，或检查模型服务。',
  };
}

export function analysisProgress(stage: string, data?: Record<string, unknown> | null): Progress {
  const error = !!data?.error;
  let label = progressLabels[stage];
  if (error) label = `${progressLabels[stage.replace(/end$/, 'start')] || label}失败`;
  if (typeof data?.step === 'number') label = `第 ${data.step + 1} 轮 · ${label}`;
  if (typeof data?.attempt === 'number' && data.attempt > 0) label = `第 ${data.attempt} 次纠错 · ${label}`;
  let detail: string | undefined;
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
    }
  }
  const actions: Record<string, string> = {
    EXPLORE: '准备执行探索查询',
    REFINE: '调整分析方向，继续探索',
    SQL: '准备执行结果查询',
    CONFIRM: '核对本轮分析结果',
  };
  if (stage === 'reasonend' && !error && typeof data?.action === 'string') detail = actions[data.action];
  return {
    at: new Date().toISOString(),
    stage,
    label,
    error,
    detail,
    recovery: error
      ? stage === 'queryend'
        ? '如仍有纠错预算，AVA 会继续修正查询；最终失败后可修改问题并重试。'
        : '请检查数据连接与模型设置；重试将重新执行分析。'
      : undefined,
    sql:
      ['querystart', 'translateend'].includes(stage) && typeof data?.dsl === 'string' ? data.dsl : undefined,
  };
}
