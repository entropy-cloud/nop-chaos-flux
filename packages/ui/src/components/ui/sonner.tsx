import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

const TOASTER_Z_INDEX = 10000;

const defaultIcons = {
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
};

const defaultToastOptions = {
  classNames: {
    toast: 'cn-toast',
  },
};

// Theme independence contract: the shell communicates dark mode through
// `documentElement[data-mode]`, not a React context. Follow the attribute so
// sonner's internal toast palette switches with it; explicit props still win.
function useDocumentThemeMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-mode') === 'dark'
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => {
      setMode(
        document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light',
      );
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    return () => observer.disconnect();
  }, []);

  return mode;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const documentMode = useDocumentThemeMode();
  return (
    <Sonner
      {...props}
      theme={props.theme ?? documentMode}
      className={cn('nop-toaster toaster group', props.className)}
      icons={props.icons ?? defaultIcons}
      style={
        {
          '--normal-bg': 'hsl(var(--popover, var(--card)))',
          '--normal-text': 'hsl(var(--popover-foreground, var(--card-foreground)))',
          '--normal-border': 'hsl(var(--border))',
          '--border-radius': 'var(--radius)',
          zIndex: TOASTER_Z_INDEX,
          ...props.style,
        } as React.CSSProperties
      }
      toastOptions={props.toastOptions ?? defaultToastOptions}
    />
  );
};

export { Toaster, TOASTER_Z_INDEX };
