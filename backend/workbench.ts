import type { Task } from '../shared/contracts';
import { Store } from './store';
import { Models } from './models';
import { Connections } from './connections';
import { DatasetService } from './datasets';
import { AnalysisRunner } from './analysis-runner';
import { SavedAnalysisService } from './saved-analyses';
// Composition root; each service owns its lifecycle.
export class Workbench {
  readonly datasets: DatasetService;
  readonly analysis: AnalysisRunner;
  readonly saved: SavedAnalysisService;
  constructor(
    store: Store,
    models: Models,
    public change: () => void,
    connections?: Connections,
    taskChanged: (task: Task) => void = () => {},
  ) {
    this.analysis = new AnalysisRunner(
      store,
      models,
      change,
      () => !!this.saved.refreshingId,
      connections,
      taskChanged,
    );
    this.saved = new SavedAnalysisService(store, models, change, () => this.analysis.busy, connections);
    this.datasets = new DatasetService(
      store,
      change,
      () => this.analysis.task,
      (id) => {
        if (this.analysis.task?.datasetId === id) this.analysis.task = null;
      },
      connections,
    );
  }
}
