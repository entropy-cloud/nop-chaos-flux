import { describe, expect, it } from 'vitest';
import {
  attachCompiledCidState,
  createCompiledCidState,
  getCompiledCidState,
} from './compiled-cid';

describe('createCompiledCidState', () => {
  it('creates state with default nextCid of 0', () => {
    const state = createCompiledCidState();
    expect(state.nextCid).toBe(0);
  });

  it('creates state with specified nextCid', () => {
    const state = createCompiledCidState(100);
    expect(state.nextCid).toBe(100);
  });

  it('initializes nextTemplateNodeId to 0', () => {
    const state = createCompiledCidState();
    expect(state.nextTemplateNodeId).toBe(0);
  });

  it('initializes empty byId map', () => {
    const state = createCompiledCidState();
    expect(state.byId).toBeInstanceOf(Map);
    expect(state.byId.size).toBe(0);
  });

  it('initializes empty idPaths map', () => {
    const state = createCompiledCidState();
    expect(state.idPaths).toBeInstanceOf(Map);
    expect(state.idPaths.size).toBe(0);
  });

  it('initializes empty duplicateIds set', () => {
    const state = createCompiledCidState();
    expect(state.duplicateIds).toBeInstanceOf(Set);
    expect(state.duplicateIds.size).toBe(0);
  });
});

describe('attachCompiledCidState', () => {
  it('attaches state to an object', () => {
    const target = {};
    const state = createCompiledCidState();
    attachCompiledCidState(target, state);
    expect(getCompiledCidState(target)).toBe(state);
  });

  it('does not attach duplicate state', () => {
    const target = {};
    const state = createCompiledCidState();
    attachCompiledCidState(target, state);
    attachCompiledCidState(target, state);
    expect(getCompiledCidState(target)).toBe(state);
  });

  it('can replace state with different instance', () => {
    const target = {};
    const state1 = createCompiledCidState(1);
    const state2 = createCompiledCidState(2);
    attachCompiledCidState(target, state1);
    attachCompiledCidState(target, state2);
    expect(getCompiledCidState(target)).toBe(state2);
  });

  it('makes the property non-enumerable', () => {
    const target = {};
    const state = createCompiledCidState();
    attachCompiledCidState(target, state);
    expect(Object.keys(target)).toEqual([]);
  });
});

describe('getCompiledCidState', () => {
  it('returns undefined for null', () => {
    expect(getCompiledCidState(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getCompiledCidState(undefined)).toBeUndefined();
  });

  it('returns undefined for object without state', () => {
    const target = {};
    expect(getCompiledCidState(target)).toBeUndefined();
  });

  it('returns attached state', () => {
    const target = {};
    const state = createCompiledCidState(42);
    attachCompiledCidState(target, state);
    const retrieved = getCompiledCidState(target);
    expect(retrieved).toBe(state);
    expect(retrieved?.nextCid).toBe(42);
  });
});
