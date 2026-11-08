import type { Task } from '../shared/contracts';
import { Store } from './store';
import { Models } from './models';
import { Connections } from './connections';
import { DatasetService } from './datasets';
import { AnalysisRunner } from './analysis-runner';
import { SnippetService } from './snippets';
// Composition root; each service owns its lifecycle.
export class Workbench {
  readonly datasets: DatasetService;
  readonly analysis: AnalysisRunner;
  readonly snippets: SnippetService;
  constructor(
    store: Store,
    models: Models,
    public change: () => void,
    connections?: Connections,
    taskChanged: (task: Task) => void = () => {},
  ) {
    this.datasets = new DatasetService(
      store,
      change,
      () => this.analysis.busy,
      (id) => {
        if (this.analysis.task?.datasetId === id) this.analysis.task = null;
      },
      connections,
      () => !!this.snippets.refreshingId,
    );
    this.analysis = new AnalysisRunner(
      store,
      models,
      this.datasets,
      change,
      () => !!this.snippets.refreshingId,
      connections,
      taskChanged,
    );
    this.snippets = new SnippetService(
      store,
      models,
      this.datasets,
      change,
      () => this.analysis.busy,
      connections,
    );
  }
}
