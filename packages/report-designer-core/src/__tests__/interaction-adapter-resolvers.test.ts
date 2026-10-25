import { describe, expect, it } from 'vitest';
import {
  createEmptyAdapterRegistry,
  type ExpressionEditorAdapter,
  type ReferencePickerAdapter,
  type ReportDesignerProfile,
} from '../index.js';
import {
  getExpressionEditorId,
  getReferencePickerId,
  resolveExpressionEditor,
  resolveReferencePicker,
} from '../runtime/registry.js';

const expressionAdapter: ExpressionEditorAdapter = {
  id: 'expr-1',
  render: () => null,
};
const referenceAdapter: ReferencePickerAdapter = {
  id: 'ref-1',
  pick: async () => undefined,
};

const profile: ReportDesignerProfile = {
  id: 'p',
  kind: 'nop-report',
  fieldSourceIds: [],
  fieldDropIds: [],
  expressionEditorId: 'expr-1',
  referencePickerId: 'ref-1',
};

describe('expression/reference adapter resolvers (plan 752 consumption path)', () => {
  it('reads the profile ids', () => {
    expect(getExpressionEditorId(profile)).toBe('expr-1');
    expect(getReferencePickerId(profile)).toBe('ref-1');
    expect(getReferencePickerId(undefined)).toBeUndefined();
  });

  it('resolves adapters from the registry maps (previously never read)', () => {
    const adapters = createEmptyAdapterRegistry();
    adapters.expressions.set('expr-1', expressionAdapter);
    adapters.references.set('ref-1', referenceAdapter);

    expect(resolveExpressionEditor({ adapters, profile })).toBe(expressionAdapter);
    expect(resolveReferencePicker({ adapters, profile })).toBe(referenceAdapter);
  });

  it('falls back to undefined when ids or registry entries are missing', () => {
    const adapters = createEmptyAdapterRegistry();
    expect(resolveExpressionEditor({ adapters, profile })).toBeUndefined();
    expect(resolveReferencePicker({ adapters, profile })).toBeUndefined();
    expect(resolveExpressionEditor({ adapters, profile: undefined })).toBeUndefined();
  });
});
