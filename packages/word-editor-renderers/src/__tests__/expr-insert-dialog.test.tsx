import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { TemplateExpr } from '@nop-chaos/word-editor-core';
import { ExprInsertDialog } from '../dialogs/expr-insert-dialog.js';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, ...props }: any) => (
      <button type="button" data-testid="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Input: ({ value, onChange, placeholder, ...props }: any) => (
      <input
        data-testid="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    ),
    Textarea: ({ value, onChange, placeholder, ...props }: any) => (
      <textarea
        data-testid="textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    ),
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
    DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
    DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
    NativeSelect: ({ value, onChange, children: ch, ...props }: any) => (
      <select data-testid="native-select" value={value} onChange={onChange} {...props}>
        {ch}
      </select>
    ),
    NativeSelectOption: ({ value, children }: any) => <option value={value}>{children}</option>,
    Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, onClick, ...props }: any) => (
      <button type="button" data-testid="tabs-trigger" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    TabsContent: ({ children }: any) => <div data-testid="tabs-content">{children}</div>,
    Label: ({ children, ...props }: any) => (
      <label data-testid="label" {...props}>
        {children}
      </label>
    ),
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
  };
});

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('ExprInsertDialog', () => {
  function renderDialog(overrides?: {
    onInsertExpr?: (expr: string) => void;
    onInsertTag?: (expr: TemplateExpr) => void;
    onClose?: () => void;
    open?: boolean;
  }) {
    return render(
      <ExprInsertDialog
        open={overrides?.open ?? true}
        onClose={overrides?.onClose ?? vi.fn()}
        onInsertExpr={overrides?.onInsertExpr ?? vi.fn()}
        onInsertTag={overrides?.onInsertTag ?? vi.fn()}
      />,
    );
  }

  it('renders dialog when open', () => {
    renderDialog();
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders title', () => {
    renderDialog();
    expect(screen.getByText('Insert Template Expression')).toBeInTheDocument();
  });

  it('renders EL Expression and XPL Tag tabs', () => {
    renderDialog();
    expect(screen.getByText('EL Expression')).toBeInTheDocument();
    expect(screen.getByText('XPL Tag')).toBeInTheDocument();
  });

  it('renders textarea for EL expression by default', () => {
    renderDialog();
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('switches to XPL Tag view when clicking XPL Tag tab', async () => {
    renderDialog();

    const triggers = screen.getAllByTestId('tabs-trigger');
    const xplTrigger = triggers.find((t) => t.textContent?.includes('XPL Tag'));
    if (xplTrigger) {
      await userEvent.click(xplTrigger);
      expect(screen.getByTestId('native-select')).toBeInTheDocument();
    }
  });

  it('calls onInsert with EL expression format', async () => {
    const onInsertExpr = vi.fn();
    renderDialog({ onInsertExpr });

    const textarea = screen.getByTestId('textarea');
    await userEvent.type(textarea, 'entity.name');

    const insertButtons = screen.getAllByText('Confirm');
    await userEvent.click(insertButtons[0]);

    expect(onInsertExpr).toHaveBeenCalledWith('${entity.name}');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not insert empty EL expression', async () => {
    const onInsertExpr = vi.fn();
    renderDialog({ onInsertExpr });

    const insertButtons = screen.getAllByText('Confirm');
    await userEvent.click(insertButtons[0]);

    expect(onInsertExpr).not.toHaveBeenCalled();
  });

  it('inserts c:out as a self-closing template tag', async () => {
    const onInsertTag = vi.fn();
    renderDialog({ onInsertTag });

    const triggers = screen.getAllByTestId('tabs-trigger');
    const xplTrigger = triggers.find((t) => t.textContent?.includes('XPL Tag'));
    if (xplTrigger) {
      await userEvent.click(xplTrigger);
    }

    const select = screen.getByTestId('native-select');
    await userEvent.selectOptions(select, 'c:out');
    const valueInput = screen.getByLabelText('value');
    fireEvent.change(valueInput, { target: { value: '${order.total}' } });
    await userEvent.click(screen.getAllByText('Confirm')[0]);

    expect(onInsertTag).toHaveBeenCalledWith({
      kind: 'tag-selfclose',
      expr: '<c:out value="${order.total}" />',
      tagName: 'c:out',
      attrs: { value: '${order.total}' },
    });
  });
});
