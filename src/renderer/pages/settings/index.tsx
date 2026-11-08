import { SlidersHorizontalIcon, CpuIcon, ArchiveIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { State } from '@shared/contracts';
import { Button } from '@renderer/components/ui/index';
import GeneralSettings from '@renderer/pages/settings/GeneralSettings';
import ModelSettings from '@renderer/pages/settings/ModelSettings';
import DeletedConversations from '@renderer/pages/settings/DeletedConversations';

export default function SettingsPage({
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
    { key: 'deleted', label: '已归档分析', icon: ArchiveIcon, count: state.deletedConversations.length },
  ];
  return (
    <div className="settings w-full max-w-280 mx-auto pt-4 pb-10" ref={root}>
      {onBack && (
        <div className="mb-4">
          <Button variant="ghost" icon={<ArrowLeftIcon />} onClick={onBack}>
            返回分析会话
          </Button>
        </div>
      )}
      <div className="grid grid-cols-[176px_minmax(0,_1fr)] gap-10 items-start max-[1101px]:grid-cols-[148px_minmax(0,_1fr)] max-[1101px]:gap-6 max-[801px]:grid-cols-1 max-[801px]:gap-6">
        <nav
          className="sticky top-0 grid gap-1 max-[801px]:static max-[801px]:flex max-[801px]:flex-wrap max-[801px]:gap-1"
          aria-label="设置分类"
        >
          <span className="pt-1 pr-3 pb-3 pl-3 text-helper text-muted tracking-[0.08em] max-[801px]:hidden">
            工作台设置
          </span>
          {sections.map(({ key, label, icon: Icon, count }) => (
            <button
              className="flex gap-2.5 items-center w-full py-3 px-3 border-0 rounded-control bg-transparent text-muted text-left [font:inherit] cursor-pointer hover:bg-page hover:text-ink [&[aria-current]]:bg-accent-soft [&[aria-current]]:text-accent-ink [&[aria-current]]:font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:outline-offset-2 max-[801px]:w-auto"
              key={key}
              type="button"
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => onTab(key)}
            >
              <Icon />
              <span className="flex-1">{label}</span>
              {count !== undefined && <small className="min-w-4.5 text-center text-helper">{count}</small>}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === 'general' && <GeneralSettings />}
          {tab === 'models' && <ModelSettings state={state} />}
          {tab === 'deleted' && <DeletedConversations state={state} />}
        </div>
      </div>
    </div>
  );
}
