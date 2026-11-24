import { Archive, ChartLineUp, Cpu, Info, ShieldCheck, SlidersHorizontal } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useState } from 'react';
import type { WorkspaceState } from '../../types';
import { AboutSettings } from './AboutSettings';
import { AnalysisSettings } from './AnalysisSettings';
import { ArchivedConversations } from './ArchivedConversations';
import { GeneralSettings } from './GeneralSettings';
import { ModelSettings } from './ModelSettings';
import { PrivacySettings } from './PrivacySettings';

type Section = 'general' | 'analysis' | 'models' | 'archived' | 'privacy' | 'about';

export function SettingsPage({ state }: { state: WorkspaceState }) {
  const [section, setSection] = useState<Section>('general');
  const sections = [
    { id: 'general' as const, label: '通用', icon: SlidersHorizontal },
    { id: 'analysis' as const, label: '分析配置', icon: ChartLineUp },
    { id: 'models' as const, label: '模型配置', icon: Cpu, count: state.models.length },
    {
      id: 'archived' as const,
      label: '已归档分析',
      icon: Archive,
      count: state.archivedConversations.length,
    },
    { id: 'privacy' as const, label: '隐私与诊断', icon: ShieldCheck },
    { id: 'about' as const, label: '关于项目', icon: Info },
  ];

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-6 max-md:flex-col max-md:gap-5">
      <aside className="w-44 shrink-0 max-md:w-full">
        <h1 className="mt-0 mb-4 px-3 text-xl font-semibold">工作台设置</h1>
        <nav className="grid gap-1 max-md:flex max-md:flex-wrap">
          {sections.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-base',
                section === id ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-page hover:text-ink',
              )}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {count !== undefined && <span className="text-xs">{count}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 pb-10">
        {section === 'general' && <GeneralSettings preferences={state.preferences} />}
        {section === 'analysis' && <AnalysisSettings preferences={state.preferences} />}
        {section === 'models' && <ModelSettings models={state.models} activeModelId={state.activeModelId} />}
        {section === 'archived' && (
          <ArchivedConversations conversations={state.archivedConversations} datasets={state.datasets} />
        )}
        {section === 'privacy' && <PrivacySettings preferences={state.preferences} />}
        {section === 'about' && <AboutSettings preferences={state.preferences} />}
      </div>
    </div>
  );
}
