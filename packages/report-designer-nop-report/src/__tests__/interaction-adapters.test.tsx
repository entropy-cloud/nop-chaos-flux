import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNopReportInspectorSchemas } from '../index.js';
import {
  createNopReportExpressionEditorAdapter,
  NOP_REPORT_EXPRESSION_EDITOR_SLOT,
} from '../expression-editor-adapter.js';
import {
  createNopReportReferencePickerAdapter,
  NOP_REPORT_REFERENCE_PICKER_ADAPTER_ID,
} from '../reference-picker-adapter.js';
import { createNopReportRendererDefinitions } from '../renderers.js';
import {
  NOP_REPORT_EXPRESSION_RENDERER_TYPE,
  NOP_REPORT_REFERENCE_RENDERER_TYPE,
  withNopReportFieldKinds,
} from '../field-kinds.js';
import {
  NOP_REPORT_REFERENCE_FIELDS,
  NOP_REPORT_REFERENCE_KIND_MARKER,
} from '../inspector-schema.js';

afterEach(cleanup);

describe('nop-report interaction adapters (plan 752)', () => {
  it('marks rowParent/colParent with the reference-kind marker in generated schemas', () => {
    const schemas = createNopReportInspectorSchemas();
    const cell = JSON.stringify(schemas.cell);
    for (const field of NOP_REPORT_REFERENCE_FIELDS) {
      expect(cell).toContain(`"name":"xpt.${field}"`);
    }
    expect(schemas.cell ? JSON.stringify(schemas.cell).includes(NOP_REPORT_REFERENCE_KIND_MARKER) : false).toBe(true);
  });

  it('keeps plain input nodes when adapters are not registered (fallback, old behavior)', () => {
    const schemas = withNopReportFieldKinds(createNopReportInspectorSchemas(), {});
    const serialized = JSON.stringify(schemas.cell);
    expect(serialized).not.toContain('nop-report-expression-editor');
    expect(serialized).toContain('"type":"input-text"');
  });

  it('rewrites marked fields to custom renderer types when adapters are registered', () => {
    const rewritten = withNopReportFieldKinds(createNopReportInspectorSchemas(), {
      expressionEditor: true,
      referencePicker: true,
    });
    const serialized = JSON.stringify(rewritten.cell);
    expect(serialized).toContain(`"${NOP_REPORT_EXPRESSION_RENDERER_TYPE}"`);
    expect(serialized).toContain(`"${NOP_REPORT_REFERENCE_RENDERER_TYPE}"`);
    // 未标记字段保持 input-text
    expect(serialized).toContain('"name":"xpt.field"');
  });

  it('expression editor adapter renders a node with the stable data-slot and forwards onChange', () => {
    const adapter = createNopReportExpressionEditorAdapter();
    expect(adapter.id).toBe('nop-report-expression-editor');

    const onChange = vi.fn();
    const node = adapter.render({ value: '${value}', onChange }) as {
      props: Record<string, unknown>;
    };
    expect(node.props['data-slot']).toBe(NOP_REPORT_EXPRESSION_EDITOR_SLOT);
    expect(node.props.value).toBe('${value}');
    (node.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value: 'next' },
    });
    expect(onChange).toHaveBeenCalledWith('next');
  });

  it('reference picker adapter falls back to undefined without a host callback', async () => {
    const adapter = createNopReportReferencePickerAdapter();
    expect(adapter.id).toBe(NOP_REPORT_REFERENCE_PICKER_ADAPTER_ID);
    await expect(adapter.pick({ targetKind: 'cell' })).resolves.toBeUndefined();
  });

  it('reference picker adapter returns the host-selected address', async () => {
    const adapter = createNopReportReferencePickerAdapter({
      selectAddress: () => 'A3',
    });
    await expect(adapter.pick({ targetKind: 'cell' })).resolves.toBe('A3');
  });

  it('renderer definitions render adapter output (direct component render)', async () => {
    const [expressionDef] = createNopReportRendererDefinitions({
      expressionEditor: createNopReportExpressionEditorAdapter(),
      referencePicker: createNopReportReferencePickerAdapter({ selectAddress: () => 'B7' }),
    });
    expect(expressionDef.type).toBe('nop-report-expression-editor');

    render(expressionDef.component({ props: { value: '${x}' } } as never));
    const editor = document.querySelector(`[data-slot="${NOP_REPORT_EXPRESSION_EDITOR_SLOT}"]`);
    expect(editor).toBeTruthy();
    expect((editor as HTMLTextAreaElement).value).toBe('${x}');
  });

  it('reference picker component fills the picked address through onChange', async () => {
    const onChange = vi.fn();
    const [, referenceDef] = createNopReportRendererDefinitions({
      referencePicker: createNopReportReferencePickerAdapter({ selectAddress: () => 'B7' }),
    });
    render(referenceDef.component({ props: { value: '', onChange } } as never));

    fireEvent.click(screen.getByText(/Pick|选择引用/));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('B7');
    });
    expect(
      document.querySelector('[data-slot="nop-report-reference-value"]')?.getAttribute('value'),
    ).toBe('B7');
  });
});
