import { FolderOpen, Monitor, Moon, Sun } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { isLanguagePreference } from '../../../shared/i18n';
import type { Preferences, StorageInfo } from '@shared/api';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../components/Select';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

const FONT_SIZES = [12, 14, 16, 18, 20];

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function GeneralSettings({ preferences }: { preferences: Preferences }) {
  const { t } = useTranslation();

  const theme = preferences.theme;
  const [saving, setSaving] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>();
  const [error, setError] = useState('');

  const cache = storage?.cache;
  const dataStorage = storage?.data;
  const cacheTotal = (cache?.usedBytes ?? 0) + (cache?.freeBytes ?? 0);
  const usedPercent = cacheTotal ? ((cache?.usedBytes ?? 0) / cacheTotal) * 100 : 0;

  useEffect(() => {
    void window.workbench
      .systemGetStorageInfo()
      .then(setStorage)
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

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
      <SettingGroup title="外观">
        <SettingRow title={t('language')} description={t('languageHint')}>
          <Select
            aria-label={t('language')}
            value={preferences.language}
            disabled={saving}
            options={[
              { value: 'system', label: t('systemLanguage') },
              { value: 'zh-CN', label: '简体中文' },
              { value: 'en-US', label: 'English' },
            ]}
            onChange={(language) => {
              if (isLanguagePreference(language)) void update({ ...preferences, language });
            }}
          />
        </SettingRow>
        <SettingRow title="界面主题" description="选择适合当前环境的配色，或跟随系统自动切换。">
          <div className="flex gap-3">
            {(
              [
                ['light', '浅色', Sun],
                ['dark', '深色', Moon],
                ['system', '跟随系统', Monitor],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                aria-label={label}
                title={label}
                disabled={saving}
                onClick={() => void update({ ...preferences, theme: { ...preferences.theme, mode } })}
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
        <SettingRow title="字体大小" description="调整工作台界面的基础字号。">
          <div className="w-56">
            <input
              aria-label="字体大小"
              aria-valuetext={`${theme.fontSize}px`}
              type="range"
              list="font-size-stops"
              min={0}
              max={FONT_SIZES.length - 1}
              step={1}
              value={Math.max(0, FONT_SIZES.indexOf(theme.fontSize))}
              disabled={saving}
              className="w-full accent-[var(--accent)]"
              onChange={(event) =>
                void update({
                  ...preferences,
                  theme: { ...preferences.theme, fontSize: FONT_SIZES[Number(event.target.value)] },
                })
              }
            />
            <datalist id="font-size-stops">
              {FONT_SIZES.map((size, index) => (
                <option key={size} value={index} label={`${size}px`} />
              ))}
            </datalist>
            <div className="grid grid-cols-5 text-xs text-muted">
              <span>小</span>
              <span className="text-center">默认</span>
              <span />
              <span />
              <span className="text-right">大</span>
            </div>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Agent 行为">
        <SettingRow
          title="最大执行轮次"
          description="限制外层 Agent 单次任务的执行轮次，控制工具调用和模型调用成本。"
        >
          <input
            aria-label="Agent 最大执行轮次"
            type="number"
            min={1}
            max={50}
            step={1}
            value={preferences.agent.maxSteps}
            disabled={saving}
            className="h-9 w-24 rounded-lg border bg-surface px-3 text-sm text-ink outline-none focus:border-accent disabled:opacity-45"
            onChange={(event) => {
              const maxSteps = event.target.valueAsNumber;
              if (Number.isInteger(maxSteps) && maxSteps >= 1 && maxSteps <= 50)
                void update({ ...preferences, agent: { maxSteps } });
            }}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="存储">
        <SettingRow title="数据存储" description={dataStorage?.path ?? '正在读取数据存储信息…'}>
          <div className="flex items-center justify-end gap-4">
            {dataStorage && (
              <span className="text-sm whitespace-nowrap text-muted">
                {formatSize(dataStorage.sizeBytes)}
              </span>
            )}
            <IconButton
              icon={FolderOpen}
              label="打开数据存储目录"
              disabled={!dataStorage}
              onClick={() =>
                void save(() => window.workbench.systemOpen('directory', dataStorage!.directory))
              }
            />
          </div>
        </SettingRow>
        <SettingRow title="系统缓存目录" description={cache?.path ?? '正在读取缓存信息…'}>
          <div className="flex items-center justify-end gap-4 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
            {cache && (
              <div className="w-72">
                <div
                  className="flex h-2 overflow-hidden rounded-full bg-line/40"
                  role="img"
                  aria-label={`缓存使用 ${usedPercent.toFixed(4)}%`}
                >
                  <div className="bg-accent" style={{ width: `${usedPercent}%` }} />
                </div>
                <p className="mt-2 mb-0 text-xs whitespace-nowrap text-muted">
                  已用 {formatSize(cache.usedBytes)}，可用 {formatSize(cache.freeBytes)}，使用{' '}
                  {usedPercent.toFixed(4)}%
                </p>
              </div>
            )}
            <IconButton
              icon={FolderOpen}
              label="打开缓存目录"
              disabled={!cache}
              onClick={() => void save(() => window.workbench.systemOpen('directory', cache!.path))}
            />
          </div>
        </SettingRow>
      </SettingGroup>

      {error && <p className="mt-0 text-xs text-danger">{error}</p>}
    </div>
  );
}
