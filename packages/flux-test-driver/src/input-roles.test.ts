// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createKeyboard, createMouse } from './input.js';
import { buildRoleSelector, matchesAccessibleName } from './roles.js';
import { createLocator } from './locator.js';
import { getRealInput, type RealInputFn } from './real-input.js';
import type { DebuggerApiView } from './types.js';

let doc: Document;

function makeApi(): DebuggerApiView {
  return { controllerId: 'c-1', sessionId: 's-1', getSnapshot: () => ({}) } as DebuggerApiView;
}

const locator = (selector: string) => createLocator(() => doc, selector, { timeoutMs: 300, intervalMs: 20 }, () => makeApi());

beforeEach(() => {
  doc = document;
  doc.body.innerHTML = '';
});

afterEach(() => {
  (globalThis as { __fluxTestRealInput?: RealInputFn }).__fluxTestRealInput = undefined;
});

describe('keyboard', () => {
  it('falls back to synthetic KeyboardEvents and marks lastSynthetic', async () => {
    const keyboard = createKeyboard();
    expect(keyboard.lastSynthetic).toBe(false);
    const events: string[] = [];
    const input = doc.createElement('input');
    input.addEventListener('keydown', (e) => events.push(`down:${(e as KeyboardEvent).key}`));
    input.addEventListener('keyup', (e) => events.push(`up:${(e as KeyboardEvent).key}`));
    doc.body.appendChild(input);
    input.focus();
    await keyboard.press('Enter');
    expect(events).toEqual(['down:Enter', 'up:Enter']);
    expect(keyboard.lastSynthetic).toBe(true);
  });

  it('splits chords and maps ControlOrMeta per platform (real channel)', async () => {
    const sent: Array<{ method: string; params: Record<string, unknown> }> = [];
    (globalThis as { __fluxTestRealInput?: RealInputFn }).__fluxTestRealInput = async (method, params) => {
      sent.push({ method, params });
    };
    const keyboard = createKeyboard();
    await keyboard.press('ControlOrMeta+a');
    expect(sent).toHaveLength(1);
    const isMacPlatform = /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
    expect(MOD_META_BIT((sent[0]!.params.modifiers as number), isMacPlatform)).toBe(true);
    expect(sent[0]!.params.key).toBe('a');
    expect(keyboard.lastSynthetic).toBe(false);
  });

  it('shift maps to modifier bit 8', async () => {
    const sent: Array<Record<string, unknown>> = [];
    (globalThis as { __fluxTestRealInput?: RealInputFn }).__fluxTestRealInput = async (_method, params) => {
      sent.push(params);
    };
    await createKeyboard().press('Shift+ArrowDown');
    expect((sent[0]!.modifiers as number) & 8).toBe(8);
  });
});

function MOD_META_BIT(modifiers: number, isMac: boolean): boolean {
  return isMac ? (modifiers & 4) === 4 : (modifiers & 2) === 2;
}

describe('mouse', () => {
  it('relays move/down/up/click/wheel through the real-input bridge', async () => {
    const sent: Array<{ method: string; params: Record<string, unknown> }> = [];
    (globalThis as { __fluxTestRealInput?: RealInputFn }).__fluxTestRealInput = async (method, params) => {
      sent.push({ method, params });
    };
    const mouse = createMouse();
    await mouse.move(10, 20);
    await mouse.down();
    await mouse.up();
    await mouse.click(30, 40);
    await mouse.wheel(0, 120);
    expect(sent.map((entry) => entry.method)).toEqual(['input.move', 'input.mousedown', 'input.mouseup', 'input.click', 'input.wheel']);
    expect(sent[3]!.params).toEqual({ x: 30, y: 40 });
    expect(sent[4]!.params).toEqual({ deltaX: 0, deltaY: 120 });
  });
});

describe('getByRole helpers', () => {
  it('buildRoleSelector covers implicit heading/button roles with level', () => {
    expect(buildRoleSelector('heading', 1)).toBe('[role="heading"],h1');
    expect(buildRoleSelector('button')).toContain('[role="button"]');
    expect(buildRoleSelector('switch')).toBe('[role="switch"]');
  });

  it('matchesAccessibleName: aria-label first, then text; string exact case-insensitive, regex partial', () => {
    doc.body.innerHTML = `
      <button id="a" aria-label="保存全部">忽略文本</button>
      <button id="b">提交订单</button>
      <h1 id="c">Report Designer Host Playground</h1>`;
    expect(matchesAccessibleName(doc.querySelector('#a')!, '保存全部')).toBe(true);
    expect(matchesAccessibleName(doc.querySelector('#a')!, '忽略文本')).toBe(false);
    expect(matchesAccessibleName(doc.querySelector('#b')!, '提交订单')).toBe(true);
    expect(matchesAccessibleName(doc.querySelector('#b')!, '提交 订单')).toBe(false);
    expect(matchesAccessibleName(doc.querySelector('#c')!, /update|更新/i)).toBe(false);
    expect(matchesAccessibleName(doc.querySelector('#c')!, /playground/i)).toBe(true);
  });

  it('getByRole via createLocator predicate finds elements by name', async () => {
    doc.body.innerHTML = `<h1 id="t">Title</h1><button id="retry">重试</button><button id="cancel">取消</button>`;
    const selector = buildRoleSelector('button');
    const retry = createLocator(() => doc, selector, { timeoutMs: 300, intervalMs: 20, predicate: (el) => matchesAccessibleName(el, '重试') }, () => makeApi());
    await expect(retry.text()).resolves.toBe('重试');
    await expect(retry.count()).resolves.toBe(1);
  });
});

describe('locator extensions', () => {
  it('nested locator composes a descendant selector', async () => {
    doc.body.innerHTML = `<ul id="l"><li>one</li><li>two</li></ul>`;
    const item = locator('ul').locator('li');
    await expect(item.count()).resolves.toBe(2);
    await expect(item.first().text()).resolves.toBe('one');
    await expect(item.last().text()).resolves.toBe('two');
  });

  it('last() tracks the live last element', async () => {
    doc.body.innerHTML = `<ul id="l"><li>a</li><li>b</li></ul>`;
    const last = locator('ul li').last();
    await expect(last.text()).resolves.toBe('b');
    const li = doc.createElement('li');
    li.textContent = 'c';
    doc.querySelector('ul')!.appendChild(li);
    await expect(last.text()).resolves.toBe('c');
  });

  it('boundingBox returns rect coordinates in a layout-capable env (0 in jsdom)', async () => {
    doc.body.innerHTML = `<div id="box">x</div>`;
    const box = await locator('#box').boundingBox();
    expect(box).toHaveProperty('width');
    expect(box).toHaveProperty('height');
  });

  it('selectOption sets selected options and fires change', async () => {
    doc.body.innerHTML = `<select id="s"><option value="a">A</option><option value="b">B</option></select>`;
    const select = doc.querySelector('#s') as HTMLSelectElement;
    let changed = 0;
    select.addEventListener('change', () => {
      changed += 1;
    });
    await locator('#s').selectOption('b');
    expect(changed).toBe(1);
    expect(select.value).toBe('b');
    await locator('#s').selectOption(['a', 'b']);
    expect(select.value).toBe('b');
    doc.body.innerHTML = `<select id="m" multiple><option value="a">A</option><option value="b">B</option></select>`;
    const multi = doc.querySelector('#m') as HTMLSelectElement;
    await locator('#m').selectOption(['a', 'b']);
    expect(Array.from(multi.selectedOptions).map((o) => o.value)).toEqual(['a', 'b']);
  });

  it('check/uncheck fire change on checkboxes', async () => {
    doc.body.innerHTML = `<input type="checkbox" id="cb">`;
    const cb = doc.querySelector('#cb') as HTMLInputElement;
    let changed = 0;
    cb.addEventListener('change', () => {
      changed += 1;
    });
    await locator('#cb').check();
    expect(cb.checked).toBe(true);
    await locator('#cb').uncheck();
    expect(cb.checked).toBe(false);
    expect(changed).toBe(2);
  });
});

describe('real-input bridge', () => {
  it('getRealInput returns undefined when no bridge installed', () => {
    expect(getRealInput()).toBeUndefined();
  });
});
