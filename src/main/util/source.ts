import type { AVA, DataSourceConfig } from '@antv/ava';
import { withGitHubMcp } from './github/client';
import { readGitHubTables } from './github/data';
import { githubSourceSchema } from '@shared/github';

export async function loadSource(ava: AVA, config: DataSourceConfig) {
  let sources: DataSourceConfig | DataSourceConfig[] = config;
  if (config.type === 'github') {
    const { options } = githubSourceSchema.parse(config);
    sources = await withGitHubMcp((call) => readGitHubTables(options, call));
  }
  await ava.source(sources);
}
