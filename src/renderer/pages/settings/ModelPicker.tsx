import { CheckIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../../components/ui/input-group';

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
          <label key={id} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-page">
            <Checkbox
              checked={value.includes(id)}
              disabled={disabled}
              onChange={() =>
                onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
              }
            />
            <span className="break-all">{id}</span>
          </label>
        ))}
        {!all.length && (
          <p className="m-0 px-1 py-3 text-center text-sm text-muted-foreground">请获取或手动添加模型</p>
        )}
      </div>

      {adding ? (
        <div className="mt-2">
          <InputGroup>
            <InputGroupInput
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
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                disabled={disabled || !manual.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={add}
                aria-label="确认添加模型"
              >
                <CheckIcon aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {error && <p className="mt-1 mb-0 px-1 text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start px-1 text-muted-foreground"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <PlusIcon size={15} />
          添加自定义模型
        </Button>
      )}
    </div>
  );
}
