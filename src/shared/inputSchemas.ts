import { z } from 'zod';
import { WorkbenchError } from '@shared/errors';

export const requiredText = (message = '请填写有效文本') =>
  z.string({ error: message }).refine((value) => value.trim().length > 0, message);
export const idSchema = requiredText('标识不能为空');
export const localFormatSchema = z.enum(['csv', 'json', 'xlsx', 'parquet']);
export const analysisModeSchema = z.enum(['direct', 'loop']);
export const analysisOptionsSchema = z.object({
  maxRetries: z.int().optional(),
  maxSteps: z.int().optional(),
});
export const themeSchema = z.object({ mode: z.enum(['light', 'dark']) });

// These restrictions match the current AVA MySQL connection-string adapter.
const connectionText = (label: string) =>
  requiredText(`请填写${label}`).regex(
    /^[^\s'"\\\x00-\x1f\x7f]+$/u,
    '当前 MySQL 驱动暂不支持连接字段含空白、引号、反斜杠或控制字符',
  );
export const mysqlInputSchema = z.object({
  id: idSchema.optional(),
  name: requiredText('请填写连接名称'),
  host: connectionText('主机'),
  port: z
    .number({ error: '请填写有效端口' })
    .int('端口应为整数')
    .min(1, '端口应为 1–65535')
    .max(65535, '端口应为 1–65535'),
  database: connectionText('数据库'),
  user: connectionText('用户名'),
  // Undefined preserves a saved password; an empty string explicitly clears it.
  password: z
    .string()
    .regex(/^[^\s'"\\\x00-\x1f\x7f]*$/u, '当前 MySQL 驱动暂不支持密码含空白、引号、反斜杠或控制字符')
    .optional(),
});

const modelURLSchema = requiredText('请填写服务地址').superRefine((value, context) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    context.addIssue({ code: 'custom', message: '模型服务地址无效' });
    return;
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
  ) {
    context.addIssue({ code: 'custom', message: '服务地址需使用 HTTPS，或本机 HTTP 地址' });
  }
});
export const modelConnectionSchema = z.object({
  baseURL: modelURLSchema,
  apiKey: z.string().optional(),
  credentialSourceId: idSchema.optional(),
});
export const modelInputSchema = modelConnectionSchema.extend({
  id: idSchema.optional(),
  name: requiredText('请填写服务名称'),
  modelIds: z
    .array(requiredText('模型名称不能为空'), { error: '请至少选择一个模型' })
    .min(1, '请至少选择一个模型'),
});
export const businessMetricSchema = z.object({
  name: z.string(),
  table: z.string(),
  expression: z.string(),
  unit: z.string(),
  description: z.string(),
});
export const metricFormSchema = businessMetricSchema.extend({
  name: requiredText('请填写指标名称'),
  table: requiredText('请选择数据表'),
  expression: requiredText('请填写聚合公式'),
});

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new WorkbenchError('INVALID_INPUT', result.error.issues[0]?.message || '请求参数无效');
  return result.data;
}
