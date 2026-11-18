// @vitest-environment jsdom
// Locator compat-layer semantics need a real DOM (synthetic events, visibility,
// delayed mount); jsdom provides the event pipeline without a browser.
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocator } from './locator.js';
import { matchesAccessibleName } from './roles.js';
import type { DebuggerApiView } from './types.js';

let doc: Document;

function makeApi(stable: boolean): DebuggerApiView {
  return {
    controllerId: 'c-1',
    sessionId: 's-1',
    getSnapshot: () => ({}),
    getStability: () => ({ stable, counters: {} }),
  } as DebuggerApiView;
}

const locator = (selector: string, opts?: { timeoutMs?: number }) =>
  createLocator(
    () => doc,
    selector,
    { timeoutMs: opts?.timeoutMs ?? 1_000, intervalMs: 20 },
    () => makeApi(true),
  );

function mountButton(attrs: Record<string, string> = {}, text = '提交订单'): HTMLButtonElement {
  const button = doc.createElement('button');
  button.textContent = text;
  for (const [key, value] of Object.entries(attrs)) button.setAttribute(key, value);
  doc.body.appendChild(button);
  return button;
}

beforeEach(() => {
  doc = document;
  doc.body.innerHTML = '';
});

describe('Locator compat layer', () => {
  it('click dispatches a click on a visible element', async () => {
    const button = mountButton({ 'data-testid': 'submit-btn' });
    let clicked = 0;
    button.addEventListener('click', () => clicked++);
    await locator('[data-testid="submit-btn"]').click();
    expect(clicked).toBe(1);
  });

  it('click retries until a delayed element mounts (discriminative: no-retry impl would throw)', async () => {
    let clicked = 0;
    setTimeout(() => {
      const button = mountButton({ 'data-testid': 'late-btn' });
      button.addEventListener('click', () => clicked++);
    }, 200);
    await locator('[data-testid="late-btn"]').click();
    expect(clicked).toBe(1);
  });

  it('click throws locator timeout when element never appears', async () => {
    await expect(locator('[data-testid="ghost"]', { timeoutMs: 120 }).click()).rejects.toThrow(/locator timeout/);
  });

  it('click does not hit invisible elements', async () => {
    const button = mountButton({ style: 'display:none' });
    let clicked = 0;
    button.addEventListener('click', () => clicked++);
    await expect(locator('button').click()).rejects.toThrow(/locator timeout/);
    expect(clicked).toBe(0);
  });

  it('fill sets input value with input+change events', async () => {
    const input = doc.createElement('input');
    input.setAttribute('data-testid', 'name');
    doc.body.appendChild(input);
    let inputEvents = 0;
    input.addEventListener('input', () => inputEvents++);
    await locator('[data-testid="name"]').fill('张三');
    expect(input.value).toBe('张三');
    expect(inputEvents).toBeGreaterThan(0);
  });

  it('fill rejects non-fillable elements', async () => {
    mountButton();
    await expect(locator('button').fill('x')).rejects.toThrow(/not fillable/);
  });

  it('type appends characters with per-char events', async () => {
    const input = doc.createElement('input');
    input.setAttribute('data-testid', 'name');
    doc.body.appendChild(input);
    await locator('[data-testid="name"]').type('ab');
    expect(input.value).toBe('ab');
  });

  it('press dispatches keydown with the key', async () => {
    const input = doc.createElement('input');
    input.setAttribute('data-testid', 'name');
    doc.body.appendChild(input);
    let received = '';
    input.addEventListener('keydown', (event) => {
      received = (event as KeyboardEvent).key;
    });
    await locator('[data-testid="name"]').press('Enter');
    expect(received).toBe('Enter');
  });

  it('hover fires mouseover', async () => {
    const button = mountButton();
    let hovered = 0;
    button.addEventListener('mouseover', () => hovered++);
    await locator('button').hover();
    expect(hovered).toBe(1);
  });

  it('text returns innerText', async () => {
    mountButton({}, '确定');
    expect(await locator('button').text()).toBe('确定');
  });

  it('innerHTML returns serialized children', async () => {
    const div = doc.createElement('div');
    div.innerHTML = '<span>hi</span>';
    doc.body.appendChild(div);
    expect(await locator('div').innerHTML()).toContain('<span>hi</span>');
  });

  it('attr reads attributes and null when missing', async () => {
    mountButton({ 'data-testid': 'b1' });
    expect(await locator('button').attr('data-testid')).toBe('b1');
    expect(await locator('button').attr('title')).toBeNull();
  });

  it('isVisible reflects presence and visibility', async () => {
    mountButton();
    expect(await locator('button').isVisible()).toBe(true);
    expect(await locator('missing-thing').isVisible()).toBe(false);
  });

  it('isEnabled reads disabled state', async () => {
    mountButton({ disabled: '' });
    mountButton({});
    expect(await locator('button[disabled]').isEnabled()).toBe(false);
    expect(await locator('button:not([disabled])').isEnabled()).toBe(true);
  });

  it('count counts matches', async () => {
    mountButton();
    mountButton();
    expect(await locator('button').count()).toBe(2);
  });

  it('nth targets the indexed match', async () => {
    mountButton({}, 'first');
    mountButton({}, 'second');
    expect(await locator('button').nth(1).text()).toBe('second');
    expect(await locator('button').first().text()).toBe('first');
  });

  it('waitFor visible resolves when element mounts late', async () => {
    setTimeout(() => mountButton({ 'data-testid': 'late-wait' }), 100);
    await expect(locator('[data-testid="late-wait"]').waitFor('visible', { timeoutMs: 1_000 })).resolves.toBeUndefined();
  });

  it('waitFor hidden resolves for absent elements', async () => {
    await expect(locator('nonexistent').waitFor('hidden', { timeoutMs: 300 })).resolves.toBeUndefined();
  });

  it('waitFor visible rejects on timeout when element stays hidden', async () => {
    mountButton({ style: 'display:none' });
    await expect(locator('button').waitFor('visible', { timeoutMs: 150 })).rejects.toThrow(/locator timeout/);
  });
});

describe('nth() carries the getByRole predicate', () => {
  it('nth(i) indexes filtered matches, not the raw page-wide selector', async () => {
    doc.body.innerHTML = `
      <button id="a">Inspect</button>
      <span id="noise">noise</span>
      <button id="b">Inspect</button>
      <button id="c">Cancel</button>`;
    const inspect = createLocator(() => doc, 'button', { timeoutMs: 300, intervalMs: 20, predicate: (el) => matchesAccessibleName(el, 'Inspect') }, () => makeApi(true));
    await expect(inspect.count()).resolves.toBe(2);
    await expect(inspect.nth(0).text()).resolves.toBe('Inspect');
    await expect(inspect.nth(1).text()).resolves.toBe('Inspect');
    // index 2 does not exist among filtered matches (raw selector's nth(2) is Cancel)
    const third = inspect.nth(2);
    await expect(third.text()).rejects.toThrow(/timeout/);
    await expect(inspect.last().text()).resolves.toBe('Inspect');
  });
});

describe('indexed locator full-method delegation', () => {
  it('nth(i) resolves isEnabled/inputValue/fill on the indexed element, not the first', async () => {
    doc.body.innerHTML = `
      <input id="i1" value="first" disabled>
      <input id="i2" value="second">`;
    const inputs = locator('input');
    await expect(inputs.nth(1).inputValue()).resolves.toBe('second');
    await expect(inputs.nth(1).isEnabled()).resolves.toBe(true);
    await expect(inputs.nth(0).isEnabled()).resolves.toBe(false);
    await inputs.nth(1).fill('changed');
    await expect((doc.querySelector('#i2') as HTMLInputElement).value).toBe('changed');
    await expect((doc.querySelector('#i1') as HTMLInputElement).value).toBe('first');
    await expect(inputs.last().inputValue()).resolves.toBe('changed');
  });

  it('last() on a getByRole-filtered locator tracks the filtered set', async () => {
    doc.body.innerHTML = `
      <button id="ok1">Inspect</button>
      <button id="no">Cancel</button>
      <button id="ok2">Inspect</button>`;
    const inspects = createLocator(() => doc, 'button', { timeoutMs: 300, intervalMs: 20, predicate: (el) => matchesAccessibleName(el, 'Inspect') }, () => makeApi(true));
    const last = inspects.last();
    await expect(last.text()).resolves.toBe('Inspect');
    (doc.querySelector('#ok2') as HTMLButtonElement).disabled = true;
    await expect(last.isEnabled()).resolves.toBe(false);
  });
});

describe('nested locator under an indexed parent', () => {
  it('child locator is not constrained by the parent nth predicate', async () => {
    doc.body.innerHTML = `
      <div class="card"><button id="b1">Inspect</button></div>
      <div class="card"><button id="b2">Inspect</button><span id="child2">meta</span></div>`;
    const card = locator('div.card').nth(1);
    const child = card.locator('span');
    await expect(child.text()).resolves.toBe('meta');
    await expect(child.count()).resolves.toBe(1);
    const childBtn = card.locator('button');
    await expect(childBtn.text()).resolves.toBe('Inspect');
  });
});
