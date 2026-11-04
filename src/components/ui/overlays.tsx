import {
  cloneElement,
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type CSSProperties,
} from 'react';
import { Dialog, DropdownMenu, Popover, Tooltip as TooltipPrimitive } from 'radix-ui';
import { CaretRightIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import { Toaster, toast } from 'sonner';
import { useTheme } from '../../theme';
import { errorMessage } from '../../shared/feedback';
import { Button, type ButtonProps, cx } from './controls';

export function Tooltip({
  title,
  children,
  open,
}: {
  title?: ReactNode;
  children: ReactElement;
  open?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  if (!title) return children;
  return (
    <TooltipPrimitive.Root open={open ?? visible} onOpenChange={setVisible}>
      <TooltipPrimitive.Trigger asChild>
        <span className="ui-tooltip-trigger">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="ui-tooltip" sideOffset={7}>
          {title}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
type MenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  children?: MenuItem[];
};
export function Dropdown({
  children,
  menu,
  placement = 'bottomRight',
  disabled,
  open,
  onOpenChange,
  popupRender,
  style,
}: {
  children: ReactElement;
  menu: {
    items: MenuItem[];
    selectedKeys?: string[];
    onClick: (info: { key: string }) => void;
    className?: string;
  };
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  popupRender?: (menu: ReactNode) => ReactNode;
  style?: CSSProperties;
}) {
  const side = placement.startsWith('top') ? 'top' : 'bottom';
  const align = placement.endsWith('Left') ? 'start' : 'end';
  const [internalOpen, setInternalOpen] = useState(false);
  const change = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };
  // Searchable history is a popover: typing must not trigger menu typeahead.
  if (popupRender)
    return (
      <Popover.Root open={!disabled && (open ?? internalOpen)} onOpenChange={change}>
        <Popover.Trigger asChild disabled={disabled}>
          {children}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side={side} align={align} sideOffset={7} className="ui-floating" style={style}>
            {popupRender(
              <div className={menu.className}>
                {menu.items.map((item) => (
                  <button
                    type="button"
                    className="ui-menu-item"
                    key={item.key}
                    disabled={item.disabled}
                    aria-current={menu.selectedKeys?.includes(item.key) ? 'true' : undefined}
                    onClick={() => {
                      menu.onClick({ key: item.key });
                      change(false);
                    }}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {menu.selectedKeys?.includes(item.key) && <CheckIcon size={14} />}
                  </button>
                ))}
              </div>,
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  return (
    <DropdownMenu.Root open={!disabled && (open ?? internalOpen)} onOpenChange={change}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align={align}
          sideOffset={7}
          className={cx('ui-floating ui-menu', menu.className)}
          style={style}
        >
          {menu.items.map((item) =>
            item.children ? (
              <DropdownMenu.Sub key={item.key}>
                <DropdownMenu.SubTrigger
                  className="ui-menu-item"
                  disabled={item.disabled}
                  data-selected={
                    item.children.some((child) => menu.selectedKeys?.includes(child.key)) || undefined
                  }
                >
                  {item.icon}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <CaretRightIcon size={12} />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className="ui-floating ui-menu"
                    sideOffset={6}
                    style={{
                      maxHeight: 'min(320px, var(--radix-dropdown-menu-content-available-height))',
                      overflowY: 'auto',
                      maxWidth: 'min(360px, 90vw)',
                    }}
                  >
                    {item.children.map((child) => (
                      <DropdownMenu.Item
                        key={child.key}
                        className="ui-menu-item"
                        disabled={child.disabled}
                        data-selected={menu.selectedKeys?.includes(child.key) || undefined}
                        onSelect={() => menu.onClick({ key: child.key })}
                      >
                        <span className="min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>
                          {child.label}
                        </span>
                        {menu.selectedKeys?.includes(child.key) && <CheckIcon size={14} />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ) : (
              <DropdownMenu.Item
                key={item.key}
                className={cx('ui-menu-item', item.danger && 'ui-danger')}
                disabled={item.disabled}
                data-selected={menu.selectedKeys?.includes(item.key) || undefined}
                onSelect={() => menu.onClick({ key: item.key })}
              >
                {item.icon}
                <span className="min-w-0 flex-1">{item.label}</span>
                {menu.selectedKeys?.includes(item.key) && <CheckIcon size={14} />}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type ModalProps = {
  title: ReactNode;
  children?: ReactNode;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void | Promise<unknown>;
  footer?: ReactNode;
  width?: number;
  okText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  okButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
};
export function Modal({
  title,
  children,
  open,
  onCancel,
  onOk,
  footer,
  width = 500,
  okText = '确定',
  cancelText = '取消',
  confirmLoading,
  okButtonProps,
  cancelButtonProps,
}: ModalProps) {
  const [pending, setPending] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const busy = pending || confirmLoading;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          className="ui-dialog"
          aria-describedby={undefined}
          style={{ maxWidth: width }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <div className="ui-dialog-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Button
              variant="ghost"
              size="small"
              icon={<XIcon />}
              aria-label="关闭弹窗"
              disabled={busy}
              onClick={onCancel}
            />
          </div>
          <div className="ui-dialog-body">{children}</div>
          <div className="ui-dialog-footer">
            {footer !== undefined ? (
              footer
            ) : (
              <>
                <Button
                  {...cancelButtonProps}
                  disabled={busy || cancelButtonProps?.disabled}
                  onClick={onCancel}
                >
                  {cancelText}
                </Button>
                <Button
                  variant="primary"
                  {...okButtonProps}
                  loading={busy}
                  onClick={async () => {
                    setPending(true);
                    try {
                      await onOk?.();
                    } catch (error) {
                      toast.error(errorMessage(error));
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  {okText}
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Drawer({
  title,
  open,
  onClose,
  children,
  width = 280,
}: {
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay" />
        <Dialog.Content className="ui-drawer" style={{ width }} aria-describedby={undefined}>
          <div className="ui-dialog-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Button variant="ghost" icon={<XIcon />} aria-label="关闭表结构" onClick={onClose} />
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
type ConfirmOptions = {
  title: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: ButtonProps;
  onOk: () => unknown | Promise<unknown>;
};
const UIContext = createContext<{ confirm: (options: ConfirmOptions) => Promise<boolean> } | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);
  const { dark } = useTheme();
  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setConfirmation(null);
  };
  return (
    <UIContext.Provider
      value={{
        confirm: (options) => {
          resolver.current?.(false);
          setConfirmation(options);
          return new Promise((resolve) => {
            resolver.current = resolve;
          });
        },
      }}
    >
      <TooltipPrimitive.Provider delayDuration={350}>{children}</TooltipPrimitive.Provider>
      <Toaster
        theme={dark ? 'dark' : 'light'}
        position="bottom-right"
        closeButton
        toastOptions={{ className: 'ui-toast' }}
      />
      <Modal
        open={!!confirmation}
        title={confirmation?.title}
        onCancel={() => close(false)}
        okText={confirmation?.okText}
        cancelText={confirmation?.cancelText}
        okButtonProps={confirmation?.okButtonProps}
        onOk={async () => {
          await confirmation?.onOk();
          close(true);
        }}
      >
        <p>{confirmation?.content}</p>
      </Modal>
    </UIContext.Provider>
  );
}
export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('UIProvider is missing');
  return { message: toast, confirm: context.confirm };
}
export function ConfirmAction({
  title,
  description,
  onConfirm,
  children,
  okText = '确定',
  cancelText = '取消',
}: {
  title: ReactNode;
  description?: ReactNode;
  onConfirm: () => unknown | Promise<unknown>;
  children: ReactElement;
  okText?: string;
  cancelText?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {cloneElement(children as ReactElement<ButtonProps>, {
        onClick: (event) => {
          (children.props as ButtonProps).onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
        },
      })}
      <Modal
        title={title}
        open={open}
        onCancel={() => setOpen(false)}
        okText={okText}
        cancelText={cancelText}
        okButtonProps={{ danger: true }}
        onOk={async () => {
          await onConfirm();
          setOpen(false);
        }}
      >
        <p>{description || '此操作无法撤销，请确认后继续。'}</p>
      </Modal>
    </>
  );
}
