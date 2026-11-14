import { z } from 'zod';

const connectionText = z
  .string()
  .trim()
  .min(1, '请填写完整的连接信息。')
  .regex(/^\S+$/, '连接信息暂不支持空白字符。');

export const mysqlInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, '请填写数据源名称。'),
  host: connectionText,
  port: z.number().int().min(1).max(65535),
  database: connectionText,
  user: connectionText,
  // AVA passes these values to DuckDB's space-separated connection string.
  password: z.string().regex(/^\S*$/, '当前 MySQL 连接暂不支持包含空白字符的密码。').optional(),
});

export type MySQLInput = z.infer<typeof mysqlInputSchema>;

export type MySQLConnection = Omit<MySQLInput, 'password'> & { hasPassword: boolean };
