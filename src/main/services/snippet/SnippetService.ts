import type { SettingsService } from '../settings/SettingsService';
import type { ConversationService } from '../conversation/ConversationService';
import type { AnalysisRecordService } from '../analysis/AnalysisRecordService';
import type { Repositories } from '../../db';
import type { StoredDataset } from '../../db/types';
import type { Run } from '@shared/contracts';
import { timestamp } from '../../utils/time';
import { queryOptions } from '../../ai/queryOptions';
import { WorkbenchError } from '@shared/errors';
import { ModelService } from '../settings/ModelService';
import { ConnectionService } from '../data/ConnectionService';
import { withAVA } from '../../ai/ava';
import { refreshChart } from '../../ai/refreshChart';
import { chartHTML } from '../export/analysisHtml';
import { validateTheme, type ThemeSettings } from '@shared/theme';
import type { DatasetService } from '../data/DatasetService';

export class SnippetService {
  refreshingId?: string;

  constructor(
    private data: Repositories,
    private records: AnalysisRecordService,
    private conversations: ConversationService,
    private settings: SettingsService,
    private models: ModelService,
    private datasets: DatasetService,
    private change: () => void,
    private isAnalyzing: () => boolean,
    private connections: ConnectionService,
  ) {}

  private snippet(id: string) {
    const snippet = this.data.snippets.getByMessageId(id);
    if (!snippet) throw new WorkbenchError('CONFLICT', '分析片段不存在');
    return snippet;
  }

  save(id: string) {
    this.data.database.write(() => {
      if (this.records.message(id).status !== 'done')
        throw new WorkbenchError('CONFLICT', '只能保存已完成的分析');
      const snippet = this.snippet(id);
      if (!snippet.isVisible)
        this.data.snippets.update(snippet.id, {
          isVisible: 1,
          updatedAt: timestamp(snippet.updatedAt),
        });
    });
    this.change();
  }

  remove(id: string) {
    this.data.database.write(() => {
      const snippet = this.snippet(id);
      this.data.snippets.update(snippet.id, {
        isVisible: 0,
        updatedAt: timestamp(snippet.updatedAt),
      });
    });
    this.change();
  }

  rename(id: string, title: string) {
    this.data.database.write(() => {
      const snippet = this.snippet(id);
      if (!snippet.isVisible) throw new WorkbenchError('CONFLICT', '此分析已从收藏移除');
      if (!title.trim()) throw new WorkbenchError('INVALID_INPUT', '请输入收藏标题');
      this.data.snippets.update(snippet.id, {
        title: title.trim(),
        updatedAt: timestamp(snippet.updatedAt),
      });
    });
    this.change();
  }

  private saveView(id: string, savedAt: string, source: StoredDataset, view: Pick<Run, 'result' | 'chart'>) {
    this.data.database.write(() => {
      this.datasets.assertDatasetCurrent(source);
      const snippet = this.snippet(id);
      if (!snippet.isVisible || snippet.updatedAt !== savedAt)
        throw new WorkbenchError('CONFLICT', '收藏已发生变化，本次刷新结果未写入');
      if (this.conversations.get(this.records.message(id).conversationId).deletedAt)
        throw new WorkbenchError('CONFLICT', '请先恢复此分析所属的会话');
      this.data.snippets.update(snippet.id, {
        content: { result: view.result, chart: view.chart ?? null },
        updatedAt: timestamp(snippet.updatedAt),
      });
    });
  }

  async refresh(id: string) {
    if (this.isAnalyzing() || this.refreshingId)
      throw new WorkbenchError('CONFLICT', '请等待当前分析或刷新完成');
    this.refreshingId = id;
    this.change();
    try {
      const run = this.records.run(id);
      if (this.conversations.get(run.conversationId).deletedAt)
        throw new WorkbenchError('CONFLICT', '请先恢复此分析所属的会话');
      if (!run.savedAt) throw new WorkbenchError('CONFLICT', '此分析已从已保存列表移除');
      const source = await this.datasets.prepare(run.datasetId);
      if (source.format === 'mysql') this.records.assertRunSource(run.id, source);
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
      this.saveView(id, run.savedAt!, source, view);
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
    const run = this.records.run(id);
    const chart = saved && run.savedView ? run.savedView.chart : run.chart;
    if (!chart) throw new WorkbenchError('CONFLICT', '尚无图表');
    return chartHTML(chart, theme ? validateTheme(theme) : this.settings.theme());
  }
}
