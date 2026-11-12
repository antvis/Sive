import { Database, FileCsv, GearSix, Lightbulb, Plus, X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Group, Panel } from 'react-resizable-panels';
import { readWidth, saveWidth } from '../utils';
import type { DatasetSummary } from '../types';
import { ResizeHandle } from './ResizeHandle';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'settings';

type AppShellProps = PropsWithChildren<{
  page: AppPage;
  hasDatasets: boolean;
  datasetTabs: DatasetSummary[];
  activeDatasetId: string | null;
  onDatasetSelect: (id: string) => void;
  onDatasetClose: (id: string) => void;
  onNavigate: (page: AppPage) => void;
}>;

const itemClass = (active: boolean) =>
  clsx(
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm',
    active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink',
  );

export function AppShell({
  page,
  hasDatasets,
  datasetTabs,
  activeDatasetId,
  onDatasetSelect,
  onDatasetClose,
  onNavigate,
  children,
}: AppShellProps) {
  const [sidebarWidth] = useState(() => readWidth('sive.sidebar-width', 210));
  return (
    <Group orientation="horizontal" className="h-screen overflow-hidden bg-page">
      <Panel
        id="app-sidebar"
        defaultSize={sidebarWidth}
        minSize={160}
        maxSize={280}
        className="h-full min-h-0"
        onResize={(size) => saveWidth('sive.sidebar-width', size.inPixels)}
      >
        <aside className="flex h-full min-h-0 flex-col overflow-auto px-3 pt-12 pb-5">
          <div className="mb-6 px-2">
            <div className="flex items-center gap-2">
              <img className="brand-logo" src="./sive.svg" alt="" />
              <strong className="text-xl leading-6 font-semibold">Sive</strong>
            </div>
            <span className="mt-1.5 block text-[11px] leading-4 whitespace-nowrap text-muted">
              See it Live, Share it Real.
            </span>
          </div>
          <button className={itemClass(false)} disabled title="数据源接入后可用">
            <Plus size={17} />
            新建分析
          </button>
          <button
            className={itemClass(page === 'welcome' || page === 'datasets' || page === 'analysis')}
            onClick={() => onNavigate(hasDatasets ? 'datasets' : 'welcome')}
          >
            <Database size={17} />
            数据源
          </button>
          <button className={itemClass(false)} disabled title="分析功能接入后可用">
            <Lightbulb size={17} />
            洞察 Snippet
          </button>
          <div className="flex-1" />
          <button className={itemClass(page === 'settings')} onClick={() => onNavigate('settings')}>
            <GearSix size={17} />
            设置
          </button>
        </aside>
      </Panel>
      <ResizeHandle />
      <Panel id="workspace-content" minSize="50%" className="h-full min-h-0 min-w-0 flex-1">
        <main className="flex h-full min-w-0 flex-col bg-surface">
          <header className="flex h-9 shrink-0 items-center bg-page px-3 [-webkit-app-region:drag]">
            {datasetTabs.length ? (
              <div className="flex h-full items-center gap-1 overflow-x-auto [-webkit-app-region:no-drag]">
                {datasetTabs.map((dataset) => {
                  const active = activeDatasetId === dataset.id;
                  return (
                    <div
                      key={dataset.id}
                      className={clsx(
                        'group relative flex h-8 min-w-28 max-w-52 flex-1 items-center rounded-md',
                        active && 'bg-surface text-ink',
                      )}
                    >
                      <button
                        type="button"
                        className={clsx(
                          'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md px-3 pr-7 text-left text-xs [-webkit-app-region:no-drag]',
                          active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/60',
                        )}
                        onClick={() => onDatasetSelect(dataset.id)}
                      >
                        <FileCsv size={14} className="shrink-0 text-[#25804d]" aria-hidden />
                        <span className="min-w-0 truncate">{dataset.name}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`关闭 ${dataset.name}`}
                        title={`关闭 ${dataset.name}`}
                        className={clsx(
                          'absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted transition-opacity [-webkit-app-region:no-drag] hover:bg-page hover:text-ink',
                          active
                            ? 'opacity-100'
                            : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDatasetClose(dataset.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-muted">
                {page === 'settings' ? '设置' : page === 'analysis' ? '数据分析' : '数据源'}
              </span>
            )}
          </header>
          <div className={clsx('min-h-0 flex-1', page === 'analysis' ? 'overflow-hidden' : 'overflow-auto')}>
            {children}
          </div>
        </main>
      </Panel>
    </Group>
  );
}
