import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from '../scheduling-renderer-definitions.js';

const SchemaRenderer = createSchemaRenderer([
  ...schedulingRendererDefinitions,
  {
    type: 'text',
    displayName: 'Text',
    category: 'basic',
    sourcePackage: 'test-host',
    defaultSchema: { type: 'text' },
    component: (props: { props: { text?: unknown } }) => <>{String(props.props.text ?? '')}</>,
  },
] as never);

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

  it('renders schema-declared column regions (start/end/duration/predecessor/text)', () => {
    const { container } = render(
      <SchemaRenderer
        schema={{
          ...ganttSchema,
          columns: [
            { name: 'text', label: 'Task', width: 160 },
            { name: 'start', label: 'Start', width: 120 },
            { name: 'end', label: 'End', width: 120 },
            { name: 'duration', label: 'Days', width: 80 },
            { name: 'predecessor', label: 'Deps', width: 80 },
          ],
          start: { type: 'text', text: 'S:${$slot.task.start}' },
          end: { type: 'text', text: 'E:${$slot.task.end}' },
          duration: { type: 'text', text: 'D:${$slot.task.duration ?? 0}' },
          predecessor: { type: 'text', text: 'P' },
          text: undefined,
        }}
        schemaUrl="/gantt"
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.textContent).toContain('S:2026-01-01');
    expect(container.textContent).toContain('E:2026-01-10');
    expect(container.textContent).toContain('D:');
    expect(container.textContent).toContain('P');
  });
});
