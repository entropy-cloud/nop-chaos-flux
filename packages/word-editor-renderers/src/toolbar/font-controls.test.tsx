// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { FontControls } from './font-controls.js';
import type { EditorSelectionState } from '@nop-chaos/word-editor-core';

const selection: EditorSelectionState = {
  bold: false,
  italic: false,
  underline: false,
  strikeout: false,
  superscript: false,
  subscript: false,
  font: null,
  size: 16,
  color: null,
  highlight: null,
  rowFlex: null,
  level: null,
  listType: null,
  listStyle: null,
  rowMargin: 0,
  undo: false,
  redo: false,
};

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('FontControls', () => {
  it('renders exactly one redo button', () => {
    render(
      <FontControls
        bridge={{ command: { executeRedo: vi.fn(), executeUndo: vi.fn() } } as any}
        selection={selection}
      />,
    );

    expect(screen.getByTestId('toolbar-undo')).toBeTruthy();
    expect(screen.getByTestId('toolbar-redo')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Redo' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
  });
});
