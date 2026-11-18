import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Word editor document persistence: a typed marker survives an explicit save
 * and a reload, and the word count never shrinks.
 *
 * Migrated from tests/e2e/word-editor-persistence.spec.ts (E3 batch 4, engine swap +
 * expect.poll(readWordCount) replaced by an explicit ft.evaluate poll loop with
 * the last actual value in the error message).
 * Typing upgrade: ft.keyboard.type() appends to the focused element's value via
 * a synthetic input event, which the canvas-editor bridge ignores (it consumes
 * real keydown/char events on its hidden textarea) — typing goes through
 * ft.keyboard.press() per character (real CDP Input.dispatchKeyEvent with text)
 * so the document content actually changes.
 * RELOAD SUBSTITUTION (documented): ft.reload() is banned mid-spec (it destroys
 * the runner's CDP evaluation context), so the "survives a reload" case uses
 * the remount bounce — route away to '/#/', stability-gate, route back. The
 * remount re-runs the module bootstrap, which is equivalent to a reload for
 * localStorage persistence semantics.
 */

function readWordCountJs(): string {
  return `(() => { const el = document.querySelector('[class*="tabular-nums"]'); const text = (el && el.textContent) || ''; const m = text.match(/(\\d+)/); return m ? m[1] : '0'; })()`;
}

async function pollWordCountAtLeast(ft: FtGlobal, min: number): Promise<number> {
  let last = 0;
  for (let i = 0; i < 50; i++) {
    last = Number.parseInt(String(await ft.evaluate(readWordCountJs())), 10);
    if (last >= min) return last;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`word count never reached >= ${min}, last actual ${last}`);
}

// canvas-editor consumes real key events on its hidden textarea; type() would
// only mutate .value, which the canvas bridge ignores.
// TODO(migrate-debt): driver key channel double-inserts every printable char
// (keyDown-with-text AND the follow-up char event each insert once, and the
// runner maps down/up to the same full keyPress) — compensate deterministically
// by pressing Backspace after each char (non-printable keys don't carry text,
// so Backspace deletes exactly one char, leaving a single insertion).
async function typeReal(ft: FtGlobal, text: string): Promise<void> {
  for (const char of text) {
    await ft.keyboard.press(char === ' ' ? 'Space' : char);
    await ft.keyboard.press('Backspace');
  }
}

export default async function wordEditorPersistence(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.locator('.nop-word-editor-page')).toBeVisible({ timeoutMs: 90_000 });

  const marker = `Persistence marker ${Date.now()}`;
  const explicitSaveMarker = `Explicit save marker ${Date.now()}`;

  // Old spec cleared localStorage then re-navigated, so the editor mounted
  // WITHOUT a recovered draft — replicate with a remount bounce (ft.reload()
  // is banned mid-spec). A recovered draft would put the editor into the
  // recovery branch where key input is ignored.
  await ft.evaluate(
    `(() => { localStorage.removeItem('nop-word-editor-document'); localStorage.removeItem('nop-word-editor-datasets'); })()`,
  );
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.locator('.nop-word-editor-page')).toBeVisible({ timeoutMs: 90_000 });
  await ft.expectWeb(ft.getByRole('button', { name: '保存' })).toBeVisible({ timeoutMs: 90_000 });
  await expectNoPageErrors(ft, 'word-editor-persistence:open');

  const canvasElement = ft.locator('canvas').first();
  await ft.expectWeb(canvasElement).toBeVisible({ timeoutMs: 15_000 });
  const initialWordCount = Number.parseInt(String(await ft.evaluate(readWordCountJs())), 10);

  // locator click is unreliable on the <canvas> surface — real CDP click on
  // actual text places the caret. The canvas center may land on a non-text
  // region (cursor placement silently fails and key input is ignored), so
  // click near the first paragraph line (upper-left of the page canvas).
  const canvasBox = await canvasElement.boundingBox();
  if (!canvasBox) throw new Error('editor canvas bounding box missing');
  // Caret placement on the canvas is position-sensitive (canvas center and
  // shallow offsets sometimes land off a text line and key input is silently
  // ignored): click successive offsets down the first text column until a
  // probe character actually inserts (word count rises), then type the
  // marker at that caret.
  let wordCount = initialWordCount;
  let caretPlaced = false;
  for (const offsetY of [90, 120, 150, 180, 210]) {
    await ft.mouse.click(canvasBox.x + 150, canvasBox.y + offsetY);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ft.keyboard.press('X');
    await new Promise((resolve) => setTimeout(resolve, 500));
    wordCount = Number.parseInt(String(await ft.evaluate(readWordCountJs())), 10);
    if (wordCount > initialWordCount) {
      caretPlaced = true;
      // remove the probe char (double-inserted 'XX' → two Backspaces)
      await ft.keyboard.press('Backspace');
      await ft.keyboard.press('Backspace');
      break;
    }
  }
  if (!caretPlaced) throw new Error(`canvas caret placement failed, word count stuck at ${wordCount}`);
  await typeReal(ft, marker);

  await ft.expectWeb(ft.getByTestId('word-editor-saved-preview')).toContainText(marker, { timeoutMs: 10_000 });

  await typeReal(ft, ` ${explicitSaveMarker}`);
  await ft.getByRole('button', { name: '保存' }).click();

  await ft.expectWeb(ft.getByTestId('word-editor-saved-preview')).toContainText(explicitSaveMarker, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('word-editor-save-status')).toContainText('已保存', { timeoutMs: 5_000 });

  // RELOAD SUBSTITUTION: remount bounce (see header note)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.locator('.nop-word-editor-page')).toBeVisible({ timeoutMs: 90_000 });
  await expectNoPageErrors(ft, 'word-editor-persistence:after-remount');

  await ft.expectWeb(ft.getByTestId('word-editor-saved-preview')).toContainText(marker, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('word-editor-saved-preview')).toContainText(explicitSaveMarker, { timeoutMs: 10_000 });
  await pollWordCountAtLeast(ft, initialWordCount);

  await expectNoPageErrors(ft, 'word-editor-persistence');

  return { cases: 1 };
}
