import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 806 — M3-K1 AI 知识库对话页 focused e2e (D3 §5.1 K1 断言清单逐条 + focus
// 三项). Pillar one (programmatic interactions, __replAiCalls 计数证据) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — desktop host-override page, no mobile canvas).
//
// Page shape (D3 §2.1 裁决块 / D6 MAJ-A/MAJ-B): host override 页 —
// ai-conversations 选中态经 host namespace action `replAi:setActive`（activeId
// 所有权归 host store，plan 633 UR-4 同构），历史消息由 host 经
// messageFindPage 取回灌入引擎回显；afterMessages 三件套（citations/feedback/
// token-usage）绑 onResponseComplete 写回的 `${message}` 整快照（activeAnswer）；
// G11 护栏 alert 的 visible 读 `activeAnswer.refused`（D6 前置义务：mock 流
// 完成时快照已携带 sources/refused/usage）。
//
// Fixture dispatch (D3 §4.2): 提问关键字 → 预设（引用→knowledge-answer /
// 长答→slow-stream / 护栏或 forceGuardrail→refusal-guardrail）。
//
// Focus 口径注记：D3 §5.1 focus ①「tab 首站落入 sender 输入框」按 live DOM 序
// 收敛为「Tab 链路可达 sender 输入框（bounded walk）」——ai-conversations 侧栏
// 与 afterMessages 控件在 DOM 上先于 sender（ai-chat 内部 slot 序：header →
// beforeMessages → 消息列表 → afterMessages → sender），sender 不可能是全页
// 首个 tab 停靠点（详见 plan 806 报告勘误建议）。

const COUNTERS_KEY = '__replAiCalls';
const HOOKS_KEY = '__replAiTestHooks';

const ROOT = '[data-testid="ai-knowledge-chat-root"]';
const CONVERSATIONS = '[data-testid="ai-knowledge-chat-conversations"]';
const CHAT = '[data-testid="ai-knowledge-chat-chat"]';
const GUARDRAIL_ALERT = '[data-testid="ai-knowledge-chat-guardrail"]';
const CITATIONS = '[data-testid="ai-knowledge-chat-citations"]';
const TOKEN_USAGE = '[data-testid="ai-knowledge-chat-token-usage"]';
const CONVERSATION_ITEM = '[data-slot="ai-conversations-item"]';
const SENDER_TEXTAREA = '[data-slot="ai-sender"] textarea';
const SENDER_SUBMIT = '[data-slot="ai-sender-submit"]';
const SENDER_CANCEL = '[data-slot="ai-sender-cancel"]';

const SLOW_STREAM_DELAY_MS = 120;
const SLOW_STREAM_FINAL_SENTENCE = '这是一段用于逐帧渲染采样的长答。';

async function openK1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'ai-knowledge-chat', {
    title: 'AI 知识库对话页',
  });
  // Host-seeded conversation list (useConversation initialConversations).
  await expect(page.locator(CONVERSATION_ITEM)).toHaveCount(2);
  await expect(page.locator(SENDER_TEXTAREA)).toBeVisible();
}

async function setReplAiHooks(page: Page, patch: Record<string, unknown>): Promise<void> {
  await page.evaluate((patched) => {
    const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replAiTestHooks;
    if (hooks) Object.assign(hooks, patched);
  }, patch);
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

function lastMessageSaveBody(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    (): Record<string, unknown> =>
      ((window as unknown as Record<string, Partial<Record<string, Record<string, unknown>>>>)
        .__replAiTestHooks ?? {}
      ).lastMessageSaveBody ?? {},
  );
}

/** Send a question through the sender textarea (real user path: fill + Enter). */
async function ask(page: Page, text: string): Promise<void> {
  const textarea = page.locator(SENDER_TEXTAREA);
  await textarea.click();
  await textarea.fill(text);
  await textarea.press('Enter');
}

async function chatText(page: Page): Promise<string> {
  return (await page.locator(CHAT).innerText()) ?? '';
}

test('前置：host 骨架（会话列表 2 行默认选中 + sender + welcome/prompts + afterMessages 控件在位）', async ({
  page,
}) => {
  await openK1(page);

  // host-owned conversation state: two seeded rows, first one active.
  await expect(page.locator(CONVERSATION_ITEM).nth(0)).toContainText('产品知识库');
  await expect(page.locator(CONVERSATION_ITEM).nth(1)).toContainText('部署手册问答');
  await expect(page.locator(CONVERSATION_ITEM).nth(0)).toHaveAttribute('aria-current', 'true');

  // beforeMessages: welcome + prompts chips（三个预设关键字各一枚）.
  await expect(page.locator(`${ROOT} [data-slot="ai-welcome"]`)).toBeVisible();
  const promptItems = page.locator('[data-testid="ai-knowledge-chat-prompts"] [data-slot="ai-prompts-item"]');
  await expect(promptItems).toHaveCount(3);

  // afterMessages 控件在位（activeAnswer 未写回：citations 空列表——空 <ol>
  // 零高度按存在性断言，写回后转可见——+ token 占位）.
  await expect(page.locator(CITATIONS)).toHaveCount(1);
  await expect(page.locator('[data-testid="ai-knowledge-chat-feedback"]')).toBeVisible();
  await expect(page.locator(`${TOKEN_USAGE}[data-empty]`)).toBeVisible();
  await expect(page.locator(GUARDRAIL_ALERT)).toHaveCount(0);

  // 无写操作发生（会话列表来自 host 种子，非 conversationFindPage 取数）.
  expect(await readEndpointCalls(page, COUNTERS_KEY)).toEqual({});
  await assertTrackedPageErrors(page);
});

test('streaming 逐帧：长答两次采样单调增长 → 完成含终句 + messageSave 落库快照携带 sources/usage/finishReason', async ({
  page,
}) => {
  await openK1(page);
  await setReplAiHooks(page, { streamDelayMs: SLOW_STREAM_DELAY_MS });

  // 走 prompts chip 预设提问（ai:send 通道）。
  await page
    .locator('[data-testid="ai-knowledge-chat-prompts"] [data-slot="ai-prompts-item"]')
    .filter({ hasText: '长答' })
    .click();

  // 逐帧渲染：两次 innerText 采样单调增长（D3 §5.1 ①）。
  const sample1 = await chatText(page);
  await page.waitForTimeout(700);
  const sample2 = await chatText(page);
  expect(sample2.length, 'streaming must grow the rendered text between samples').toBeGreaterThan(
    sample1.length,
  );

  // 完成后含 fixture 终句；发送钮恢复（loading 解除）。
  await expect(page.locator(CHAT)).toContainText(SLOW_STREAM_FINAL_SENTENCE, { timeout: 15_000 });
  await expect(page.locator(SENDER_SUBMIT)).toBeVisible();

  // 消息落库（assistant 快照）：conversationId + message 一等字段 + D6 前置
  // 义务扩展字段（sources/refused/usage 非 ChatMessage 一等字段——mock 投影层
  // 必须已携带）。
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__messageSave', { atLeast: 1 });
  const saved = await lastMessageSaveBody(page);
  expect(saved.conversationId).toBe('conv-kb-001');
  const savedMessage = saved.message as Record<string, unknown>;
  expect(savedMessage.role).toBe('assistant');
  expect(String(savedMessage.content)).toContain(SLOW_STREAM_FINAL_SENTENCE);
  expect((savedMessage.metadata as Record<string, unknown>).finishReason).toBe('stop');
  expect(Array.isArray(savedMessage.sources)).toBe(true);
  expect((savedMessage.usage as Record<string, unknown>).total_tokens).toBe(224);
  expect(savedMessage.refused).toBe(false);
  await assertTrackedPageErrors(page);
});

test('停止按钮：慢流期间 cancel 可见可点 → loading 解除、输入框恢复可用', async ({ page }) => {
  await openK1(page);
  await setReplAiHooks(page, { streamDelayMs: 300 });

  await ask(page, '长答：请尽量完整作答');
  // 期间停止钮可见（plan 529 发送/停止同位切换）。
  await expect(page.locator(SENDER_CANCEL)).toBeVisible({ timeout: 5_000 });

  await page.locator(SENDER_CANCEL).click();
  // abort → requestState 'aborted' → 发送钮回来、输入框恢复可用。
  await expect(page.locator(SENDER_SUBMIT)).toBeVisible({ timeout: 5_000 });
  const textarea = page.locator(SENDER_TEXTAREA);
  await expect(textarea).toBeEnabled();
  await expect(textarea).toBeEditable();

  // 停止后的残留增量保留（非 vacuous 提交）→ messageSave 不触发（无 completed）。
  expect(await callCount(page, 'ReplAi__messageSave')).toBe(0);
  await assertTrackedPageErrors(page);
});

test('引用回答：citations mode list 2 条来源 + like → feedbackCreate 计数 + token 用量渲染', async ({
  page,
}) => {
  await openK1(page);

  await ask(page, '引用：flux 的样式契约是什么？');
  // 完成后 citations list（explicit sources = activeAnswer.sources）恰 2 条。
  const citationItems = page.locator(`${CITATIONS} [data-slot="ai-citation-item"]`);
  await expect(citationItems).toHaveCount(2, { timeout: 15_000 });
  await expect(citationItems.nth(0)).toContainText('flux 渲染器样式契约');
  await expect(citationItems.nth(1)).toContainText('stack-* 间距别名规范');

  // 气泡正文保留 [1][2] 上标字面（ai-bubble markdown 渲染）。
  await expect(page.locator(CHAT)).toContainText('[1]');

  // token 用量（metadata.usage.total_tokens = 224，contextLimit 8192）。
  await expect(page.locator(`${TOKEN_USAGE} [data-slot="ai-token-usage-total"]`)).toHaveText('224');
  await expect(page.locator(`${TOKEN_USAGE} [data-slot="ai-token-usage-text"]`)).toContainText('/ 8,192');

  // like → onAction → feedbackCreate 埋点计数 1（G11 缺口口径外的反馈链）。
  const like = page.locator('[data-testid="ai-knowledge-chat-feedback"] [data-slot="ai-feedback-like"]');
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__feedbackCreate', { atLeast: 1 });

  // 非护栏回答：alert 不出现。
  await expect(page.locator(GUARDRAIL_ALERT)).toHaveCount(0);
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__messageSave', { atLeast: 1 });
  await assertTrackedPageErrors(page);
});

test('G11 护栏：forceGuardrail → 拒绝流 refused+content_filter → guardrail alert 可见 + 快照落库', async ({
  page,
}) => {
  await openK1(page);
  // hook 强制护栏预设（D3 §4.2/§5.1：G11 断言只看 alert 可见性）。
  await setReplAiHooks(page, { forceGuardrail: true });

  await ask(page, '随便问点什么');
  const alert = page.locator(GUARDRAIL_ALERT);
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText('本次回答触发内容护栏已被拦截');

  // 拒绝话术渲染在气泡中；token 用量照常出（usage 随拒绝快照携带）。
  await expect(page.locator(CHAT)).toContainText('触及内容护栏');
  await expect(page.locator(`${TOKEN_USAGE} [data-slot="ai-token-usage-total"]`)).toHaveText('224');

  // 落库快照：refused === true + finishReason 'content_filter'。
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__messageSave', { atLeast: 1 });
  const savedMessage = (await lastMessageSaveBody(page)).message as Record<string, unknown>;
  expect(savedMessage.refused).toBe(true);
  expect((savedMessage.metadata as Record<string, unknown>).finishReason).toBe('content_filter');
  await assertTrackedPageErrors(page);
});

test('新建会话 + 会话切换（replAi:setActive）：conversationSave 计数 + 列表行数 +1 + 历史回显往返', async ({
  page,
}) => {
  await openK1(page);

  // 在主会话里先问一轮（供切回后回显）。
  await ask(page, '引用：样式契约');
  await expect(
    page.locator(`${CITATIONS} [data-slot="ai-citation-item"]`),
  ).toHaveCount(2, { timeout: 15_000 });
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__messageSave', { atLeast: 1 });

  // 新建会话：ai:createConversation（host 列表 +1）+ conversationSave 持久化副写。
  await page.locator('[data-slot="ai-conversations-create"]').click();
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__conversationSave', { atLeast: 1 });
  await expect(page.locator(CONVERSATION_ITEM)).toHaveCount(3);
  await expect(page.locator(CONVERSATION_ITEM).filter({ hasText: '新会话' })).toHaveCount(1);
  await expect(page.locator(CONVERSATION_ITEM).filter({ hasText: '新会话' })).toHaveAttribute(
    'aria-current',
    'true',
  );

  // 切到部署手册会话：host 取历史（messageFindPage 计数证据）→ 灌入引擎回显。
  await page.locator(CONVERSATION_ITEM).filter({ hasText: '部署手册问答' }).click();
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__messageFindPage', { atLeast: 1 });
  await expect(page.locator(CONVERSATION_ITEM).filter({ hasText: '部署手册问答' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.locator(CHAT)).toContainText('如何部署 playground？', { timeout: 15_000 });
  await expect(page.locator(CHAT)).toContainText('pnpm build 产出各包 dist 构建物');

  // 切回主会话：刚问的轮次（引擎缓存保留）原样回显——切换全语义（选中回显 +
  // 历史消息进引擎）成立，不收窄。
  await page.locator(CONVERSATION_ITEM).filter({ hasText: '产品知识库' }).click();
  await expect(page.locator(CHAT)).toContainText('引用：样式契约', { timeout: 15_000 });
  await expect(
    page.locator(`${CITATIONS} [data-slot="ai-citation-item"]`),
  ).toHaveCount(0);
  await assertTrackedPageErrors(page);
});

test('focus ①：Tab 链路可达 sender 输入框且可输入（首交互面收敛口径，见文件头注记）', async ({
  page,
}) => {
  await openK1(page);

  // 从会话侧栏最后一个控件出发沿 Tab 链路行走（bounded walk），sender 输入框
  // 必须可达并获得焦点。
  await page.locator(`${CONVERSATIONS} [data-testid="ai-conversations-search"]`).focus();
  let focused = false;
  for (let step = 0; step < 30 && !focused; step += 1) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLTextAreaElement && active.closest('[data-slot="ai-sender"]') !== null;
    });
  }
  expect(focused, 'Tab walk must land focus inside the sender textarea').toBe(true);

  const textarea = page.locator(SENDER_TEXTAREA);
  await textarea.fill('焦点落点可输入');
  await expect(textarea).toHaveValue('焦点落点可输入');
  await assertTrackedPageErrors(page);
});

test('focus ②：streaming 中发送钮切换为停止钮、textarea 保持可输入（text-gating），停止后恢复', async ({
  page,
}) => {
  await openK1(page);
  await setReplAiHooks(page, { streamDelayMs: 300 });

  await ask(page, '长答：状态采样');
  await expect(page.locator(SENDER_CANCEL)).toBeVisible({ timeout: 5_000 });
  // 发送钮同位隐藏（同一位置只渲染一个）。
  await expect(page.locator(SENDER_SUBMIT)).toHaveCount(0);
  // V12e 族1 text-gating：流式期间 textarea 保持 enabled（author 可继续输入）。
  const textarea = page.locator(SENDER_TEXTAREA);
  await expect(textarea).toBeEnabled();

  await page.locator(SENDER_CANCEL).click();
  await expect(page.locator(SENDER_SUBMIT)).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(SENDER_CANCEL)).toHaveCount(0);
  await expect(textarea).toBeEnabled();
  await assertTrackedPageErrors(page);
});

test('focus ③：会话切换后焦点保持文档内、sender 仍可输入（replAi:setActive 不掷焦点出页）', async ({
  page,
}) => {
  await openK1(page);

  await page.locator(CONVERSATION_ITEM).filter({ hasText: '部署手册问答' }).click();
  await expect(page.locator(CHAT)).toContainText('pnpm build 产出各包 dist 构建物', { timeout: 15_000 });

  // 切换动作不把焦点掷出文档（activeElement 仍在页面 DOM 内）。
  const focusInsidePage = await page.evaluate(() => {
    const active = document.activeElement;
    const root = document.querySelector('[data-testid="ai-knowledge-chat-root"]');
    return active !== null && root !== null && (active === root || root.contains(active));
  });
  expect(focusInsidePage).toBe(true);

  const textarea = page.locator(SENDER_TEXTAREA);
  await textarea.click();
  await textarea.fill('切换后仍可输入');
  await expect(textarea).toHaveValue('切换后仍可输入');
  await assertTrackedPageErrors(page);
});
