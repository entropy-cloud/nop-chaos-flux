
import { toast } from '@nop-chaos/ui';

export function notifyWithToast(level: string, message: unknown): void {
  const text = typeof message === 'string' ? message : String(message ?? '');
  if (level === 'error') toast.error(text || 'Error');
  else if (level === 'success') toast.success(text || 'Success');
  else if (level === 'warning') toast.warning?.(text || 'Warning');
  else toast.info?.(text || 'Info');
}
