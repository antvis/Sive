import type { Task } from '@shared/contracts';
import type { DataServices } from '@main/data';
import { ModelService } from '@main/services/settings/ModelService';
import { ConnectionService } from '@main/services/data/ConnectionService';
import { DatasetService } from '@main/services/data/DatasetService';
import { AnalysisService } from '@main/services/analysis/AnalysisService';
import { SnippetService } from '@main/services/snippet/SnippetService';

export function createWorkbenchServices(
  data: DataServices,
  models: ModelService,
  change: () => void,
  connections: ConnectionService,
  taskChanged: (task: Task) => void,
) {
  const datasets: DatasetService = new DatasetService(
    data.datasets,
    change,
    () => analysis.busy,
    (id) => {
      if (analysis.task?.datasetId === id) analysis.task = null;
    },
    connections,
    () => !!snippets.refreshingId,
  );
  const analysis: AnalysisService = new AnalysisService(
    data.conversations,
    models,
    datasets,
    change,
    () => !!snippets.refreshingId,
    connections,
    taskChanged,
  );
  const snippets: SnippetService = new SnippetService(
    data.conversations,
    data.settings,
    models,
    datasets,
    change,
    () => analysis.busy,
    connections,
  );
  return { datasets, analysis, snippets };
}

export type WorkbenchServices = ReturnType<typeof createWorkbenchServices>;
