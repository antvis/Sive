import type { AVA, DataSourceConfig } from '@antv/ava';

export async function loadSource(ava: AVA, config: DataSourceConfig) {
  await ava.source(config);
}
