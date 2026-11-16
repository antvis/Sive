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

export type { Preferences } from '@shared/api';

export type ModelConnectionInput = {
  baseURL: string;
  apiKey?: string;
  credentialSourceId?: string;
};

export type ModelTestProgress = { completed: number; total: number; active: string[] };
