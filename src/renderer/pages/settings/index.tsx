import clsx from 'clsx';
import {
  ArchiveIcon,
  ChartLineIcon,
  CpuIcon,
  HardDriveIcon,
  InfoIcon,
  MonitorIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import type { WorkspaceState } from '../../types';
import { AboutSettings } from './AboutSettings';
import { AnalysisSettings } from './AnalysisSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { ArchivedConversations } from './ArchivedConversations';
import { ModelSettings } from './ModelSettings';
import { PrivacySettings } from './PrivacySettings';
import { StorageSettings } from './StorageSettings';

const sections = {
  appearance: { label: '偏好设置', description: '调整界面语言、主题亮暗和对话字号', icon: MonitorIcon },
  models: { label: '模型服务', description: '管理模型服务、可用模型和默认模型', icon: CpuIcon },
  analysis: {
    label: '分析配置',
    description: '设置默认分析方式、Agent 行为和 DuckDB 引擎',
    icon: ChartLineIcon,
  },
  storage: { label: '存储空间', description: '查看工作台数据库和应用缓存的占用', icon: HardDriveIcon },
  archived: { label: '归档会话', description: '查找和管理已归档的分析会话', icon: ArchiveIcon },
  privacy: { label: '隐私与诊断', description: undefined, icon: ShieldCheckIcon },
  about: { label: '关于 Sive', description: '查看版本、更新和开源项目信息', icon: InfoIcon },
};

type Section = keyof typeof sections;

const groups: { label: string; items: Section[] }[] = [
  { label: '常规', items: ['appearance', 'models', 'analysis'] },
  { label: '数据管理', items: ['storage', 'archived'] },
  { label: '应用', items: ['privacy', 'about'] },
];

export function SettingsWindow({ state, fallback }: { state: WorkspaceState | null; fallback: ReactNode }) {
  const { isMacOS } = window.workbench;

  return (
    <div
      data-settings-window
      className="relative flex h-screen flex-col overflow-hidden bg-white select-none [-webkit-app-region:drag] dark:bg-preview-surface"
    >
      {!isMacOS && (
        <IconButton
          icon={XIcon}
          iconSize={18}
          label="关闭设置"
          variant="danger"
          className={clsx(panelControlClassName, 'absolute top-2 right-2 z-10')}
          onClick={() => window.workbench.settingsClose()}
        />
      )}
      {state ? <SettingsContent state={state} /> : <main className="min-h-0 flex-1">{fallback}</main>}
    </div>
  );
}

function SettingsContent({ state }: { state: WorkspaceState }) {
  const [section, setSection] = useState<Section>('appearance');
  const { label, description } = sections[section];
  const counts: Partial<Record<Section, number>> = {
    models: state.models.length,
    archived: state.archivedConversations.length,
  };

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[clamp(176px,26%,224px)_minmax(0,1fr)] overflow-hidden">
      <nav
        aria-label="设置分类"
        className="grid min-h-0 content-start gap-7 overflow-y-auto bg-preview-row px-3 pt-12 pb-6"
      >
        {groups.map(({ label, items }) => (
          <div key={label}>
            <p id={`settings-group-${items[0]}`} className="m-0 mb-2 px-2 text-sm text-sidebar-muted">
              {label}
            </p>
            <ul aria-labelledby={`settings-group-${items[0]}`} className="m-0 grid list-none gap-1 p-0">
              {items.map((id) => {
                const { label, icon: Icon } = sections[id];
                const count = counts[id] ?? 0;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-current={section === id ? 'true' : undefined}
                      aria-controls="settings-panel"
                      onClick={() => setSection(id)}
                      className={clsx(
                        'flex min-h-10 w-full items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-left text-base transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-focus',
                        section === id
                          ? 'bg-ink/5 font-medium text-sidebar-ink'
                          : 'text-sidebar-text hover:bg-ink/3',
                      )}
                    >
                      <Icon size={16} aria-hidden className="shrink-0" />
                      <span className="min-w-0 flex-1">{label}</span>
                      {count > 0 && <span className="text-xs tabular-nums text-sidebar-muted">{count}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <section
        key={section}
        id="settings-panel"
        aria-labelledby="settings-panel-title"
        className="min-h-0 min-w-0 overflow-y-auto px-[clamp(20px,5vw,40px)] pt-7 pb-8"
      >
        <div className="mb-8">
          <h1 id="settings-panel-title" className="m-0 text-xl font-medium text-ink/85">
            {label}
          </h1>
          {description && <p className="mt-1 mb-0 text-sm font-light text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-col gap-8">
          {section === 'appearance' && <AppearanceSettings preferences={state.preferences} />}
          {section === 'models' && (
            <ModelSettings models={state.models} activeModelId={state.activeModelId} />
          )}
          {section === 'analysis' && <AnalysisSettings preferences={state.preferences} />}
          {section === 'storage' && <StorageSettings />}
          {section === 'archived' && (
            <ArchivedConversations conversations={state.archivedConversations} datasets={state.datasets} />
          )}
          {section === 'privacy' && <PrivacySettings preferences={state.preferences} />}
          {section === 'about' && <AboutSettings />}
        </div>
      </section>
    </main>
  );
}
