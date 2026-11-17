import type { DataSourceConfig, EngineConfig } from '@antv/ava';
import { DEFAULT_PREFERENCES } from '@shared/api';
import type { DuckDBEngineConfig } from '@shared/api';

export function sourceEngine(
  source: DataSourceConfig,
  duckdb: DuckDBEngineConfig = DEFAULT_PREFERENCES.engine,
): EngineConfig {
  return ['clickhouse', 'supabase'].includes(source.type) ? { type: source.type } : duckdb;
}
