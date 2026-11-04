import { forwardRef, useId, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { TextArea, type TextAreaProps } from './controls';

export type MentionsRef = { focus: () => void; textWithoutQuery: () => string };
type Option = { key: string; value: string; label: ReactNode };
function mentionQuery(text: string, end: number) {
  const match = /(?:^|\s)@([^@\s]*)$/.exec(text.slice(0, end));
  return match ? { start: end - match[1].length - 1, end, text: match[1] } : null;
}
export const Mentions = forwardRef<
  MentionsRef,
  Omit<TextAreaProps, 'onChange' | 'value' | 'onSelect'> & {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    onSelect: (option: Option, value: string) => void;
  }
>(function Mentions({ value, onChange, options, onSelect, ...props }, ref) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<{ start: number; end: number; text: string } | null>(null);
  const [active, setActive] = useState(0);
  const id = useId();
  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
    textWithoutQuery: () => {
      const node = input.current;
      if (!node) return value;
      const current = mentionQuery(node.value, node.selectionStart);
      return current ? node.value.slice(0, current.start) + node.value.slice(current.end) : node.value;
    },
  }));
  const matches = query
    ? options.filter((o) => o.value.toLocaleLowerCase().includes(query.text.toLocaleLowerCase()))
    : [];
  const updateQuery = (text: string, end: number) => {
    setQuery(mentionQuery(text, end));
    setActive(0);
  };
  const choose = (option: Option) => {
    if (!query) return;
    const prefix = value.slice(0, query.start) + '@' + option.value + ' ';
    setQuery(null);
    // Commit selection and its text together; a second callback can overwrite it with a stale draft.
    onSelect(option, prefix + value.slice(query.end));
    requestAnimationFrame(() => {
      const node = input.current;
      if (!node) return;
      node.focus();
      // The consumer may normalize the selected reference to the start of the question.
      const start = node.value.indexOf('@' + option.value);
      const caret = start < 0 ? Math.min(prefix.length, node.value.length) : start + option.value.length + 2;
      node.setSelectionRange(caret, caret);
    });
  };
  return (
    <div className="ui-mentions">
      {query && !props.disabled && (
        <div className="ui-mention-menu ui-floating" id={id} role="listbox" aria-label="引用数据">
          {matches.length ? (
            matches.map((option, index) => (
              <div
                key={option.key}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === active}
                className="ui-menu-item"
                data-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(index)}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="ui-empty-option">没有匹配的数据</div>
          )}
        </div>
      )}
      <TextArea
        {...props}
        ref={input}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!query && !props.disabled}
        aria-controls={query ? id : undefined}
        aria-activedescendant={query && matches[active] ? `${id}-${active}` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          if (
            !event.nativeEvent.isTrusted ||
            !('isComposing' in event.nativeEvent) ||
            !event.nativeEvent.isComposing
          )
            updateQuery(event.target.value, event.target.selectionStart);
        }}
        onCompositionEnd={(event) =>
          updateQuery(event.currentTarget.value, event.currentTarget.selectionStart)
        }
        onClick={(event) => updateQuery(value, event.currentTarget.selectionStart)}
        onBlur={() => setQuery(null)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.shiftKey) return;
          if (query && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === 'Escape') setQuery(null);
            else if (event.key === 'Enter' && matches[active]) choose(matches[active]);
            else if (event.key !== 'Enter' && matches.length)
              setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
          }
          props.onKeyDown?.(event);
        }}
      />
    </div>
  );
});
