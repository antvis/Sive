import { cx } from '../shared/cx';
import { Fragment, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Button, useUI } from './ui';
import { CaretRightIcon } from '@phosphor-icons/react';
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
import logo from '../../assets/sive.svg';

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
  const entries = conversationView(state.runs, state.tasks, state.task, conversationId);
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
    if (
      !dataset ||
      dataset.deletedAt ||
      busy ||
      !!state.refreshingSavedId ||
      submitting ||
      !text ||
      !state.activeModelId
    )
      return;
    setSubmitting(true);
    const originKey = location.key;
    try {
      const selectedId = conversationId || (await api.createConversation(dataset.id)).id;
      const id = await api.analyze(dataset.id, text, mode, undefined, selectedId);
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
  // The layout synchronizes the route into the workspace before the first paint.
  if (!dataset || datasetId !== route.datasetId || conversationId !== (search.get('conversation') || ''))
    return null;
  const conversationSpacing = cx(
    'transition-[padding-inline] duration-220 ease-[cubic-bezier(0.2,0,0,1)]',
    !dataOpen && 'px-[max(20px,_calc((100%_-_940px)_/_2))]',
  );
  return (
    <DatasetLayout
      dataOpen={dataOpen}
      onDataOpenChange={setDataOpen}
      data={
        <section
          className={cx(
            'h-full overflow-hidden transition-[opacity,padding-inline] duration-220 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col min-w-0 min-h-0 py-3',
            dataOpen ? 'pr-4 pl-2 max-[1151px]:pr-3' : 'px-0 opacity-0 pointer-events-none',
          )}
          aria-label="数据面板"
          inert={!dataOpen}
          aria-hidden={!dataOpen}
        >
          {dataset.deletedAt ? (
            <Alert
              type="info"
              title="连接已删除"
              description="无法读取数据预览，历史分析和收藏仍可查看和导出。"
            />
          ) : (
            <DataBrowser
              className="flex-1"
              key={dataset.id}
              dataset={dataset}
              datasets={state.datasets.filter((d) => !d.deletedAt)}
              onAsk={ask}
              active={dataOpen}
              busy={busy || submitting || !!state.refreshingSavedId}
            />
          )}
        </section>
      }
    >
      <section
        className="h-full flex flex-col min-h-0 min-w-0 bg-surface overflow-hidden"
        aria-label="分析会话"
      >
        <ConversationTimeline
          className={conversationSpacing}
          sessionKey={datasetId + conversationId + runId}
          targetMessageId={search.get('run') || undefined}
        >
          {!dataset.deletedAt && !entries.length && (
            <div className="w-full max-w-85 mt-[clamp(20px,_8vh,_80px)] mr-auto mb-6 ml-auto text-center">
              <img className="mx-auto size-7 opacity-80 dark:[filter:invert(1)]" src={logo} alt="" />
              <h3 className="font-semibold text-headline tracking-[-0.4px] mt-4.5 mr-0 mb-2 ml-0">
                从一个问题开始
              </h3>
              <p className="text-muted text-body m-0 leading-[1.8]">描述你的问题，或从下面的方向开始。</p>
              <div className="grid mt-7">
                {[
                  { title: '了解这份数据', description: '概览数据，找出值得关注的指标' },
                  { title: '检查数据质量', description: '检查缺失值、重复记录和异常数据' },
                ].map(({ title, description }) => (
                  <button
                    className="group/suggestion flex items-center relative justify-center py-4 px-0 text-ink bg-transparent border-0 border-b border-b-line/65 text-center leading-[1.6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:outline-offset-4 disabled:opacity-50"
                    key={title}
                    title="填入问题"
                    disabled={!dataset || busy}
                    onClick={() => ask(description)}
                  >
                    <span className="grid gap-1">
                      <strong className="text-body font-medium group-hover/suggestion:group-enabled/suggestion:text-accent-ink">
                        {title}
                      </strong>
                      <span className="text-muted text-helper">{description}</span>
                    </span>
                    <CaretRightIcon
                      className="absolute right-0 size-3.5 text-muted opacity-0 group-hover/suggestion:group-enabled/suggestion:opacity-100 group-focus-visible/suggestion:opacity-100"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {entries.map((entry) => {
            if (entry.kind === 'run')
              return (
                <div key={entry.run.id} data-message-id={entry.run.id}>
                  <Result run={entry.run} />
                </div>
              );
            const currentTask = entry.task;
            return (
              <Fragment key={currentTask.id}>
                <UserMessage
                  key={currentTask.id}
                  question={currentTask.question}
                  time={currentTask.startedAt || currentTask.events[0]?.at}
                />
                <AssistantMessage
                  time={currentTask.finishedAt || currentTask.events.at(-1)?.at || currentTask.startedAt}
                  markdown={() => taskReplyMarkdown(currentTask)}
                >
                  <AnalysisProgress className="mt-0" task={currentTask} />
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
                    <div className="flex items-center gap-2 flex-wrap mt-1 mr-0 mb-3 ml-0">
                      <Button onClick={openModelSettings}>检查模型设置</Button>
                    </div>
                  )}
                </AssistantMessage>
              </Fragment>
            );
          })}
        </ConversationTimeline>
        {dataset.deletedAt ? (
          <Alert type="info" title="连接已删除，无法继续分析" />
        ) : (
          <AnalysisComposer
            className={conversationSpacing}
            question={question}
            onChange={(text) => dispatchConversation({ type: 'edit', question: text })}
            dataset={dataset}
            models={state.models}
            modelId={state.activeModelId}
            onModel={(id, model) => perform(() => api.activateModel(id, model))}
            mode={mode}
            onMode={setMode}
            busy={busy || !!state.refreshingSavedId}
            busyElsewhere={
              !!state.refreshingSavedId || (busy && state.task?.conversationId !== conversationId)
            }
            busyElsewhereLabel={state.refreshingSavedId ? '收藏的分析正在刷新，完成后可发送' : undefined}
            cancelling={state.task?.status === 'cancelling'}
            submitting={submitting}
            onSubmit={() => start()}
            onCancel={() => perform(() => api.cancel())}
            onSettings={openModelSettings}
          />
        )}
      </section>
    </DatasetLayout>
  );
}
