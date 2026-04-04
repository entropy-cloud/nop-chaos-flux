import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchReplace } from '../toolbar/SearchReplace.js';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, disabled, title, ...props }: any) => (
      <button data-testid="button" onClick={onClick} disabled={disabled} title={title} {...props}>
        {children}
      </button>
    ),
    Input: ({ value, onChange, placeholder, ...props }: any) => (
      <input data-testid="input" value={value} onChange={onChange} placeholder={placeholder} {...props} />
    ),
    Separator: ({ orientation, className }: any) => (
      <div data-testid="separator" data-orientation={orientation} className={className} />
    ),
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

vi.mock('../toolbar/shared.js', () => ({
  ToolbarButton: ({ icon: Icon, onClick, disabled, title }: any) => (
    <button data-testid="toolbar-button" onClick={onClick} disabled={disabled} title={title}>
      {Icon && <Icon />}
    </button>
  ),
  ToolbarSeparator: () => <div data-testid="toolbar-separator" />
}));

describe('SearchReplace', () => {
  it('does not render when visible is false', () => {
    render(<SearchReplace bridge={null} visible={false} onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('renders when visible is true', () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders replace input', () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Replace...')).toBeInTheDocument();
  });

  it('renders Replace button', () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Replace')).toBeInTheDocument();
  });

  it('disables Replace button when search text is empty', () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Replace')).toBeDisabled();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<SearchReplace bridge={null} visible={true} onClose={onClose} />);

    const closeButtons = screen.getAllByTestId('toolbar-button');
    const closeButton = closeButtons.find(b => b.title === 'Close');
    if (closeButton) {
      await userEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('allows typing in search input', async () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'hello');
    expect(searchInput).toHaveValue('hello');
  });

  it('allows typing in replace input', async () => {
    render(<SearchReplace bridge={null} visible={true} onClose={vi.fn()} />);

    const replaceInput = screen.getByPlaceholderText('Replace...');
    await userEvent.type(replaceInput, 'world');
    expect(replaceInput).toHaveValue('world');
  });
});
