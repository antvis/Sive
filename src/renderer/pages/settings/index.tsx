import type { MessageKey } from '@shared/i18n';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
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
  appearance: {
    labelKey: 'settings.pages.appearance.title',
    descriptionKey: 'settings.pages.appearance.description',
    icon: MonitorIcon,
  },
  models: {
    labelKey: 'settings.pages.models.title',
    descriptionKey: 'settings.pages.models.description',
    icon: CpuIcon,
  },
  analysis: {
    labelKey: 'settings.pages.analysis.title',
    descriptionKey: 'settings.pages.analysis.description',
    icon: ChartLineIcon,
  },
  storage: {
    labelKey: 'settings.pages.storage.title',
    descriptionKey: 'settings.pages.storage.description',
    icon: HardDriveIcon,
  },
  archived: {
    labelKey: 'settings.pages.archived.title',
    descriptionKey: 'settings.pages.archived.description',
    icon: ArchiveIcon,
  },
  privacy: {
    labelKey: 'settings.pages.privacy.title',
    descriptionKey: undefined,
    icon: ShieldCheckIcon,
  },
  about: {
    labelKey: 'settings.pages.about.title',
    descriptionKey: 'settings.pages.about.description',
    icon: InfoIcon,
  },
} as const satisfies Record<
  string,
  {
    labelKey: MessageKey;
    descriptionKey: MessageKey | undefined;
    icon: LucideIcon;
  }
>;

type Section = keyof typeof sections;

const groups: { labelKey: MessageKey; items: Section[] }[] = [
  {
    labelKey: 'settings.groups.general',
    items: ['appearance', 'models', 'analysis'],
  },
  {
    labelKey: 'settings.groups.data',
    items: ['storage', 'archived'],
  },
  {
    labelKey: 'settings.groups.application',
    items: ['privacy', 'about'],
  },
];

export function SettingsWindow({ state, fallback }: { state: WorkspaceState | null; fallback: ReactNode }) {
  const i18n = useI18n();
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
          aria-label={i18n('settings.actions.close')}
          title={i18n('settings.actions.close')}
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
  const i18n = useI18n();
  const [section, setSection] = useState<Section>('appearance');
  const { labelKey, descriptionKey } = sections[section];
  const counts: Partial<Record<Section, number>> = {
    models: state.models.length,
    archived: state.archivedConversations.length,
  };

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[clamp(160px,24%,208px)_minmax(0,1fr)] gap-(--workspace-gutter) overflow-hidden">
      <nav
        aria-label={i18n('settings.navigationLabel')}
        className="grid min-h-0 content-start gap-6 overflow-y-auto rounded-2xl bg-surface px-3 pt-12 pb-6 [-webkit-app-region:no-drag]"
      >
        {groups.map(({ labelKey, items }) => (
          <div key={labelKey}>
            <p
              id={`settings-group-${items[0]}`}
              className="m-0 mb-2 px-2.5 text-xs font-medium text-muted-foreground"
            >
              {i18n(labelKey)}
            </p>
            <ul aria-labelledby={`settings-group-${items[0]}`} className="m-0 grid list-none gap-1 p-0">
              {items.map((id) => {
                const { labelKey, icon: Icon } = sections[id];
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
                      <span className="min-w-0 flex-1">{i18n(labelKey)}</span>
                      {count > 0 && (
                        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                      )}
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
            {i18n(labelKey)}
          </h1>
          {descriptionKey && (
            <p className="mt-2 mb-0 leading-[1.7] text-muted-foreground">{i18n(descriptionKey)}</p>
          )}
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
