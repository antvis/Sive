import type { ButtonProps } from '@renderer/types/ui';
import { controlSurface, floatingSurface, menuItem } from '@renderer/components/ui/styles';
import {
  forwardRef,
  useId,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Select as SelectPrimitive, Tabs as TabsPrimitive } from 'radix-ui';
import {
  IconContext,
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

import { cx } from '@renderer/utils/cx';
const buttonVariants = {
  primary:
    'font-medium text-white bg-accent shadow-[0_1px_2px] shadow-ink/10 hover:bg-[color-mix(in_srgb,_var(--accent)_87%,_black)]',
  secondary: 'text-ink bg-neutral-soft hover:bg-[color-mix(in_srgb,_var(--muted)_14%,_var(--surface))]',
  ghost: 'text-muted bg-transparent hover:text-ink hover:bg-muted/9',
  link: 'bg-transparent text-accent-ink max-w-full h-auto whitespace-normal text-left px-0 hover:underline',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'default', danger, loading, icon, children, className, disabled, ...props },
  ref,
) {
  const iconContext = useContext(IconContext);
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'h-[var(--control-height)] py-0 px-3.5 font-normal text-body border border-transparent rounded-button leading-none whitespace-nowrap outline-accent cursor-pointer inline-flex items-center justify-center gap-2 select-none transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2',
        size === 'small' && 'h-7 px-2.5 text-helper',
        buttonVariants[variant],
        danger &&
          (variant === 'primary' ? 'bg-danger text-white hover:bg-danger' : 'text-danger hover:bg-danger/10'),
        !children && [size === 'small' ? 'w-7' : 'w-[var(--control-height)]', 'p-0'],
        className,
      )}
    >
      <IconContext.Provider value={{ ...iconContext, size: size === 'small' ? 14 : iconContext.size }}>
        {loading ? <CircleNotchIcon className="inline-block shrink-0 align-middle animate-spin" /> : icon}
        {children}
      </IconContext.Provider>
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
        controlSurface,
        "min-h-[var(--control-height)] w-full py-0 px-3 min-w-0 focus-within:border-focus focus-within:ring-2 focus-within:ring-accent/8 [&:has([aria-invalid='true'])]:border-danger flex items-center gap-2 transition-colors",
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={style}
    >
      {prefix && <span className="inline-flex text-muted shrink-0">{prefix}</span>}
      <input
        {...props}
        className="w-full min-w-0 outline-none border-0 bg-transparent py-1.5 px-0 leading-[18px] text-inherit placeholder:text-muted/80"
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
          className="inline-flex text-muted shrink-0 border-0 p-1 bg-transparent rounded-compact hover:bg-muted/12"
          onClick={() => {
            const node = internal.current;
            const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (!node || !setValue) return;
            setValue.call(node, '');
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
  return (
    <Input
      {...props}
      prefix={<MagnifyingGlassIcon />}
      className={cx('w-70 max-w-full border-transparent hover:border-line', props.className)}
    />
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        className={cx(props.className, 'pr-10')}
        ref={ref}
        type={visible ? 'text' : 'password'}
      />
      <Button
        variant="ghost"
        className="absolute top-px right-0.5"
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
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
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
    <div className="relative min-w-0">
      <textarea
        {...props}
        style={style}
        rows={autoSize?.minRows || props.rows}
        className={cx(
          controlSurface,
          "block w-full resize-y py-2.5 px-3 leading-[1.7] [&::placeholder]:text-muted/80 focus:border-focus focus:ring-2 focus:ring-accent/8 [&[aria-invalid='true']]:border-danger disabled:opacity-50 disabled:cursor-not-allowed",
          variant === 'borderless' && 'border-0 bg-transparent resize-none focus:ring-0',
          className,
        )}
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
        <small className="block mt-1 text-muted text-right">
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
          controlSurface,
          "h-[var(--control-height)] py-0 px-3 cursor-pointer min-w-22.5 text-left focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-accent/8 [&[aria-invalid='true']]:border-danger disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-between gap-2",
          size === 'small' && 'h-7 text-helper',
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="shrink-0">
          <CaretDownIcon size={12} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cx(
            floatingSurface,
            'min-w-[var(--radix-select-trigger-width)] max-h-[min(360px,_var(--radix-select-content-available-height))] overflow-auto',
          )}
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.ScrollUpButton className="text-center p-1 text-muted">
            ↑
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={String(o.value)}
                value={String(o.value)}
                disabled={o.disabled}
                className={menuItem}
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto text-accent">
                  <CheckIcon size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="text-center p-1 text-muted">
            ↓
          </SelectPrimitive.ScrollDownButton>
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
  items: { key: string; label: ReactNode; children: ReactNode; className?: string }[];
}) {
  return (
    <TabsPrimitive.Root className="flex flex-col flex-1 min-h-0" value={activeKey} onValueChange={onChange}>
      <TabsPrimitive.List className="flex gap-1 p-1 bg-muted/6 rounded-panel w-fit max-w-full mb-4 shrink-0">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="py-1 px-3.5 text-muted text-body rounded-button border-0 bg-transparent whitespace-nowrap data-[state=active]:text-ink data-[state=active]:bg-surface data-[state=active]:shadow-[0_1px_4px_#0000000d] data-[state=active]:font-medium"
            value={item.key}
            key={item.key}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className={cx(
            'h-full min-h-0 overflow-auto focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:-outline-offset-2 data-[state=inactive]:hidden',
            item.className,
          )}
          value={item.key}
          key={item.key}
        >
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
    <div className="flex p-1 rounded-card bg-muted/7 gap-0.5" role="radiogroup" {...props}>
      {options.map((option) => (
        <label
          key={option}
          className={cx(
            'flex-1 relative cursor-pointer text-center text-helper text-muted rounded-button py-1 px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-1',
            value === option && 'bg-surface text-ink shadow-[0_1px_3px_#0000000d]',
          )}
        >
          <input
            className="absolute opacity-0 inset-0 w-full cursor-pointer"
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
    <nav
      className={cx('flex items-center justify-end gap-2.5 mt-2 text-muted text-helper', className)}
      aria-label="分页"
    >
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

export function Tag({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 py-0.5 px-2 rounded-compact bg-muted/7 text-muted text-helper whitespace-nowrap data-[tone=success]:text-success data-[tone=success]:bg-success/8 data-[tone=green]:text-success data-[tone=green]:bg-success/8 data-[tone=error]:text-danger data-[tone=error]:bg-danger/8 data-[tone=warning]:text-warning data-[tone=warning]:bg-warning/8 data-[tone=processing]:text-accent data-[tone=processing]:bg-accent/8',
        className,
      )}
      data-tone={color}
    >
      {children}
    </span>
  );
}

export function Spin({ size }: { size?: 'small' }) {
  return (
    <CircleNotchIcon
      aria-label="加载中"
      role="status"
      className="inline-block shrink-0 align-middle animate-spin"
      size={size === 'small' ? 16 : 24}
    />
  );
}

export function Empty({ description, children }: { description: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-35 p-7.5 text-muted text-center text-body">
      <TrayIcon size={28} weight="duotone" aria-hidden />
      <p className="m-0 max-w-90">{description}</p>
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
  className,
}: {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  closable?: boolean;
  className?: string;
  onClose?: () => void;
}) {
  const { icon: Icon, color } = {
    success: { icon: CheckCircleIcon, color: 'text-accent' },
    info: { icon: InfoIcon, color: 'text-accent' },
    warning: { icon: WarningCircleIcon, color: 'text-warning' },
    error: { icon: WarningCircleIcon, color: 'text-danger' },
  }[type];
  return (
    <div
      className={cx(
        'flex items-start gap-2.5 py-3 px-3.5 rounded-card bg-accent-soft text-ink my-2 mx-0 text-helper leading-[1.6] data-[tone=error]:bg-[color-mix(in_srgb,_var(--danger)_7%,_var(--surface))] data-[tone=warning]:bg-[color-mix(in_srgb,_var(--warning)_7%,_var(--surface))]',
        className,
      )}
      data-tone={type}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon size={16} className={cx('shrink-0 mt-px', color)} />
      <div className="min-w-0 flex-1">
        <div>{title}</div>
        {description && <p className="mt-1 mr-0 mb-0 ml-0 text-muted">{description}</p>}
      </div>
      {action}
      {closable && (
        <Button variant="ghost" size="small" aria-label="关闭提示" icon={<XIcon />} onClick={onClose} />
      )}
    </div>
  );
}
