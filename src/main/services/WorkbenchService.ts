import type { Task } from '@shared/contracts';
import type { DataServices } from '@main/data';
import { ModelService } from '@main/services/settings/ModelService';
import { ConnectionService } from '@main/services/data/ConnectionService';
import { DatasetService } from '@main/services/data/DatasetService';
import { AnalysisService } from '@main/services/analysis/AnalysisService';
import { SnippetService } from '@main/services/snippet/SnippetService';
// Composition root; each service owns its lifecycle.
export class WorkbenchService {
  readonly datasets: DatasetService;
  readonly analysis: AnalysisService;
  readonly snippets: SnippetService;
  constructor(
    data: DataServices,
    models: ModelService,
    public change: () => void,
    connections: ConnectionService,
    taskChanged: (task: Task) => void,
  ) {
    this.datasets = new DatasetService(
      data.datasets,
      change,
      () => this.analysis.busy,
      (id) => {
        if (this.analysis.task?.datasetId === id) this.analysis.task = null;
      },
      connections,
      () => !!this.snippets.refreshingId,
    );
    this.analysis = new AnalysisService(
      data.conversations,
      models,
      this.datasets,
      change,
      () => !!this.snippets.refreshingId,
      connections,
      taskChanged,
    );
    this.snippets = new SnippetService(
      data.conversations,
      data.settings,
      models,
      this.datasets,
      change,
      () => this.analysis.busy,
      connections,
    );
  }
}
