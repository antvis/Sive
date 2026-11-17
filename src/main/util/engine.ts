import type { DataSourceConfig, EngineConfig } from '@antv/ava';
import type { DuckDBEngineConfig } from '@shared/api';

export function sourceEngine(source: DataSourceConfig, duckdb: DuckDBEngineConfig): EngineConfig {
  return source.type === 'clickhouse' ? { type: 'clickhouse' } : duckdb;
}
