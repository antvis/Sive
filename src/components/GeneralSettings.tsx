import { useId, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  SunIcon,
  MoonIcon,
  ArrowCounterClockwiseIcon,
  KeyboardIcon,
} from '@phosphor-icons/react';
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
    <div className="setting-row">
      <div className="setting-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="setting-control">{children}</div>
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
      <header className="settings-heading">
        <div>
          <h2>通用设置</h2>
          <p>调整外观、分析习惯与数据预览。</p>
        </div>
        <span className="settings-autosave">
          <CheckCircleIcon />
          自动保存
        </span>
      </header>
      <section className="settings-group" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" className="settings-group-title">
          外观
        </h3>
        <SettingRow title="界面主题" description="选择适合当前环境的配色，图表与导出同步使用。">
          <div className="theme-choices" role="radiogroup" aria-label="界面主题">
            {(
              [
                { mode: 'light', label: '浅色', icon: SunIcon },
                { mode: 'dark', label: '深色', icon: MoonIcon },
              ] as const
            ).map(({ mode, label, icon: Icon }) => (
              <label key={mode} className={'theme-choice' + (settings.mode === mode ? ' selected' : '')}>
                <input
                  type="radio"
                  name={themeName}
                  checked={settings.mode === mode}
                  disabled={changing}
                  onChange={() => setMode(mode).catch((error) => message.error(errorMessage(error)))}
                />
                <span className={'theme-preview ' + mode} aria-hidden="true">
                  <i />
                  <b />
                  <b />
                </span>
                <span>
                  <Icon />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </SettingRow>
      </section>
      <section className="settings-group" aria-labelledby="analysis-heading">
        <h3 id="analysis-heading" className="settings-group-title">
          分析与输入
        </h3>
        <SettingRow
          title="分析方式"
          description="记住最近选择，分析输入框中的切换也会同步保存。多步探索通常耗时更长、调用更多。"
        >
          <Select
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
      <section className="settings-group" aria-labelledby="preview-heading">
        <h3 id="preview-heading" className="settings-group-title">
          数据预览
        </h3>
        <SettingRow
          title="默认每页行数"
          description="下次打开数据预览时生效，仍可在表格底部临时调整。行数越多，单次读取的数据越多。"
        >
          <Select
            aria-label="默认每页行数"
            value={preferences.previewPageSize}
            onChange={(previewPageSize) => updatePreferences({ previewPageSize })}
            options={([50, 100, 200] as const).map((value) => ({ value, label: `${value} 行` }))}
          />
        </SettingRow>
      </section>
      <section className="settings-shortcuts" aria-labelledby="shortcuts-heading">
        <h3 id="shortcuts-heading">
          <KeyboardIcon size={18} aria-hidden="true" />
          常用快捷键
        </h3>
        <dl>
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
            <div key={label}>
              <dt>{label}</dt>
              <dd aria-label={keys.join(' + ')}>
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <footer className="settings-footer">
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
