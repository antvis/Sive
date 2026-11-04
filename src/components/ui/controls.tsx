import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Select as SelectPrimitive, Tabs as TabsPrimitive } from 'radix-ui';
import {
  MagnifyingGlassIcon,
  XIcon,
  EyeIcon,
  EyeSlashIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  TrayIcon,
} from '@phosphor-icons/react';

export const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'small' | 'default';
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'default', danger, loading, icon, children, className, disabled, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'ui-button inline-flex items-center justify-center gap-2 select-none transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2',
        `ui-button-${variant}`,
        size === 'small' && 'ui-button-small',
        danger && 'ui-danger',
        !children && 'ui-button-icon',
        className,
      )}
    >
      {loading ? <CircleNotchIcon className="ui-icon animate-spin" /> : icon}
      {children}
    </button>
  );
});

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> & {
  prefix?: ReactNode;
  allowClear?: boolean;
  onClear?: () => void;
};
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { prefix, allowClear, onClear, value, onChange, className, style, disabled, ...props },
  ref,
) {
  const internal = useRef<HTMLInputElement | null>(null);
  return (
    <span
      className={cx(
        'ui-input-wrap flex items-center gap-2 transition-colors',
        disabled && 'is-disabled',
        className,
      )}
      style={style}
    >
      {prefix && <span className="ui-input-prefix">{prefix}</span>}
      <input
        {...props}
        disabled={disabled}
        value={value}
        onChange={onChange}
        ref={(node) => {
          internal.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
      />
      {allowClear && !!value && !disabled && (
        <button
          type="button"
          aria-label="清除搜索"
          className="ui-input-clear"
          onClick={() => {
            const node = internal.current;
            if (!node) return;
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, '');
            node.dispatchEvent(new Event('input', { bubbles: true }));
            onClear?.();
            node.focus();
          }}
        >
          <XIcon size={14} />
        </button>
      )}
    </span>
  );
});
export function SearchInput(props: InputProps) {
  return <Input {...props} prefix={<MagnifyingGlassIcon />} className={cx('ui-search', props.className)} />;
}
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="ui-password">
      <Input {...props} ref={ref} type={visible ? 'text' : 'password'} />
      <Button
        variant="ghost"
        aria-label={visible ? '隐藏密钥' : '显示密钥'}
        disabled={props.disabled}
        onClick={() => setVisible(!visible)}
        icon={visible ? <EyeSlashIcon /> : <EyeIcon />}
      />
    </div>
  );
});
export const InputNumber = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'value' | 'onChange'> & {
    value?: number | null;
    onChange?: (value: number | null) => void;
  }
>(function InputNumber({ value, onChange, ...props }, ref) {
  return (
    <Input
      {...props}
      ref={ref}
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value === '' ? null : e.target.valueAsNumber)}
    />
  );
});
export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoSize?: { minRows: number; maxRows: number };
  showCount?: boolean;
  variant?: 'borderless';
};
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { autoSize, showCount, className, variant, style, ...props },
  ref,
) {
  const internal = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const node = internal.current;
    if (!node || !autoSize) return;
    const css = getComputedStyle(node),
      line = parseFloat(css.lineHeight) || 22;
    const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + 2;
    node.style.height = '0px';
    node.style.height = `${Math.min(line * autoSize.maxRows + padding, Math.max(line * autoSize.minRows + padding, node.scrollHeight))}px`;
  };
  useLayoutEffect(resize, [props.value, autoSize?.minRows, autoSize?.maxRows]);
  return (
    <div className={cx('ui-textarea-wrap', className)}>
      <textarea
        {...props}
        style={style}
        rows={autoSize?.minRows || props.rows}
        className={cx('ui-textarea', variant === 'borderless' && 'ui-textarea-plain')}
        ref={(node) => {
          internal.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onInput={(e) => {
          resize();
          props.onInput?.(e);
        }}
      />
      {showCount && (
        <small className="ui-input-count">
          {String(props.value || '').length}
          {props.maxLength ? ` / ${props.maxLength}` : ''}
        </small>
      )}
    </div>
  );
});

type Option<T> = { value: T; label: ReactNode; disabled?: boolean };
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = '请选择',
  disabled,
  size,
  style,
  className,
  ...props
}: {
  value?: T;
  onChange?: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'small';
  style?: CSSProperties;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value === undefined ? '' : String(value)}
      disabled={disabled}
      onValueChange={(v) => {
        const option = options.find((o) => String(o.value) === v);
        if (option) onChange?.(option.value);
      }}
    >
      <SelectPrimitive.Trigger
        {...props}
        style={style}
        className={cx(
          'ui-select inline-flex items-center justify-between gap-2',
          size === 'small' && 'ui-select-small',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <CaretDownIcon size={12} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="ui-select-menu ui-floating" position="popper" sideOffset={6}>
          <SelectPrimitive.ScrollUpButton className="ui-select-scroll">↑</SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={String(o.value)}
                value={String(o.value)}
                disabled={o.disabled}
                className="ui-menu-item"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ui-menu-check">
                  <CheckIcon size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="ui-select-scroll">↓</SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
export function Tabs({
  activeKey,
  onChange,
  items,
}: {
  activeKey: string;
  onChange: (key: string) => void;
  items: { key: string; label: ReactNode; children: ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root className="ui-tabs" value={activeKey} onValueChange={onChange}>
      <TabsPrimitive.List className="ui-tab-list">
        {items.map((item) => (
          <TabsPrimitive.Trigger className="ui-tab" value={item.key} key={item.key}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="ui-tab-content" value={item.key} key={item.key}>
          {item.children}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
export function Segmented({
  options,
  value,
  onChange,
  ...props
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
}) {
  const id = useId();
  return (
    <div className="ui-segmented" role="radiogroup" {...props}>
      {options.map((option) => (
        <label key={option} className={cx(value === option && 'is-selected')}>
          <input
            type="radio"
            name={id}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
export function Pagination({
  current,
  pageSize,
  total,
  onChange,
  className,
}: {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className={cx('ui-pagination', className)} aria-label="分页">
      <Button
        variant="ghost"
        size="small"
        icon={<CaretLeftIcon />}
        aria-label="上一页"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      />
      <span>
        {current} / {pages}
      </span>
      <Button
        variant="ghost"
        size="small"
        icon={<CaretRightIcon />}
        aria-label="下一页"
        disabled={current >= pages}
        onClick={() => onChange(current + 1)}
      />
    </nav>
  );
}
export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="ui-badge" data-tone={color}>
      {children}
    </span>
  );
}
export function Spin({ size }: { size?: 'small' }) {
  return (
    <CircleNotchIcon
      aria-label="加载中"
      role="status"
      className="ui-icon animate-spin"
      size={size === 'small' ? 16 : 24}
    />
  );
}
export function Empty({ description, children }: { description: ReactNode; children?: ReactNode }) {
  return (
    <div className="ui-empty">
      <TrayIcon size={28} weight="duotone" aria-hidden />
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Alert({
  type = 'info',
  title,
  description,
  action,
  closable,
  onClose,
}: {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  closable?: boolean;
  onClose?: () => void;
}) {
  const Icon = type === 'success' ? CheckCircleIcon : type === 'info' ? InfoIcon : WarningCircleIcon;
  return (
    <div className="ui-alert" data-tone={type} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={16} />
      <div className="min-w-0 flex-1">
        <div>{title}</div>
        {description && <p>{description}</p>}
      </div>
      {action}
      {closable && (
        <Button variant="ghost" size="small" aria-label="关闭提示" icon={<XIcon />} onClick={onClose} />
      )}
    </div>
  );
}
