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

const calendarSchema = {
  type: 'calendar',
  view: 'month' as const,
  date: '2026-07-01',
  events: [
    { id: 'e1', title: 'Morning Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
    { id: 'e2', title: 'Sick Leave', start: '2026-07-22T00:00:00', end: '2026-07-22T23:59:00', type: 'leave', resourceId: 'r1' },
    { id: 'e3', title: 'Team Meeting', start: '2026-07-23T10:00:00', end: '2026-07-23T11:00:00', type: 'appointment', resourceId: 'r2' },
    { id: 'e4', title: 'Maintenance Window', start: '2026-07-24T02:00:00', end: '2026-07-24T06:00:00', type: 'maintenance', resourceId: 'r2' },
  ],
  resources: [
    { id: 'r1', title: 'Team A' },
    { id: 'r2', title: 'Team B' },
  ],
};

describe('Calendar Schema Renderer Integration', () => {
  it('renders calendar container via SchemaRenderer', () => {
    const { container } = render(
      <SchemaRenderer schema={calendarSchema} schemaUrl="/calendar" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.querySelector('.nop-calendar')).toBeTruthy();
  });

  it('renders with month view data attribute', () => {
    const { container } = render(
      <SchemaRenderer schema={calendarSchema} schemaUrl="/calendar" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.querySelector('[data-view="month"]')).toBeTruthy();
  });

  it('renders event count in calendar header', () => {
    const { container } = render(
      <SchemaRenderer schema={calendarSchema} schemaUrl="/calendar" env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(container.textContent).toContain('4 events');
  });
});
