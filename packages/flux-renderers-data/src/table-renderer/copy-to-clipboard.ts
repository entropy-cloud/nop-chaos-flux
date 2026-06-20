export interface CopyToClipboardResult {
  success: boolean;
  method: 'clipboard-api' | 'exec-command' | 'none';
  error?: unknown;
}

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

function fallbackExecCommand(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    document.body.removeChild(textarea);
    return ok;
  } catch (error) {
    if (isDevRuntime()) {
      console.warn('[TableRenderer] copy-to-clipboard fallback failed', error);
    }
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<CopyToClipboardResult> {
  const safeText = String(text ?? '');

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(safeText);
      return { success: true, method: 'clipboard-api' };
    } catch (error) {
      if (isDevRuntime()) {
        console.warn('[TableRenderer] navigator.clipboard.writeText rejected; falling back to execCommand', error);
      }
    }
  }

  if (fallbackExecCommand(safeText)) {
    return { success: true, method: 'exec-command' };
  }

  if (isDevRuntime()) {
    console.warn('[TableRenderer] copy-to-clipboard denied (HTTPS / permissions required)');
  }
  return { success: false, method: 'none' };
}
