import { queryOptions } from './query-options';
import { WorkbenchError } from '../shared/errors';
import { Store } from './store';
import { Models } from './models';
import { Connections } from './connections';
import { withAVA } from './ava-service';
import { refreshChart } from './refresh-chart';
import { chartHTML } from './render';
import { validateTheme, type ThemeSettings } from '../shared/theme';
export class SavedAnalysisService {
  refreshingId?: string;
  constructor(
    private store: Store,
    private models: Models,
    private change: () => void,
    private isAnalyzing: () => boolean,
    private connections?: Connections,
  ) {}
  remove(id: string) {
    this.store.removeSavedAnalysis(id);
    this.change();
  }
  rename(id: string, title: string) {
    this.store.renameSavedAnalysis(id, title);
    this.change();
  }
  async refresh(id: string) {
    if (this.isAnalyzing() || this.refreshingId)
      throw new WorkbenchError('CONFLICT', '请等待当前分析或刷新完成');
    const run = this.store.run(id);
    if (!run.savedAt) throw new WorkbenchError('CONFLICT', '此分析已从已保存列表移除');
    const source = this.store.dataset(run.datasetId);
    if (source.fingerprint !== run.fingerprint)
      throw new WorkbenchError('CONFLICT', '数据来源已变化，请重新分析后保存，不能沿用原收藏刷新');
    if (!run.result.sql?.trim()) throw new WorkbenchError('CONFLICT', '此分析没有可刷新的 SQL');
    if (JSON.stringify(source.excelSheets) !== JSON.stringify(run.excelSheets))
      throw new WorkbenchError('CONFLICT', 'Excel 读取区域已变化，请重新分析后保存');
    const model = run.chart && run.chart.chartType !== 'table' ? this.models.active() : undefined;
    this.refreshingId = id;
    this.change();
    try {
      const view = await withAVA(
        { ...source, semantic: run.semantic, metrics: run.metrics },
        undefined,
        undefined,
        undefined,
        async (ava) => {
          const queried = await ava.query(run.result.sql!, queryOptions);
          const result = { ...queried, query: run.question, sql: run.result.sql, text: '' };
          let chart;
          if (run.chart && queried.data.length) {
            try {
              chart = await refreshChart(
                run.chart,
                queried.data,
                run.question,
                model ? this.models.model(model) : undefined,
              );
            } catch {
              throw new WorkbenchError('CONFLICT', '图表更新失败，本次刷新未保存。请检查当前模型后重试。');
            }
          }
          return { result, chart, updatedAt: new Date().toISOString() };
        },
        this.connections,
        model,
      );
      this.store.saveView(id, run.savedAt!, source, view);
    } finally {
      this.refreshingId = undefined;
      this.change();
    }
  }
  chartHTML(id: string, theme?: ThemeSettings, saved = false) {
    const run = this.store.run(id);
    const chart = saved && run.savedView ? run.savedView.chart : run.chart;
    if (!chart) throw new WorkbenchError('CONFLICT', '尚无图表');
    return chartHTML(chart, theme ? validateTheme(theme) : this.store.theme());
  }
}
