import { test, expect, assertTrackedPageErrors } from './fixtures.js';

async function openCoverage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /AI Coverage/i })).toBeVisible({ timeout: 25_000 });
}

function byTestid(page: import('@playwright/test').Page, testid: string) {
  return page.locator(`[data-testid="${testid}"]`);
}

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082',
  'hex',
);

test.describe('AI coverage — sender modes, limits and cancel', () => {
  test('word count renders, native maxLength truncates, forced over-limit disables submit', async ({ page }) => {
    await openCoverage(page);
    const sender = byTestid(page, 'cov-sender-limit');
    const textarea = sender.locator('textarea');
    const count = sender.locator('[data-slot="ai-sender-count"]');
    const submit = sender.locator('[data-slot="ai-sender-submit"]');
    await expect(sender).toBeVisible({ timeout: 15_000 });

    await textarea.fill('abc');
    await expect(count).toHaveText('3/5');
    await expect(submit).toBeEnabled();

    // Typing beyond maxLength is clamped by the native attribute (truncation).
    await textarea.fill('aaaaaaaaaa');
    await expect(textarea).toHaveValue('aaaaa');
    await expect(count).toHaveText('5/5');

    // Force the defensive over-limit path via the native value setter (bypasses
    // the browser clamp) — count flips destructive and submit disables.
    await textarea.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw new Error('native textarea value setter missing');
      setter.call(el, 'seven77');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(count).toHaveText('7/5');
    await expect(count).toHaveClass(/text-destructive/);
    await expect(submit).toBeDisabled();
    await assertTrackedPageErrors(page);
  });

  test('ctrlEnter mode: Enter does not submit, Ctrl+Enter does', async ({ page }) => {
    await openCoverage(page);
    const probe = byTestid(page, 'cov-probe-ctrl-send');
    await expect(probe).toContainText('SENDCTRL:', { timeout: 15_000 });
    const sender = byTestid(page, 'cov-sender-ctrl');
    const textarea = sender.locator('textarea');
    await textarea.fill('ctrl mode');
    await textarea.press('Enter');
    await expect(probe).toContainText('SENDCTRL:');
    await textarea.press('Control+Enter');
    await expect(probe).toContainText('SENDCTRL:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('shiftEnter mode: Enter inserts a newline, Shift+Enter submits', async ({ page }) => {
    await openCoverage(page);
    const probe = byTestid(page, 'cov-probe-shift-send');
    await expect(probe).toContainText('SENDSHIFT:', { timeout: 15_000 });
    const sender = byTestid(page, 'cov-sender-shift');
    const textarea = sender.locator('textarea');
    await textarea.fill('shift mode');
    await textarea.press('Enter');
    await expect(probe).toContainText('SENDSHIFT:');
    await textarea.press('Shift+Enter');
    await expect(probe).toContainText('SENDSHIFT:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('loading sender disables textarea + submit and shows the cancel action', async ({ page }) => {
    await openCoverage(page);
    const sender = byTestid(page, 'cov-sender-loading');
    await expect(sender).toBeVisible({ timeout: 15_000 });
    await expect(sender.locator('textarea')).toBeDisabled();
    await expect(sender.locator('[data-slot="ai-sender-submit"]')).toBeDisabled();
    await expect(sender.locator('[data-slot="ai-sender-cancel"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('first assistant chunk gap shows the bubble loading placeholder', async ({ page }) => {
    await openCoverage(page);
    const chat = byTestid(page, 'cov-chat-slow');
    await expect(page.locator('[data-slot="ai-chat-root"][data-testid="cov-chat-slow"]')).toBeVisible({
      timeout: 15_000,
    });
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('loading slot');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    // The slow connector delays the first chunk long enough for the loading
    // placeholder (message.loading === true) to be observable.
    await expect(chat.locator('[data-slot="ai-bubble-loading"]')).toBeVisible({ timeout: 10_000 });
    await expect(chat.locator('[data-slot="ai-bubble-loading"]')).toHaveCount(0, { timeout: 20_000 });
    await assertTrackedPageErrors(page);
  });

  test('cancel button aborts an in-flight slow stream', async ({ page }) => {
    await openCoverage(page);
    const chat = byTestid(page, 'cov-chat-slow');
    const root = page.locator('[data-slot="ai-chat-root"][data-testid="cov-chat-slow"]');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('cancel me');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    const cancel = chat.locator('[data-slot="ai-sender-cancel"]');
    await expect(cancel).toBeVisible({ timeout: 5_000 });
    await cancel.click();
    await expect(cancel).toHaveCount(0, { timeout: 5_000 });
    await expect(root).toHaveAttribute('data-state', 'aborted', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — conversations lifecycle', () => {
  test('create dispatches, item click moves data-active, delete dispatches', async ({ page }) => {
    await openCoverage(page);
    const convs = byTestid(page, 'cov-convs');
    await expect(convs.locator('[data-slot="ai-conversations-header"]')).toBeVisible({ timeout: 15_000 });
    await expect(convs.locator('[data-slot="ai-conversations-list"] [data-slot="ai-conversations-item"]')).toHaveCount(3);

    // PAGE_DATA seeds covActiveId='cc1' — the first item starts active.
    await expect(convs.locator('[data-id="cc1"]')).toHaveAttribute('data-active', '');

    await convs.locator('[data-id="cc2"] [data-slot="ai-conversations-item-button"]').click();
    const activeItem = convs.locator('[data-id="cc2"]');
    await expect(activeItem).toHaveAttribute('data-active', '');
    await expect(activeItem).toHaveAttribute('aria-current', 'true');

    await convs.locator('[data-id="cc3"] [data-slot="ai-conversations-item-button"]').click();
    await expect(convs.locator('[data-id="cc3"]')).toHaveAttribute('data-active', '');
    await expect(activeItem).not.toHaveAttribute('data-active');

    await convs.locator('[data-id="cc3"] [data-slot="ai-conversations-delete"]').click();
    await expect(byTestid(page, 'cov-probe-conv-delete')).toContainText('CONVDELETE:fired', { timeout: 5_000 });

    await convs.locator('[data-slot="ai-conversations-create"]').click();
    await expect(byTestid(page, 'cov-probe-conv-create')).toContainText('CONVCREATE:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('rename: Escape cancels without dispatch, Enter commits the event', async ({ page }) => {
    await openCoverage(page);
    const convs = byTestid(page, 'cov-convs');
    await expect(convs).toBeVisible({ timeout: 15_000 });
    const renameInput = convs.locator('[data-slot="ai-conversations-rename-input"]');

    await convs.locator('[data-id="cc1"] [data-slot="ai-conversations-rename"]').click();
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toHaveValue('First Chat');
    await renameInput.fill('Discarded Name');
    await renameInput.press('Escape');
    await expect(renameInput).toHaveCount(0);
    await expect(byTestid(page, 'cov-probe-conv-rename')).not.toContainText('CONVRENAME:fired');

    await convs.locator('[data-id="cc1"] [data-slot="ai-conversations-rename"]').click();
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed Chat');
    await renameInput.press('Enter');
    await expect(renameInput).toHaveCount(0);
    await expect(byTestid(page, 'cov-probe-conv-rename')).toContainText('CONVRENAME:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('showRenameControls=false hides rename/delete but keeps the active marker', async ({ page }) => {
    await openCoverage(page);
    const convs = byTestid(page, 'cov-convs-static');
    await expect(convs).toBeVisible({ timeout: 15_000 });
    await expect(convs.locator('[data-slot="ai-conversations-rename"]')).toHaveCount(0);
    await expect(convs.locator('[data-slot="ai-conversations-delete"]')).toHaveCount(0);
    const active = convs.locator('[data-id="cs1"]');
    await expect(active).toHaveAttribute('data-active', '');
    await expect(active).toHaveAttribute('aria-current', 'true');
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — welcome / prompts / feedback widgets', () => {
  test('welcome renders align variants, icon, title, description and footer region', async ({ page }) => {
    await openCoverage(page);
    const left = byTestid(page, 'cov-welcome-left');
    await expect(left).toBeVisible({ timeout: 15_000 });
    await expect(left).toHaveAttribute('data-align', 'left');
    await expect(left.locator('[data-slot="ai-welcome-icon"]')).toHaveText('🤖');
    await expect(left.locator('[data-slot="ai-welcome-title"]')).toHaveText('Coverage Welcome');
    await expect(left.locator('[data-slot="ai-welcome-description"]')).toHaveText('left aligned welcome panel');
    await expect(byTestid(page, 'cov-welcome-footer')).toBeVisible();

    const right = byTestid(page, 'cov-welcome-right');
    await expect(right).toHaveAttribute('data-align', 'right');
    await assertTrackedPageErrors(page);
  });

  test('prompts: vertical layout with badge + description, onSelect fires; empty state', async ({ page }) => {
    await openCoverage(page);
    const prompts = byTestid(page, 'cov-prompts-vertical');
    await expect(prompts).toBeVisible({ timeout: 15_000 });
    await expect(prompts).toHaveAttribute('data-layout', 'vertical');
    const items = prompts.locator('[data-slot="ai-prompts-item"]');
    await expect(items).toHaveCount(2);
    await expect(items.first().locator('[data-slot="ai-prompts-item-label"]')).toHaveText('Prompt One');
    await expect(items.first().locator('[data-slot="ai-prompts-item-badge"]')).toHaveText('NEW');
    await expect(items.first().locator('[data-slot="ai-prompts-item-description"]')).toHaveText('first description');

    await items.first().click();
    await expect(byTestid(page, 'cov-probe-prompt')).toContainText('PROMPT:fired', { timeout: 5_000 });

    // Layout variants: vertical (above) + horizontal + wrap (widgets-demo page).
    await expect(byTestid(page, 'cov-prompts-horizontal')).toHaveAttribute('data-layout', 'horizontal');

    await expect(byTestid(page, 'cov-prompts-empty')).toHaveAttribute('data-empty', '');
    await assertTrackedPageErrors(page);
  });

  test('feedback like/dislike toggle data-active and fire onAction; custom actions hide copy', async ({ page }) => {
    await openCoverage(page);
    const feedback = byTestid(page, 'cov-feedback-vote');
    await expect(feedback).toBeVisible({ timeout: 15_000 });
    const like = feedback.locator('[data-slot="ai-feedback-like"]');
    const dislike = feedback.locator('[data-slot="ai-feedback-dislike"]');
    await expect(feedback.locator('[data-slot="ai-feedback-copy"]')).toHaveCount(0);
    await expect(feedback.locator('[data-slot="ai-feedback-refresh"]')).toHaveCount(0);

    await like.click();
    await expect(like).toHaveAttribute('data-active', '');
    await expect(dislike).not.toHaveAttribute('data-active');
    await like.click();
    await expect(like).not.toHaveAttribute('data-active');

    await dislike.click();
    await expect(dislike).toHaveAttribute('data-active', '');
    await expect(byTestid(page, 'cov-probe-feedback')).toContainText('FEEDBACK:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('feedback copy flips to the Copied state', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openCoverage(page);
    const feedback = byTestid(page, 'cov-feedback-copy');
    await expect(feedback).toBeVisible({ timeout: 15_000 });
    const copy = feedback.locator('[data-slot="ai-feedback-copy"]');
    await expect(copy).toBeVisible();
    await copy.click();
    await expect(copy).toContainText(/copied|已复制/i, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — tool-call states, args and HITL', () => {
  test('running / success / failed statuses map to data-tool-status and status borders', async ({ page }) => {
    await openCoverage(page);
    const running = byTestid(page, 'cov-tool-running');
    await expect(running).toBeVisible({ timeout: 15_000 });
    await expect(running).toHaveAttribute('data-tool-status', 'running');

    const success = byTestid(page, 'cov-tool-success');
    await expect(success).toHaveAttribute('data-tool-status', 'success');
    await expect(success).toHaveClass(/border-success/);

    const failed = byTestid(page, 'cov-tool-failed');
    await expect(failed).toHaveAttribute('data-tool-status', 'failed');
    await expect(failed).toHaveClass(/border-destructive/);
    await assertTrackedPageErrors(page);
  });

  test('args toggle expands and collapses the JSON arguments', async ({ page }) => {
    await openCoverage(page);
    const tool = byTestid(page, 'cov-tool-args');
    await expect(tool).toBeVisible({ timeout: 15_000 });
    const args = tool.locator('[data-slot="ai-tool-call-args"]');
    await expect(tool).toHaveAttribute('data-open', '');
    await expect(args).toBeVisible();
    await expect(args).toContainText('city');

    await tool.locator('[data-slot="ai-tool-call-toggle"]').click();
    await expect(tool).not.toHaveAttribute('data-open');
    await expect(args).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('pending approval without a handler disables approve/reject with a title hint', async ({ page }) => {
    await openCoverage(page);
    const tool = byTestid(page, 'cov-tool-pending-nohandler');
    await expect(tool).toBeVisible({ timeout: 15_000 });
    await expect(tool).toHaveAttribute('data-approval', 'pending');
    await expect(tool).toHaveAttribute('data-requires-approval', '');
    const approve = tool.locator('[data-slot="ai-tool-call-approve"]');
    const reject = tool.locator('[data-slot="ai-tool-call-reject"]');
    await expect(approve).toBeDisabled();
    await expect(reject).toBeDisabled();
    await expect(approve).toHaveAttribute('title');
    await assertTrackedPageErrors(page);
  });

  test('focus trap cycles Tab between approve and reject', async ({ page }) => {
    await openCoverage(page);
    const tool = byTestid(page, 'cov-tool-pending');
    await expect(tool).toBeVisible({ timeout: 15_000 });

    // Entering pending moves focus onto the approve action.
    await expect
      .poll(
        async () => tool.locator('[data-slot="ai-tool-call-approve"]:focus').count(),
        { timeout: 5_000 },
      )
      .toBe(1);

    await page.keyboard.press('Tab');
    await expect
      .poll(
        async () => tool.locator('[data-slot="ai-tool-call-reject"]:focus').count(),
        { timeout: 5_000 },
      )
      .toBe(1);

    await page.keyboard.press('Tab');
    await expect
      .poll(
        async () => tool.locator('[data-slot="ai-tool-call-approve"]:focus').count(),
        { timeout: 5_000 },
      )
      .toBe(1);
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — attachments states, drag/paste and limits', () => {
  test('empty state shows only the pick button; pick opens the file chooser', async ({ page }) => {
    await openCoverage(page);
    const att = byTestid(page, 'cov-att-limits');
    await expect(att).toBeVisible({ timeout: 15_000 });
    await expect(att.locator('[data-slot="ai-attachments-pick"]')).toBeVisible();
    await expect(att.locator('[data-slot="ai-attachments-upload"]')).toHaveCount(0);
    await expect(att.locator('[data-slot="ai-attachments-item"]')).toHaveCount(0);

    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), att.locator('[data-slot="ai-attachments-pick"]').click()]);
    expect(chooser.isMultiple()).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('drag-over sets data-dragging, drop adds the file, drag-leave clears it', async ({ page }) => {
    await openCoverage(page);
    const att = byTestid(page, 'cov-att-limits');
    await expect(att).toBeVisible({ timeout: 15_000 });

    const dragFile = (type: string) =>
      att.evaluate((el, evtType) => {
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array([1, 2, 3])], 'dropped.png', { type: 'image/png' }));
        el.dispatchEvent(new DragEvent(evtType, { bubbles: true, cancelable: true, dataTransfer: dt }));
      }, type);

    await dragFile('dragover');
    await expect(att).toHaveAttribute('data-dragging', '');

    await dragFile('dragleave');
    await expect(att).not.toHaveAttribute('data-dragging');

    await dragFile('dragover');
    await dragFile('drop');
    await expect(att.locator('[data-slot="ai-attachments-item"]')).toHaveCount(1, { timeout: 5_000 });
    await expect(att.locator('[data-slot="ai-attachments-thumb"]')).toHaveCount(1);
    await expect(att).not.toHaveAttribute('data-dragging');
    await assertTrackedPageErrors(page);
  });

  test('pasting an image file adds it as an attachment', async ({ page }) => {
    await openCoverage(page);
    const att = byTestid(page, 'cov-att-limits');
    await expect(att).toBeVisible({ timeout: 15_000 });

    await att.evaluate((el) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array([1, 2, 3])], 'pasted.png', { type: 'image/png' }));
      const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'clipboardData', { value: dt });
      el.dispatchEvent(ev);
    });
    await expect(att.locator('[data-slot="ai-attachments-item"]')).toHaveCount(1, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('maxSize and maxFiles violations reject files and fire onError', async ({ page }) => {
    await openCoverage(page);
    const att = byTestid(page, 'cov-att-limits');
    await expect(att).toBeVisible({ timeout: 15_000 });
    const input = att.locator('[data-slot="ai-attachments-input"]');
    const probe = byTestid(page, 'cov-probe-att-error');
    await expect(probe).toContainText('ATTERR:', { timeout: 15_000 });

    // 200-byte payload exceeds maxSize=100 → rejected, onError fires.
    await input.setInputFiles([{ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(200, 1) }]);
    await expect(att.locator('[data-slot="ai-attachments-item"]')).toHaveCount(0);
    await expect(probe).toContainText('ATTERR:fired', { timeout: 5_000 });

    // 3 files against maxFiles=2 → two kept, surplus rejected, onError fires.
    await input.setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'b.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'c.png', mimeType: 'image/png', buffer: TINY_PNG },
    ]);
    await expect(att.locator('[data-slot="ai-attachments-item"]')).toHaveCount(2, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('upload button is disabled while the chat is processing, enabled after', async ({ page }) => {
    await openCoverage(page);
    const chat = byTestid(page, 'cov-chat-slow');
    await expect(page.locator('[data-slot="ai-chat-root"][data-testid="cov-chat-slow"]')).toBeVisible({ timeout: 15_000 });
    const att = byTestid(page, 'cov-att-in-chat');
    await att.locator('[data-slot="ai-attachments-input"]').setInputFiles([
      { name: 'gate.png', mimeType: 'image/png', buffer: TINY_PNG },
    ]);
    const upload = att.locator('[data-slot="ai-attachments-upload"]');
    await expect(upload).toBeVisible();
    await expect(upload).toBeEnabled();

    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('upload gating');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(upload).toBeDisabled({ timeout: 5_000 });
    await expect(page.locator('[data-slot="ai-chat-root"][data-testid="cov-chat-slow"]')).toHaveAttribute('data-state', 'completed', {
      timeout: 20_000,
    });
    await expect(upload).toBeEnabled();
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — citations list mode and missing sources', () => {
  test('list mode renders ordered items with url link and open-source button', async ({ page }) => {
    await openCoverage(page);
    const citations = byTestid(page, 'cov-citations-list');
    await expect(citations).toBeVisible({ timeout: 15_000 });
    await expect(citations).toHaveAttribute('data-mode', 'list');
    const items = citations.locator('[data-slot="ai-citation-item"]');
    await expect(items).toHaveCount(2);

    const url = items.first().locator('[data-slot="ai-citation-url"]');
    await expect(url).toBeVisible();
    await expect(url).toHaveAttribute('href', 'https://coverage.example.com/source-1');
    await expect(items.nth(1).locator('[data-slot="ai-citation-url"]')).toHaveCount(0);

    const probe = byTestid(page, 'cov-probe-citation');
    await expect(probe).toContainText('CITATION:', { timeout: 15_000 });
    await items.nth(1).locator('[data-slot="ai-citation-open"]').click();
    await expect(probe).toContainText('CITATION:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('inline citation for a missing source renders the empty card', async ({ page }) => {
    await openCoverage(page);
    const citations = byTestid(page, 'cov-citations-inline');
    await expect(citations).toBeVisible({ timeout: 15_000 });
    await citations.locator('[data-slot="ai-citation-trigger"][data-citation-index="5"]').click();
    // PopoverContent renders in a portal outside the citations subtree.
    await expect(page.locator('[data-slot="ai-citation-empty"]')).toBeVisible({ timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — voice input states', () => {
  test('unsupported browser: data-unsupported, disabled button and badge', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    });
    await openCoverage(page);
    const voice = byTestid(page, 'cov-voice');
    await expect(voice).toBeVisible({ timeout: 15_000 });
    await expect(voice).toHaveAttribute('data-unsupported', '');
    await expect(voice).toBeDisabled();
    await expect(page.locator('[data-slot="ai-voice-input-unavailable-badge"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('supported browser: click starts listening with waveform, result fires, stop returns idle', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeSpeechRecognition {
        static last: FakeSpeechRecognition | null = null;
        lang = '';
        continuous = false;
        interimResults = false;
        onresult: ((event: unknown) => void) | null = null;
        onerror: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start(): void {
          FakeSpeechRecognition.last = this;
        }
        stop(): void {
          this.onend?.();
        }
        abort(): void {
          this.onend?.();
        }
      }
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition;
    });
    await openCoverage(page);
    const voice = byTestid(page, 'cov-voice');
    await expect(voice).toBeVisible({ timeout: 15_000 });
    await expect(voice).toHaveAttribute('data-state', 'idle');
    await expect(voice).not.toHaveAttribute('data-unsupported');

    await voice.click();
    await expect(voice).toHaveAttribute('data-state', 'listening');
    await expect(voice).toHaveAttribute('aria-pressed', 'true');
    await expect(voice.locator('[data-slot="ai-voice-input-wave"]')).toBeVisible();

    const probe = byTestid(page, 'cov-probe-voice');
    await expect(probe).toContainText('VOICE:', { timeout: 15_000 });
    await page.evaluate(() => {
      const fake = (
        window as unknown as {
          SpeechRecognition: { last: { onresult: ((event: unknown) => void) | null } | null } | null;
        }
      ).SpeechRecognition;
      fake?.last?.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: 'hello voice' }, isFinal: true }],
      });
    });
    await expect(probe).toContainText('VOICE:fired', { timeout: 5_000 });

    await voice.click();
    await expect(voice).toHaveAttribute('data-state', 'idle');
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — token usage states', () => {
  test('missing usage renders the data-empty placeholder', async ({ page }) => {
    await openCoverage(page);
    const token = byTestid(page, 'cov-token-empty');
    await expect(token).toBeVisible({ timeout: 15_000 });
    await expect(token).toHaveAttribute('data-empty', '');
    await expect(token).not.toHaveText('');
    await assertTrackedPageErrors(page);
  });

  test('usage renders total, prompt/completion arrows, cost, a half ring and fires onClick', async ({ page }) => {
    await openCoverage(page);
    const token = byTestid(page, 'cov-token-ring');
    await expect(token).toBeVisible({ timeout: 15_000 });
    await expect(token.locator('[data-slot="ai-token-usage-total"]')).toHaveText('250');
    await expect(token.locator('[data-slot="ai-token-usage-prompt"]')).toHaveText('↑100');
    await expect(token.locator('[data-slot="ai-token-usage-completion"]')).toHaveText('↓50');
    await expect(token.locator('[data-slot="ai-token-usage-cost"]')).toHaveText('$0.0025');

    // 250 of 500 context → the ring arc is exactly half the circumference.
    const dash = await token.locator('[data-slot="ai-token-usage-ring"] circle').nth(1).getAttribute('stroke-dasharray');
    const [arc, gap] = (dash ?? '').split(/\s+/).map(Number);
    expect(arc).toBeGreaterThan(0);
    expect(Math.abs(arc - gap)).toBeLessThan(0.01);

    const probe = byTestid(page, 'cov-probe-token');
    await expect(probe).toContainText('TOKEN:', { timeout: 15_000 });
    await token.click();
    await expect(probe).toContainText('TOKEN:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });
});

test.describe('AI coverage — suggestions overflow modes', () => {
  test('scroll mode keeps a horizontal scroller and fires onSelect', async ({ page }) => {
    await openCoverage(page);
    const suggestions = byTestid(page, 'cov-suggestions-scroll');
    await expect(suggestions).toBeVisible({ timeout: 15_000 });
    await expect(suggestions).toHaveAttribute('data-overflow', 'scroll');
    const overflowX = await suggestions.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    const probe = byTestid(page, 'cov-probe-suggestion');
    await expect(probe).toContainText('SUGGESTION:', { timeout: 15_000 });
    await suggestions.locator('[data-slot="ai-suggestions-item"]').first().click();
    await expect(probe).toContainText('SUGGESTION:fired', { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('popover mode shows maxVisible pills and opens the +N overflow list', async ({ page }) => {
    await openCoverage(page);
    const suggestions = byTestid(page, 'cov-suggestions-popover');
    await expect(suggestions).toBeVisible({ timeout: 15_000 });
    await expect(suggestions).toHaveAttribute('data-overflow', 'popover');
    await expect(suggestions.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(2);

    const overflow = suggestions.locator('[data-slot="ai-suggestions-overflow"]');
    await expect(overflow).toHaveText('+2');
    await overflow.click();
    // PopoverContent renders in a portal outside the suggestions subtree.
    const overflowList = page.locator('[data-slot="ai-suggestions-overflow-list"]');
    await expect(overflowList).toBeVisible({ timeout: 5_000 });
    await expect(overflowList.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(2);
    await assertTrackedPageErrors(page);
  });

  test('empty suggestions render the data-empty state', async ({ page }) => {
    await openCoverage(page);
    await expect(byTestid(page, 'cov-suggestions-empty')).toHaveAttribute('data-empty', '', { timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });
});

