// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  const React = await import('react');

  interface MockComboboxContextValue {
    items: unknown[] | undefined;
    value: unknown;
    onValueChange?: (item: unknown) => void;
    onItemHighlighted?: (item: unknown | undefined) => void;
  }

  const ComboboxContext = React.createContext<MockComboboxContextValue>({
    items: undefined,
    value: null,
  });

  function MockCombobox({ children, items, value, onValueChange, onItemHighlighted }: any) {
    const contextValue = React.useMemo(
      () => ({ items, value, onValueChange, onItemHighlighted }),
      [items, value, onValueChange, onItemHighlighted],
    );
    return (
      <ComboboxContext.Provider value={contextValue}>
        <div data-testid="mock-combobox">{children}</div>
      </ComboboxContext.Provider>
    );
  }

  function MockComboboxInput(props: any) {
    const ctx = React.useContext(ComboboxContext);
    const label = ctx.value == null ? '' : String(ctx.value);
    return (
      <input
        data-testid={props['data-testid'] ?? 'mock-combobox-input'}
        aria-label={props['aria-label']}
        title={props.title}
        className={props.className}
        placeholder={props.placeholder}
        defaultValue={label}
        key={`${props['data-testid']}:${label}`}
        onKeyDown={props.onKeyDown}
        onBlur={props.onBlur}
      />
    );
  }

  function MockComboboxContent({ children }: any) {
    return <div data-testid="mock-combobox-content">{children}</div>;
  }

  function MockComboboxEmpty({ children }: any) {
    return <div data-testid="mock-combobox-empty">{children}</div>;
  }

  function MockComboboxList({ children }: any) {
    const ctx = React.useContext(ComboboxContext);
    if (typeof children === 'function') {
      return (
        <div data-testid="mock-combobox-list">
          {(ctx.items ?? []).map((item, index) => children(item, index))}
        </div>
      );
    }
    return <div data-testid="mock-combobox-list">{children}</div>;
  }

  function MockComboboxItem({ children, value: itemValue }: any) {
    const ctx = React.useContext(ComboboxContext);
    return (
      <div
        data-testid="mock-combobox-item"
        role="option"
        onMouseEnter={() => ctx.onItemHighlighted?.(itemValue)}
        onClick={() => {
          ctx.onValueChange?.(itemValue);
          ctx.onItemHighlighted?.(undefined);
        }}
      >
        {children}
      </div>
    );
  }

  return {
    ...actual,
    Combobox: MockCombobox,
    ComboboxInput: MockComboboxInput,
    ComboboxContent: MockComboboxContent,
    ComboboxEmpty: MockComboboxEmpty,
    ComboboxList: MockComboboxList,
    ComboboxItem: MockComboboxItem,
  };
});

function setupFontControls(selectionOverrides: Partial<EditorSelectionState> = {}) {
  const command = {
    executeUndo: vi.fn(),
    executeRedo: vi.fn(),
    executeFont: vi.fn(),
    executeSize: vi.fn(),
  };
  render(
    <FontControls
      bridge={{ command } as any}
      selection={{ ...selection, ...selectionOverrides }}
    />,
  );
  return { command };
}

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('FontControls', () => {
  it('renders exactly one redo button', () => {
    setupFontControls();

    expect(screen.getByTestId('toolbar-undo')).toBeTruthy();
    expect(screen.getByTestId('toolbar-redo')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Redo' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
  });

  it('echoes an out-of-preset font size instead of showing blank', () => {
    setupFontControls({ size: 15 });

    const sizeInput = screen.getByTestId('toolbar-size-input') as HTMLInputElement;
    expect(sizeInput.value).toBe('15');
  });

  it('echoes an out-of-preset font family instead of showing blank', () => {
    setupFontControls({ font: '楷体' });

    const fontInput = screen.getByTestId('toolbar-font-input') as HTMLInputElement;
    expect(fontInput.value).toBe('楷体');
  });

  it('commits a free-typed size clamped into the [5,72] canvas-editor range', () => {
    const { command } = setupFontControls();
    const sizeInput = screen.getByTestId('toolbar-size-input') as HTMLInputElement;

    fireEvent.change(sizeInput, { target: { value: '999' } });
    fireEvent.keyDown(sizeInput, { key: 'Enter' });
    expect(command.executeSize).toHaveBeenLastCalledWith(72);

    fireEvent.change(sizeInput, { target: { value: '3' } });
    fireEvent.keyDown(sizeInput, { key: 'Enter' });
    expect(command.executeSize).toHaveBeenLastCalledWith(5);

    fireEvent.change(sizeInput, { target: { value: '15' } });
    fireEvent.keyDown(sizeInput, { key: 'Enter' });
    expect(command.executeSize).toHaveBeenLastCalledWith(15);
  });

  it('commits free-typed font families on Enter and blur, and keeps the previous value on empty input', () => {
    const { command } = setupFontControls();
    const fontInput = screen.getByTestId('toolbar-font-input') as HTMLInputElement;

    fireEvent.change(fontInput, { target: { value: '  楷体  ' } });
    fireEvent.keyDown(fontInput, { key: 'Enter' });
    expect(command.executeFont).toHaveBeenLastCalledWith('楷体');

    fireEvent.change(fontInput, { target: { value: 'Comic Sans MS' } });
    fireEvent.blur(fontInput);
    expect(command.executeFont).toHaveBeenLastCalledWith('Comic Sans MS');

    const fontCallCount = command.executeFont.mock.calls.length;
    fireEvent.change(fontInput, { target: { value: '   ' } });
    fireEvent.keyDown(fontInput, { key: 'Enter' });
    fireEvent.blur(fontInput);
    expect(command.executeFont.mock.calls.length).toBe(fontCallCount);
  });

  it('commits a preset picked from the list without re-committing raw input text', () => {
    const { command } = setupFontControls();
    const fontInput = screen.getByTestId('toolbar-font-input') as HTMLInputElement;

    const simHei = screen.getAllByRole('option', { name: 'SimHei' })[0];
    fireEvent.mouseEnter(simHei);
    fireEvent.click(simHei);
    expect(command.executeFont).toHaveBeenLastCalledWith('SimHei');

    fireEvent.keyDown(fontInput, { key: 'Enter' });
    expect(command.executeFont).toHaveBeenCalledTimes(1);
  });

  it('previews each font item with its own fontFamily', () => {
    setupFontControls();

    const simSun = screen.getAllByRole('option', { name: 'SimSun' })[0];
    const preview = simSun.querySelector('span');
    expect(preview).toBeTruthy();
    expect((preview as HTMLElement).style.fontFamily).toBe('SimSun');

    const arial = screen.getAllByRole('option', { name: 'Arial' })[0];
    const arialPreview = arial.querySelector('span');
    expect((arialPreview as HTMLElement).style.fontFamily).toBe('Arial');
  });
});
