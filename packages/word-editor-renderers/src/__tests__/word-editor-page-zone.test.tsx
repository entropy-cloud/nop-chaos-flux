// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import {
  editorStore,
  mockState,
  renderWordEditor,
  resetWordEditorActionMocks,
} from './word-editor-page-actions.test-support.js';

describe('WordEditorPage zone switcher', () => {
  afterEach(() => {
    cleanup();
    resetWordEditorActionMocks();
  });

  it('renders the header/main/footer switcher with the main zone active by default', () => {
    resetWordEditorActionMocks();
    renderWordEditor();

    expect(screen.getByTestId('zone-toggle-header').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('zone-toggle-main').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('zone-toggle-footer').getAttribute('aria-pressed')).toBe('false');
  });

  it('optimistically flips the indicator and drives executeSetZone on click', () => {
    resetWordEditorActionMocks();
    renderWordEditor();

    fireEvent.click(screen.getByTestId('zone-toggle-footer'));

    expect(editorStore.setActiveZone).toHaveBeenCalledWith('footer');
    expect(mockState.lastEditorCanvasProps.bridge.command.executeSetZone).toHaveBeenCalledWith(
      'footer',
    );
    expect(screen.getByTestId('zone-toggle-footer').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('zone-toggle-main').getAttribute('aria-pressed')).toBe('false');
  });

  it('follows canvas-driven zone switches (canvas double-click path) without losing sync', () => {
    resetWordEditorActionMocks();
    renderWordEditor();

    act(() => {
      editorStore.setActiveZone('header');
    });

    expect(screen.getByTestId('zone-toggle-header').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('zone-toggle-footer').getAttribute('aria-pressed')).toBe('false');
  });
});
