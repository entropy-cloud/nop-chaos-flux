import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutlinePanel } from '../panels/OutlinePanel.js';

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

function createMockBridge(headings: any[] = []) {
  return {
    command: {
      getValue: () => ({
        data: {
          main: headings
        }
      }),
      executeLocationCatalog: vi.fn()
    },
    subscribeContentChange: () => () => {}
  };
}

describe('OutlinePanel', () => {
  it('renders Outline header', () => {
    render(<OutlinePanel bridge={null} />);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('shows empty state when bridge is null', () => {
    render(<OutlinePanel bridge={null} />);
    expect(screen.getByText('No headings found')).toBeInTheDocument();
  });

  it('shows empty state when bridge has no headings', () => {
    const bridge = createMockBridge([]);
    render(<OutlinePanel bridge={bridge as any} />);
    expect(screen.getByText('No headings found')).toBeInTheDocument();
  });

  it('renders headings from bridge', () => {
    const bridge = createMockBridge([
      { id: 'h1', value: 'Introduction', level: 'first', valueList: [{ value: 'Introduction', level: 'first' }] },
      { id: 'h2', value: 'Methods', level: 'second', valueList: [{ value: 'Methods', level: 'second' }] }
    ]);
    render(<OutlinePanel bridge={bridge as any} />);

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Methods')).toBeInTheDocument();
  });

  it('renders heading hierarchy', () => {
    const bridge = createMockBridge([
      { id: 'h1', value: 'Chapter 1', level: 'first', titleId: 'h1' },
      { id: 'h2', value: 'Section 1.1', level: 'second', titleId: 'h2' },
      { id: 'h3', value: 'Section 1.1.1', level: 'third', titleId: 'h3' }
    ]);
    render(<OutlinePanel bridge={bridge as any} />);

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('Section 1.1')).toBeInTheDocument();
    expect(screen.getByText('Section 1.1.1')).toBeInTheDocument();
  });

  it('handles bridge without command gracefully', () => {
    const bridge = {
      subscribeContentChange: () => () => {}
    };
    render(<OutlinePanel bridge={bridge as any} />);
    expect(screen.getByText('No headings found')).toBeInTheDocument();
  });

  it('handles bridge with command but no getValue', () => {
    const bridge = {
      command: {},
      subscribeContentChange: () => () => {}
    };
    render(<OutlinePanel bridge={bridge as any} />);
    expect(screen.getByText('No headings found')).toBeInTheDocument();
  });
});
