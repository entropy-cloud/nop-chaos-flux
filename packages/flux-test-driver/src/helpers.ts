import type { FtGlobal } from './types.js';

/**
 * Kernel white-box page-error check: stricter than Playwright's console-error
 * capture — the debugger kernel tracks runtime-level failures. Throws when any
 * tracked error is present.
 */
export async function expectNoPageErrors(ft: FtGlobal, marker?: string): Promise<void> {
  const latest = await ft.evaluate(
    'window.__NOP_DEBUGGER_API__ && window.__NOP_DEBUGGER_API__.getLatestErrors ? window.__NOP_DEBUGGER_API__.getLatestErrors() : []',
  ) as Array<{ kind?: string; summary?: string }>;
  if (latest.length > 0) {
    const first = JSON.stringify(latest[0])?.slice(0, 300);
    throw new Error(`page errors detected${marker ? ` (${marker})` : ''}: ${latest.length} tracked; first: ${first}`);
  }
}
