import { floatingSurface, menuItem } from './styles';
import {
  cloneElement,
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
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
        <span className="inline-flex align-middle">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-150 max-w-80 bg-ink text-surface text-helper leading-[1.6] py-1.5 px-2.5 rounded-button shadow-[0_3px_10px_#0001]"
          sideOffset={7}
        >
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
  contentClassName,
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
  contentClassName?: string;
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
          <Popover.Content
            side={side}
            align={align}
            sideOffset={7}
            className={cx(floatingSurface, contentClassName)}
          >
            {popupRender(
              <div className={menu.className}>
                {menu.items.map((item) => (
                  <button
                    type="button"
                    className={menuItem}
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
          className={cx(
            floatingSurface,
            'min-w-42.5 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-auto',
            menu.className,
            contentClassName,
          )}
        >
          {menu.items.map((item) =>
            item.children ? (
              <DropdownMenu.Sub key={item.key}>
                <DropdownMenu.SubTrigger
                  className={menuItem}
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
                    className={cx(
                      floatingSurface,
                      'min-w-42.5 overflow-auto max-h-[min(320px,_var(--radix-dropdown-menu-content-available-height))] max-w-[min(360px,_90vw)]',
                    )}
                    sideOffset={6}
                  >
                    {item.children.map((child) => (
                      <DropdownMenu.Item
                        key={child.key}
                        className={menuItem}
                        disabled={child.disabled}
                        data-selected={menu.selectedKeys?.includes(child.key) || undefined}
                        onSelect={() => menu.onClick({ key: child.key })}
                      >
                        <span className="min-w-0 flex-1 wrap-anywhere">{child.label}</span>
                        {menu.selectedKeys?.includes(child.key) && <CheckIcon size={14} />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ) : (
              <DropdownMenu.Item
                key={item.key}
                className={cx(menuItem, item.danger && 'ui-danger text-danger')}
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
        <Dialog.Overlay className="fixed inset-0 z-90 bg-[#0c14234d] [backdrop-filter:blur(3px)] [animation:ui-fade_120ms_ease-out]" />
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
          className="fixed z-100 top-[50%] left-[50%] [transform:translate(-50%,_-50%)] w-[calc(100vw_-_40px)] max-h-[calc(100dvh_-_64px)] flex flex-col text-ink bg-surface border border-line rounded-dialog shadow-[0_20px_70px_#0003] outline-none [animation:ui-fade_150ms_ease-out]"
          aria-describedby={undefined}
          style={{ maxWidth: width }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <div className="flex items-center gap-4 justify-between pt-4.5 pr-5.5 pb-2.5 pl-5.5 shrink-0 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:m-0">
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
          <div className="overflow-auto pt-2 pr-5.5 pb-4 pl-5.5 [&_>_p]:mt-0 [&_>_p]:mr-0 [&_>_p]:mb-4 [&_>_p]:ml-0 [&_>_p]:text-muted">
            {children}
          </div>
          <div className="flex justify-end gap-2 pt-3.5 pr-5.5 pb-4.5 pl-5.5 shrink-0 border-t border-t-[color-mix(in_srgb,_var(--border)_60%,_transparent)]">
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
