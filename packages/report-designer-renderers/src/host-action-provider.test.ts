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

      const result = await resolved!.provider.invoke(resolved!.method, {}, {} as any);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Preview adapter unavailable');
      expect(result.data).toEqual({ code: 'preview-unavailable' });
    } finally {
      unregister();
    }
  });

  it('exposes the documented report-designer host methods through listMethods', () => {
    const provider = createReportDesignerActionProvider(async () => ({ ok: true, changed: false }));

    expect(provider.listMethods?.()).toEqual(REPORT_DESIGNER_HOST_METHODS);
  });

  it('exports the report-designer action provider from the package root', () => {
    expect(typeof createReportDesignerActionProvider).toBe('function');
  });
});
