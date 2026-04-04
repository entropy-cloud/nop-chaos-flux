import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExprInsertDialog } from '../dialogs/ExprInsertDialog.js';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, ...props }: any) => (
      <button data-testid="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Input: ({ value, onChange, placeholder, ...props }: any) => (
      <input data-testid="input" value={value} onChange={onChange} placeholder={placeholder} {...props} />
    ),
    Textarea: ({ value, onChange, placeholder, ...props }: any) => (
      <textarea data-testid="textarea" value={value} onChange={onChange} placeholder={placeholder} {...props} />
    ),
    Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
    NativeSelect: ({ value, onChange, children: ch, ...props }: any) => (
      <select data-testid="native-select" value={value} onChange={onChange} {...props}>{ch}</select>
    ),
    NativeSelectOption: ({ value, children }: any) => (
      <option value={value}>{children}</option>
    ),
    Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, onClick, ...props }: any) => (
      <button data-testid="tabs-trigger" onClick={onClick} {...props}>{children}</button>
    ),
    TabsContent: ({ children }: any) => <div data-testid="tabs-content">{children}</div>,
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

describe('ExprInsertDialog', () => {
  it('renders dialog when open', () => {
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExprInsertDialog open={false} onClose={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders title', () => {
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.getByText('Insert Template Expression')).toBeInTheDocument();
  });

  it('renders EL Expression and XPL Tag tabs', () => {
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.getByText('EL Expression')).toBeInTheDocument();
    expect(screen.getByText('XPL Tag')).toBeInTheDocument();
  });

  it('renders textarea for EL expression by default', () => {
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('switches to XPL Tag view when clicking XPL Tag tab', async () => {
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={vi.fn()} />);

    const triggers = screen.getAllByTestId('tabs-trigger');
    const xplTrigger = triggers.find(t => t.textContent?.includes('XPL Tag'));
    if (xplTrigger) {
      await userEvent.click(xplTrigger);
      expect(screen.getByTestId('native-select')).toBeInTheDocument();
    }
  });

  it('calls onInsert with EL expression format', async () => {
    const onInsert = vi.fn();
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={onInsert} />);

    const textarea = screen.getByTestId('textarea');
    await userEvent.type(textarea, 'entity.name');

    const insertButtons = screen.getAllByText('Insert');
    await userEvent.click(insertButtons[0]);

    expect(onInsert).toHaveBeenCalledWith('${entity.name}');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<ExprInsertDialog open={true} onClose={onClose} onInsert={vi.fn()} />);

    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not insert empty EL expression', async () => {
    const onInsert = vi.fn();
    render(<ExprInsertDialog open={true} onClose={vi.fn()} onInsert={onInsert} />);

    const insertButtons = screen.getAllByText('Insert');
    await userEvent.click(insertButtons[0]);

    expect(onInsert).not.toHaveBeenCalled();
  });
});
