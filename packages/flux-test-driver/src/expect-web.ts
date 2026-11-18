import type { Locator, WebExpectNotify, WebExpectApi, WebLocatorExpectation } from './types.js';

export const WEB_ASSERT_DEFAULT_TIMEOUT_MS = 5_000;

interface ProbeOutcome {
  pass: boolean;
  actual: unknown;
}

type Probe = () => ProbeOutcome | Promise<ProbeOutcome>;

/**
 * Playwright-style web assertions over the flux-test Locator subset: every
 * assertion polls until it passes or the timeout elapses (retry-able, matching
 * `expect(locator)...` semantics), and reports selector + assertion + last
 * actual value on failure.
 */
export function createWebExpect(notify: WebExpectNotify): WebExpectApi {
  return (locator: Locator) => buildExpectation(locator, false, notify);
}

function buildExpectation(locator: Locator, inverted: boolean, notify: WebExpectNotify): WebLocatorExpectation {
  const assert = async (kind: string, expected: unknown, probe: Probe, options?: { timeoutMs?: number }): Promise<void> => {
    const timeoutMs = options?.timeoutMs ?? WEB_ASSERT_DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    let last: ProbeOutcome = { pass: false, actual: undefined };
    while (Date.now() < deadline) {
      last = await probe();
      if (last.pass !== inverted) {
        notify({ passed: true, kind, actual: last.actual, expected });
        return;
      }
      await sleep(50);
    }
    notify({ passed: false, kind, actual: last.actual, expected });
    throw new Error(`web assertion failed (${inverted ? 'not ' : ''}${kind}) within ${timeoutMs}ms: expected ${describe(expected)}, last actual ${describe(last.actual)}`);
  };

  const api: WebLocatorExpectation = {
    not: undefined as unknown as WebLocatorExpectation['not'],
    async toBeVisible(options) {
      await assert('toBeVisible', 'visible', async () => {
        const visible = await locator.isVisible(options);
        return { pass: visible, actual: visible };
      }, options);
    },
    async toBeHidden(options) {
      await assert('toBeHidden', 'hidden', async () => {
        const visible = await locator.isVisible(options);
        return { pass: !visible, actual: visible };
      }, options);
    },
    async toContainText(expected, options) {
      await assert('toContainText', expected, async () => {
        const text = await locator.text(options);
        return { pass: text.includes(expected), actual: text };
      }, options);
    },
    async toHaveText(expected, options) {
      await assert('toHaveText', expected, async () => {
        const text = await locator.text(options);
        return { pass: text.trim() === expected, actual: text };
      }, options);
    },
    async toHaveAttribute(name, expected, options) {
      await assert(`toHaveAttribute(${name})`, expected, async () => {
        const value = await locator.attr(name, options);
        if (expected === undefined) return { pass: value !== null, actual: value };
        return { pass: value === expected, actual: value };
      }, options);
    },
    async toHaveValue(expected, options) {
      await assert('toHaveValue', expected, async () => {
        const value = await locator.inputValue(options);
        return { pass: value === expected, actual: value };
      }, options);
    },
    async toHaveCount(expected, options) {
      await assert('toHaveCount', expected, async () => {
        const count = await locator.count();
        return { pass: count === expected, actual: count };
      }, options);
    },
    async toBeEnabled(options) {
      await assert('toBeEnabled', 'enabled', async () => {
        const enabled = await locator.isEnabled(options);
        return { pass: enabled, actual: enabled };
      }, options);
    },
    async toBeDisabled(options) {
      await assert('toBeDisabled', 'disabled', async () => {
        const enabled = await locator.isEnabled(options);
        return { pass: !enabled, actual: enabled };
      }, options);
    },
  };
  api.not = {
    toBeVisible: (options) => buildExpectation(locator, true, notify).toBeVisible(options),
    toBeHidden: (options) => buildExpectation(locator, true, notify).toBeHidden(options),
    toContainText: (expected, options) => buildExpectation(locator, true, notify).toContainText(expected, options),
    toHaveText: (expected, options) => buildExpectation(locator, true, notify).toHaveText(expected, options),
    toHaveAttribute: (name, expected, options) => buildExpectation(locator, true, notify).toHaveAttribute(name, expected, options),
    toHaveValue: (expected, options) => buildExpectation(locator, true, notify).toHaveValue(expected, options),
    toHaveCount: (expected, options) => buildExpectation(locator, true, notify).toHaveCount(expected, options),
    toBeEnabled: (options) => buildExpectation(locator, true, notify).toBeEnabled(options),
    toBeDisabled: (options) => buildExpectation(locator, true, notify).toBeDisabled(options),
  };
  return api;
}

function describe(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value.length > 120 ? `${value.slice(0, 120)}…` : value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
