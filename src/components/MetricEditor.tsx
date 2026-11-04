import { useState } from 'react';
import { Button, Form, Field, useForm, Input, TextArea, Modal, ConfirmAction, Select } from './ui';
import type { BusinessMetric, Dataset } from '../../shared/contracts';

export default function MetricEditor({
  dataset,
  datasets,
  metrics,
  onChange,
  disabled,
}: {
  dataset: Dataset;
  datasets: Dataset[];
  metrics: BusinessMetric[];
  onChange: (metrics: BusinessMetric[]) => void;
  disabled: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const form = useForm<BusinessMetric>({ mode: 'onChange' });
  const sources = datasets.filter((item) => item.id !== dataset.id && item.metrics?.length);
  function edit(position: number) {
    form.reset(
      metrics[position] ?? {
        name: '',
        table: dataset.schema.models[0]?.name || '',
        expression: '',
        unit: '',
        description: '',
      },
    );
    setIndex(position);
  }
  return (
    <details className="metric-editor">
      <summary>
        指标定义 <span className="text-muted">{metrics.length} 个 · 可复用</span>
      </summary>
      <p className="text-muted">
        把常用指标保存为名称、计算公式和单位，后续推荐与分析会统一参考。公式会校验，但模型执行仍需核对。
      </p>
      <div className="metric-toolbar">
        <Button size="small" disabled={disabled} onClick={() => edit(metrics.length)}>
          添加指标
        </Button>
        {sources.length > 0 && (
          <Select
            aria-label="复制已有指标"
            placeholder="从其他数据复制指标"
            value={undefined}
            disabled={disabled}
            options={sources.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(id) => {
              const source = sources.find((item) => item.id === id)!;
              onChange([
                ...metrics,
                ...source.metrics!.map((metric) => ({
                  ...metric,
                  table: dataset.schema.models.some((model) => model.name === metric.table)
                    ? metric.table
                    : '',
                })),
              ]);
            }}
          />
        )}
      </div>
      {!metrics.length && <p className="text-muted">还没有定义指标，可添加或从其他数据复制。</p>}
      {metrics.map((metric, position) => (
        <div className="metric-row" key={position}>
          <div>
            <strong>{metric.name || '未命名指标'}</strong>
            <small>
              {metric.table || '待选择数据表'}
              {metric.unit ? ` · ${metric.unit}` : ''}
            </small>
            <code>{metric.expression}</code>
          </div>
          <Button variant="ghost" size="small" disabled={disabled} onClick={() => edit(position)}>
            编辑
          </Button>
          <ConfirmAction
            title="删除此指标定义？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => onChange(metrics.filter((_, i) => i !== position))}
          >
            <Button variant="ghost" size="small" danger disabled={disabled}>
              删除
            </Button>
          </ConfirmAction>
        </div>
      ))}
      <Modal
        title={index !== null && index < metrics.length ? '编辑指标' : '添加指标'}
        open={index !== null}
        okText="应用到草稿"
        cancelText="取消"
        onCancel={() => setIndex(null)}
        onOk={async () => {
          if (!(await form.trigger(undefined, { shouldFocus: true }))) return;
          const value = form.getValues();
          const next = [...metrics];
          next[index!] = value;
          onChange(next);
          setIndex(null);
        }}
      >
        <Form form={form}>
          <Field name="name" label="指标名称" required="请填写指标名称">
            <Input placeholder="例如：净收入" />
          </Field>
          <Field name="table" label="数据表" required="请选择数据表">
            <Select
              options={dataset.schema.models.map((model) => ({ value: model.name, label: model.name }))}
            />
          </Field>
          <Field
            name="expression"
            label="聚合公式"
            extra="例如 SUM(amount - refund) 或 COUNT(DISTINCT customer_id)。按实际字段填写，过滤规则可补充在上方的数据语义说明中。"
            required="请填写聚合公式"
          >
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Field>
          <Field name="unit" label="单位">
            <Input placeholder="例如：元、单、%" />
          </Field>
          <Field name="description" label="指标说明">
            <TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="例如：仅统计有效订单，金额扣除退款"
            />
          </Field>
        </Form>
      </Modal>
    </details>
  );
}
