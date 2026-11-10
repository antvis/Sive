import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'small' | 'default';
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export type ConfirmOptions = {
  title: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: ButtonProps;
  onOk: () => unknown | Promise<unknown>;
};
