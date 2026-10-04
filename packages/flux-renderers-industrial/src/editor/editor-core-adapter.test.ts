import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEditorDomains, getEditorDomain } from '@nop-chaos/editor-core';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));
import {
  SCADA_EDITOR_DOMAIN_COMMANDS,
  SCADA_EDITOR_DOMAIN_KIND,
  createScadaEditorDomainAdapter,
  hasScadaDiffChanges,
  registerScadaEditorDomain,
} from './editor-core-adapter.js';
import { RUNTIME_HANDLE_METHODS, EDITOR_HANDLE_METHODS } from './editor-handle-names.js';
import { diffScadaConfig } from '../serialization/diff.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { computeInverse } from './undo-redo/compute-inverse.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

const symbol = (id: string, x: number, fill = '#f00'): ScadaSymbolNode =>
  ({ id, type: 'scada-rect', x, y: 0, width: 10, height: 10, fill }) as ScadaSymbolNode;

const config = (symbols: ScadaSymbolNode[]): ScadaConfig =>
  ({ version: 1, variables: [], symbols }) as ScadaConfig;

beforeEach(() => {
  clearEditorDomains();
  registerBuiltinScadaSymbols();
});

describe('scada editor domain adapter (editor-core contract)', () => {
  it('kind is scada-editor and domainCommands matches the live handle list', () => {
    const adapter = createScadaEditorDomainAdapter(config([]));
    expect(adapter.kind).toBe(SCADA_EDITOR_DOMAIN_KIND);
    expect(adapter.domainCommands).toBeDefined();
    expect([...adapter.domainCommands!].sort()).toEqual(
      [...RUNTIME_HANDLE_METHODS, ...EDITOR_HANDLE_METHODS].sort(),
    );
    expect(adapter.domainCommands).toHaveLength(20);
    expect(SCADA_EDITOR_DOMAIN_COMMANDS).toHaveLength(20);
  });

  it('diff returns null when structurally identical (editor-core diff contract)', () => {
    const adapter = createScadaEditorDomainAdapter(config([]));
    const doc = config([symbol('a', 0)]);
    expect(adapter.diff(doc, config([symbol('a', 0)]))).toBeNull();
    expect(adapter.diff(doc, config([symbol('a', 5)]))).not.toBeNull();
  });

  it('diff is null for pure z-order reorder (order-blind diff — domain computes reordered inverse)', () => {
    const adapter = createScadaEditorDomainAdapter(config([]));
    const doc = config([symbol('a', 0), symbol('b', 1)]);
    expect(adapter.diff(doc, config([symbol('b', 1), symbol('a', 0)]))).toBeNull();
  });

  it('applyDiff round-trips forward+inverse to the original document (symmetry contract)', () => {
    const adapter = createScadaEditorDomainAdapter(config([]));
    const prev = config([symbol('a', 0), symbol('b', 1)]);
    const next = config([symbol('a', 7, '#0f0'), symbol('c', 2)]);
    const forward = diffScadaConfig(prev, next);
    const inverse = computeInverse(forward, prev);
    const applied = adapter.applyDiff(prev, forward);
    expect(applied).toEqual(next);
    expect(adapter.applyDiff(applied, inverse)).toEqual(prev);
  });

  it('getDocumentIds projects recursive symbol ids for selection pruning', () => {
    const adapter = createScadaEditorDomainAdapter(config([]));
    const doc = config([symbol('a', 0), { ...symbol('g', 0), children: [symbol('a-1', 1)] } as ScadaSymbolNode]);
    expect(adapter.getDocumentIds!(doc).sort()).toEqual(['a', 'a-1', 'g']);
  });

  it('serialize/validate delegate to the scada serialization layer', () => {
    const doc = config([symbol('a', 0)]);
    const adapter = createScadaEditorDomainAdapter(doc);
    const serialized = adapter.serialize(doc);
    expect(typeof serialized).toBe('string');
    expect(adapter.validate(doc).ok).toBe(true);
  });

  it('hasScadaDiffChanges treats reordered increments as changes', () => {
    expect(hasScadaDiffChanges({ added: [], removed: [], updated: [] })).toBe(false);
    expect(hasScadaDiffChanges({ added: [], removed: [], updated: [], reordered: ['a', 'b'] })).toBe(true);
  });
});

describe('registerScadaEditorDomain (editor-core domain registry)', () => {
  it('registers kind scada-editor retrievable via getEditorDomain', () => {
    const initial = config([symbol('a', 0)]);
    registerScadaEditorDomain(initial);
    const domain = getEditorDomain(SCADA_EDITOR_DOMAIN_KIND);
    expect(domain).toBeDefined();
    expect(domain!.load()).toEqual(initial);
    expect(domain!.domainCommands).toHaveLength(20);
  });

  it('re-registration overwrites (editor-core.md §3 ruling)', () => {
    registerScadaEditorDomain(config([symbol('a', 0)]));
    registerScadaEditorDomain(config([symbol('b', 1)]));
    const domain = getEditorDomain(SCADA_EDITOR_DOMAIN_KIND);
    expect(domain!.load()).toEqual(config([symbol('b', 1)]));
  });
});
