import { useEffect, useRef, useState } from 'react';
import { Alert, useUI, Button, Spin } from './components/ui';
import {
  DatabaseIcon,
  CaretLeftIcon,
  GearSixIcon,
  CaretRightIcon,
  FolderSimpleIcon,
} from '@phosphor-icons/react';
import type { Conversation, Dataset, RunSummary, State, Task } from '../shared/contracts';
import type { AnalysisMode } from '../shared/analysis-options';
import { dataTab, conversationIdsWithContent, type WorkspaceTab } from './shared/workspace-tabs';
import DataManager from './components/DataManager';
import DatasetTabs from './components/DatasetTabs';
import DatasetLayout from './components/DatasetLayout';
import Settings from './components/Settings';
import AnalysisProgress from './components/AnalysisProgress';
import DataBrowser from './components/DataBrowser';
import AnalysisComposer from './components/AnalysisComposer';
import Result from './components/AnalysisResult';
import Grid from './components/DataGrid';
import SavedAnalyses from './components/SavedAnalyses';
import logo from '../assets/sive-logo.svg';
import { errorMessage } from './shared/feedback';
import ConversationTimeline from './components/ConversationTimeline';
import ConversationHistory from './components/ConversationHistory';
import NewConversation from './components/NewConversation';
import ConversationSearch from './components/ConversationSearch';
import { conversationView } from './shared/conversation-view';
import { draftKey } from './shared/conversation-state';
import { useWorkspaceNavigation } from './shared/use-workspace-navigation';
import { observeWorkspace } from './shared/workspace-subscription';
import { AssistantMessage, UserMessage } from './components/ConversationMessage';
import { taskReplyMarkdown } from '../shared/conversation-markdown';

const api = window.workbench;
type Page = 'data' | 'detail' | 'saved' | 'settings';
const labels: Record<Page, string> = {
  data: '数据源',
  detail: '数据源详情',
  saved: '分析收藏',
  settings: '设置',
};
export default function App() {
  const { message, confirm } = useUI();
  const [state, setState] = useState<State | null>(null);
  const navigation = useWorkspaceNavigation(message.error);
  const { workspaceTabs, activeTabId, conversationState, dispatchConversation, dataOpen, setDataOpen } =
    navigation;
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('data');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsTab, setSettingsTab] = useState('general');
  const [returnToChat, setReturnToChat] = useState(false);
  const { datasetId, conversationId, runId, question } = conversationState;
  const [mode, setMode] = useState<AnalysisMode>('direct');
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
    if (state && page === 'detail' && !state.datasets.some((item) => item.id === datasetId)) setPage('data');
  }, [state, page, datasetId]);
  if (!state)
    return <div className="loading">{loadError ? <Alert type="error" title={loadError} /> : <Spin />}</div>;
  const busy = state.task?.status === 'running' || state.task?.status === 'cancelling';
  const dataset = state.datasets.find((d) => d.id === datasetId);
  const pageTitle = page === 'detail' && dataset ? dataset.name : labels[page];
  const contentIds = conversationIdsWithContent(state);
  const conversations = state.conversations
    .filter((item) => item.datasetId === datasetId && contentIds.has(item.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const { currentTask, activeRunId, session } = conversationView(
    state.runs,
    state.tasks,
    state.task,
    conversationId,
    runId,
  );
  const selectConversation = (conversation: Conversation, selectedRunId = '') => {
    dispatchConversation({
      type: 'navigate',
      datasetId: conversation.datasetId,
      conversationId: conversation.id,
      runId: selectedRunId,
    });
  };
  const newConversation = (keepDraft = false) => {
    if (!dataset || submitting) return;
    navigation.newConversation(dataset.id, keepDraft ? question : undefined);
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
    navigation.activate(tab);
    setPage('detail');
  };
  const open = (d: Dataset) => {
    const next = dataTab(d.id);
    next.conversationId =
      state.conversations.find((c) => c.datasetId === d.id && contentIds.has(c.id))?.id || '';
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
    setPage('detail');
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
      });
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
      });

      return true;
    } catch (error) {
      message.error(errorMessage(error));
      return false;
    } finally {
      resubmitting.current = false;
      setSubmitting(false);
    }
  };
  const exportChat = async (id: string, format: 'html' | 'md') => {
    if (exportingChat) return;
    setExportingChat(true);
    try {
      const view = conversationView(state.runs, state.tasks, state.task, id);
      const saved = await api.exportConversation(
        view.session.map((run) => run.id),
        view.currentTask?.id || null,
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
    saved: <FolderSimpleIcon />,
    settings: <GearSixIcon />,
  };
  return (
    <div className={'shell' + (sidebarOpen ? '' : ' sidebar-collapsed')}>
      <aside className="sidebar" id="workspace-sidebar" inert={!sidebarOpen} aria-hidden={!sidebarOpen}>
        <div className="brand">
          <img src={logo} alt="Sive 标志" />
          <strong>Sive</strong>
          <ConversationSearch
            conversations={state.conversations.filter((item) => contentIds.has(item.id))}
            datasets={state.datasets}
            disabled={submitting}
            onSelect={(conversation) => {
              selectConversation(conversation);
              setPage('detail');
            }}
          />
        </div>
        <nav>
          <NewConversation
            datasets={state.datasets}
            current={page === 'detail' ? dataset : undefined}
            disabled={submitting}
            onNew={(source) => {
              navigation.newConversation(source.id);
              setPage('detail');
            }}
            onAddData={() => setPage('data')}
          />
          {(['data', 'saved'] as const).map((key) => (
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
        {page === 'detail' && dataset && (
          <ConversationHistory
            key={dataset.id}
            sourceName={dataset.name}
            conversations={conversations}
            currentId={conversationId}
            disabled={submitting}
            onSelect={selectConversation}
            onNew={() => newConversation()}
            exporting={exportingChat}
            deleteDisabled={(conversation) =>
              submitting ||
              (busy && state.task?.conversationId === conversation.id) ||
              state.runs.some(
                (run) => run.id === state.refreshingSavedId && run.conversationId === conversation.id,
              )
            }
            onExport={(conversation, format) => exportChat(conversation.id, format)}
            onDelete={(conversation) =>
              confirm({
                title: '移除这个会话？',
                content: `“${conversation.title}”将移至设置中的“已删除会话”，分析记录和收藏会保留，可随时恢复。`,
                okText: '删除会话',
                cancelText: '取消',
                onOk: () => api.deleteConversation(conversation.id),
              })
            }
          />
        )}
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          datasets={state.datasets}
          tabs={workspaceTabs.map((tab) => ({
            id: tab.id,
            name: state.datasets.find((d) => d.id === tab.datasetId)?.name || '数据源',
          }))}
          selectedId={page === 'detail' ? activeTabId : ''}
          onSelect={(id) => {
            const tab = workspaceTabs.find((entry) => entry.id === id);
            if (tab) activateTab(tab);
          }}
          onOpenData={open}
          onClose={(id) => {
            const remaining = workspaceTabs.filter((tab) => tab.id !== id);
            navigation.close(id);
            if (id === activeTabId && page === 'detail' && !remaining.length) setPage('data');
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
                dispatchConversation({
                  type: 'navigate',
                  datasetId: state.task!.datasetId,
                  conversationId: state.task!.conversationId,
                  observedTask: state.task!.id,
                });
                setPage('detail');
              }}
            >
              <Spin size="small" />
              分析进行中
            </Button>
          )}
        </header>
        {loadError && <Alert type="error" title={loadError} />}
        <div
          className="page"
          id="workspace-panel"
          role={page === 'detail' ? 'tabpanel' : undefined}
          aria-label={page === 'detail' ? dataset?.name || '数据源详情' : undefined}
        >
          {page === 'data' && (
            <DataManager
              datasets={state.datasets}
              open={open}
              busy={busy || !!state.refreshingSavedId}
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
                      setPage('detail');
                    }
                  : undefined
              }
            />
          )}
          {page === 'detail' && dataset && (
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
                  busyElsewhereLabel={
                    state.refreshingSavedId ? '收藏的分析正在刷新，完成后可发送' : undefined
                  }
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
        </div>
      </main>
    </div>
  );
}
