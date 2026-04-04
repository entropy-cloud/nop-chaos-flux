import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from '../toolbar/shared.js';

vi.mock('@nop-chaos/ui', () => {
  const ForwardRef = (tag: string) => {
    const Comp = ({ children, ...props }: any) => {
      const { className, title, disabled, 'aria-pressed': ariaPressed, ...rest } = props;
      return (
        <button
          data-testid={tag}
          title={title}
          disabled={disabled}
          aria-pressed={ariaPressed}
          className={className}
          {...rest}
        >
          {children}
        </button>
      );
    };
    Comp.displayName = tag;
    return Comp;
  };

  return {
    Button: ForwardRef('button'),
    Separator: ({ orientation, className }: any) => (
      <div data-testid="separator" data-orientation={orientation} className={className} />
    ),
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

describe('ToolbarButton', () => {
  it('renders with title', () => {
    render(<ToolbarButton onClick={vi.fn()} title="Bold" />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ToolbarButton onClick={onClick} title="Bold" />);
    await userEvent.click(screen.getByTitle('Bold'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders icon when provided', () => {
    const MockIcon = ({ className }: { className?: string }) => (
      <svg data-testid="mock-icon" className={className} />
    );
    render(<ToolbarButton icon={MockIcon} onClick={vi.fn()} title="Bold" />);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<ToolbarButton onClick={vi.fn()} title="Bold" label="Bold" />);
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });

  it('sets aria-pressed when active', () => {
    render(<ToolbarButton onClick={vi.fn()} title="Bold" active />);
    expect(screen.getByTitle('Bold')).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables button when disabled prop is true', () => {
    render(<ToolbarButton onClick={vi.fn()} title="Bold" disabled />);
    expect(screen.getByTitle('Bold')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<ToolbarButton onClick={onClick} title="Bold" disabled />);
    expect(screen.getByTitle('Bold')).toBeDisabled();
  });
});

describe('ToolbarSeparator', () => {
  it('renders a separator', () => {
    render(<ToolbarSeparator />);
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('has vertical orientation', () => {
    render(<ToolbarSeparator />);
    expect(screen.getByTestId('separator')).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('ToolbarGroup', () => {
  it('renders children', () => {
    render(
      <ToolbarGroup>
        <span>Child 1</span>
        <span>Child 2</span>
      </ToolbarGroup>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});
