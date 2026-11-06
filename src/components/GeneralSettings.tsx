import { cx } from '../shared/cx';
import { useId, type ReactNode } from 'react';
import { SunIcon, MoonIcon, ArrowCounterClockwiseIcon, KeyboardIcon } from '@phosphor-icons/react';
import { Button, Select, useUI } from './ui';
import { useTheme } from '../theme';
import { usePreferences } from '../preferences';
import { defaultPreferences } from '../shared/preferences';
import { analysisModes } from '../../shared/analysis-options';
import { errorMessage } from '../shared/feedback';

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 p-5 [&+&]:border-t [&+&]:border-t-[color-mix(in_srgb,_var(--border)_65%,_transparent)] max-[1101px]:gap-4 max-[1101px]:py-4.5 max-[1101px]:px-4 max-[541px]:items-start max-[541px]:flex-col">
      <div className="flex-1 min-w-0">
        <h3 className="mt-0 mr-0 mb-[5px] ml-0 text-body font-medium">{title}</h3>
        <p className="m-0 max-w-107.5 text-helper text-muted leading-[1.65]">{description}</p>
      </div>
      <div className="shrink-0 max-[541px]:w-full">{children}</div>
    </div>
  );
}

export default function GeneralSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const { settings, changing, setMode } = useTheme();
  const { message, confirm } = useUI();
  const themeName = useId();
  const modifier = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
  return (
    <section>
      <section
        className="border border-line rounded-card mb-3 overflow-hidden"
        aria-labelledby="appearance-heading"
      >
        <h3
          id="appearance-heading"
          className="m-0 py-3 px-5 text-helper font-semibold bg-[color-mix(in_srgb,_var(--background)_55%,_var(--surface))] border-b border-b-line"
        >
          外观
        </h3>
        <SettingRow title="界面主题" description="选择适合当前环境的配色，图表与导出同步使用。">
          <div className="flex gap-2.5" role="radiogroup" aria-label="界面主题">
            {(
              [
                { mode: 'light', label: '浅色', icon: SunIcon },
                { mode: 'dark', label: '深色', icon: MoonIcon },
              ] as const
            ).map(({ mode, label, icon: Icon }) => (
              <label
                key={mode}
                className={cx(
                  'relative grid gap-[7px] w-20 p-1.5 border border-line rounded-button cursor-pointer [&:has(input:focus-visible)]:outline-2 [&:has(input:focus-visible)]:outline-solid [&:has(input:focus-visible)]:outline-accent [&:has(input:focus-visible)]:outline-offset-4 [&:has(input:disabled)]:opacity-60 [&:has(input:disabled)]:cursor-wait',
                  settings.mode === mode && 'border-accent shadow-[0_0_0_1px_var(--accent)]',
                )}
              >
                <input
                  className="absolute size-px opacity-0"
                  type="radio"
                  name={themeName}
                  checked={settings.mode === mode}
                  disabled={changing}
                  onChange={() => setMode(mode).catch((error) => message.error(errorMessage(error)))}
                />
                <span
                  className={cx(
                    'grid grid-cols-[15px_1fr] grid-rows-[1fr_1fr] gap-[5px] p-1.5 h-10.5 rounded-compact border',
                    mode === 'dark' ? 'bg-[#20262d] border-[#38434e]' : 'bg-[#f1f3f5] border-[#dce1e5]',
                  )}
                  aria-hidden="true"
                >
                  <i
                    className={cx(
                      'row-span-full rounded-mini',
                      mode === 'dark' ? 'bg-[#36544e]' : 'bg-[#d3dfdc]',
                    )}
                  />
                  <b
                    className={cx(
                      'self-center h-1 rounded-mini',
                      mode === 'dark' ? 'bg-[#56616d]' : 'bg-[#cbd2d8]',
                    )}
                  />
                  <b
                    className={cx(
                      'self-center h-1 rounded-mini',
                      mode === 'dark' ? 'bg-[#56616d]' : 'bg-[#cbd2d8]',
                    )}
                  />
                </span>
                <span className="flex justify-center items-center gap-1 text-caption">
                  <Icon />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </SettingRow>
      </section>
      <section
        className="border border-line rounded-card mb-3 overflow-hidden"
        aria-labelledby="analysis-heading"
      >
        <h3
          id="analysis-heading"
          className="m-0 py-3 px-5 text-helper font-semibold bg-[color-mix(in_srgb,_var(--background)_55%,_var(--surface))] border-b border-b-line"
        >
          分析与输入
        </h3>
        <SettingRow
          title="分析方式"
          description="记住最近选择，分析输入框中的切换也会同步保存。多步探索通常耗时更长、调用更多。"
        >
          <Select
            className="min-w-42 max-[1101px]:min-w-35.5 max-[541px]:w-full"
            aria-label="分析方式"
            value={preferences.analysisMode}
            onChange={(analysisMode) => updatePreferences({ analysisMode })}
            options={analysisModes.map(({ value, label }) => ({ value, label }))}
          />
        </SettingRow>
        <SettingRow
          title="发送快捷键"
          description={
            preferences.sendShortcut === 'enter'
              ? 'Enter 发送，Shift + Enter 换行。'
              : `${modifier} + Enter 发送，Enter 换行。`
          }
        >
          <Select
            className="min-w-42 max-[1101px]:min-w-35.5 max-[541px]:w-full"
            aria-label="发送快捷键"
            value={preferences.sendShortcut}
            onChange={(sendShortcut) => updatePreferences({ sendShortcut })}
            options={[
              { value: 'enter', label: 'Enter' },
              { value: 'mod-enter', label: `${modifier} + Enter` },
            ]}
          />
        </SettingRow>
      </section>
      <section
        className="border border-line rounded-card mb-3 overflow-hidden"
        aria-labelledby="preview-heading"
      >
        <h3
          id="preview-heading"
          className="m-0 py-3 px-5 text-helper font-semibold bg-[color-mix(in_srgb,_var(--background)_55%,_var(--surface))] border-b border-b-line"
        >
          数据预览
        </h3>
        <SettingRow
          title="默认每页行数"
          description="下次打开数据预览时生效，仍可在表格底部临时调整。行数越多，单次读取的数据越多。"
        >
          <Select
            className="min-w-42 max-[1101px]:min-w-35.5 max-[541px]:w-full"
            aria-label="默认每页行数"
            value={preferences.previewPageSize}
            onChange={(previewPageSize) => updatePreferences({ previewPageSize })}
            options={([50, 100, 200] as const).map((value) => ({ value, label: `${value} 行` }))}
          />
        </SettingRow>
      </section>
      <section
        className="p-5 border border-line rounded-card bg-[color-mix(in_srgb,_var(--background)_45%,_var(--surface))] text-helper"
        aria-labelledby="shortcuts-heading"
      >
        <h3
          className="flex items-center gap-2 mt-0 mr-0 mb-4 ml-0 text-body font-medium"
          id="shortcuts-heading"
        >
          <KeyboardIcon className="text-muted" size={18} aria-hidden="true" />
          常用快捷键
        </h3>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-7 m-0 max-[1101px]:grid-cols-1">
          {[
            { label: '搜索所有会话', keys: [modifier, 'K'] },
            {
              label: '发送分析问题',
              keys: preferences.sendShortcut === 'enter' ? ['Enter'] : [modifier, 'Enter'],
            },
            {
              label: '输入框换行',
              keys: preferences.sendShortcut === 'enter' ? ['Shift', 'Enter'] : ['Enter'],
            },
            { label: '关闭弹窗', keys: ['Esc'] },
          ].map(({ label, keys }) => (
            <div className="flex justify-between items-center gap-3 min-h-9" key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="flex items-center gap-[5px] shrink-0 m-0" aria-label={keys.join(' + ')}>
                {keys.map((key) => (
                  <kbd
                    className="font-[family-name:inherit] inline-flex items-center justify-center min-w-7 h-7 px-[7px] border border-line rounded-key bg-surface shadow-[0_2px_0_var(--border)] text-caption font-medium whitespace-nowrap"
                    key={key}
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <footer className="flex justify-between items-center gap-3 flex-wrap text-muted text-caption mt-3">
        <span>使用偏好保存在当前设备。</span>
        <Button
          size="small"
          variant="ghost"
          icon={<ArrowCounterClockwiseIcon />}
          onClick={() =>
            confirm({
              title: '恢复默认使用偏好？',
              content: '恢复分析方式、发送快捷键和预览行数。不会修改主题、模型服务或数据。',
              okText: '恢复默认',
              onOk: () => {
                if (updatePreferences(defaultPreferences)) message.success('使用偏好已恢复默认');
              },
            })
          }
        >
          恢复默认偏好
        </Button>
      </footer>
    </section>
  );
}
