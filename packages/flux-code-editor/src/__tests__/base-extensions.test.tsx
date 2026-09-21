import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createBaseExtensions } from '../extensions/base.js';

function mountEditor(doc = 'const value = 1;') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: createBaseExtensions({ language: 'javascript', lineNumbers: true }),
    }),
    parent: host,
  });
  return { view, host };
}

/**
 * Drives typed-text input through the public EditorView.inputHandler facet —
 * the exact production path closeBrackets hooks. happy-dom cannot synthesize
 * real contenteditable mutations, so DOM-level beforeinput events never reach
 * CM6's input pipeline; when no handler claims the text we fall back to a
 * plain insert (which does NOT auto-pair), keeping the red phase honest.
 */
function typeChar(view: EditorView, char: string): void {
  const selection = view.state.selection.main;
  let handled = false;
  for (const handler of view.state.facet(EditorView.inputHandler)) {
    const result = handler(view, selection.from, selection.to, char, () =>
      view.state.update({
        changes: { from: selection.from, to: selection.to, insert: char },
        selection: { anchor: selection.from + char.length },
      }),
    );
    if (result) {
      if (result !== true) {
        view.dispatch(result);
      }
      handled = true;
      break;
    }
  }
  if (!handled) {
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: char },
      selection: { anchor: selection.from + char.length },
    });
  }
}

function pressModF(view: EditorView): void {
  const base: KeyboardEventInit = {
    key: 'f',
    code: 'KeyF',
    bubbles: true,
    cancelable: true,
  };
  view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { ...base, metaKey: true }));
  view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { ...base, ctrlKey: true }));
}

describe('createBaseExtensions editor capabilities', () => {
  it('opens the search panel via the search keymap (Mod-f)', () => {
    const { view, host } = mountEditor();
    view.focus();

    pressModF(view);

    const panel = host.querySelector('.cm-panel.cm-search');
    expect(panel, 'Mod-f should open the .cm-panel.cm-search panel').toBeTruthy();

    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(host.querySelector('.cm-panel.cm-search')).toBeNull();
  });

  it('auto-closes brackets while typing', () => {
    // Typing at end-of-line: closeBrackets intentionally skips auto-pairing
    // when the character after the cursor is a word character.
    const { view } = mountEditor('');
    view.focus();

    typeChar(view, '(');

    expect(view.state.doc.toString()).toBe('()');
  });

  it('highlights the active line and gutter', () => {
    const { view, host } = mountEditor();
    view.focus();

    expect(host.querySelector('.cm-activeLine'), '.cm-activeLine should exist').toBeTruthy();
    expect(
      host.querySelector('.cm-activeLineGutter'),
      '.cm-activeLineGutter should exist',
    ).toBeTruthy();
  });
});
