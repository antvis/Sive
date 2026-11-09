import type { SettingsService } from '@main/db/repository/SettingsService';
import type { ConversationService } from '@main/db/repository/ConversationService';
import { queryOptions } from '@main/ai/queryOptions';
import { WorkbenchError } from '@shared/errors';
import { ModelService } from '@main/services/settings/ModelService';
import { ConnectionService } from '@main/services/data/ConnectionService';
import { withAVA } from '@main/ai/ava';
import { refreshChart } from '@main/ai/refreshChart';
import { chartHTML } from '@main/services/export/analysisHtml';
import { validateTheme, type ThemeSettings } from '@shared/theme';
import type { DatasetService } from '@main/services/data/DatasetService';
export class SnippetService {
  refreshingId?: string;
  constructor(
    private conversations: ConversationService,
    private settings: SettingsService,
    private models: ModelService,
    private datasets: DatasetService,
    private change: () => void,
    private isAnalyzing: () => boolean,
    private connections: ConnectionService,
  ) {}
  remove(id: string) {
    this.conversations.removeSavedAnalysis(id);
    this.change();
  }
  rename(id: string, title: string) {
    this.conversations.renameSavedAnalysis(id, title);
    this.change();
  }
  async refresh(id: string) {
    if (this.isAnalyzing() || this.refreshingId)
      throw new WorkbenchError('CONFLICT', '请等待当前分析或刷新完成');
    this.refreshingId = id;
    this.change();
    try {
      const run = this.conversations.run(id);
      if (this.conversations.conversation(run.conversationId).deletedAt)
        throw new WorkbenchError('CONFLICT', '请先恢复此分析所属的会话');
      if (!run.savedAt) throw new WorkbenchError('CONFLICT', '此分析已从已保存列表移除');
      const source = await this.datasets.prepare(run.datasetId);
      if (source.format === 'mysql') this.conversations.assertRunSource(run.id, source);
      if (!run.result.sql?.trim()) throw new WorkbenchError('CONFLICT', '此分析没有可刷新的 SQL');
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
                run.chart.chartType !== 'table' ? this.models.model(this.models.active()) : undefined,
              );
            } catch {
              throw new WorkbenchError('CONFLICT', '图表更新失败，本次刷新未保存。请检查当前模型后重试。');
            }
          }
          await this.datasets.assertFileUnchanged(source);
          return { result, chart };
        },
        this.connections,
      );
      this.conversations.saveView(id, run.savedAt!, source, view);
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      throw new WorkbenchError(
        'CONFLICT',
        '刷新查询失败，请检查源文件、数据表及字段是否变化。上次成功结果已保留。',
      );
    } finally {
      this.refreshingId = undefined;
      this.change();
    }
  }
  chartHTML(id: string, theme?: ThemeSettings, saved = false) {
    const run = this.conversations.run(id);
    const chart = saved && run.savedView ? run.savedView.chart : run.chart;
    if (!chart) throw new WorkbenchError('CONFLICT', '尚无图表');
    return chartHTML(chart, theme ? validateTheme(theme) : this.settings.theme());
  }
}
