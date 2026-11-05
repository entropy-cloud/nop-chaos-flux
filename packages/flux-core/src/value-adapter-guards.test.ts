import { describe, expect, it } from 'vitest';
import {
  isCanonicalBuiltInActionName,
  CANONICAL_BUILT_IN_ACTION_NAMES,
} from './constants.js';
import {
  isCompiledActionProgram,
  booleanMappingAdapter,
} from './value-adapter.js';
import { normalizeHiddenFieldPolicy } from './validation-model.js';
import { isSchemaArray, isSchemaInput } from './utils/schema.js';
import { formatRegistry } from './format-registry.js';

describe('isCompiledActionProgram', () => {
  it('accepts an object with a nodes array', () => {
    expect(isCompiledActionProgram({ nodes: [], isFullyStatic: true })).toBe(true);
    expect(isCompiledActionProgram({ nodes: [{ anything: true }], meta: 'x' })).toBe(true);
  });

  it('rejects plain action schemas, arrays, primitives and malformed nodes', () => {
    expect(isCompiledActionProgram({ actionType: 'setValue', args: {} })).toBe(false);
    expect(isCompiledActionProgram([{ nodes: [] }])).toBe(false);
    expect(isCompiledActionProgram({ nodes: 'not-an-array' })).toBe(false);
    expect(isCompiledActionProgram(null)).toBe(false);
    expect(isCompiledActionProgram(undefined)).toBe(false);
    expect(isCompiledActionProgram('program')).toBe(false);
    expect(isCompiledActionProgram(42)).toBe(false);
  });

  it('distinguishes compiled programs from wrapped schema arrays that merely contain nodes', () => {
    expect(isCompiledActionProgram({ nodes: undefined })).toBe(false);
    expect(isCompiledActionProgram({ NODES: [] })).toBe(false);
  });
});

describe('isCanonicalBuiltInActionName', () => {
  it('accepts canonical built-in action names', () => {
    expect(isCanonicalBuiltInActionName('setValue')).toBe(true);
    expect(isCanonicalBuiltInActionName('ajax')).toBe(true);
    expect(isCanonicalBuiltInActionName('openDialog')).toBe(true);
  });

  it('rejects compatibility aliases, unknown names and case drift', () => {
    // 'submit' is a registered compatibility alias of submitForm, not canonical
    expect(isCanonicalBuiltInActionName('submit')).toBe(false);
    expect(CANONICAL_BUILT_IN_ACTION_NAMES.has('submit')).toBe(false);
    expect(isCanonicalBuiltInActionName('not-an-action')).toBe(false);
    expect(isCanonicalBuiltInActionName('SetValue')).toBe(false);
    expect(isCanonicalBuiltInActionName('')).toBe(false);
  });
});

describe('normalizeHiddenFieldPolicy', () => {
  it('keeps boolean fields and drops non-boolean noise', () => {
    expect(normalizeHiddenFieldPolicy({ validateWhenHidden: true, clearValueWhenHidden: false })).toEqual({
      validateWhenHidden: true,
      clearValueWhenHidden: false,
    });
    expect(normalizeHiddenFieldPolicy({ validateWhenHidden: 'yes' })).toEqual({});
    expect(normalizeHiddenFieldPolicy({ unrelated: 1 })).toEqual({});
  });

  it('returns undefined for non-object input (null/array/primitives)', () => {
    expect(normalizeHiddenFieldPolicy(undefined)).toBeUndefined();
    expect(normalizeHiddenFieldPolicy(null)).toBeUndefined();
    expect(normalizeHiddenFieldPolicy([])).toBeUndefined();
    expect(normalizeHiddenFieldPolicy('validate')).toBeUndefined();
    expect(normalizeHiddenFieldPolicy(0)).toBeUndefined();
  });

  it('an empty-but-valid object normalizes to {} (distinct from undefined)', () => {
    expect(normalizeHiddenFieldPolicy({})).toEqual({});
  });
});

describe('schema shape guards', () => {
  it('isSchemaArray requires every element to be a {type: string} plain object', () => {
    expect(isSchemaArray([{ type: 'button' }, { type: 'form' }])).toBe(true);
    expect(isSchemaArray([])).toBe(true);
    expect(isSchemaArray([{ type: 'button' }, { notype: true }])).toBe(false);
    expect(isSchemaArray([{ type: 42 }])).toBe(false);
    expect(isSchemaArray('button')).toBe(false);
    expect(isSchemaArray(null)).toBe(false);
    expect(isSchemaArray([{ type: 'x' }, null])).toBe(false);
  });

  it('isSchemaInput accepts a single schema object or an array, nothing else', () => {
    expect(isSchemaInput({ type: 'page' })).toBe(true);
    expect(isSchemaInput([{ type: 'page' }])).toBe(true);
    expect(isSchemaInput({ type: 'page', body: [{ type: 'text' }] })).toBe(true);
    expect(isSchemaInput({})).toBe(false);
    expect(isSchemaInput([{ type: 'page' }, 'text'])).toBe(false);
    expect(isSchemaInput('page')).toBe(false);
    expect(isSchemaInput(42)).toBe(false);
    // isPlainObject here is toString-tag based: plain-class instances pass,
    // but non-plain objects (Date/Map/Array) are rejected
    class SchemaLike {
      type = 'page';
    }
    expect(isSchemaInput(new SchemaLike())).toBe(true);
    expect(isSchemaInput(new Date())).toBe(false);
    expect(isSchemaInput(new Map())).toBe(false);
  });
});

describe('formatRegistry', () => {
  it('registers built-in validators queryable via has/get', () => {
    expect(formatRegistry.has('email')).toBe(true);
    expect(formatRegistry.has('url')).toBe(true);
    expect(formatRegistry.has('integer')).toBe(true);
    expect(typeof formatRegistry.get('email')?.validate).toBe('function');
  });

  it('built-in email/url/integer validators accept valid and empty inputs, reject invalid', () => {
    const email = formatRegistry.get('email')!;
    expect(email.validate('a@b.co')).toBe(true);
    expect(email.validate('')).toBe(true);
    expect(email.validate('not-an-email')).toBe(false);

    const url = formatRegistry.get('url')!;
    expect(url.validate('https://example.com')).toBe(true);
    expect(url.validate('')).toBe(true);
    expect(url.validate('example.com')).toBe(false);

    const integer = formatRegistry.get('integer')!;
    expect(integer.validate('-15')).toBe(true);
    expect(integer.validate('')).toBe(true);
    expect(integer.validate('1.5')).toBe(false);
  });

  it('supports register/unregister round-trip and list()', () => {
    const custom = 'zz-test-format';
    expect(formatRegistry.has(custom)).toBe(false);
    formatRegistry.register(custom, { validate: () => true, messageKey: 'x', defaultMessage: 'x' });
    expect(formatRegistry.has(custom)).toBe(true);
    expect(formatRegistry.list()).toContain(custom);
    expect(formatRegistry.unregister(custom)).toBe(true);
    expect(formatRegistry.has(custom)).toBe(false);
    expect(formatRegistry.unregister(custom)).toBe(false);
  });
});

describe('booleanMappingAdapter', () => {
  it('defaults reproduce the boolean contract: in=strict true, out=boolean→true/false', () => {
    const adapter = booleanMappingAdapter();
    expect(adapter.in(true, {} as never)).toBe(true);
    expect(adapter.in('true', {} as never)).toBe(false);
    expect(adapter.in(1, {} as never)).toBe(false);
    expect(adapter.in(false, {} as never)).toBe(false);
    expect(adapter.in(null, {} as never)).toBe(false);
    expect(adapter.out(true, {} as never)).toBe(true);
    expect(adapter.out(false, {} as never)).toBe(false);
  });

  it('custom mappings map only the exact trueValue and round-trip', () => {
    const adapter = booleanMappingAdapter('Y', 'N');
    expect(adapter.in('Y', {} as never)).toBe(true);
    expect(adapter.in('N', {} as never)).toBe(false);
    expect(adapter.in('y', {} as never)).toBe(false);
    expect(adapter.in(null, {} as never)).toBe(false);
    expect(adapter.out(true, {} as never)).toBe('Y');
    expect(adapter.out(false, {} as never)).toBe('N');
  });

  it('uses Object.is identity: 1 and "1" are not trueValue=1', () => {
    const adapter = booleanMappingAdapter(1, 0);
    expect(adapter.in(1, {} as never)).toBe(true);
    expect(adapter.in('1', {} as never)).toBe(false);
    expect(adapter.in(true, {} as never)).toBe(false);
  });
});
