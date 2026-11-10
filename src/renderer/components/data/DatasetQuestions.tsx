import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dataset, ModelProfile } from '@shared/contracts';
import { suggestionsQuery } from '../../data/queries';
import { errorMessage } from '../../utils/feedback';
import { Alert, Button, Spin } from '../ui';

const basicQuestions = [
  { label: '数据概览', query: '统计各表记录数，简要说明数据覆盖范围，不要推测未计算的信息。' },
  { label: '数据质量', query: '统计各字段的 NULL 数量和占比，指出需要关注的字段，不把数值 0 当作缺失。' },
];

export default function DatasetQuestions({
  dataset,
  model,
  active,
  busy,
  onAsk,
  onModelSettings,
}: {
  dataset: Dataset;
  model?: ModelProfile;
  active: boolean;
  busy: boolean;
  onAsk: (question: string) => void;
  onModelSettings: () => void;
}) {
  const client = useQueryClient();
  const options = suggestionsQuery(dataset, model, active && !busy);
  const suggestions = useQuery(options);
  useEffect(() => {
    if (!active || busy) void client.cancelQueries({ queryKey: ['suggestions', dataset.id] });
  }, [active, busy, dataset.id, client]);
  let refreshLabel = '生成推荐';
  if (suggestions.data) refreshLabel = '换一组';
  if (suggestions.isError) refreshLabel = '重试';
  return (
    <div className="shrink-0 min-w-0 mt-2 pt-2 border-t border-t-line space-y-2">
      <div className="flex items-center gap-2 text-helper text-muted">
        <span className="flex-1">数据源推荐问题</span>
        {model ? (
          <>
            <Button
              size="small"
              variant="ghost"
              disabled={busy || suggestions.isFetching}
              onClick={() => suggestions.refetch()}
            >
              {refreshLabel}
            </Button>
            {suggestions.isFetching && (
              <Button
                size="small"
                variant="ghost"
                onClick={() => client.cancelQueries({ queryKey: options.queryKey, exact: true })}
              >
                取消
              </Button>
            )}
          </>
        ) : (
          <Button size="small" variant="ghost" onClick={onModelSettings}>
            配置模型以获取推荐
          </Button>
        )}
      </div>
      {model && suggestions.isFetching && (
        <div role="status" className="flex items-center gap-2 text-helper text-muted">
          <Spin size="small" /> 正在生成推荐问题…
        </div>
      )}
      {model && suggestions.isError && <Alert type="error" title={errorMessage(suggestions.error)} />}
      {model ? (
        <div className="flex flex-col items-start gap-2">
          {suggestions.data?.map(({ query, reason }) => (
            <Button
              key={query}
              size="small"
              className="h-auto max-w-full whitespace-normal break-words text-left justify-start py-2 leading-relaxed"
              title={reason}
              disabled={busy}
              onClick={() => onAsk(query)}
            >
              {query}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {basicQuestions.map(({ label, query }) => (
            <Button
              key={label}
              size="small"
              disabled={busy}
              onClick={() =>
                onAsk(`分析数据源 ${JSON.stringify(dataset.name)}，遵循已保存的业务口径和指标定义。${query}`)
              }
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
