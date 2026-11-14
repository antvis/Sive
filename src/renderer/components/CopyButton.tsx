import { Copy } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { IconButton } from './IconButton';
import { errorMessage } from '../utils';

export function CopyButton({
  label,
  text,
  className,
}: {
  label: string;
  text: string | (() => string);
  className?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text);
      toast.success('已复制');
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  };
  return <IconButton icon={Copy} label={label} tooltip className={className} onClick={() => void copy()} />;
}
