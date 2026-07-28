import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from '../scheduling-renderer-definitions.js';

const SchemaRenderer = createSchemaRenderer(schedulingRendererDefinitions);

const env: RendererEnv = {
  fetcher: async function <T>() { return { ok: true, status: 200, data: null as T }; },
  notify: () => undefined,
};
const formulaCompiler = createFormulaCompiler();

const ganttSchema = {
  type: 'gantt',
  tasks: [
    { id: 't1', text: 'Design API', start: '2026-01-01', end: '2026-01-10' },
    { id: 't2', text: 'Implement API', start: '2026-01-11', end: '2026-01-20' },
    { id: 't3', text: 'Write Tests', start: '2026-01-15', end: '2026-01-25' },
  ],
  links: [
    { id: 'l1', source: 't1', target: 't2', type: 'finish_to_start' },
    { id: 'l2', source: 't2', target: 't3', type: 'start_to_start' },
  ],
};

describe('Gantt Schema Renderer Integration', () => {
  it('renders gantt container via SchemaRenderer', () => {
    const { container } = render(
      <SchemaRenderer schema={ganttSchema} schemaUrl="/gantt" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.querySelector('.nop-gantt')).toBeTruthy();
  });

  it('renders task bars with expected count', () => {
    const { container } = render(
      <SchemaRenderer schema={ganttSchema} schemaUrl="/gantt" env={env} formulaCompiler={formulaCompiler} />,
    );
    const bars = container.querySelectorAll('[data-slot="gantt-bar"]');
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders task names in bar text', () => {
    const { container } = render(
      <SchemaRenderer schema={ganttSchema} schemaUrl="/gantt" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.textContent).toContain('Design API');
    expect(container.textContent).toContain('Implement API');
    expect(container.textContent).toContain('Write Tests');
  });
});
