import { ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../components/Select';
import type { ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';

type Props = {
  datasetId: string;
  onBack: () => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

const modelValue = (providerId: string, model: string) => JSON.stringify([providerId, model]);

export function ConversationPanel({ datasetId, onBack, models, activeModelId, preferences }: Props) {
  const [question, setQuestion] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeProvider = models.find((model) => model.id === activeModelId);
  const activeModel = activeProvider?.model ?? '';
  const options = models.flatMap((provider) =>
    provider.modelIds.map((model) => ({
      value: modelValue(provider.id, model),
      label: `${provider.name} · ${model}`,
    })),
  );

  useEffect(() => {
    let live = true;
    if (!activeModelId) {
      setLoading(false);
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError('');
    window.workbench
      .datasetSuggest(datasetId)
      .then((result) => {
        if (live) setSuggestions(result);
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [datasetId, activeModelId, activeModel]);

  const changeModel = (value: string) => {
    const [id, model] = JSON.parse(value) as [string, string];
    window.workbench.modelActivate(id, model).catch((cause) => toast.error(errorMessage(cause)));
  };

  const changeMode = (analysisMode: string) => {
    window.workbench
      .settingsSavePreferences({ ...preferences, analysisMode: analysisMode as Preferences['analysisMode'] })
      .catch((cause) => toast.error(errorMessage(cause)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b px-4">
        <IconButton icon={ArrowLeft} label="返回数据源" onClick={onBack} />
        <span className="ml-1 text-sm font-medium">AI 对话</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-xl pt-8">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Sparkle size={22} />
          </span>
          <h1 className="mt-4 mb-2 text-xl font-semibold">向数据提问，发现新的洞察</h1>
          <p className="m-0 text-sm leading-6 text-muted">选择一个推荐问题，或输入你关心的问题。</p>
          <div className="mt-6 grid gap-2">
            {loading && <p className="text-sm text-muted">正在生成推荐问题…</p>}
            {!activeModelId && <p className="text-sm text-muted">请先在设置中配置默认模型服务。</p>}
            {error && <p className="m-0 text-sm text-danger">{error}</p>}
            {!loading &&
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.query}
                  type="button"
                  className="rounded-xl bg-page px-4 py-3 text-left text-sm leading-6 text-muted transition-colors hover:bg-accent-soft"
                  onClick={() => setQuestion(suggestion.query)}
                >
                  {suggestion.query}
                </button>
              ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t p-4">
        <textarea
          className="min-h-24 w-full resize-none rounded-xl bg-page p-3 text-sm leading-6 outline-none focus:bg-accent-soft"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="输入你的分析问题…"
          aria-label="分析问题"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            aria-label="选择模型"
            value={activeProvider ? modelValue(activeProvider.id, activeModel) : ''}
            onChange={changeModel}
            options={options}
            disabled={!models.length}
            className="w-36 shrink-0"
            compact
          />
          <Tabs.Root className="shrink-0" value={preferences.analysisMode} onValueChange={changeMode}>
            <Tabs.List aria-label="分析方式" className="flex rounded-lg bg-page p-1">
              <Tabs.Trigger
                value="direct"
                className="rounded-md px-2 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
              >
                直接分析
              </Tabs.Trigger>
              <Tabs.Trigger
                value="loop"
                className="rounded-md px-2 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
              >
                多步探索
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          <Button className="ml-auto shrink-0" variant="primary" disabled title="分析功能待接入">
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
