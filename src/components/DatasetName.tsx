import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LocalDataset } from '../../shared/contracts';
import { requiredText } from '../../shared/input-schemas';
import { errorMessage } from '../shared/feedback';
import { Button, Input, Tooltip, useForm, useUI } from './ui';

const nameSchema = z.object({ name: requiredText('请填写连接名称') });

export default function DatasetName({
  dataset,
  disabled,
  onOpen,
}: {
  dataset: LocalDataset;
  disabled: boolean;
  onOpen: () => void;
}) {
  const { message } = useUI();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const form = useForm<{ name: string }>({ resolver: zodResolver(nameSchema) });
  useEffect(() => {
    if (editing) form.setFocus('name', { shouldSelect: true });
  }, [editing, form.setFocus]);
  const finish = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const rename = form.handleSubmit(async ({ name }) => {
    if (pending.current || disabled) return;
    if (name.trim() === dataset.name) {
      finish();
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      await window.workbench.renameData(dataset.id, name.trim());
      finish();
      message.success('连接名称已修改');
    } catch (error) {
      form.setError('name', { message: errorMessage(error) }, { shouldFocus: true });
    } finally {
      pending.current = false;
      setSaving(false);
    }
  });
  return editing ? (
    <form
      className="relative z-2 mb-1 min-w-0"
      aria-label="修改连接名称"
      onSubmit={rename}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) {
          if (event.key === 'Enter') event.preventDefault();
          return;
        }
        if (event.key === 'Escape' && !pending.current) {
          event.preventDefault();
          event.stopPropagation();
          finish();
        }
        if (event.key === 'Enter' && event.repeat) event.preventDefault();
      }}
    >
      <div className="flex min-w-0 items-center">
        <Input
          {...form.register('name')}
          aria-label="连接名称"
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={form.formState.errors.name ? errorId : undefined}
          disabled={disabled || saving}
          className="mr-1 flex-1"
        />
        <Button
          size="small"
          variant="ghost"
          icon={<CheckIcon />}
          aria-label="保存连接名称"
          disabled={disabled || saving}
          loading={saving}
          onClick={() => rename()}
        />
        <Button
          size="small"
          variant="ghost"
          icon={<XIcon />}
          aria-label="取消修改名称"
          disabled={saving}
          onClick={finish}
        />
      </div>
      {form.formState.errors.name && (
        <p id={errorId} role="alert" className="m-0 mt-1 text-danger text-helper">
          {form.formState.errors.name.message}
        </p>
      )}
    </form>
  ) : (
    <div className="group/name relative z-2 flex min-w-0 items-start gap-1">
      <h3
        className="min-w-0 flex-1 line-clamp-2 wrap-anywhere text-body text-ink tracking-[-0.02em] leading-[1.5] mt-0 mb-1 min-h-6"
        title={dataset.name}
      >
        <button
          type="button"
          className="border-0 bg-transparent p-0 text-left text-inherit [font:inherit] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          onClick={onOpen}
        >
          {dataset.name}
        </button>
      </h3>
      <Tooltip title="修改名称">
        <Button
          ref={editButton}
          size="small"
          variant="ghost"
          icon={<PencilSimpleIcon />}
          aria-label={`修改名称：${dataset.name}`}
          disabled={disabled}
          className="opacity-0 group-hover/name:opacity-100 group-focus-within/name:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={() => {
            form.reset({ name: dataset.name });
            setEditing(true);
          }}
        />
      </Tooltip>
    </div>
  );
}
