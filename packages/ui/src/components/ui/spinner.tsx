import { cn } from '../../lib/utils.js';
import { t } from '../../lib/i18n.js';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, 'aria-label': ariaLabel, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label={ariaLabel ?? t('flux.common.loading')}
      className={cn('nop-spinner ', 'size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
