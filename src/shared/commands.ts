import type { API } from './contracts';

export type Commands = Omit<API, 'workspaceOnChange' | 'analysisOnTaskChange' | 'modelOnTestProgress'>;

export type Command = keyof Commands;

export const commandNames = Object.values({
  clipboardWrite: 'clipboardWrite',
  workspaceGetState: 'workspaceGetState',
  analysisGetRun: 'analysisGetRun',
  datasetImport: 'datasetImport',
  analysisCancel: 'analysisCancel',
  conversationCreate: 'conversationCreate',
  conversationRename: 'conversationRename',
  conversationArchive: 'conversationArchive',
  conversationRestore: 'conversationRestore',
  conversationPurge: 'conversationPurge',
  datasetDelete: 'datasetDelete',
  datasetRename: 'datasetRename',
  datasetRelocate: 'datasetRelocate',
  datasetRefreshMySQL: 'datasetRefreshMySQL',
  snippetSave: 'snippetSave',
  snippetRemove: 'snippetRemove',
  snippetRename: 'snippetRename',
  snippetRefresh: 'snippetRefresh',
  modelActivate: 'modelActivate',
  modelDelete: 'modelDelete',
  datasetTestMySQL: 'datasetTestMySQL',
  datasetSaveMySQL: 'datasetSaveMySQL',
  settingsSaveTheme: 'settingsSaveTheme',
  datasetGetTableDetails: 'datasetGetTableDetails',
  datasetSuggest: 'datasetSuggest',
  datasetCancelSuggestions: 'datasetCancelSuggestions',
  datasetPreview: 'datasetPreview',
  datasetSaveSemantic: 'datasetSaveSemantic',
  analysisStart: 'analysisStart',
  analysisGetChartHTML: 'analysisGetChartHTML',
  analysisExport: 'analysisExport',
  modelSave: 'modelSave',
  modelListAvailable: 'modelListAvailable',
} satisfies { [K in Command]: K });
