import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI Rich Text Sender — P6 (A6) end-to-end: Tiptap editor surface (not the
 * Textarea fallback), template bar inserts text, @-mention popup selection,
 * slash command popup, plain-text serialization on submit. Plus the plan 480
 * (visual quality V10) computed-style contract: template button ghost
 * geometry (h-7), decorated placeholder visibility, light↔dark content token
 * flip.
 *
 * Migrated from tests/e2e/ai-rich-text-sender.spec.ts (E3 batch 4, engine
 * swap + the dark-flip case now restores data-mode via a finally-guarded
 * evaluate so a mid-case failure cannot leak the dark attribute into later
 * cases; per-case isolation via the gated hash-route bounce).
 *
 * TODO(migrate-debt): element-scoped evaluate probes (getBoundingClientRect
 * height, ::before pseudo style, getComputedStyle color) go through
 * ft.evaluate with the same probe bodies as the old spec — the driver Locator
 * has no evaluate handle.
 */

async function openRichTextDemo(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the demo remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('ai-rich-text-chat')).not.toBeVisible();
  await ft.goto('/#/ai-rich-text');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  await ft.expectWeb(ft.getByTestId('ai-rich-text-chat')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiRichTextSender(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: renders the Tiptap editor surface (not the Textarea fallback)
  await openRichTextDemo(ft);
  // the ai-sender root carries data-extension when an extension component is bound
  const sender = ft.locator('[data-slot="ai-sender"]');
  await ft.expectWeb(sender).toBeVisible();
  await ft.expectWeb(sender).toHaveAttribute('data-extension', '');
  // the Tiptap contenteditable is present (surface carries the tiptap marker)
  await ft.expectWeb(ft.locator('[data-slot="ai-sender-tiptap"]')).toBeVisible();
  await expectNoPageErrors(ft, 'ai-rich-text:tiptap-surface');

  // Case 2: template bar renders and clicking a template inserts text
  await openRichTextDemo(ft);
  const templateBar = ft.locator('[data-slot="ai-sender-tiptap-templates"]');
  await ft.expectWeb(templateBar).toBeVisible();
  // Wave 1–3 lesson: composed sub-locators lose ancestor scoping — assert the
  // concrete template button instead of templateBar.locator('button').first()
  const greetingTemplate = ft.locator('[data-testid="ai-sender-template-Greeting"]');
  await ft.expectWeb(greetingTemplate).toBeVisible();

  // click the "Greeting" template button
  await greetingTemplate.click();
  // the editor content now includes the template text
  await ft.expectWeb(ft.locator('[data-slot="ai-sender-tiptap"]')).toContainText('Hello! How can I help?');
  await expectNoPageErrors(ft, 'ai-rich-text:template-insert');

  // Case 3: typing @ opens the mention popup and selecting inserts @label
  await openRichTextDemo(ft);
  const content3 = ft.locator('[data-slot="ai-sender-tiptap"]');
  await content3.click();
  // TODO(migrate-debt): ft.keyboard.type is unusable on the tiptap
  // contenteditable (the synthetic per-char relay double-inserts/swallows
  // text, so the mention trigger never fires) — execCommand insertText walks
  // the browser's real input pipeline and ProseMirror transactions fire.
  await ft.evaluate(`document.execCommand('insertText', false, '@al')`);

  const popup3 = ft.locator('[data-slot="ai-sender-tiptap-popup"]');
  await ft.expectWeb(popup3).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(popup3).toHaveAttribute('data-popup-kind', 'mention');

  // select the first match (alice or alex)
  await popup3.locator('button[role="option"]').first().click();

  // the editor now contains @alice or @alex as plain text
  await ft.expectWeb(content3).toContainText('@al');
  await expectNoPageErrors(ft, 'ai-rich-text:mention-popup');

  // Case 4: typing / opens the slash command popup
  await openRichTextDemo(ft);
  const content4 = ft.locator('[data-slot="ai-sender-tiptap"]');
  await content4.click();
  await ft.evaluate(`document.execCommand('insertText', false, ' /sum')`);

  const popup4 = ft.locator('[data-slot="ai-sender-tiptap-popup"]');
  await ft.expectWeb(popup4).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(popup4).toHaveAttribute('data-popup-kind', 'slash');
  await expectNoPageErrors(ft, 'ai-rich-text:slash-popup');

  // Case 5: submitting rich-text content sends plain text to the message list
  await openRichTextDemo(ft);
  const content5 = ft.locator('[data-slot="ai-sender-tiptap"]');
  await content5.click();
  await ft.evaluate(`document.execCommand('insertText', false, 'hello from tiptap')`);

  // submit via the Send button
  await ft.locator('[data-slot="ai-sender-submit"]').click();

  // a user bubble with the plain text appears in the message list
  const userBubble = ft.locator('.nop-ai-bubble[data-role="user"]').first();
  await ft.expectWeb(userBubble).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(userBubble).toContainText('hello from tiptap');
  await expectNoPageErrors(ft, 'ai-rich-text:submit-plaintext');

  // Case 6: template bar buttons carry the unified ghost geometry (h-7)
  await openRichTextDemo(ft);
  const templateButton = ft.locator('[data-testid="ai-sender-template-Greeting"]');
  await ft.expectWeb(templateButton).toBeVisible();
  // TODO(migrate-debt): locator.evaluate — getBoundingClientRect().height
  const height = await ft.evaluate(
    `document.querySelector('[data-testid="ai-sender-template-Greeting"]')?.getBoundingClientRect().height`,
  );
  if (height !== 28) {
    throw new Error(`template button height expected 28 (h-7), got ${JSON.stringify(height)}`);
  }
  await expectNoPageErrors(ft, 'ai-rich-text:ghost-geometry');

  // Case 7: placeholder is visible on the empty tiptap surface (decorated ::before)
  await openRichTextDemo(ft);
  await ft.expectWeb(ft.locator('[data-slot="ai-sender-tiptap-content"]')).toBeVisible();
  // TODO(migrate-debt): locator.evaluate — ::before pseudo style probe
  const pseudo = await ft.evaluate(
    `(() => {
      const root = document.querySelector('[data-slot="ai-sender-tiptap-content"]');
      const p = root && root.querySelector('p.is-editor-empty');
      if (!p) return null;
      const style = getComputedStyle(p, '::before');
      return { content: style.getPropertyValue('content'), color: style.getPropertyValue('color') };
    })()`,
  );
  // the Placeholder extension decorates the empty paragraph; the package CSS
  // renders the label through attr(data-placeholder)
  if (!pseudo || typeof pseudo.content !== 'string') {
    throw new Error('placeholder ::before probe returned null — is-editor-empty paragraph missing');
  }
  if (!pseudo.content.includes('Type a message')) {
    throw new Error(`placeholder content should contain "Type a message", got ${JSON.stringify(pseudo.content)}`);
  }
  if (pseudo.color === 'rgba(0, 0, 0, 0)') {
    throw new Error(`placeholder color is fully transparent: ${JSON.stringify(pseudo)}`);
  }
  await expectNoPageErrors(ft, 'ai-rich-text:placeholder');

  // Case 8: light↔dark flip re-resolves the content token color (dual-track)
  await openRichTextDemo(ft);
  await ft.expectWeb(ft.locator('[data-slot="ai-sender-tiptap-content"]')).toBeVisible();

  const readColor = async (): Promise<string> =>
    await ft.evaluate(
      `(() => { const el = document.querySelector('[data-slot="ai-sender-tiptap-content"]'); return getComputedStyle(el).color; })()`,
    );
  const lightColor = await readColor();

  try {
    await ft.evaluate(`document.documentElement.setAttribute('data-mode', 'dark')`);
    const darkColor = await readColor();
    if (darkColor === lightColor) {
      throw new Error(`dark flip did not re-resolve the content color: stayed ${JSON.stringify(lightColor)}`);
    }
    await ft.evaluate(`document.documentElement.setAttribute('data-mode', 'light')`);
    const restored = await readColor();
    if (restored !== lightColor) {
      throw new Error(`light restore did not return the original color: ${JSON.stringify({ lightColor, restored })}`);
    }
  } finally {
    // never leak the dark attribute into later cases or expectNoPageErrors
    await ft.evaluate(`document.documentElement.setAttribute('data-mode', 'light')`);
  }
  await expectNoPageErrors(ft, 'ai-rich-text:dark-flip');

  return { cases: 8 };
}
