import { ArrowSquareOut } from '@phosphor-icons/react';
import type { Preferences } from '@shared/api';
import { useState } from 'react';
import { errorMessage } from '../../utils';
import { SettingGroup, SettingRow } from './SettingControls';

export function PrivacySettings({ preferences }: { preferences: Preferences }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateNativeCrashReporting = async (nativeCrashReporting: boolean) => {
    setSaving(true);
    setError('');
    try {
      await window.workbench.settingsSavePreferences({
        ...preferences,
        diagnostics: { nativeCrashReporting },
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingGroup title="异常报告" description="异常报告用于排查发布版本中的问题。">
        <SettingRow
          title="JavaScript 异常报告"
          description="报告包含错误类型、脱敏堆栈、应用版本和系统版本。原始错误消息会在上报前移除。"
        >
          <span className="text-sm whitespace-nowrap text-muted-foreground">始终开启</span>
        </SettingRow>
        <SettingRow
          title="原生崩溃报告"
          description="默认关闭，修改后下次启动生效。开启后会上传 minidump，不会额外上传数据文件，但其中可能包含崩溃时的少量进程内存片段。"
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              aria-label="启用原生崩溃报告"
              checked={preferences.diagnostics.nativeCrashReporting}
              disabled={saving}
              className="size-4 accent-[var(--accent)]"
              onChange={(event) => void updateNativeCrashReporting(event.target.checked)}
            />
            启用
          </label>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="隐私边界" description="所有常规异常事件都会经过统一白名单过滤。">
        <div className="text-sm leading-6 text-muted-foreground">
          <ul className="m-0 list-disc space-y-1 pl-5">
            <li>不上传数据文件、数据库内容、查询结果或 SQL。</li>
            <li>不上传 AI 对话、模型回答、账号密码、Token 或 Cookie。</li>
            <li>不采集屏幕截图、本地变量、网络请求 breadcrumb 或用户身份信息。</li>
          </ul>
          <p className="mt-4 mb-0">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-accent hover:underline"
              onClick={() => void window.workbench.systemOpen('url', 'https://github.com/antvis/Sive')}
            >
              查看 Sive 源码
              <ArrowSquareOut size={14} aria-hidden />
            </button>
          </p>
        </div>
      </SettingGroup>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
