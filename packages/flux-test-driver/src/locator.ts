import type { DebuggerApiView, Locator, LocatorOptions } from './types.js';
import { getRealInput, type RealInputFn } from './real-input.js';

type DocGetter = () => Document;

function realInput(): RealInputFn | undefined {
  return getRealInput();
}

async function centerOf(element: Element): Promise<{ x: number; y: number }> {
  element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  // allow layout to settle after the scroll
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function createLocator(getDoc: DocGetter, selector: string, options: LocatorOptions = {}, getApi: () => DebuggerApiView | undefined = () => undefined): Locator {
  const defaultTimeoutMs = () => options.timeoutMs ?? 5_000;
  const predicate = options.predicate;
  const matches = (element: Element): boolean => (predicate ? predicate(element) : true);
  const queryAll = (): Element[] => Array.from(getDoc().querySelectorAll(selector)).filter(matches);
  const queryOne = (): Element | null => Array.from(getDoc().querySelectorAll(selector)).find(matches) ?? null;

  const retry = async <T>(probe: () => T | null, timeoutMs: number): Promise<T> => {
    const deadline = Date.now() + timeoutMs;
    const intervalMs = options.intervalMs ?? 50;
    let result = probe();
    while (result === null || result === false) {
      if (Date.now() >= deadline) break;
      await sleep(intervalMs);
      result = probe();
    }
    if (result === null || result === false) {
      throw new Error(`locator timeout: ${selector} did not satisfy condition within ${timeoutMs}ms`);
    }
    return result as T;
  };

  const stabilityGate = async (): Promise<void> => {
    const tracker = getApi()?.getStability;
    if (!tracker) return;
    const deadline = Date.now() + 2_000;
    while (!tracker().stable && Date.now() < deadline) {
      await sleep(50);
    }
  };

  const isElementVisible = (element: Element): boolean => {
    // Style-based check: works identically in real browsers and jsdom
    // (jsdom has no layout engine, so bounding rects are always 0).
    // Element-based (not HTMLElement): SVG shapes (rect/path/g) are visible
    // targets too — Playwright treats them as visible.
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    return (element as HTMLElement).checkVisibility?.() !== false;
  };

  const actionability = async (timeoutMs: number): Promise<Element> => {
    return retry(() => {
      const element = queryOne();
      return element && isElementVisible(element) ? element : null;
    }, timeoutMs);
  };

  const fire = (element: Element, type: string, init: EventInit = { bubbles: true, cancelable: true }): boolean => {
    return element.dispatchEvent(new MouseEvent(type, init));
  };

  const act = async (timeoutMs: number, perform: (element: Element) => void | Promise<void>): Promise<void> => {
    const element = await actionability(timeoutMs);
    await perform(element);
    await stabilityGate();
  };

  return {
    async click(opts) {
      await act(opts?.timeoutMs ?? defaultTimeoutMs(), async (element) => {
        const real = realInput();
        if (real) {
          const { x, y } = await centerOf(element);
          await real('input.click', { x, y });
          return;
        }
        fire(element, 'pointerover');
        fire(element, 'mouseover');
        fire(element, 'pointerdown');
        fire(element, 'mousedown');
        fire(element, 'pointerup');
        fire(element, 'mouseup');
        if (element instanceof HTMLElement) element.click();
        else element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
    },
    async dblclick(opts) {
      await act(opts?.timeoutMs ?? defaultTimeoutMs(), (element) => {
        fire(element, 'dblclick');
      });
    },
    async fill(text, opts) {
      const timeoutMs = opts?.timeoutMs ?? defaultTimeoutMs();
      const element = await actionability(timeoutMs);
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
        throw new Error(`locator fill: element is not fillable: ${selector}`);
      }
      element.focus();
      const setter = Object.getOwnPropertyDescriptor(element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      await stabilityGate();
    },
    async type(text, opts) {
      const timeoutMs = opts?.timeoutMs ?? defaultTimeoutMs();
      const element = await actionability(timeoutMs);
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
        throw new Error(`locator type: element is not typable: ${selector}`);
      }
      element.focus();
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      }
      await stabilityGate();
    },
    async press(key, opts) {
      await act(opts?.timeoutMs ?? defaultTimeoutMs(), (element) => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      });
    },
    async hover(opts) {
      await act(opts?.timeoutMs ?? defaultTimeoutMs(), async (element) => {
        const real = realInput();
        if (real) {
          const { x, y } = await centerOf(element);
          await real('input.hover', { x, y });
          return;
        }
        fire(element, 'pointerover');
        fire(element, 'mouseover');
        fire(element, 'pointerenter', { bubbles: false });
        fire(element, 'mouseenter', { bubbles: false });
      });
    },
    async text(opts) {
      await retry(() => queryOne(), opts?.timeoutMs ?? defaultTimeoutMs());
      const element = queryOne() as HTMLElement;
      return element.innerText ?? element.textContent ?? '';
    },
    async innerHTML(opts) {
      await retry(() => (queryOne() ? queryOne() : null), opts?.timeoutMs ?? defaultTimeoutMs());
      return (queryOne() as Element).innerHTML;
    },
    async inputValue(opts) {
      await retry(() => (queryOne() ? queryOne() : null), opts?.timeoutMs ?? defaultTimeoutMs());
      const element = queryOne();
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        return element.value;
      }
      return element?.getAttribute('value') ?? '';
    },
    async attr(name, opts) {
      await retry(() => queryOne(), opts?.timeoutMs ?? defaultTimeoutMs());
      return queryOne()?.getAttribute(name) ?? null;
    },
    async isVisible(opts) {
      try {
        await retry(() => {
          const element = queryOne();
          return element instanceof HTMLElement && isElementVisible(element) ? element : null;
        }, opts?.timeoutMs ?? Math.min(defaultTimeoutMs(), 1_000));
        return true;
      } catch {
        return false;
      }
    },
    async isEnabled(opts) {
      try {
        await retry(() => queryOne(), opts?.timeoutMs ?? Math.min(defaultTimeoutMs(), 1_000));
        const element = queryOne();
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
          return !element.disabled;
        }
        return true;
      } catch {
        return false;
      }
    },
    async count() {
      return queryAll().length;
    },
    nth(index: number) {
      return createIndexedLocator(getDoc, selector, index, options, getApi);
    },
    first() {
      return this.nth(0);
    },
    last() {
      return createIndexedLocator(getDoc, selector, -1, options, getApi);
    },
    locator(sub: string) {
      // descendant composition starts a fresh element set: the parent's
      // index/name predicate must NOT flow into the child (a nth()'d parent's
      // predicate tests elements against the parent's own match list).
      return createLocator(getDoc, `${selector} ${sub}`, { ...options, predicate: undefined }, getApi);
    },
    async boundingBox(opts) {
      await retry(() => (queryOne() ? queryOne() : null), opts?.timeoutMs ?? defaultTimeoutMs());
      const rect = (queryOne() as Element).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    },
    async selectOption(values, opts) {
      const timeoutMs = opts?.timeoutMs ?? defaultTimeoutMs();
      const element = await actionability(timeoutMs);
      if (!(element instanceof HTMLSelectElement)) {
        throw new Error(`locator selectOption: element is not a select: ${selector}`);
      }
      const wanted = Array.isArray(values) ? values : [values];
      for (const option of Array.from(element.options)) {
        option.selected = wanted.includes(option.value) || wanted.includes(option.label);
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      await stabilityGate();
    },
    async check(opts) {
      await setChecked(selector, opts?.timeoutMs ?? defaultTimeoutMs(), actionability, stabilityGate, true);
    },
    async uncheck(opts) {
      await setChecked(selector, opts?.timeoutMs ?? defaultTimeoutMs(), actionability, stabilityGate, false);
    },
    async waitFor(state, opts) {
      const timeoutMs = opts?.timeoutMs ?? defaultTimeoutMs();
      await retry(() => {
        const elements = queryAll();
        if (state === 'attached') {
          return elements.length > 0 ? elements[0]! : null;
        }
        if (state === 'visible') {
          const element = elements[0];
          return element && isElementVisible(element) ? element : null;
        }
        // hidden: either absent or not visible
        const element = elements[0];
        if (!element) return document.body;
        return !isElementVisible(element) ? document.body : null;
      }, timeoutMs);
    },
  };
}

function createIndexedLocator(getDoc: DocGetter, selector: string, index: number, options: LocatorOptions, getApi: () => DebuggerApiView | undefined): Locator {
  // nth()/last() are modeled as an index PREDICATE over the same filtered set
  // the base locator matches — so every base method (click/fill/isEnabled/
  // inputValue/text/…) resolves the indexed element, not the first match.
  // The previous predicate (getByRole name matching, or a chained nth) carries
  // through; the index resolves against the live filtered list on every query.
  const basePredicate = options.predicate;
  const baseMatches = (element: Element): boolean => (basePredicate ? basePredicate(element) : true);
  const indexedPredicate = (element: Element): boolean => {
    const filtered = Array.from(getDoc().querySelectorAll(selector)).filter(baseMatches);
    if (filtered.length === 0) return false;
    const resolved = index < 0 ? filtered.length + index : index;
    return filtered[resolved] === element;
  };
  return createLocator(getDoc, selector, { ...options, predicate: indexedPredicate }, getApi);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setChecked(
  selector: string,
  timeoutMs: number,
  actionability: (timeoutMs: number) => Promise<Element>,
  stabilityGate: () => Promise<void>,
  checked: boolean,
): Promise<void> {
  const element = await actionability(timeoutMs);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`locator check: element is not checkable: ${selector}`);
  }
  element.checked = checked;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  await stabilityGate();
}
