import type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';

export type DatasetSaveInput = {
  id?: string;
  name: string;
  sourceConfig: DataSourceConfig;
  schema: Schema;
  profile: Profile;
  semantic?: Semantic;
  metrics?: unknown;
};

export type ModelInput = {
  id?: string;
  name: string;
  modelIds: string[];
  baseURL: string;
  apiKey?: string;
  credentialSourceId?: string;
};

export type ThemeSettings = { mode: 'light' | 'dark' };
