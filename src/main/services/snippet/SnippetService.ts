import type { SettingsService } from '../settings/SettingsService';
import type { ConversationService } from '../conversation/ConversationService';
import type { AnalysisRecordService } from '../analysis/AnalysisRecordService';
import type { Repositories } from '../../db';
import type { StoredDataset } from '../../db/types';
import type { AnalysisOutput } from '@shared/contracts';
import { timestamp } from '../../utils/time';
import { QUERY_OPTIONS } from '../../ai/queryOptions';
import { WorkbenchError } from '@shared/errors';
import { ModelService } from '../settings/ModelService';
import { ConnectionService } from '../data/ConnectionService';
import { withAVA } from '../../ava';
import { createChart } from '../../ai/charts';
import { chartHTML } from '../export/analysisHtml';
import type { ThemeSettings } from '@shared/theme';
import { themeSchema } from '@shared/inputSchemas';
import { parseInput } from '../../utils/input';
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

  private saveView(id: string, snippetUpdatedAt: string, source: StoredDataset, output: AnalysisOutput) {
    this.data.database.write(() => {
      this.datasets.assertDatasetCurrent(source);
      const snippet = this.snippet(id);
      if (!snippet.isVisible || snippet.updatedAt !== snippetUpdatedAt)
        throw new WorkbenchError('CONFLICT', '收藏已发生变化，本次刷新结果未写入');
      if (this.conversations.get(this.records.message(id).conversationId).archivedAt)
        throw new WorkbenchError('CONFLICT', '请先恢复此分析所属的会话');
      this.data.snippets.update(snippet.id, {
        content: { output },
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
      if (this.conversations.get(run.conversationId).archivedAt)
        throw new WorkbenchError('CONFLICT', '请先恢复此分析所属的会话');
      if (!run.snippet) throw new WorkbenchError('CONFLICT', '此分析已从已保存列表移除');
      const saved = run.snippet.output || run.output;
      const source = await this.datasets.prepare(run.datasetId);
      if (source.format === 'mysql') this.records.assertRunSource(run.id, source);
      if (!saved.results.length) throw new WorkbenchError('CONFLICT', '此分析没有可刷新的 SQL');
      const queries = saved.results.map((evidence) => {
        const sql = evidence.result.sql;
        if (!sql?.trim()) throw new WorkbenchError('CONFLICT', '此分析没有可刷新的 SQL');
        return { ...evidence, sql };
      });
      const signal = AbortSignal.timeout(300000);
      const view = await withAVA(
        {
          dataset: { ...source, semantic: run.semantic, metrics: run.metrics },
          signal,
          connections: this.connections,
        },
        async (ava) => {
          const output: AnalysisOutput = { text: '', results: [], charts: [] };
          let model: ReturnType<ModelService['model']> | undefined;
          for (const { id: resultId, result, sql } of queries) {
            signal.throwIfAborted();
            const queried = await ava.query(sql, QUERY_OPTIONS);
            output.results.push({
              id: resultId,
              result: { ...queried, query: result.query, sql: result.sql, text: '' },
            });
          }
          for (const chart of saved.charts) {
            signal.throwIfAborted();
            const evidence = output.results.find(({ id }) => id === chart.resultId);
            if (!evidence) throw new WorkbenchError('CONFLICT', '图表引用的计算结果不存在');
            if (chart.spec.chartType === 'table' && typeof chart.spec.config !== 'string') {
              output.charts.push({
                resultId: chart.resultId,
                spec: { ...chart.spec, config: { ...chart.spec.config, data: evidence.result.data } },
              });
            } else {
              const next = await createChart(
                evidence,
                `保持原图类型 ${chart.spec.chartType}。${run.question}`,
                (model ||= this.models.model(this.models.active(), signal)),
                signal,
                chart.spec,
              );
              if (!next || next.spec.chartType !== chart.spec.chartType)
                throw new WorkbenchError('CONFLICT', '无法保留原图类型，本次刷新未保存。');
              output.charts.push(next);
            }
          }
          if (output.results.some(({ result }) => result.truncated)) output.warning = '部分查询结果已截断。';
          await this.datasets.assertFileUnchanged(source);
          signal.throwIfAborted();
          return output;
        },
      );
      this.saveView(id, run.snippet.updatedAt, source, view);
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

  chartHTML(id: string, theme?: ThemeSettings, saved = false, index = 0) {
    const run = this.records.run(id);
    const chart = (saved && run.snippet?.output ? run.snippet.output : run.output).charts[index]?.spec;
    if (!chart) throw new WorkbenchError('CONFLICT', '尚无图表');
    return chartHTML(chart, theme ? parseInput(themeSchema, theme) : this.settings.theme());
  }
}
