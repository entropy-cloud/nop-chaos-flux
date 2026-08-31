import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const inputProbeRenderer: RendererDefinition = {
  type: 'keyboard-input-probe',
  component: () => <input name="note" data-testid="note-input" readOnly />,
  fields: [],
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderSchema(schema: unknown, data?: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer([inputProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://keyboard-bindings"
      schema={schema as any}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function keyDown(key: string, modifiers: Partial<KeyboardEvent> = {}) {
  return fireEvent.keyDown(window, {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

const probe = { type: 'text', text: 'hits:${hits}' };

describe('keyboard definition contracts', () => {
  it('registers the keyboard renderer as an invisible logic type with the binding field family', async () => {
    const { basicRendererDefinitions } = await import('../index.js');
    const definition = basicRendererDefinitions.find((d) => d.type === 'keyboard');
    expect(definition).toBeTruthy();
    expect(definition?.category).toBe('logic');
    expect(definition?.sourcePackage).toBe('@nop-chaos/flux-renderers-basic');
    const fieldKeys = definition?.fields?.map((f) => f.key);
    expect(fieldKeys).toContain('bindings');
    expect(fieldKeys).toContain('chordTimeout');
    expect(fieldKeys).toContain('onTrigger');
    expect(definition?.defaultSchema?.type).toBe('keyboard');
  });

  it('renders null — zero DOM output for the keyboard node', async () => {
    renderSchema(
      {
        type: 'page',
        body: [{ type: 'keyboard', bindings: [] }, probe],
      },
      { hits: 0 },
    );
    expect(screen.getByText('hits:0')).toBeTruthy();
    expect(document.querySelector('.nop-keyboard')).toBeNull();
    expect(document.querySelector('[data-type="keyboard"]')).toBeNull();
  });
});

describe('key dispatch matrix', () => {
  it('fires the static action track + onTrigger on a bare key hit', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'g',
                action: { action: 'setValue', args: { path: 'hits', value: '${hits + 1}' } },
              },
            ],
            onTrigger: { action: 'setValue', args: { path: 'triggered', value: '${keys}' } },
          },
          probe,
          { type: 'text', text: 'triggered:${triggered}' },
        ],
      },
      { hits: 0 },
    );
    expect(screen.getByText('hits:0')).toBeTruthy();
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:1')).toBeTruthy();
    expect(screen.getByText('triggered:g')).toBeTruthy();
  });

  it('fires modifier combos: mod+k (meta), shift+j, ctrl+alt+d', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'mod+k',
                action: { action: 'setValue', args: { path: 'hits', value: 'modk' } },
              },
              {
                keys: 'shift+j',
                action: { action: 'setValue', args: { path: 'hits', value: 'shiftj' } },
              },
              {
                keys: 'ctrl+alt+d',
                action: { action: 'setValue', args: { path: 'hits', value: 'ctrlaltd' } },
              },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('k', { metaKey: true });
    await flush();
    expect(screen.getByText('hits:modk')).toBeTruthy();
    keyDown('j', { shiftKey: true });
    await flush();
    expect(screen.getByText('hits:shiftj')).toBeTruthy();
    keyDown('d', { ctrlKey: true, altKey: true });
    await flush();
    expect(screen.getByText('hits:ctrlaltd')).toBeTruthy();
    // Wrong modifier shapes never fire.
    keyDown('k');
    keyDown('j', { ctrlKey: true });
    keyDown('d', { ctrlKey: true, altKey: true, shiftKey: true });
    await flush();
    expect(screen.getByText('hits:ctrlaltd')).toBeTruthy();
  });

  it('prevents default on hit by default and honors preventDefault: false', async () => {
    const seen: boolean[] = [];
    const probeListener = (event: KeyboardEvent) => {
      seen.push(event.defaultPrevented);
    };
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
              { keys: 'h', preventDefault: false, action: { action: 'setValue', args: { path: 'hits', value: 2 } } },
            ],
          },
          probe,
        ],
      },
      { hits: 0 },
    );
    window.addEventListener('keydown', probeListener);
    try {
      keyDown('g');
      keyDown('h');
      expect(seen).toEqual([true, false]);
    } finally {
      window.removeEventListener('keydown', probeListener);
    }
  });

  it('fires no side effects for a non-matching key', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
            ],
          },
          probe,
        ],
      },
      { hits: 0 },
    );
    keyDown('x');
    keyDown('g', { shiftKey: true });
    await flush();
    expect(screen.getByText('hits:0')).toBeTruthy();
  });
});

describe('chord timing matrix', () => {
  it('dispatches a chord completed within the window', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'g o',
                action: { action: 'setValue', args: { path: 'hits', value: 'go' } },
              },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:none')).toBeTruthy();
    keyDown('o');
    await flush();
    expect(screen.getByText('hits:go')).toBeTruthy();
  });

  it('does not dispatch when the chord continuation misses the window (kb-chord-timeout)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'g o',
                action: { action: 'setValue', args: { path: 'hits', value: 'go' } },
              },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    keyDown('o');
    await flush();
    expect(screen.getByText('hits:none')).toBeTruthy();
  });

  it('honors a node-level chordTimeout override', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            chordTimeout: 100,
            bindings: [
              {
                keys: 'g o',
                action: { action: 'setValue', args: { path: 'hits', value: 'go' } },
              },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    keyDown('o');
    await flush();
    expect(screen.getByText('hits:go')).toBeTruthy();
  });

  it('re-evaluates a mismatching key from idle so overlapping sequence starts work', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'g o',
                action: { action: 'setValue', args: { path: 'hits', value: 'go' } },
              },
              {
                keys: 'o x',
                action: { action: 'setValue', args: { path: 'hits', value: 'ox' } },
              },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    keyDown('x');
    keyDown('o');
    await flush();
    expect(screen.getByText('hits:none')).toBeTruthy();
    keyDown('x');
    await flush();
    expect(screen.getByText('hits:ox')).toBeTruthy();
  });

  it('waits on a prefix that is both a complete binding and a longer sequence (kb-prefix-conflict)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 'short' } } },
              { keys: 'g o', action: { action: 'setValue', args: { path: 'hits', value: 'long' } } },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:none')).toBeTruthy();
    keyDown('o');
    await flush();
    expect(screen.getByText('hits:long')).toBeTruthy();
  });

  it('falls back to the short binding when the prefix wait times out (kb-prefix-conflict)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 'short' } } },
              { keys: 'g o', action: { action: 'setValue', args: { path: 'hits', value: 'long' } } },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    await flush();
    expect(screen.getByText('hits:short')).toBeTruthy();
  });
});

describe('input focus gating (kb-input-focus)', () => {
  it('suppresses bindings while focus is inside an editable target', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
            ],
          },
          { type: 'keyboard-input-probe' },
          probe,
        ],
      },
      { hits: 0 },
    );
    const input = document.querySelector('input[name="note"]') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'g' });
    await flush();
    expect(screen.getByText('hits:0')).toBeTruthy();
    input.blur();
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:1')).toBeTruthy();
  });

  it('allowInInput: true exempts a binding from the editable-target gate', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'mod+s',
                allowInInput: true,
                action: { action: 'setValue', args: { path: 'hits', value: 'saved' } },
              },
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
            ],
          },
          { type: 'keyboard-input-probe' },
          probe,
        ],
      },
      { hits: 'none' },
    );
    const input = document.querySelector('input[name="note"]') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 's', metaKey: true });
    await flush();
    expect(screen.getByText('hits:saved')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'g' });
    await flush();
    expect(screen.getByText('hits:saved')).toBeTruthy();
  });
});

describe('built-in priority (defaultPrevented skip)', () => {
  it('skips events already consumed by an earlier-registered built-in handler', async () => {
    const builtin = (event: KeyboardEvent) => {
      event.preventDefault();
    };
    window.addEventListener('keydown', builtin);
    try {
      renderSchema(
        {
          type: 'page',
          body: [
            {
              type: 'keyboard',
              bindings: [
                { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
              ],
            },
            probe,
          ],
        },
        { hits: 0 },
      );
      keyDown('g');
      await flush();
      expect(screen.getByText('hits:0')).toBeTruthy();
    } finally {
      window.removeEventListener('keydown', builtin);
    }
  });
});

describe('binding conflicts (kb-conflict)', () => {
  it('dev-warns once and keeps registration order for duplicate normalized sequences', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 'first' } } },
              { keys: 'G', action: { action: 'setValue', args: { path: 'hits', value: 'second' } } },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    const warnCountAfterMount = warn.mock.calls.length;
    expect(warnCountAfterMount).toBeGreaterThan(0);
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:first')).toBeTruthy();
    expect(warn.mock.calls.length).toBe(warnCountAfterMount);
    warn.mockRestore();
  });
});

describe('when gating', () => {
  it('suppresses a binding while its when expression is falsy and re-arms when truthy', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              {
                keys: 'g',
                when: 'canEdit',
                action: { action: 'setValue', args: { path: 'hits', value: 1 } },
              },
            ],
          },
          {
            type: 'button',
            label: 'Enable',
            onClick: { action: 'setValue', args: { path: 'canEdit', value: true } },
          },
          probe,
        ],
      },
      { hits: 0, canEdit: false },
    );
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await flush();
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:1')).toBeTruthy();
  });
});

describe('invalid binding handling', () => {
  it('dev-warns and ignores a binding with malformed keys; siblings stay live', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'mod+ctrl+k', action: { action: 'setValue', args: { path: 'hits', value: 'bad' } } },
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 'good' } } },
            ],
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    expect(warn.mock.calls.some((call) => String(call[0]).includes('mod+ctrl+k'))).toBe(true);
    keyDown('k', { metaKey: true, ctrlKey: true });
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:good')).toBeTruthy();
    warn.mockRestore();
  });
});

describe('listener lifecycle + surface routing (kb-surface-stack)', () => {
  it('unbinds on unmount', async () => {
    const { unmount } = renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 1 } } },
            ],
          },
          probe,
        ],
      },
      { hits: 0 },
    );
    unmount();
    keyDown('g');
    await flush();
    expect(document.querySelector('body')?.textContent).not.toContain('hits:1');
  });

  it('pauses page-level bindings while a dialog surface is open; bindings declared inside the dialog stay live', async () => {
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'keyboard',
            bindings: [
              { keys: 'g', action: { action: 'setValue', args: { path: 'hits', value: 'page' } } },
            ],
          },
          {
            type: 'button',
            label: 'Open dialog',
            onClick: {
              action: 'openDialog',
              args: {
                title: 'Surface',
                body: [
                  {
                    type: 'keyboard',
                    bindings: [
                      {
                        keys: 'd',
                        action: { action: 'setValue', args: { path: 'hits', value: 'surface' } },
                      },
                    ],
                  },
                  { type: 'text', text: 'dialog body' },
                  { type: 'text', text: 'dialog hits:${hits}' },
                ],
              },
            },
          },
          probe,
        ],
      },
      { hits: 'none' },
    );
    keyDown('g');
    await flush();
    expect(screen.getByText('hits:page')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    await screen.findByText('dialog body');
    expect(screen.getByText('dialog hits:page')).toBeTruthy();

    keyDown('g');
    await flush();
    expect(screen.getByText('hits:page')).toBeTruthy();

    keyDown('d');
    await flush();
    expect(screen.getByText('dialog hits:surface')).toBeTruthy();
  });
});
