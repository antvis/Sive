import { SlidersHorizontalIcon, CpuIcon, ArchiveIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { State } from '../../shared/contracts';
import { Button } from './ui';
import GeneralSettings from './GeneralSettings';
import ModelSettings from './ModelSettings';
import DeletedConversations from './DeletedConversations';

export default function Settings({
  state,
  tab,
  onTab,
  onBack,
}: {
  state: State;
  tab: string;
  onTab: (tab: string) => void;
  onBack?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.closest('.page')?.scrollTo({ top: 0 });
  }, [tab]);
  const sections = [
    { key: 'general', label: '通用设置', icon: SlidersHorizontalIcon },
    { key: 'models', label: '模型服务', icon: CpuIcon, count: state.models.length },
    { key: 'deleted', label: '已删除会话', icon: ArchiveIcon, count: state.deletedConversations.length },
  ];
  return (
    <div className="settings" ref={root}>
      {onBack && (
        <div className="settings-return">
          <Button variant="ghost" icon={<ArrowLeftIcon />} onClick={onBack}>
            返回分析会话
          </Button>
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置分类">
          <span className="settings-nav-label">工作台设置</span>
          {sections.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => onTab(key)}
            >
              <Icon />
              <span>{label}</span>
              {count !== undefined && <small>{count}</small>}
            </button>
          ))}
          <p>按你的习惯，调整工作台。</p>
        </nav>
        <div className="settings-content">
          {tab === 'general' && <GeneralSettings />}
          {tab === 'models' && <ModelSettings state={state} />}
          {tab === 'deleted' && <DeletedConversations state={state} />}
        </div>
      </div>
    </div>
  );
}
