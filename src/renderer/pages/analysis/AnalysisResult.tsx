import { useRun } from '@renderer/hooks/useRun';
import { useEffect, useState } from 'react';
import { BookmarkSimpleIcon, CheckIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import type { Run, RunSummary } from '@shared/contracts';
import { Alert, Button, Dropdown, Input, Modal, Spin, Tooltip } from '@renderer/components/ui/index';
import { renderMarkdown } from '@shared/markdown';
import { errorMessage } from '@renderer/utils/feedback';
import { UserMessage, AssistantMessage } from '@renderer/pages/analysis/ConversationMessage';
import { replyMarkdown } from '../../utils/conversationMarkdown';
import AnalysisTools from './AnalysisTools';
import ConversationChart from '@renderer/pages/analysis/ConversationChart';
import Grid from '@renderer/components/data/DataGrid';
const api = window.workbench;
const exportFormats: Parameters<typeof api.analysisExport>[1][] = ['pdf', 'png', 'html'];

function useResultActionFeedback() {
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(undefined), feedback.error ? 5000 : 2000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  return [feedback, setFeedback] as const;
}

function ResultContent({ run, showQuestion = true }: { run: Run; showQuestion?: boolean }) {
  const [dataOpen, setDataOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useResultActionFeedback();
  const [saveFeedback, setSaveFeedback] = useResultActionFeedback();
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const saved = !!run.snippet || saveFeedback?.error === false;
  let saveLabel = saved ? '已保存' : '保存分析';
  if (saving) saveLabel = '保存中';

  const save = async () => {
    if (saving || saved || !saveTitle?.trim()) return;
    setSaveFeedback(undefined);
    setSaveError('');
    setSaving(true);
    try {
      // Keep fast local saves visible long enough to avoid a loading flash.
      await Promise.all([
        api.snippetSave(run.id, saveTitle.trim()),
        new Promise((resolve) => window.setTimeout(resolve, 350)),
      ]);
      setSaveTitle(null);
      setSaveFeedback({ text: '保存成功', error: false });
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const performExport = async (format: Parameters<typeof api.analysisExport>[1]) => {
    if (exporting) return;
    setExportFeedback(undefined);
    setExporting(true);
    try {
      const result = await api.analysisExport(run.id, format);
      if (result) setExportFeedback({ text: '导出成功', error: false });
    } catch (e) {
      setExportFeedback({ text: errorMessage(e), error: true });
    } finally {
      setExporting(false);
    }
  };
  return (
    <article className="result pb-4.5 mb-4.5 min-w-0">
      {showQuestion && <UserMessage question={run.question} time={run.events[0]?.at || run.createdAt} />}
      <AssistantMessage time={run.createdAt} markdown={() => replyMarkdown(run)}>
        <p className="text-muted text-helper">
          {run.sourceName} · {run.modelName}
        </p>
        <AnalysisTools output={run.output} />
        <div
          className="markdown"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(run.output.text || '没有文字总结，请查看计算结果。'),
          }}
        />
        {run.output.charts.map((chart, index) => (
          <ConversationChart key={`${chart.resultId}:${index}`} run={run} index={index} />
        ))}
        {run.output.warning && <Alert type="warning" title={run.output.warning} />}
        <details onToggle={(event) => setDataOpen(event.currentTarget.open)}>
          <summary>计算依据 · {run.output.results.length} 个结果</summary>
          {dataOpen && (
            <>
              {run.output.results.map(({ id, result }, index) => (
                <section key={id} className="mb-3">
                  <p>
                    依据 {index + 1} · {result.query}
                  </p>
                  {result.truncated && <Alert type="warning" title="此结果已截断，请核对查询范围。" />}
                  <pre className="mb-3">{result.sql}</pre>
                  <Grid rows={result.data} columns={result.schema} />
                </section>
              ))}
            </>
          )}
        </details>
        <div className="flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0">
          <Tooltip open={!!saveFeedback} title={<span role="status">{saveFeedback?.text}</span>}>
            <Button
              size="small"
              className="min-w-[104px]"
              loading={saving}
              icon={saved ? <CheckIcon /> : <BookmarkSimpleIcon />}
              disabled={saving || saved}
              onClick={() => {
                setSaveTitle(run.question);
                setSaveError('');
              }}
            >
              <span
                key={saveLabel}
                className="[animation:result-save-enter_180ms_ease-out]"
                aria-live="polite"
              >
                {saveLabel}
              </span>
            </Button>
          </Tooltip>
          <Tooltip open={!!exportFeedback} title={<span role="status">{exportFeedback?.text}</span>}>
            <span className="inline-flex">
              <Dropdown
                disabled={exporting}
                open={exportMenuOpen}
                onOpenChange={(open) => {
                  setExportMenuOpen(open);
                  if (open) setExportFeedback(undefined);
                }}
                menu={{
                  items: exportFormats.map((key) => ({
                    key,
                    label: key === 'html' ? 'HTML 源码' : key.toUpperCase(),
                  })),
                  onClick: (e) => {
                    setExportMenuOpen(false);
                    performExport(e.key);
                  },
                }}
              >
                <Button
                  size="small"
                  loading={exporting}
                  icon={exportFeedback && !exportFeedback.error ? <CheckIcon /> : <DownloadSimpleIcon />}
                >
                  导出结果
                </Button>
              </Dropdown>
            </span>
          </Tooltip>
        </div>
      </AssistantMessage>
      <Modal
        title="保存分析"
        open={saveTitle !== null}
        onCancel={() => !saving && setSaveTitle(null)}
        onOk={save}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ disabled: !saveTitle?.trim() }}
      >
        <label className="grid gap-2 text-body font-medium">
          标题
          <Input
            autoFocus
            aria-label="收藏标题"
            value={saveTitle ?? ''}
            disabled={saving}
            placeholder="输入收藏标题"
            onChange={(event) => {
              setSaveTitle(event.target.value);
              setSaveError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing && !event.repeat) {
                event.preventDefault();
                save();
              }
            }}
          />
        </label>
        {saveError && <Alert className="mt-3" type="error" title={saveError} />}
      </Modal>
    </article>
  );
}

export default function AnalysisResult(props: { run: RunSummary; showQuestion?: boolean }) {
  const detail = useRun(props.run);
  if (detail.error)
    return <Alert type="error" title={detail.error} action={<Button onClick={detail.retry}>重试</Button>} />;
  if (!detail.run)
    return (
      <div className="loading grid place-content-center min-h-50">
        <Spin />
      </div>
    );
  return <ResultContent {...props} run={detail.run} />;
}
