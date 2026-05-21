import { describe, expect, it } from 'vitest';
import { createActionScope } from '@nop-chaos/flux-runtime';
import {
  createReportDesignerActionProvider,
  REPORT_DESIGNER_HOST_METHODS,
} from './index.js';

describe('report designer host action provider', () => {
  it('maps failed report-designer commands to top-level action result errors', async () => {
    const provider = createReportDesignerActionProvider(async () => ({
      ok: false,
      changed: false,
      error: 'Preview adapter unavailable',
      data: { code: 'preview-unavailable' },
    }));

    const actionScope = createActionScope({ id: 'report-designer-test-scope' });
    const unregister = actionScope.registerNamespace('report-designer', provider);

    try {
      const resolved = actionScope.resolve('report-designer:preview');
      expect(resolved?.method).toBe('preview');

      const result = await resolved!.provider.invoke(resolved!.method, { mode: 'inline' }, {} as any);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Preview adapter unavailable');
      expect(result.data).toEqual({ code: 'preview-unavailable' });
    } finally {
      unregister();
    }
  });

  it('preserves non-Error report-designer failures as error causes', async () => {
    const structuredError = {
      code: 'preview-unavailable',
      message: 'Preview adapter unavailable',
      providerId: 'preview-host',
    };
    const provider = createReportDesignerActionProvider(async () => ({
      ok: false,
      changed: false,
      error: structuredError,
      data: { code: 'preview-unavailable' },
    }));

    const result = await provider.invoke('preview', { mode: 'inline' }, {} as any);

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Preview adapter unavailable');
    expect((result.error as Error).cause).toBe(structuredError);
    expect(result.data).toEqual({ code: 'preview-unavailable' });
  });

  it('exposes the documented report-designer host methods through listMethods', () => {
    const provider = createReportDesignerActionProvider(async () => ({ ok: true, changed: false }));

    expect(provider.listMethods?.()).toEqual(REPORT_DESIGNER_HOST_METHODS);
  });

  it('exports the report-designer action provider from the package root', () => {
    expect(typeof createReportDesignerActionProvider).toBe('function');
  });

  it('preserves thrown error objects as both error and cause fidelity', async () => {
    const thrown = new Error('Host dispatch crashed');
    const provider = createReportDesignerActionProvider(async () => {
      throw thrown;
    });

    const result = await provider.invoke('save', {}, {} as any);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(thrown);
    expect((result as { cause?: unknown }).cause).toBe(thrown);
  });

  it('rejects payloads that do not match the published report-designer host args contract', async () => {
    const dispatch = async () => ({ ok: true, changed: false } as const);
    const provider = createReportDesignerActionProvider(dispatch);

    const result = await provider.invoke('openInspector', { target: 'workbook' }, {} as any);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'report-designer:openInspector payload does not match the published host args contract.',
    );
  });

  it('rejects incomplete report selection targets for metadata writes', async () => {
    const provider = createReportDesignerActionProvider(async () => ({ ok: true, changed: false }));

    const result = await provider.invoke(
      'updateMeta',
      { target: { kind: 'row' }, patch: { label: 'x' } },
      {} as any,
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'report-designer:updateMeta payload does not match the published host args contract.',
    );
  });

  it('rejects field drops that target non-cell report selections', async () => {
    const provider = createReportDesignerActionProvider(async () => ({ ok: true, changed: false }));

    const result = await provider.invoke(
      'dropFieldToTarget',
      {
        field: { type: 'field', sourceId: 'sales', fieldId: 'amount', data: {} },
        target: { kind: 'workbook' },
      },
      {} as any,
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'report-designer:dropFieldToTarget payload does not match the published host args contract.',
    );
  });
});
