import { createLazyLibLoader } from '@nop-chaos/flux-core';

/**
 * WA-scheduling-002 (plan 568): html2canvas (~200KB) used to be loaded three
 * ways — a static import in the calendar export hook (pinning the lib into
 * the scheduling main chunk), a hand-rolled memoized dynamic import in
 * kanban-export, and the createLazyLibLoader primitive already used by the
 * barcode scanner. One shared loader now owns the memoization; failures
 * clear the cache so the next call retries (primitive contract), and errors
 * propagate to the caller.
 */
export const loadHtml2canvas = createLazyLibLoader(
  async () => (await import('html2canvas')).default,
);
