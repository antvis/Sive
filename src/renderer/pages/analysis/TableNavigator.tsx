import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  Hash,
  Key,
  MagnifyingGlass,
  Table,
  TextT,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { DatasetDetail } from '../../types';

function columnIcon(type: string, primary: boolean) {
  if (primary) return Key;
  if (/INT|DECIMAL|FLOAT|DOUBLE|NUMERIC/i.test(type)) return Hash;
  if (/DATE|TIME/i.test(type)) return CalendarBlank;
  return TextT;
}

export function TableNavigator({
  models,
  selected,
  onSelect,
  autoFocus,
}: {
  models: DatasetDetail['schema']['models'];
  selected: string;
  onSelect: (name: string) => void;
  autoFocus: boolean;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(selected);
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLocaleLowerCase();
  const tables = models.filter((model) => model.name.toLocaleLowerCase().includes(query));

  useEffect(() => {
    if (autoFocus) searchInput.current?.focus();
  }, [autoFocus]);

  return (
    <>
      <div className="shrink-0 p-3">
        <div className="relative">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={searchInput}
            type="search"
            aria-label="搜索数据表"
            placeholder="搜索数据表…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full min-w-0 rounded-lg bg-workspace-control py-1.5 pr-2 pl-8 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-sm">数据表</span>
          <span>{query ? `${tables.length} / ${models.length}` : models.length} 张</span>
        </div>
      </div>
      <nav aria-label="数据表目录" className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        <ul className="m-0 list-none space-y-0.5 p-0">
          {tables.map((model) => {
            const open = expanded === model.name;
            const primary =
              typeof model.primaryKey === 'string' ? [model.primaryKey] : (model.primaryKey ?? []);
            const Caret = open ? CaretDown : CaretRight;
            return (
              <li key={model.name}>
                <div
                  className={clsx(
                    'flex items-center rounded-lg',
                    selected === model.name ? 'bg-accent-soft text-accent' : 'hover:bg-workspace-control',
                  )}
                >
                  <button
                    type="button"
                    aria-label={`${open ? '收起' : '展开'} ${model.name} 的字段`}
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : model.name)}
                    className="grid h-9 w-6 shrink-0 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Caret size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`选择数据表 ${model.name}`}
                    aria-current={selected === model.name ? 'true' : undefined}
                    title={model.name}
                    onClick={() => {
                      setExpanded(model.name);
                      onSelect(model.name);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 pr-2 text-left text-base outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[current=true]:font-medium"
                  >
                    <Table size={15} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{model.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground" title={`${model.columns.length} 个字段`}>
                      {model.columns.length}
                    </span>
                  </button>
                </div>
                {open && (
                  <ul className="my-1 ml-3 list-none border-l border-ink/10 py-1 pr-2 pl-4">
                    {model.columns.map((column) => {
                      const isPrimary = primary.includes(column.name);
                      const Icon = columnIcon(column.type, isPrimary);
                      return (
                        <li
                          key={column.name}
                          title={`${column.name} · ${column.type}${isPrimary ? ' · 主键' : ''}${column.notNull ? ' · 非空' : ''}`}
                          className="flex min-w-0 items-center gap-2 py-1.5 text-sm"
                        >
                          <Icon
                            size={13}
                            className={clsx('shrink-0', isPrimary ? 'text-accent' : 'text-muted-foreground')}
                            aria-label={isPrimary ? '主键' : undefined}
                          />
                          <span className="min-w-0 flex-1 truncate">{column.name}</span>
                          <span className="max-w-20 truncate text-xs text-muted-foreground">{column.type}</span>
                        </li>
                      );
                    })}
                    {!model.columns.length && <li className="py-1.5 text-sm text-muted-foreground">暂无字段</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {!tables.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">无匹配数据表</p>}
      </nav>
    </>
  );
}
