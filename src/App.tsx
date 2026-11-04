import { useEffect, useRef, useState } from 'react';
import { Alert, useUI, Button, Dropdown, Spin } from './components/ui';
import {
  DatabaseIcon,
  TableIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  ChatCircleDotsIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  XIcon,
  PlusIcon,
  DownloadSimpleIcon,
  FolderSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import type { Conversation, Dataset, RunSummary, State, Task } from '../shared/contracts';
import type { AnalysisMode } from '../shared/analysis-options';
import { questionText, referencedDatasets, withDataReference } from './shared/data-references';
import { dataTab, hasConversationContent, type WorkspaceTab } from './shared/workspace-tabs';
import DataManager from './components/DataManager';
import DatasetTabs from './components/DatasetTabs';
import DatasetPicker from './components/DatasetPicker';
import Settings from './components/Settings';
import AnalysisProgress from './components/AnalysisProgress';
import DataBrowser from './components/DataBrowser';
import AnalysisComposer from './components/AnalysisComposer';
import Result from './components/AnalysisResult';
import Grid from './components/DataGrid';
import SavedAnalyses from './components/SavedAnalyses';
import AnalysisHistory from './components/AnalysisHistory';
import logo from '../assets/sive-logo.svg';
import { errorMessage } from './shared/feedback';
import ConversationTimeline from './components/ConversationTimeline';
import ConversationHistory from './components/ConversationHistory';
import { conversationView } from './shared/conversation-view';
import { draftKey } from './shared/conversation-state';
import { useWorkspaceNavigation } from './shared/use-workspace-navigation';
import { observeWorkspace } from './shared/workspace-subscription';
import { AssistantMessage, UserMessage } from './components/ConversationMessage';
import { taskReplyMarkdown } from '../shared/conversation-markdown';

const api = window.workbench;
type Page = 'data' | 'explorer' | 'saved' | 'history' | 'settings';
const labels: Record<Page, string> = {
  data: '数据源',
  explorer: '数据探索',
  saved: '分析收藏',
  history: '会话记录',
  settings: '设置',
};
export default function App() {
  const { message, confirm } = useUI();
  const [state, setState] = useState<State | null>(null);
  const navigation = useWorkspaceNavigation(message.error);
  const {
    workspaceTabs,
    activeTabId,
    conversationState,
    dispatchConversation,
    chat,
    full,
    setChat,
    setFull,
  } = navigation;
  const activeTabRef = useRef(activeTabId);
  activeTabRef.current = activeTabId;
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('data');
  const [settingsTab, setSettingsTab] = useState('general');
  const [returnToChat, setReturnToChat] = useState(false);
  const { datasetId, conversationId, runId, historyTask, question } = conversationState;
  const [mode, setMode] = useState<AnalysisMode>('direct');
  const [creatingChat, setCreatingChat] = useState(false);
  const creatingChatRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportingChat, setExportingChat] = useState(false);
  const resubmitting = useRef(false);
  useEffect(() => {
    return observeWorkspace(
      api,
      (s) => {
        setState(s);
        navigation.receive(s);
        setLoadError('');
      },
      (error) => setLoadError(String(error)),
    );
  }, []);
  useEffect(() => {
    if (!full) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [full]);
  if (!state)
    return <div className="loading">{loadError ? <Alert type="error" title={loadError} /> : <Spin />}</div>;
  const busy = state.task?.status === 'running' || state.task?.status === 'cancelling';
  const dataset = state.datasets.find((d) => d.id === datasetId);
  const pageTitle = page === 'explorer' && dataset ? dataset.name : labels[page];
  const selectedHistory = historyTask
    ? state.task?.id === historyTask.id
      ? state.task
      : state.tasks.find((task) => task.id === historyTask.id) || historyTask
    : null;
  const conversations = state.conversations
    .filter((item) => item.datasetId === datasetId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const { currentTask, activeRunId, session } = conversationView(
    state.runs,
    state.tasks,
    state.task,
    conversationId,
    runId,
    selectedHistory,
  );
  const selectConversation = (conversation: Conversation, selectedRunId = '', keepQuestion?: string) => {
    const source = state.datasets.find((item) => item.id === conversation.datasetId);
    dispatchConversation({
      type: 'navigate',
      datasetId: conversation.datasetId,
      conversationId: conversation.id,
      runId: selectedRunId,
      initialQuestion: source ? withDataReference('', source, state.datasets) : '',
      question: keepQuestion,
    });
    setChat(true);
  };
  const newConversation = async (keepDraft = false) => {
    if (!dataset || submitting || creatingChatRef.current) return;
    const hasContent = hasConversationContent(
      state,
      conversationId,
      questionText(question, state.datasets),
      selectedHistory,
    );
    if (!hasContent && conversationId) {
      setChat(true);
      return;
    }
    const originTabId = activeTabId;
    creatingChatRef.current = true;
    setCreatingChat(true);
    try {
      const conversation = await api.createConversation(dataset.id);
      const next: WorkspaceTab = {
        ...dataTab(dataset.id),
        conversationId: conversation.id,
        chat: true,
      };
      navigation.activate(
        next,
        keepDraft ? question : withDataReference('', dataset, state.datasets),
        activeTabRef.current === originTabId,
      );
      if (!hasContent) navigation.close(originTabId);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      creatingChatRef.current = false;
      setCreatingChat(false);
    }
  };
  const openModelSettings = () => {
    setSettingsTab('models');
    setReturnToChat(true);
    setPage('settings');
  };
  const perform = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const activateTab = (tab: WorkspaceTab) => {
    const source = state.datasets.find((d) => d.id === tab.datasetId);
    if (!source) return;
    navigation.activate(tab, withDataReference('', source, state.datasets));
    setPage('explorer');
  };
  const open = (d: Dataset) => {
    const existing =
      workspaceTabs.find((tab) => tab.datasetId === d.id && !tab.conversationId) ||
      workspaceTabs.find((tab) => tab.datasetId === d.id);
    const next = existing || dataTab(d.id);
    activateTab(next);
    perform(() => api.touchData(d.id));
  };
  const openSavedAnalysis = (run: RunSummary) => {
    const conversation = state.conversations.find((item) => item.id === run.conversationId);
    if (!conversation) {
      message.warning('所属会话不存在，请从数据页面新建会话。');
      return;
    }
    selectConversation(conversation, run.id);
    setPage('explorer');
  };
  const ask = (q: string) => {
    dispatchConversation({
      type: 'edit',
      question: dataset ? withDataReference(q, dataset, state.datasets) : q,
      clearHistory: true,
    });
    setChat(true);
  };
  const start = async () => {
    const text = questionText(question, state.datasets);
    if (
      !dataset ||
      busy ||
      !!state.refreshingSavedId ||
      submitting ||
      creatingChat ||
      !text ||
      !state.activeModelId ||
      referencedDatasets(question, state.datasets).length > 1
    )
      return;
    setSubmitting(true);
    try {
      const selectedId = conversationId || (await api.createConversation(dataset.id)).id;
      const id = await api.analyze(dataset.id, text, mode, activeRunId || undefined, undefined, selectedId);
      dispatchConversation({
        type: 'submitted',
        originKey: draftKey(conversationState),
        datasetId: dataset.id,
        conversationId: selectedId,
        taskId: id,
        sentQuestion: question,
        emptyQuestion: withDataReference('', dataset, state.datasets),
      });
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  const resubmitReason = (target: RunSummary | Task) => {
    if (state.refreshingSavedId) return '请等待收藏的分析刷新完成';
    if (busy || submitting || creatingChat) return '请等待当前操作结束，或先停止分析';
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
    try {
      const strategy = target.strategy === 'loop' ? 'loop' : 'direct';
      const id = await api.analyze(
        target.datasetId,
        text.trim(),
        strategy,
        target.parentId,
        target.analysisOptions,
        target.conversationId,
      );
      dispatchConversation({
        type: 'navigate',
        datasetId: target.datasetId,
        conversationId: target.conversationId,
        observedTask: id,
        initialQuestion: '',
      });
      setChat(true);
      return true;
    } catch (error) {
      message.error(errorMessage(error));
      return false;
    } finally {
      resubmitting.current = false;
      setSubmitting(false);
    }
  };
  const reference = (source: Dataset, text = question) =>
    dispatchConversation({
      type: 'edit',
      datasetId: source.id,
      question: withDataReference(text, source, state.datasets),
      clearHistory: true,
    });
  const exportChat = async (format: 'html' | 'md') => {
    if (exportingChat) return;
    setExportingChat(true);
    try {
      const saved = await api.exportConversation(
        session.map((run) => run.id),
        currentTask?.id || null,
        format,
      );
      if (saved) message.success('会话已导出');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setExportingChat(false);
    }
  };
  const icons = {
    data: <DatabaseIcon />,
    explorer: <TableIcon />,
    saved: <FolderSimpleIcon />,
    history: <ClockCounterClockwiseIcon />,
    settings: <GearSixIcon />,
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="Sive 标志" />
          <strong>Sive</strong>
        </div>
        <nav>
          {(['data', 'explorer', 'saved', 'history'] as Page[]).map((key) => (
            <button
              key={key}
              aria-label={labels[key]}
              className={page === key ? 'active' : ''}
              aria-current={page === key ? 'page' : undefined}
              onClick={() => setPage(key)}
            >
              {icons[key]}
              {labels[key]}
            </button>
          ))}
        </nav>
        <button
          className={'settings-link ' + (page === 'settings' ? 'active' : '')}
          aria-label="设置"
          onClick={() => {
            setReturnToChat(false);
            setPage('settings');
          }}
        >
          <GearSixIcon />
          设置
        </button>
      </aside>
      <main className="workspace">
        <DatasetTabs
          datasets={state.datasets}
          tabs={workspaceTabs.map((tab) => ({
            id: tab.id,
            datasetId: tab.datasetId,
            name: tab.conversationId
              ? `${state.conversations.find((entry) => entry.id === tab.conversationId)?.title || '新建会话'} · 会话`
              : state.datasets.find((d) => d.id === tab.datasetId)?.name || '数据探索',
          }))}
          selectedId={page === 'explorer' ? activeTabId : ''}
          onSelect={(id) => {
            const tab = workspaceTabs.find((entry) => entry.id === id);
            if (tab) activateTab(tab);
          }}
          onOpenData={open}
          onClose={(id) => {
            const remaining = workspaceTabs.filter((tab) => tab.id !== id);
            navigation.close(id);
            if (id === activeTabId && page === 'explorer' && !remaining.length) setPage('data');
          }}
        />
        <header className="topbar">
          <strong title={pageTitle}>{pageTitle}</strong>
          <span className="min-w-[4px] flex-1" />
          {busy && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                const source = state.datasets.find((d) => d.id === state.task!.datasetId);
                dispatchConversation({
                  type: 'navigate',
                  datasetId: state.task!.datasetId,
                  conversationId: state.task!.conversationId,
                  observedTask: state.task!.id,
                  initialQuestion: source ? withDataReference('', source, state.datasets) : '',
                });
                setPage('explorer');
                setChat(true);
              }}
            >
              <Spin size="small" />
              分析进行中
            </Button>
          )}
          {page === 'explorer' && !chat && (
            <Button
              aria-label="新建会话"
              icon={<PlusIcon />}
              disabled={!dataset || submitting || creatingChat}
              loading={creatingChat}
              onClick={() => newConversation()}
            >
              新建会话
            </Button>
          )}
          {page === 'explorer' && (
            <Button
              aria-label={chat ? '收起会话' : '打开分析会话'}
              icon={<ChatCircleDotsIcon />}
              onClick={() => setChat(!chat)}
            >
              {chat ? '收起会话' : '打开分析会话'}
            </Button>
          )}
        </header>
        {loadError && <Alert type="error" title={loadError} />}
        <div
          className="page"
          id="workspace-panel"
          role={page === 'explorer' ? 'tabpanel' : undefined}
          aria-label={page === 'explorer' ? dataset?.name || '数据探索' : undefined}
        >
          {page === 'data' && (
            <DataManager
              datasets={state.datasets}
              open={(d) => {
                open(d);
                setChat(false);
                setFull(false);
              }}
              busy={busy}
              modelName={state.models.find((model) => model.id === state.activeModelId)?.model}
              onModelSettings={() => {
                setSettingsTab('models');
                setReturnToChat(false);
                setPage('settings');
              }}
            />
          )}
          {page === 'settings' && (
            <Settings
              state={state}
              tab={settingsTab}
              onTab={setSettingsTab}
              onBack={
                returnToChat
                  ? () => {
                      setPage('explorer');
                      setChat(true);
                    }
                  : undefined
              }
            />
          )}
          {page === 'explorer' && (
            <div className={'explorer ' + (chat ? 'with-chat' : '') + (full && chat ? ' full-chat' : '')}>
              <section className="browser-pane">
                {dataset ? (
                  <DataBrowser key={dataset.id} dataset={dataset} datasets={state.datasets} onAsk={ask} />
                ) : (
                  <DatasetPicker datasets={state.datasets} onSelect={open} onAdd={() => setPage('data')} />
                )}
              </section>
              {chat && (
                <section className="conversation" aria-label="分析会话">
                  <div className="conversation-toolbar">
                    <div className="conversation-heading">
                      <strong>
                        <ChatCircleDotsIcon /> 分析会话
                      </strong>
                    </div>
                    <span className="min-w-[4px] flex-1" />
                    <Button
                      size="small"
                      title="新建会话"
                      aria-label="新建会话"
                      disabled={!dataset || submitting || creatingChat}
                      loading={creatingChat}
                      icon={<PlusIcon />}
                      onClick={() => newConversation()}
                    />
                    <ConversationHistory
                      conversations={conversations}
                      currentId={conversationId}
                      disabled={submitting || creatingChat}
                      onSelect={selectConversation}
                    />
                    <Button
                      size="small"
                      aria-label="删除当前会话"
                      title="删除当前会话"
                      icon={<TrashIcon />}
                      disabled={
                        !conversationId || busy || submitting || creatingChat || !!state.refreshingSavedId
                      }
                      onClick={() =>
                        confirm({
                          title: '删除此会话及其分析？',
                          content:
                            '将删除全部对话结果、执行记录和属于此会话的收藏。数据源保留；如需保留结果，请先导出。',
                          okText: '删除会话',
                          cancelText: '取消',
                          onOk: () => api.deleteConversation(conversationId),
                        })
                      }
                    />
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'html', label: '导出会话 HTML' },
                          { key: 'md', label: '导出 Markdown（含图表配置）' },
                        ],
                        onClick: (e) => exportChat(e.key as 'html' | 'md'),
                      }}
                    >
                      <Button
                        size="small"
                        title="导出会话"
                        aria-label="导出会话"
                        loading={exportingChat}
                        disabled={exportingChat || (!session.length && !currentTask)}
                        icon={<DownloadSimpleIcon />}
                      />
                    </Dropdown>
                    <Button
                      size="small"
                      aria-label={full ? '退出全屏' : '全屏会话'}
                      icon={full ? <ArrowsInIcon /> : <ArrowsOutIcon />}
                      onClick={() => setFull(!full)}
                    />
                    <Button
                      size="small"
                      aria-label="收起会话"
                      icon={<XIcon />}
                      onClick={() => {
                        setChat(false);
                        setFull(false);
                      }}
                    />
                  </div>
                  <ConversationTimeline sessionKey={conversationId + (selectedHistory?.id || runId)}>
                    {!session.length && !currentTask && (
                      <div className="chat-empty">
                        <img src={logo} alt="" />
                        <h3>从一个问题开始</h3>
                        <p className="text-muted">
                          用自然语言探索数据。
                          <br />
                          查询、计算与结果会逐步呈现在这里。
                        </p>
                        <div className="chat-suggestions">
                          {['概览数据，找出值得关注的指标', '检查缺失值、重复记录和异常数据'].map((text) => (
                            <button key={text} disabled={!dataset || busy} onClick={() => ask(text)}>
                              {text}
                              <PlusIcon />
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
                          time={
                            currentTask.finishedAt || currentTask.events.at(-1)?.at || currentTask.startedAt
                          }
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
                    onChange={(text) => {
                      const sources = referencedDatasets(text, state.datasets);
                      dispatchConversation({
                        type: 'edit',
                        question: text,
                        datasetId: sources.length === 1 ? sources[0].id : undefined,
                      });
                    }}
                    datasets={state.datasets}
                    dataset={dataset}
                    onReference={reference}
                    models={state.models}
                    modelId={state.activeModelId}
                    onModel={(id, model) => perform(() => api.activateModel(id, model))}
                    mode={mode}
                    onMode={setMode}
                    busy={busy || !!state.refreshingSavedId}
                    busyElsewhere={
                      !!state.refreshingSavedId || (busy && state.task?.conversationId !== conversationId)
                    }
                    busyElsewhereLabel={
                      state.refreshingSavedId ? '收藏的分析正在刷新，完成后可发送' : undefined
                    }
                    cancelling={state.task?.status === 'cancelling'}
                    submitting={submitting || creatingChat}
                    hasContext={!!activeRunId}
                    onClearContext={() => newConversation(true)}
                    onSubmit={() => start()}
                    onCancel={() => perform(() => api.cancel())}
                    onSettings={openModelSettings}
                  />
                </section>
              )}
            </div>
          )}
          {page === 'saved' && (
            <SavedAnalyses
              runs={state.runs}
              onOpen={openSavedAnalysis}
              refreshingId={state.refreshingSavedId}
              busy={busy}
              onRemove={(id) => api.removeSavedAnalysis(id)}
            />
          )}
          {page === 'history' && (
            <AnalysisHistory
              tasks={state.tasks}
              busy={busy}
              onClear={async () => {
                await api.clearHistory();
                dispatchConversation({ type: 'clear-history' });
              }}
              onOpen={(t) => {
                const source = state.datasets.find((d) => d.id === t.datasetId);
                dispatchConversation({
                  type: 'navigate',
                  datasetId: t.datasetId,
                  conversationId: t.conversationId,
                  runId: t.runId,
                  historyTask: t,
                  initialQuestion: source ? withDataReference('', source, state.datasets) : '',
                });
                setPage('explorer');
                setChat(true);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
