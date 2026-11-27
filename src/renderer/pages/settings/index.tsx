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
import { Button } from '../../components/ui/button';
import { SidebarButton } from '../../components/ui/sidebar';
import type { WorkspaceState } from '../../types';
import { AboutSettings } from './AboutSettings';
import { AnalysisSettings } from './AnalysisSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { ArchivedConversations } from './ArchivedConversations';
import { ModelSettings } from './ModelSettings';
import { PrivacySettings } from './PrivacySettings';
import { StorageSettings } from './StorageSettings';

const sections = {
  appearance: { label: '偏好设置', description: '调整界面语言、主题亮暗和界面字号', icon: MonitorIcon },
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
      className="relative flex h-screen flex-col overflow-hidden bg-workspace-canvas p-(--workspace-gutter) select-none [-webkit-app-region:drag]"
    >
      {!isMacOS && (
        <Button
          variant="danger"
          size="icon-sm"
          aria-label="关闭设置"
          title="关闭设置"
          className="absolute top-2 right-2 z-10 border-0 bg-transparent"
          onClick={() => window.workbench.settingsClose()}
        >
          <XIcon aria-hidden />
        </Button>
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
    <main className="grid min-h-0 flex-1 grid-cols-[clamp(160px,24%,208px)_minmax(0,1fr)] gap-(--workspace-gutter) overflow-hidden">
      <nav
        aria-label="设置分类"
        className="grid min-h-0 content-start gap-6 overflow-y-auto rounded-2xl bg-surface px-3 pt-12 pb-6 [-webkit-app-region:no-drag]"
      >
        {groups.map(({ label, items }) => (
          <div key={label}>
            <p id={`settings-group-${items[0]}`} className="m-0 mb-2 px-2.5 text-xs font-medium text-muted-foreground">
              {label}
            </p>
            <ul aria-labelledby={`settings-group-${items[0]}`} className="m-0 grid list-none gap-1 p-0">
              {items.map((id) => {
                const { label, icon: Icon } = sections[id];
                const count = counts[id] ?? 0;
                return (
                  <li key={id}>
                    <SidebarButton
                      aria-current={section === id ? 'true' : undefined}
                      aria-controls="settings-panel"
                      onClick={() => setSection(id)}
                      className="w-full"
                    >
                      <Icon size={16} aria-hidden className="shrink-0" />
                      <span className="min-w-0 flex-1">{label}</span>
                      {count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
                    </SidebarButton>
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
        className="min-h-0 min-w-0 overflow-y-auto rounded-2xl bg-surface px-[clamp(20px,5vw,40px)] pt-8 pb-8 [-webkit-app-region:no-drag]"
      >
        <div className="mb-10 motion-safe:animate-fade-up">
          <h1 id="settings-panel-title" className="m-0 text-3xl leading-tight font-semibold tracking-tight">
            {label}
          </h1>
          {description && <p className="mt-2 mb-0 leading-[1.7] text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-col gap-8 motion-safe:animate-fade-up">
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
          {section === 'about' && <AboutSettings preferences={state.preferences} />}
        </div>
      </section>
    </main>
  );
}
