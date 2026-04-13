import { useEffect } from 'react';
import { DEBUGGER_STYLE_ID, DEBUGGER_STYLES } from './styles-css';

export { DEBUGGER_STYLE_ID, DEBUGGER_STYLES } from './styles-css';

export function useInjectDebuggerStyles(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    let style = document.getElementById(DEBUGGER_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = DEBUGGER_STYLE_ID;
      style.textContent = DEBUGGER_STYLES;
      document.head.appendChild(style);
    }
  }, [enabled]);
}
