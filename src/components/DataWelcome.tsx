import { ArrowRightIcon, CircleNotchIcon, DatabaseIcon, FolderOpenIcon } from '@phosphor-icons/react';
import { Button } from './ui';

export default function DataWelcome({
  importing,
  disabled,
  modelName,
  onImport,
  onConnect,
  onSettings,
}: {
  importing: boolean;
  disabled: boolean;
  modelName?: string;
  onImport: () => void;
  onConnect: () => void;
  onSettings: () => void;
}) {
  return (
    <section className="data-welcome" aria-labelledby="data-welcome-title">
      <header>
        <h2 id="data-welcome-title">添加数据</h2>
        <p>从本地文件或数据库开始。</p>
      </header>
      <div className="data-welcome-actions">
        <button
          type="button"
          className="data-welcome-action"
          disabled={disabled || importing}
          aria-busy={importing || undefined}
          onClick={onImport}
        >
          {importing ? (
            <CircleNotchIcon
              className="data-welcome-action-icon animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <FolderOpenIcon className="data-welcome-action-icon" aria-hidden="true" />
          )}
          <span>
            <strong>{importing ? '正在导入…' : '导入本地文件'}</strong>
            <small>CSV、Excel、JSON、Parquet</small>
          </span>
          <ArrowRightIcon className="data-welcome-arrow" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="data-welcome-action"
          disabled={disabled || importing}
          onClick={onConnect}
        >
          <DatabaseIcon className="data-welcome-action-icon" aria-hidden="true" />
          <span>
            <strong>连接数据库</strong>
            <small>MySQL · 只读访问</small>
          </span>
          <ArrowRightIcon className="data-welcome-arrow" aria-hidden="true" />
        </button>
      </div>
      <div className="data-welcome-model">
        <span>{modelName ? `分析模型：${modelName}` : '使用自然语言分析前，需要配置模型。'}</span>
        <Button variant="link" size="small" onClick={onSettings}>
          {modelName ? '更改' : '去设置'}
        </Button>
      </div>
      <p className="data-welcome-note">导入会创建本地副本，不修改原文件。</p>
    </section>
  );
}
