export const SchemaDDL = `
  CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_config TEXT NOT NULL,
    schema TEXT NOT NULL,
    profile TEXT NOT NULL,
    semantic TEXT NOT NULL DEFAULT '{}',
    metrics TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  UPDATE datasets SET semantic = '{}' WHERE semantic = '';

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_dataset
    ON conversations (dataset_id, created_at, id);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    content TEXT NOT NULL,
    analysis_options TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_sequence_unique
    ON messages (conversation_id, sequence);
  CREATE INDEX IF NOT EXISTS idx_messages_status
    ON messages (status, created_at, id);

  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_snippets_visible
    ON snippets (is_visible, deleted_at, updated_at DESC, id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS model_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_names TEXT NOT NULL,
    base_url TEXT NOT NULL,
    encrypted_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
`;
