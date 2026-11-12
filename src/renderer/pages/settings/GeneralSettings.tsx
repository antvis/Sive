import { Moon, Sun } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Select } from '../../components/Select';
import type { Preferences, ThemeSettings } from '../../types';
import { errorMessage } from '../../utils';

const defaults: Preferences = { analysisMode: 'direct', sendShortcut: 'enter' };

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border">
      <h2 className="m-0 border-b bg-page px-5 py-4 text-base font-medium">{title}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 p-5 max-sm:flex-col max-sm:items-start">
      <div>
        <h3 className="m-0 text-sm font-medium">{title}</h3>
        <p className="mt-1 mb-0 max-w-lg text-xs leading-5 text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function GeneralSettings({ theme, preferences }: { theme: ThemeSettings; preferences: Preferences }) {
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const save = async (action: () => Promise<void>) => {
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const update = (value: Preferences) => save(() => window.workbench.settingsSavePreferences(value));

  return (
    <div>
      <div className="mb-5 flex items-center justify-end">
        <Button variant="primary" disabled={saving} onClick={() => setResetting(true)}>
          恢复默认偏好
        </Button>
      </div>
      <SettingGroup title="外观">
        <SettingRow title="界面主题" description="选择适合当前环境的配色，图表与导出同步使用。">
          <div className="flex gap-3">
            {(
              [
                ['light', '浅色', Sun],
                ['dark', '深色', Moon],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                aria-label={label}
                title={label}
                disabled={saving}
                onClick={() => void save(() => window.workbench.settingsSaveTheme({ mode }))}
                className={clsx(
                  'grid size-12 place-items-center rounded-xl border',
                  theme.mode === mode ? 'border-accent bg-accent-soft text-accent' : 'bg-surface text-muted',
                )}
              >
                <Icon size={22} className={mode === 'dark' ? 'text-ink' : undefined} />
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="分析与输入">
        <SettingRow
          title="分析方式"
          description="直接分析适合明确问题；多步探索会逐步查询，通常更慢、调用更多。"
        >
          <Tabs.Root
            value={preferences.analysisMode}
            onValueChange={(analysisMode) =>
              void update({ ...preferences, analysisMode: analysisMode as Preferences['analysisMode'] })
            }
          >
            <Tabs.List aria-label="分析方式" className="flex w-42 rounded-lg bg-page p-1">
              <Tabs.Trigger
                value="direct"
                disabled={saving}
                className="flex-1 rounded-md px-3 py-1.5 text-sm text-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                直接分析
              </Tabs.Trigger>
              <Tabs.Trigger
                value="loop"
                disabled={saving}
                className="flex-1 rounded-md px-3 py-1.5 text-sm text-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                多步探索
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </SettingRow>
        <SettingRow
          title="发送快捷键"
          description={
            preferences.sendShortcut === 'enter'
              ? 'Enter 发送，Shift + Enter 换行。'
              : '⌘ / Ctrl + Enter 发送，Enter 换行。'
          }
        >
          <Select
            aria-label="发送快捷键"
            disabled={saving}
            value={preferences.sendShortcut}
            onChange={(sendShortcut) =>
              void update({ ...preferences, sendShortcut: sendShortcut as Preferences['sendShortcut'] })
            }
            options={[
              { value: 'enter', label: 'Enter' },
              { value: 'mod-enter', label: '⌘ / Ctrl + Enter' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      {error && <p className="mt-0 text-xs text-danger">{error}</p>}
      <Modal
        open={resetting}
        onOpenChange={setResetting}
        title="恢复默认偏好"
        footer={
          <>
            <Button onClick={() => setResetting(false)}>取消</Button>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() =>
                void save(async () => {
                  await window.workbench.settingsSavePreferences(defaults);
                  setResetting(false);
                  toast.success('使用偏好已恢复默认');
                })
              }
            >
              恢复默认
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted">仅恢复分析方式和发送快捷键，不修改主题、模型服务或数据。</p>
      </Modal>
    </div>
  );
}
