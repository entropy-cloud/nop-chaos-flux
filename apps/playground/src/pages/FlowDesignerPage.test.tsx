import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FlowDesignerPage } from './FlowDesignerPage';

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({
    hasExpression: () => false,
    compileExpression: (src: string) => ({ kind: 'expression', source: src, exec: () => src }),
    compileTemplate: (src: string) => ({ kind: 'template', source: src, exec: () => src }),
    compileValue: (val: unknown) => ({ kind: 'static', value: val })
  })
}));

vi.mock('@nop-chaos/flux-react', () => ({
  createSchemaRenderer: () => {
    return function MockSchemaRenderer() {
      return <div data-testid="designer-page-mock">Designer Page Rendered</div>;
    };
  },
  createDefaultRegistry: () => ({ register: () => undefined }),
  createDefaultEnv: () => ({ fetcher: async () => ({ ok: true }), notify: () => undefined })
}));

vi.mock('@nop-chaos/flux-renderers-basic', () => ({
  registerBasicRenderers: () => undefined
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  registerFormRenderers: () => undefined
}));

vi.mock('@nop-chaos/flux-renderers-data', () => ({
  registerDataRenderers: () => undefined
}));

vi.mock('@nop-chaos/flow-designer-renderers', () => ({
  registerFlowDesignerRenderers: () => undefined
}));

describe('FlowDesignerPage', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(<FlowDesignerPage onBack={() => undefined} />);
    expect(screen.getByTestId('designer-page-mock')).toBeTruthy();
  });
});
