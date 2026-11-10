import type { BrowserWindow } from 'electron';
import type { CommandHandlers } from '../commands';
import type { WorkbenchServices } from '../../services';
import { exportAnalysis } from '../../services/export/exportAnalysis';

export function createAnalysisHandlers(
  win: BrowserWindow,
  services: Pick<WorkbenchServices, 'analysis' | 'records' | 'snippets' | 'settings'>,
  root: string,
): Pick<
  CommandHandlers,
  'analysisGetRun' | 'analysisStart' | 'analysisCancel' | 'analysisGetChartHTML' | 'analysisExport'
> {
  return {
    analysisGetRun: (id) => services.records.run(id),
    analysisStart: (...args) => services.analysis.analyze(...args),
    analysisCancel: (taskId) => services.analysis.cancel(taskId),
    analysisGetChartHTML: (id, theme, saved, index) => services.snippets.chartHTML(id, theme, saved, index),
    analysisExport: (id, format, saved) =>
      exportAnalysis(win, services.records, services.settings.theme(), root, id, format, saved),
  };
}
