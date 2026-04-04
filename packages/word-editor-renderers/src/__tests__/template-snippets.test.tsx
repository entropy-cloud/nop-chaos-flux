import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSnippets } from '../panels/TemplateSnippets.js';

vi.mock('@nop-chaos/ui', () => {
  return {
    Button: ({ children, onClick, ...props }: any) => (
      <button data-testid="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
  };
});

describe('TemplateSnippets', () => {
  it('renders Template Tags header', () => {
    render(<TemplateSnippets onInsertTag={vi.fn()} />);
    expect(screen.getByText('Template Tags')).toBeInTheDocument();
  });

  it('renders all tag-open and tag-selfclose tags', () => {
    render(<TemplateSnippets onInsertTag={vi.fn()} />);
    expect(screen.getByText('If Condition')).toBeInTheDocument();
    expect(screen.getByText('For Loop')).toBeInTheDocument();
    expect(screen.getByText('For Each')).toBeInTheDocument();
    expect(screen.getByText('Choose')).toBeInTheDocument();
    expect(screen.getByText('When')).toBeInTheDocument();
    expect(screen.getByText('Otherwise')).toBeInTheDocument();
    expect(screen.getByText('Set Variable')).toBeInTheDocument();
    expect(screen.getByText('Output Value')).toBeInTheDocument();
  });

  it('does not render tag-close entries (like End If)', () => {
    render(<TemplateSnippets onInsertTag={vi.fn()} />);
    expect(screen.queryByText('End If')).not.toBeInTheDocument();
    expect(screen.queryByText('End For')).not.toBeInTheDocument();
  });

  it('displays tag name badges', () => {
    render(<TemplateSnippets onInsertTag={vi.fn()} />);
    expect(screen.getByText('c:if')).toBeInTheDocument();
    expect(screen.getByText('c:for')).toBeInTheDocument();
    expect(screen.getByText('c:out')).toBeInTheDocument();
  });

  it('displays tag descriptions', () => {
    render(<TemplateSnippets onInsertTag={vi.fn()} />);
    expect(screen.getByText('Conditional block — renders content if test is true')).toBeInTheDocument();
    expect(screen.getByText('Output an expression value (self-closing)')).toBeInTheDocument();
  });

  it('calls onInsertTag with correct tag name when clicked', async () => {
    const onInsertTag = vi.fn();
    render(<TemplateSnippets onInsertTag={onInsertTag} />);

    const buttons = screen.getAllByTestId('button');
    const ifButton = buttons.find(btn => btn.textContent?.includes('If Condition'));
    if (ifButton) {
      await userEvent.click(ifButton);
      expect(onInsertTag).toHaveBeenCalledWith('c:if');
    }
  });
});
