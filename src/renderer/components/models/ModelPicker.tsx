import { useState } from 'react';
import { Button, Input, SearchInput } from '@renderer/components/ui/index';

export default function ModelPicker({
  value = [],
  onChange,
  options,
  disabled,
  id,
  ...props
}: {
  value?: string[];
  onChange?: (ids: string[]) => void;
  options: string[];
  disabled?: boolean;
  id?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState('');
  const ids = [...new Set([...options, ...value])].filter((name) =>
    name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const add = () => {
    const name = manual.trim();
    if (!name || disabled) return;
    onChange?.([...new Set([...value, name])]);
    setManual('');
  };
  return (
    <div id={id} role="group" {...props}>
      <div className="flex items-center gap-3">
        <SearchInput
          className="flex-1"
          aria-label="搜索可用模型"
          placeholder="搜索模型"
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="text-muted" role="status">
          已选 {value.length} 个
        </span>
      </div>
      {!!ids.length && (
        <div className="border border-line rounded-control my-3 max-h-[200px] overflow-y-auto">
          {ids.map((name) => (
            <label
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 [overflow-wrap:anywhere] hover:bg-accent-soft [&:has(input:checked)]:bg-accent-soft"
              key={name}
            >
              <input
                className="accent-accent"
                type="checkbox"
                checked={value.includes(name)}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.(
                    event.target.checked ? [...value, name] : value.filter((entry) => entry !== name),
                  )
                }
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      )}
      {!ids.length && (
        <p className="text-muted">{search ? '没有匹配的模型' : '获取模型列表，或手动添加模型 ID。'}</p>
      )}
      <div className="flex items-center gap-3">
        <Input
          className="flex-1"
          aria-label="手动添加模型 ID"
          placeholder="输入模型 ID"
          value={manual}

          disabled={disabled}
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button disabled={disabled || !manual.trim()} onClick={add}>
          添加
        </Button>
      </div>
    </div>
  );
}
