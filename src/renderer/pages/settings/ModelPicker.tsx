import { Check, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../components/Button';

type Props = {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export function ModelPicker({ options, value, onChange, disabled }: Props) {
  const [adding, setAdding] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const all = [...new Set([...options, ...value])];

  const add = () => {
    const id = manual.trim();
    if (!id) return;
    if (all.includes(id)) {
      setError('该模型已在列表中。');
      return;
    }
    onChange([...value, id]);
    setManual('');
    setError('');
  };

  return (
    <div className="rounded-lg bg-page p-3">
      <div className="max-h-36 overflow-auto">
        {all.map((id) => (
          <label key={id} className="flex items-center gap-2 rounded px-1 py-1.5 text-xs hover:bg-page">
            <input
              type="checkbox"
              checked={value.includes(id)}
              disabled={disabled}
              onChange={() =>
                onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
              }
            />
            <span className="break-all">{id}</span>
          </label>
        ))}
        {!all.length && <p className="m-0 px-1 py-3 text-center text-xs text-muted">请获取或手动添加模型</p>}
      </div>

      {adding ? (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-0.5">
            <input
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              value={manual}
              disabled={disabled}
              autoFocus
              onChange={(e) => {
                setManual(e.target.value);
                setError('');
              }}
              onBlur={() => {
                if (!manual.trim()) {
                  setAdding(false);
                  setError('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  add();
                }
                if (e.key === 'Escape') {
                  setManual('');
                  setError('');
                  setAdding(false);
                }
              }}
              placeholder="输入模型 ID，Enter 添加"
              aria-label="自定义模型 ID"
            />
            <Button
              variant="ghost"
              className="size-5 min-h-0 p-0 text-accent"
              disabled={disabled || !manual.trim()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={add}
              aria-label="确认添加模型"
            >
              <Check size={16} />
            </Button>
          </div>
          {error && <p className="mt-1 mb-0 px-1 text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start px-1 text-muted"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <Plus size={15} />
          添加自定义模型
        </Button>
      )}
    </div>
  );
}
