import { useState } from 'react';
import { Button, Input, SearchInput } from './ui';

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
    if (!name || name.length > 255 || value.length >= 50 || disabled) return;
    onChange?.([...new Set([...value, name])]);
    setManual('');
  };
  return (
    <div id={id} role="group" {...props}>
      <div className="flex items-center gap-[12px]">
        <SearchInput
          className="flex-1"
          aria-label="搜索可用模型"
          placeholder="搜索模型"
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="text-muted" role="status">
          已选 {value.length} / 50
        </span>
      </div>
      {!!ids.length && (
        <div className="model-picker-list my-[12px] max-h-[200px] overflow-y-auto">
          {ids.map((name) => (
            <label
              className="flex cursor-pointer items-center gap-[10px] px-[12px] py-[8px] [overflow-wrap:anywhere]"
              key={name}
            >
              <input
                type="checkbox"
                checked={value.includes(name)}
                disabled={disabled || (!value.includes(name) && value.length >= 50)}
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
      <div className="flex items-center gap-[12px]">
        <Input
          className="flex-1"
          aria-label="手动添加模型 ID"
          placeholder="输入模型 ID"
          value={manual}
          maxLength={255}
          disabled={disabled}
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button disabled={disabled || !manual.trim() || value.length >= 50} onClick={add}>
          添加
        </Button>
      </div>
    </div>
  );
}
