import { floatingSurface, menuItem } from './styles';
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

import { cx } from '../../shared/cx';
export { cx } from '../../shared/cx';
const buttonVariants = {
  primary:
    'ui-button-primary font-medium text-white bg-accent shadow-[0_1px_2px_color-mix(in_srgb,_var(--text)_10%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--accent)_87%,_black)] [&.ui-danger]:bg-danger [&.ui-danger]:text-white',
  secondary:
    'ui-button-secondary text-ink bg-[color-mix(in_srgb,_var(--muted)_8%,_var(--surface))] hover:bg-[color-mix(in_srgb,_var(--muted)_14%,_var(--surface))]',
  ghost:
    'ui-button-ghost text-muted bg-transparent hover:text-ink hover:bg-[color-mix(in_srgb,_var(--muted)_9%,_transparent)]',
  link: 'ui-button-link bg-transparent text-accent-ink max-w-full h-auto whitespace-normal text-left px-0 hover:underline',
};
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
        'ui-button h-[var(--control-height)] py-0 px-3.5 font-normal text-body border border-transparent rounded-button leading-none whitespace-nowrap outline-accent cursor-pointer [&.ui-danger:not(.ui-button-primary):hover]:bg-[color-mix(in_srgb,_var(--danger)_10%,_transparent)] inline-flex items-center justify-center gap-2 select-none transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2',
        size === 'small' &&
          'h-7 px-2.5 text-helper rounded-button [&_>_.ui-icon]:w-3.5 [&_>_.ui-icon]:h-3.5 [&.ui-button-icon]:w-7',
        buttonVariants[variant],
        danger && 'ui-danger text-danger',
        !children && 'ui-button-icon w-[var(--control-height)] p-0',
        className,
      )}
    >
      {loading ? (
        <CircleNotchIcon className="ui-icon inline-block shrink-0 align-middle animate-spin" />
      ) : (
        icon
      )}
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
        "ui-input-wrap bg-[color-mix(in_srgb,_var(--background)_65%,_var(--surface))] text-ink border border-[color-mix(in_srgb,_var(--border)_65%,_transparent)] rounded-card outline-none text-body min-h-[var(--control-height)] w-full py-0 px-[11px] min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:outline-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:py-[7px] [&_input]:px-0 [&_input]:leading-[18px] [&_input]:text-inherit [&_input::placeholder]:text-[color-mix(in_srgb,_var(--muted)_80%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_60%,_var(--border))] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&:has([aria-invalid='true'])]:border-danger flex items-center gap-2 transition-colors",
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={style}
    >
      {prefix && <span className="inline-flex text-muted shrink-0">{prefix}</span>}
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
          className="inline-flex text-muted shrink-0 border-0 p-[3px] bg-transparent rounded-[4px] hover:bg-[color-mix(in_srgb,_var(--muted)_12%,_transparent)]"
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
    <div className="relative [&_.ui-input-wrap]:pr-10 [&_>_.ui-button]:absolute [&_>_.ui-button]:top-[1px] [&_>_.ui-button]:right-0.5">
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
    <div className={cx('relative min-w-0', className)}>
      <textarea
        {...props}
        style={style}
        rows={autoSize?.minRows || props.rows}
        className={cx(
          "ui-textarea bg-[color-mix(in_srgb,_var(--background)_65%,_var(--surface))] text-ink border border-[color-mix(in_srgb,_var(--border)_65%,_transparent)] rounded-card outline-none text-body block w-full resize-y py-2.5 px-3 leading-[1.7] [&::placeholder]:text-[color-mix(in_srgb,_var(--muted)_80%,_transparent)] focus:border-[color-mix(in_srgb,_var(--accent)_60%,_var(--border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[aria-invalid='true']]:border-danger disabled:opacity-50 disabled:cursor-not-allowed",
          variant === 'borderless' && 'border-0 bg-transparent resize-none shadow-none!',
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
          "ui-select bg-[color-mix(in_srgb,_var(--background)_65%,_var(--surface))] text-ink border border-[color-mix(in_srgb,_var(--border)_65%,_transparent)] rounded-card outline-none text-body h-[var(--control-height)] py-0 px-[11px] cursor-pointer min-w-22.5 text-left focus-visible:border-[color-mix(in_srgb,_var(--accent)_60%,_var(--border))] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,_var(--accent)_8%,_transparent)] [&[aria-invalid='true']]:border-danger [&_>_span:first-child]:overflow-hidden [&_>_span:first-child]:text-ellipsis [&_>_span:first-child]:whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-between gap-2",
          size === 'small' && 'h-7 text-helper',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
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
  items: { key: string; label: ReactNode; children: ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root className="ui-tabs flex flex-col min-h-0" value={activeKey} onValueChange={onChange}>
      <TabsPrimitive.List className="flex gap-1 p-[3px] bg-[color-mix(in_srgb,_var(--muted)_6%,_transparent)] rounded-[calc(var(--radius)_+_5px)] w-fit max-w-full mb-4 shrink-0">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="py-[5px] px-3.5 text-muted text-body rounded-button border-0 bg-transparent whitespace-nowrap data-[state=active]:text-ink data-[state=active]:bg-surface data-[state=active]:shadow-[0_1px_4px_#0000000d] data-[state=active]:font-medium"
            value={item.key}
            key={item.key}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className="ui-tab-content min-h-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:-outline-offset-2 data-[state=inactive]:hidden"
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
    <div
      className="flex p-[3px] rounded-card bg-[color-mix(in_srgb,_var(--muted)_7%,_transparent)] gap-0.5 [&_label]:flex-1 [&_label]:relative [&_label]:cursor-pointer [&_label]:text-center [&_label]:text-helper [&_label]:text-muted [&_label]:rounded-item [&_label]:py-[5px] [&_label]:px-3 [&_.is-selected]:bg-surface [&_.is-selected]:text-ink [&_.is-selected]:shadow-[0_1px_3px_#0000000d] [&_label:has(input:focus-visible)]:outline-2 [&_label:has(input:focus-visible)]:outline-solid [&_label:has(input:focus-visible)]:outline-accent [&_label:has(input:focus-visible)]:outline-offset-1"
      role="radiogroup"
      {...props}
    >
      {options.map((option) => (
        <label key={option} className={cx(value === option && 'is-selected')}>
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
export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="ui-badge inline-flex items-center gap-1 py-0.5 px-[7px] rounded-[5px] bg-[color-mix(in_srgb,_var(--muted)_7%,_transparent)] text-muted text-caption whitespace-nowrap data-[tone=success]:text-success data-[tone=success]:bg-[color-mix(in_srgb,_var(--success)_8%,_transparent)] data-[tone=green]:text-success data-[tone=green]:bg-[color-mix(in_srgb,_var(--success)_8%,_transparent)] data-[tone=error]:text-danger data-[tone=error]:bg-[color-mix(in_srgb,_var(--danger)_8%,_transparent)] data-[tone=warning]:text-warning data-[tone=warning]:bg-[color-mix(in_srgb,_var(--warning)_8%,_transparent)] data-[tone=processing]:text-accent data-[tone=processing]:bg-[color-mix(in_srgb,_var(--accent)_8%,_transparent)]"
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
      className="ui-icon inline-block shrink-0 align-middle animate-spin"
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
    <div
      className="ui-alert flex items-start gap-2.5 py-3 px-3.5 rounded-card bg-[color-mix(in_srgb,_var(--accent)_6%,_var(--surface))] text-ink my-2 mx-0 text-helper leading-[1.6] [&_>_svg]:text-accent [&_>_svg]:mt-[1px] data-[tone=error]:bg-[color-mix(in_srgb,_var(--danger)_7%,_var(--surface))] [&[data-tone='error']_>_svg]:text-danger data-[tone=warning]:bg-[color-mix(in_srgb,_var(--warning)_7%,_var(--surface))] [&[data-tone='warning']_>_svg]:text-warning"
      data-tone={type}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon size={16} />
      <div className="min-w-0 flex-1">
        <div>{title}</div>
        {description && <p className="mt-[3px] mr-0 mb-0 ml-0 text-muted">{description}</p>}
      </div>
      {action}
      {closable && (
        <Button variant="ghost" size="small" aria-label="关闭提示" icon={<XIcon />} onClick={onClose} />
      )}
    </div>
  );
}
