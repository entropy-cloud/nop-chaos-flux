import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';

function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      { id: 'start', label: 'Start', defaults: { label: 'Start' } },
      { id: 'end', label: 'End', defaults: { label: 'End' } },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: { groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start', 'end'] }] },
  };
}

function createDocument(): GraphDocument {
  return {
    id: 'doc-i18n',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [{ id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } }],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('designer command adapter i18n error messages', () => {
  beforeAll(async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
  });

  afterAll(() => {
    resetFluxI18n();
  });

  it('localizes undo-not-available errors in en-US', () => {
    const core = createDesignerCore(createDocument(), createTestConfig());
    const adapter = createDesignerCommandAdapter(core);
    const result = adapter.execute({ type: 'undo' });
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(result.error).toBe('Undo is not available.');
  });

  it('localizes redo-not-available errors in zh-CN after language switch', async () => {
    await changeLanguage('zh-CN');
    const core = createDesignerCore(createDocument(), createTestConfig());
    const adapter = createDesignerCommandAdapter(core);
    const result = adapter.execute({ type: 'redo' });
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(result.error).toBe('无法重做。');
  });

  it('localizes unknown-node errors with interpolation', async () => {
    await changeLanguage('en-US');
    const core = createDesignerCore(createDocument(), createTestConfig());
    const adapter = createDesignerCommandAdapter(core);
    const result = adapter.execute({ type: 'duplicateNode', nodeId: 'missing-1' });
    expect(result).toMatchObject({ ok: false, reason: 'missing-node' });
    expect(result.error).toBe('Unknown node: missing-1');
  });
});
