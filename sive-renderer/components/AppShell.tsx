import { Database, GearSix, Lightbulb, Plus } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

export type AppPage = 'welcome' | 'datasets' | 'settings';

type AppShellProps = PropsWithChildren<{
  page: AppPage;
  hasDatasets: boolean;
  onNavigate: (page: AppPage) => void;
}>;

const itemClass = (active: boolean) =>
  clsx(
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm',
    active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink',
  );

export function AppShell({ page, hasDatasets, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <aside className="flex w-52 shrink-0 flex-col border-r px-3 pt-12 pb-5">
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
          className={itemClass(page === 'welcome' || page === 'datasets')}
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
      <main className="flex min-w-0 flex-1 flex-col bg-surface">
        <header className="flex h-9 shrink-0 items-center border-b bg-page px-3 [-webkit-app-region:drag]">
          <span className="text-xs text-muted">{page === 'settings' ? '设置' : '数据源'}</span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
