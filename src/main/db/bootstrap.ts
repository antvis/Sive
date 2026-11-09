export const sqliteSchema = `
CREATE TABLE model_providers (
  id TEXT PRIMARY KEY NOT NULL, -- 模型服务商 ID
  name TEXT NOT NULL, -- 服务商显示名称
  model_names TEXT NOT NULL CHECK (json_valid(model_names) AND json_type(model_names) = 'array'), -- 可选模型名称/调用标识数组（JSON）
  base_url TEXT NOT NULL, -- 模型服务 API 地址
  encrypted_key TEXT, -- safeStorage 加密的 API 密钥，Base64 文本，无密钥时为空
  created_at TEXT NOT NULL, -- 创建时间
  updated_at TEXT NOT NULL, -- 最近修改时间
  deleted_at TEXT -- 软删除时间
) STRICT;


CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL CHECK (length(trim(key)) > 0), -- 设置项唯一名称
  value TEXT NOT NULL CHECK (json_valid(value)), -- 设置值，统一使用 JSON 编码
  created_at TEXT NOT NULL, -- 创建时间
  updated_at TEXT NOT NULL, -- 最近修改时间
  deleted_at TEXT -- 软删除时间
) STRICT;


CREATE TABLE datasets (
  id TEXT PRIMARY KEY NOT NULL, -- 数据源 ID
  name TEXT NOT NULL, -- 数据源显示名称
  source_type TEXT NOT NULL CHECK (source_type IN ('csv', 'json', 'xlsx', 'parquet', 'text', 'mysql', 'postgresql', 'sqlite', 'mongodb', 'clickhouse', 'http_file', 'supabase', 'feishu_bitable')), -- 来源类型
  source_config TEXT NOT NULL, -- 整份来源配置（含凭据）经 safeStorage 加密后的 Base64 文本
  schema TEXT NOT NULL CHECK (json_valid(schema) AND json_type(schema) = 'object'), -- AVA 数据结构对象（JSON）
  profile TEXT NOT NULL CHECK (json_valid(profile) AND json_type(profile) = 'object'), -- AVA 数据概况对象（JSON）
  semantic TEXT NOT NULL DEFAULT '', -- 业务语义说明
  metrics TEXT CHECK (metrics IS NULL OR (json_valid(metrics) AND json_type(metrics) = 'array')), -- 业务指标定义数组（JSON）
  created_at TEXT NOT NULL, -- 创建时间
  updated_at TEXT NOT NULL, -- 最近修改时间
  deleted_at TEXT -- 软删除时间
) STRICT;


CREATE TABLE conversations (
  id TEXT PRIMARY KEY NOT NULL, -- 会话 ID
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT, -- 所属数据源 ID
  title TEXT NOT NULL, -- 会话标题
  created_at TEXT NOT NULL, -- 创建时间
  updated_at TEXT NOT NULL, -- 最近追加消息或会话信息变化的时间
  deleted_at TEXT -- 归档/软删除时间
) STRICT;

CREATE INDEX idx_conversations_dataset ON conversations(dataset_id, created_at, id);


CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL, -- 消息 ID
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, -- 所属会话 ID
  sequence INTEGER NOT NULL CHECK (sequence >= 0), -- 会话内追加序号
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), -- 消息角色
  status TEXT NOT NULL CHECK (status IN ('running', 'cancelling', 'done', 'error', 'cancelled', 'interrupted')), -- 生成状态，用户消息固定为 done
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'), -- 消息正文、分析结果及过程信息对象（JSON）
  analysis_options TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(analysis_options) AND json_type(analysis_options) = 'object'), -- AVA 相关配置快照对象（JSON），不含凭据
  created_at TEXT NOT NULL, -- 消息创建时间
  updated_at TEXT NOT NULL, -- 最近生成进度、终态或软删除变化时间
  deleted_at TEXT, -- 软删除时间
  UNIQUE (conversation_id, sequence)
) STRICT;

CREATE INDEX idx_messages_status ON messages(status, created_at, id);


CREATE TABLE snippets (
  id TEXT PRIMARY KEY NOT NULL, -- 片段 ID
  message_id TEXT NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE, -- 来源助手消息 ID，每条消息最多一个片段
  title TEXT NOT NULL, -- 片段标题，默认来自本轮问题，可独立修改
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'), -- 展示快照对象（JSON），如 result/chart/chart_error/error
  is_visible INTEGER NOT NULL DEFAULT 0 CHECK (is_visible IN (0, 1)), -- 是否出现在已保存列表，创建时隐藏
  created_at TEXT NOT NULL, -- 本轮回复结束、片段生成的时间
  updated_at TEXT NOT NULL, -- 最近保存/取消保存、改名、刷新或软删除变化时间
  deleted_at TEXT -- 软删除时间
) STRICT;

CREATE INDEX idx_snippets_visible ON snippets(is_visible, deleted_at, updated_at DESC, id);
`;
