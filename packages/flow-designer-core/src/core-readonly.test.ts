import { describe, expect, it } from 'vitest';
import type { DesignerConfig, DesignerEvent, GraphDocument } from './types.js';
import { createDesignerCore } from './core.js';

// P1-MA4.4-001 regression guard: the readonly core must reject mutating
// commands across the guarded entry surface (audit: ~20 entries; the
// representative set below spans undo/redo/clipboard/host-replace). Prior
// coverage never executed a guard in the rejection direction — deleting
// assertReadonly left the suite green.

function minimalDoc(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'graph',
    name: 'readonly-guard-doc',
    version: '1',
    nodes: [],
    edges: [],
  };
}

function minimalConfig(): DesignerConfig {
  return {
    version: '1',
    kind: 'test',
    nodeTypes: [],
  } as unknown as DesignerConfig;
}

function createReadonlyCore() {
  const events: DesignerEvent[] = [];
  const core = createDesignerCore(minimalDoc(), minimalConfig(), { readonly: true });
  core.subscribe((event: DesignerEvent) => events.push(event));
  return { core, events };
}

describe('flow designer readonly core rejects mutations (P1-MA4.4-001)', () => {
  it('undo/redo/copySelection/pasteClipboard are each rejected with lifecycleHookError', () => {
    const { core, events } = createReadonlyCore();

    core.undo();
    const undoReject = events.find(
      (event) => event.type === 'lifecycleHookError' && (event as { hook?: string }).hook === 'undo',
    );
    expect(undoReject).toBeDefined();

    core.redo();
    const redoReject = events.find(
      (event) => event.type === 'lifecycleHookError' && (event as { hook?: string }).hook === 'redo',
    );
    expect(redoReject).toBeDefined();

    core.copySelection();
    const copyReject = events.find(
      (event) => event.type === 'lifecycleHookError' && (event as { hook?: string }).hook === 'copySelection',
    );
    expect(copyReject).toBeDefined();

    core.pasteClipboard();
    const pasteReject = events.find(
      (event) => event.type === 'lifecycleHookError' && (event as { hook?: string }).hook === 'pasteClipboard',
    );
    expect(pasteReject).toBeDefined();
  });

  it('replaceDocumentFromHost is rejected on a readonly core', () => {
    const { core, events } = createReadonlyCore();

    core.replaceDocumentFromHost(minimalDoc());

    const replaceReject = events.find(
      (event) =>
        event.type === 'lifecycleHookError' &&
        (event as { hook?: string }).hook === 'replaceDocumentFromHost',
    );
    expect(replaceReject).toBeDefined();
  });

  it('control: a writable core with empty history does not emit lifecycleHookError for undo', () => {
    const events: DesignerEvent[] = [];
    const core = createDesignerCore(minimalDoc(), minimalConfig());
    core.subscribe((event: DesignerEvent) => events.push(event));

    core.undo();

    expect(
      events.filter((event) => event.type === 'lifecycleHookError'),
    ).toHaveLength(0);
  });
});
