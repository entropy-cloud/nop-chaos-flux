import { expect, test } from './fixtures.js';

// plan 558 Phase 2b (G 类/V7 反馈通道卫生): passive visit + minimal neutral
// interaction. Baseline tripwire, not an exhaustive sweep: edit-action noise
// and same-text duplicate toasts (the recorder dedupes by text) are outside
// this guard's scope.
// interaction on each designer-family form, collecting EVERY sonner toast via
// a monotonic init-script recorder. Any toast that cannot be mapped to a user
// action or a legitimate async business event is feedback-channel pollution
// (G 类). The expected-mapping allowlist below is the triaged result of the
// plan-558 live probe run; new unmapped entries fail the spec.

const INSTALL_RECORDER = `
  window.__toastLog = [];
  const record = () => {
    for (const el of document.querySelectorAll('[data-sonner-toast]')) {
      const text = (el.textContent ?? '').trim();
      if (text && !window.__toastLog.includes(text)) window.__toastLog.push(text);
    }
  };
  setInterval(record, 250);
  const attach = () => {
    if (document.body) new MutationObserver(record).observe(document.body, { childList: true, subtree: true });
    else setTimeout(attach, 100);
  };
  attach();
`;

const FORMS: Array<{ name: string; route: string; settle: number; tabs?: string[] }> = [
  { name: 'flow-designer', route: '#/flow-designer', settle: 3000 },
  { name: 'report-designer', route: '#/report-designer', settle: 3000 },
  { name: 'report-designer-host', route: '#/report-designer-host', settle: 3000 },
  { name: 'spreadsheet', route: '#/spreadsheet', settle: 3000 },
  { name: 'word-editor', route: '#/word-editor', settle: 3000 },
  { name: 'scada-editor-demo', route: '#/scada-editor-demo', settle: 3000 },
  { name: 'dashboard-demo', route: '#/dashboard-demo', settle: 3000 },
  { name: 'debugger-lab', route: '#/debugger-lab', settle: 3000 },
  { name: 'print-designer', route: '#/print-designer', settle: 3000 },
];

for (const form of FORMS) {
  test(`designer toast hygiene: ${form.name} (plan 558 G/V7)`, async ({ page }) => {
    await page.addInitScript(INSTALL_RECORDER);
    await page.goto(`/${form.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(form.settle);

    // Minimal neutral interaction: click the first canvas node / panel header
    // if present (selection only — must not produce toasts by itself).
    const firstNode = page.locator('.react-flow__node').first();
    if ((await firstNode.count()) > 0) {
      await firstNode.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    const toasts = await page.evaluate(
      () => (window as unknown as { __toastLog?: string[] }).__toastLog ?? [],
    );

    // Known-mapped entries (legitimate async business events) live here; the
    // plan-558 probe run triaged every toast on these nine forms and found
    // none — the assertion pins the hygiene baseline. A failure here is a G
    // 类 candidate: map it or fix it.
    const unmapped = toasts.filter((text) => !isKnownMappedToast(text));
    expect(unmapped, `unmapped toasts on ${form.name}: ${JSON.stringify(toasts)}`).toEqual([]);
  });
}

function isKnownMappedToast(_text: string): boolean {
  // None of the nine forms promises passive-visit toasts; every current toast
  // would be unmapped. Extend this allowlist only with mapped justifications.
  return false;
}
