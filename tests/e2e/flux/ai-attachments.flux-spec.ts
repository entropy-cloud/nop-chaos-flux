import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI attachments — P2 upload + preview + remove.
 *
 * Migrated from tests/e2e/ai-attachments.spec.ts (E3 batch 1, engine swap +
 * count assertions upgraded to retry-polling expectWeb / waitFor and kernel
 * white-box error check in place of assertTrackedPageErrors).
 */

// 1x1 transparent PNG.
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function openAiAttachmentsDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-attachments');
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 15_000 });
}

/**
 * Driver gap: no setInputFiles — synthesize a real File selection via
 * DataTransfer on the hidden <input type="file"> (programmatic bridge,
 * mirrors the renderer contract; same approach the old Playwright spec's
 * setInputFiles took under the hood).
 */
// TODO(migrate-debt): evaluate fallback (driver has no file-input API)
async function setInputFiles(ft: FtGlobal, selector: string, names: string[]): Promise<void> {
  const expression =
    `(() => {` +
    ` const input = document.querySelector(${JSON.stringify(selector)});` +
    ` if (!input) throw new Error('file input missing: ${selector}');` +
    ` const bytes = Uint8Array.from(atob(${JSON.stringify(TINY_PNG_BASE64)}), (c) => c.charCodeAt(0));` +
    ` const transfer = new DataTransfer();` +
    ` for (const name of ${JSON.stringify(names)}) {` +
    `  transfer.items.add(new File([bytes], name, { type: 'image/png' }));` +
    ` }` +
    ` input.files = transfer.files;` +
    ` input.dispatchEvent(new Event('input', { bubbles: true }));` +
    ` input.dispatchEvent(new Event('change', { bubbles: true }));` +
    ` return input.files.length;` +
    `})()`;
  await ft.evaluate(expression);
}

export default async function aiAttachments(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: picking an image renders a preview item then remove clears it
  await openAiAttachmentsDemo(ft);

  await setInputFiles(ft, '[data-slot="ai-attachments-input"]', ['tiny.png']);

  // A preview item is rendered.
  const item = ft.locator('[data-slot="ai-attachments-item"]').first();
  await item.waitFor('visible', { timeoutMs: 10_000 });

  // The thumbnail uses an object URL (image_url-style multimodal payload source).
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  const thumbCount = await ft.locator('[data-slot="ai-attachments-thumb"]').count();
  if (thumbCount < 1) {
    throw new Error(`expected at least 1 attachment thumbnail, got ${thumbCount}`);
  }

  // Removing the attachment clears the list.
  await ft.locator('[data-slot="ai-attachments-remove"]').first().click();
  await ft.expectWeb(ft.locator('[data-slot="ai-attachments-item"]')).toHaveCount(0, { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'ai-attachments-upload');

  // Case 2: exceeding maxFiles rejects the surplus file (validation Failure Path)
  await openAiAttachmentsDemo(ft);

  const fileInput = ft.locator('[data-slot="ai-attachments-input"]');
  await fileInput.waitFor('attached');
  // maxFiles is 4; upload 5 to force a rejection.
  await setInputFiles(ft, '[data-slot="ai-attachments-input"]', ['a.png', 'b.png', 'c.png', 'd.png', 'e.png']);

  // Only up to maxFiles items are kept.
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  const count = await ft.locator('[data-slot="ai-attachments-item"]').count();
  if (count > 4) {
    throw new Error(`expected at most 4 attachment items (maxFiles), got ${count}`);
  }

  await expectNoPageErrors(ft, 'ai-attachments-maxfiles');

  return { cases: 2 };
}
