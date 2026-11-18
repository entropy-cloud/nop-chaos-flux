import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W3d upload family — input-file / input-image:
 * input-file dispatches uploadAction and writes back the url on success;
 * input-image renders a thumbnail preview after upload.
 *
 * Migrated from tests/e2e/w3d-upload-family.spec.ts (E3 batch 1, engine swap +
 * Playwright setInputFiles replaced by an in-page DataTransfer dispatch (the
 * driver has no file-picker bridge); visibility/text waits upgraded to
 * expectWeb retry-polling).
 */

async function openW3d(ft: FtGlobal): Promise<void> {
  await ft.goto('#/w3d-advanced-input-family');
  await ft.expectWeb(
    ft.getByRole('heading', {
      name: '高级输入族 — period / markdown-editor / upload / editor',
      level: 1,
    }),
  ).toBeVisible({ timeoutMs: 20_000 });
}

// TODO(migrate-debt): evaluate fallback (driver has no setInputFiles/file-picker
// bridge; synthesize a File onto the hidden <input type="file"> via DataTransfer,
// mirroring the renderer contract the old spec documented).
async function setInputFilesViaEvaluate(ft: FtGlobal, testId: string, name: string, mimeType: string, bytes: string): Promise<void> {
  const ok = await ft.evaluate(
    `(() => {
      const input = document.querySelector('input[data-testid="${testId}"]');
      if (!input) return false;
      const file = new File(['${bytes}'], '${name}', { type: '${mimeType}' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  if (ok !== true) throw new Error(`file input [${testId}] not found for DataTransfer dispatch`);
}

async function caseInputFileUpload(ft: FtGlobal): Promise<void> {
  await openW3d(ft);

  const report = ft.locator('[data-testid="file-report"]');
  await ft.expectWeb(report).toContainText('file:—');

  await setInputFilesViaEvaluate(ft, 'nop-input-file-input', 'contract.pdf', 'application/pdf', 'fake-pdf-bytes');

  // Upload resolves → a done item appears in the file list.
  await ft.expectWeb(
    ft.locator('[data-testid="nop-input-file-item"][data-item-status="done"]').first(),
  ).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(report).toHaveText('file:https://cdn.example.com/contract.pdf', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'w3d-upload-family: input-file');
}

async function caseInputImageThumbnail(ft: FtGlobal): Promise<void> {
  await openW3d(ft);

  await setInputFilesViaEvaluate(ft, 'nop-input-image-input', 'avatar.png', 'image/png', 'fake-png-bytes');

  const thumb = ft.locator('[data-testid="nop-input-image-thumbnail"]').first();
  await ft.expectWeb(thumb).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(thumb).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');

  const report = ft.locator('[data-testid="image-report"]');
  await ft.expectWeb(report).toHaveText('image:https://cdn.example.com/avatar.png', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'w3d-upload-family: input-image');
}

export default async function w3dUploadFamilySpec(ft: FtGlobal): Promise<{ cases: number }> {
  await caseInputFileUpload(ft);
  await caseInputImageThumbnail(ft);
  return { cases: 2 };
}
