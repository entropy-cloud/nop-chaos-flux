import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FlowDesignerPage } from './flow-designer-page';

const mockDebuggerController = {
  id: 'test-debugger',
  getSnapshot: () => ({
    enabled: true,
    panelOpen: false,
    paused: false,
    events: [],
    filters: [],
    activeTab: 'timeline' as const,
    position: { x: 24, y: 24 },
  }),
  subscribe: () => () => undefined,
  decorateEnv: (env: unknown) => env,
  plugin: {},
  setRuntime: () => undefined,
  setComponentRegistry: () => undefined,
  setActionScope: () => undefined,
  onActionError: () => undefined,
};

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({
    hasExpression: () => false,
    compileExpression: (src: string) => ({ kind: 'expression', source: src, exec: () => src }),
    compileTemplate: (src: string) => ({ kind: 'template', source: src, exec: () => src }),
    compileValue: (val: unknown) => ({ kind: 'static', value: val }),
  }),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  createSchemaRenderer: () => {
    return function MockSchemaRenderer({ schema }: { schema: Record<string, unknown> }) {
      const config = schema.config as Record<string, unknown> | undefined;
      const mode = config?.documentMode ?? 'graph';
      return (
        <div data-testid="designer-page-mock" data-mode={mode as string}>
          Designer Page Rendered
        </div>
      );
    };
  },
  createDefaultRegistry: () => ({ register: () => undefined }),
  createDefaultEnv: () => ({ fetcher: async () => ({ ok: true }), notify: () => undefined }),
}));

vi.mock('@nop-chaos/flux-renderers-basic', () => ({
  registerBasicRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  registerFormRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-form-advanced', () => ({
  registerFormAdvancedRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-data', () => ({
  registerDataRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flow-designer-renderers', () => ({
  registerFlowDesignerRenderers: () => undefined,
}));

describe('FlowDesignerPage', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(
      <FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );
    expect(screen.getByTestId('designer-page-mock')).toBeTruthy();
  });

  it('renders default workflow example in graph mode', () => {
    render(
      <FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );
    expect(screen.getByTestId('designer-page-mock').dataset.mode).toBe('graph');
  });

  it('renders example selector tabs', () => {
    render(
      <FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );
    expect(screen.getByText('工作流')).toBeTruthy();
    expect(screen.getByText('钉钉审批流')).toBeTruthy();
    expect(screen.getByText('Action 编排')).toBeTruthy();
  });

  it('switches to dingtalk example on tab click', () => {
    render(
      <FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );
    fireEvent.click(screen.getByText('钉钉审批流'));
    expect(screen.getByTestId('designer-page-mock').dataset.mode).toBe('tree');
  });

  it('switches to action-flow example on tab click', () => {
    render(
      <FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );
    fireEvent.click(screen.getByText('Action 编排'));
    expect(screen.getByTestId('designer-page-mock').dataset.mode).toBe('tree');
  });

  it('navigates back when onBack is called', () => {
    const onBack = vi.fn();
    render(<FlowDesignerPage debuggerController={mockDebuggerController as any} onBack={onBack} />);
    expect(onBack).not.toHaveBeenCalled();
  });
});
