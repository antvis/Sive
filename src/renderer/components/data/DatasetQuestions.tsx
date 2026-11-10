import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatCircleTextIcon } from '@phosphor-icons/react';
import type { Dataset, ModelProfile } from '@shared/contracts';
import { suggestionsQuery } from '../../data/queries';
import { errorMessage } from '../../utils/feedback';
import { Alert, Button, Spin, Tooltip } from '../ui';

const basicQuestions = [
  { label: '数据概览', query: '统计各表记录数，简要说明数据覆盖范围，不要推测未计算的信息。' },
  { label: '数据质量', query: '统计各字段的 NULL 数量和占比，指出需要关注的字段，不把数值 0 当作缺失。' },
];

export default function DatasetQuestions({
  dataset,
  model,
  active,
  onAsk,
  onModelSettings,
}: {
  dataset: Dataset;
  model?: ModelProfile;
  active: boolean;
  onAsk: (question: string) => void;
  onModelSettings: () => void;
}) {
  const client = useQueryClient();
  const options = suggestionsQuery(dataset, model, active);
  const suggestions = useQuery(options);
  useEffect(() => {
    if (!active) void client.cancelQueries({ queryKey: ['suggestions', dataset.id] });
  }, [active, dataset.id, client]);
  let refreshLabel = '生成推荐';
  if (suggestions.data) refreshLabel = '换一组';
  if (suggestions.isError) refreshLabel = '重试';
  return (
    <div
      role="group"
      aria-label="推荐问题"
      className="shrink-0 min-w-0 mt-2 pt-2 border-t border-t-line space-y-2"
    >
      {model && suggestions.isFetching ? (
        <div className="flex h-8 min-w-0 items-center gap-2">
          <div role="status" className="flex min-w-0 flex-1 items-center gap-2 text-helper text-muted">
            <Spin size="small" />
            <span className="truncate">正在生成推荐问题…</span>
          </div>
          <Button
            size="small"
            variant="ghost"
            className="shrink-0"
            onClick={() => client.cancelQueries({ queryKey: options.queryKey, exact: true })}
          >
            取消
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {model ? (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              {suggestions.data?.map(({ query }) => (
                <Tooltip key={query} className="min-w-0" title={<span className="break-words">{query}</span>}>
                  <Button
                    size="small"
                    className="h-8 min-w-0 w-full text-left justify-start"
                    icon={<ChatCircleTextIcon className="shrink-0 text-muted" aria-hidden />}
                    onClick={() => onAsk(query)}
                  >
                    <span className="min-w-0 truncate">{query}</span>
                  </Button>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {basicQuestions.map(({ label, query }) => (
                <Button
                  key={label}
                  size="small"
                  icon={<ChatCircleTextIcon className="shrink-0 text-muted" aria-hidden />}
                  onClick={() =>
                    onAsk(
                      `分析数据源 ${JSON.stringify(dataset.name)}，遵循已保存的业务口径和指标定义。${query}`,
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          {model ? (
            <Button size="small" variant="ghost" className="shrink-0" onClick={() => suggestions.refetch()}>
              {refreshLabel}
            </Button>
          ) : (
            <Button size="small" variant="ghost" className="shrink-0" onClick={onModelSettings}>
              配置模型以获取推荐
            </Button>
          )}
        </div>
      )}
      {model && !suggestions.isFetching && suggestions.isError && (
        <Alert type="error" title={errorMessage(suggestions.error)} />
      )}
    </div>
  );
}
