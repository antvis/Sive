import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, useUI } from './ui';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { RunSummary, Task } from '../../shared/contracts';
import { taskReplyMarkdown } from '../../shared/conversation-markdown';
import { useWorkspace } from '../shared/workspace-context';
import { datasetPath } from '../shared/routes';
import { errorMessage } from '../shared/feedback';
import { draftKey } from '../shared/conversation-state';
import { conversationView } from '../shared/conversation-view';
import DatasetLayout from './DatasetLayout';
import ConversationTimeline from './ConversationTimeline';
import { AssistantMessage, UserMessage } from './ConversationMessage';
import Result from './AnalysisResult';
import AnalysisProgress from './AnalysisProgress';
import AnalysisComposer from './AnalysisComposer';
import DataBrowser from './DataBrowser';
import Grid from './DataGrid';
import logo from '../../assets/sive-logo.svg';

const api = window.workbench;
export default function AnalysisPage() {
  const {
    state,
    busy,
    submitting,
    setSubmitting,
    analysisMode: mode,
    setAnalysisMode: setMode,
    navigation,
    refresh,
    newConversation,
    openModelSettings,
  } = useWorkspace();
  const route = useParams();
  const [search] = useSearchParams();
  const { conversationState, dispatchConversation, dataOpen, setDataOpen } = navigation;
  const { datasetId, conversationId, runId, question } = conversationState;
  const dataset = state.datasets.find((d) => d.id === datasetId)!;
  const { message } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const resubmitting = useRef(false);
  const { currentTask, activeRunId, session } = conversationView(
    state.runs,
    state.tasks,
    state.task,
    conversationId,
    runId,
  );
  const perform = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };
  const ask = (q: string) => {
    dispatchConversation({
      type: 'edit',
      question: q,
    });
  };
  const start = async () => {
    const text = question.trim();
    if (!dataset || busy || !!state.refreshingSavedId || submitting || !text || !state.activeModelId) return;
    setSubmitting(true);
    const originKey = location.key;
    try {
      const selectedId = conversationId || (await api.createConversation(dataset.id)).id;
      const id = await api.analyze(dataset.id, text, mode, activeRunId || undefined, undefined, selectedId);
      await refresh();
      dispatchConversation({
        type: 'submitted',
        originKey: draftKey(conversationState),
        datasetId: dataset.id,
        conversationId: selectedId,
        taskId: id,
        sentQuestion: question,
      });
      if (mounted.current && locationRef.current.key === originKey)
        navigate(datasetPath(dataset.id, selectedId), { replace: true });
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  const resubmitReason = (target: RunSummary | Task) => {
    if (state.refreshingSavedId) return '请等待收藏的分析刷新完成';
    if (busy || submitting) return '请等待当前操作结束，或先停止分析';
    if (!state.datasets.some((source) => source.id === target.datasetId))
      return '原数据源已移除，请重新导入数据后发起分析';
    if (!state.activeModelId) return '请先在设置中配置模型';
    if (target.parentId && !state.runs.some((run) => run.id === target.parentId))
      return '上一轮分析已删除，请开始新会话';
    return undefined;
  };
  const resubmit = async (target: RunSummary | Task, text: string) => {
    if (resubmitting.current || resubmitReason(target) || !text.trim()) return false;
    resubmitting.current = true;
    setSubmitting(true);
    const originKey = location.key;
    try {
      const strategy = target.strategy === 'loop' ? 'loop' : 'direct';
      await api.analyze(
        target.datasetId,
        text.trim(),
        strategy,
        target.parentId,
        target.analysisOptions,
        target.conversationId,
      );
      if (mounted.current && locationRef.current.key === originKey)
        navigate(datasetPath(target.datasetId, target.conversationId), { replace: true });

      return true;
    } catch (error) {
      message.error(errorMessage(error));
      return false;
    } finally {
      resubmitting.current = false;
      setSubmitting(false);
    }
  };

  // The layout synchronizes the route into the workspace before the first paint.
  if (!dataset || datasetId !== route.datasetId || conversationId !== (search.get('conversation') || ''))
    return null;
  return (
    <DatasetLayout dataOpen={dataOpen}>
      <section className="conversation" aria-label="分析会话">
        <ConversationTimeline sessionKey={datasetId + conversationId + runId}>
          {!session.length && !currentTask && (
            <div className="chat-empty">
              <img src={logo} alt="" />
              <h3>从一个问题开始</h3>
              <p className="text-muted">描述你的问题，或从下面的方向开始。</p>
              <div className="chat-suggestions">
                {[
                  { title: '了解这份数据', description: '概览数据，找出值得关注的指标' },
                  { title: '检查数据质量', description: '检查缺失值、重复记录和异常数据' },
                ].map(({ title, description }) => (
                  <button
                    key={title}
                    title="填入问题"
                    disabled={!dataset || busy}
                    onClick={() => ask(description)}
                  >
                    <span>
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </span>
                    <CaretRightIcon aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {session.map((run) => (
            <Result
              key={run.id}
              run={run}
              disabledReason={resubmitReason(run)}
              onResubmit={(text) => resubmit(run, text)}
            />
          ))}
          {currentTask && !session.some((r) => r.id === currentTask.runId) && (
            <>
              <UserMessage
                key={currentTask.id}
                question={currentTask.question}
                time={currentTask.startedAt || currentTask.events[0]?.at}
                disabledReason={resubmitReason(currentTask)}
                onResubmit={(text) => resubmit(currentTask, text)}
              />
              <AssistantMessage
                time={currentTask.finishedAt || currentTask.events.at(-1)?.at || currentTask.startedAt}
                markdown={() => taskReplyMarkdown(currentTask)}
              >
                <AnalysisProgress task={currentTask} />
                {currentTask.preview && (
                  <details open>
                    <summary>
                      {['running', 'cancelling'].includes(currentTask.status)
                        ? '已得到计算结果，正在完成分析'
                        : '本次分析中断前的计算结果'}
                    </summary>
                    <Grid rows={currentTask.preview.data} />
                  </details>
                )}
                {!['running', 'cancelling', 'done'].includes(currentTask.status) && (
                  <div className="toolbar">
                    <Button onClick={openModelSettings}>检查模型设置</Button>
                  </div>
                )}
              </AssistantMessage>
            </>
          )}
        </ConversationTimeline>
        <AnalysisComposer
          question={question}
          onChange={(text) => dispatchConversation({ type: 'edit', question: text })}
          dataset={dataset}
          models={state.models}
          modelId={state.activeModelId}
          onModel={(id, model) => perform(() => api.activateModel(id, model))}
          mode={mode}
          onMode={setMode}
          busy={busy || !!state.refreshingSavedId}
          busyElsewhere={!!state.refreshingSavedId || (busy && state.task?.conversationId !== conversationId)}
          busyElsewhereLabel={state.refreshingSavedId ? '收藏的分析正在刷新，完成后可发送' : undefined}
          cancelling={state.task?.status === 'cancelling'}
          submitting={submitting}
          hasContext={!!activeRunId}
          onClearContext={() => newConversation(true)}
          onSubmit={() => start()}
          onCancel={() => perform(() => api.cancel())}
          onSettings={openModelSettings}
        />
      </section>
      <Button
        className="data-panel-toggle"
        size="small"
        title={dataOpen ? '收起数据面板' : '展开数据面板'}
        aria-label={dataOpen ? '收起数据面板' : '展开数据面板'}
        aria-expanded={dataOpen}
        icon={dataOpen ? <CaretRightIcon /> : <CaretLeftIcon />}
        onClick={() => setDataOpen(!dataOpen)}
      />
      <section className="data-panel" aria-label="数据面板" inert={!dataOpen} aria-hidden={!dataOpen}>
        <DataBrowser key={dataset.id} dataset={dataset} datasets={state.datasets} onAsk={ask} />
      </section>
    </DatasetLayout>
  );
}
