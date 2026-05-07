import { describe, expect, it } from 'vitest';
import { genId, resetIdSeq } from './id-utils.js';

describe('id-utils', () => {
  it('generates sequential ids with default prefix', () => {
    resetIdSeq();
    expect(genId()).toBe('node-1');
    expect(genId()).toBe('node-2');
    expect(genId()).toBe('node-3');
  });

  it('generates ids with custom prefix', () => {
    resetIdSeq();
    expect(genId('item')).toBe('item-1');
    expect(genId('group')).toBe('group-2');
    expect(genId('root')).toBe('root-3');
  });

  it('resets sequence to zero', () => {
    resetIdSeq();
    genId();
    genId();
    resetIdSeq();
    expect(genId()).toBe('node-1');
  });

  it('continues incrementing after reset', () => {
    resetIdSeq();
    expect(genId()).toBe('node-1');
    expect(genId()).toBe('node-2');
    resetIdSeq();
    expect(genId()).toBe('node-1');
    expect(genId()).toBe('node-2');
    expect(genId()).toBe('node-3');
  });
});
