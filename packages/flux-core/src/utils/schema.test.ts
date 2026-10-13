import { describe, expect, it } from 'vitest';
import { createNodeId, isTemplateNode } from './schema.js';

describe('createNodeId', () => {
  it('returns schema.id directly if present', () => {
    const schema = { type: 'page', id: 'custom-id' };
    expect(createNodeId('any-path', schema)).toBe('custom-id');
  });

  it('sanitizes brackets', () => {
    expect(createNodeId('foo[bar]', { type: 'x' })).toBe('foo_bar_');
  });

  it('sanitizes equals sign', () => {
    expect(createNodeId('a=b', { type: 'x' })).toBe('a_b');
  });

  it('sanitizes spaces', () => {
    expect(createNodeId('hello world', { type: 'x' })).toBe('hello_world');
  });

  it('preserves dots', () => {
    expect(createNodeId('a.b', { type: 'x' })).toBe('a.b');
  });

  it('preserves underscores', () => {
    expect(createNodeId('a_b', { type: 'x' })).toBe('a_b');
  });

  it('preserves colons', () => {
    expect(createNodeId('a:b', { type: 'x' })).toBe('a:b');
  });

  it('preserves hyphens', () => {
    expect(createNodeId('my-id', { type: 'x' })).toBe('my-id');
  });

  it('sanitizes multiple illegal characters', () => {
    expect(createNodeId('foo[bar]@baz', { type: 'x' })).toBe('foo_bar__baz');
  });

  it('preserves alphanumeric characters', () => {
    expect(createNodeId('abc123XYZ', { type: 'x' })).toBe('abc123XYZ');
  });

  it('handles empty path', () => {
    expect(createNodeId('', { type: 'x' })).toBe('');
  });
});

describe('isTemplateNode (CX-6)', () => {
  const validNode = {
    templateNodeId: 1,
    templatePath: 'page.body.card',
    type: 'card',
    component: { type: 'Card' },
    schema: { type: 'card' },
    regions: {},
  };

  it('accepts a fully shaped template node', () => {
    expect(isTemplateNode(validNode)).toBe(true);
  });

  it('rejects null, undefined, primitives and arrays', () => {
    expect(isTemplateNode(null)).toBe(false);
    expect(isTemplateNode(undefined)).toBe(false);
    expect(isTemplateNode(42)).toBe(false);
    expect(isTemplateNode('node')).toBe(false);
    expect(isTemplateNode(true)).toBe(false);
    expect(isTemplateNode([])).toBe(false);
  });

  it('rejects when templateNodeId is missing or not a number', () => {
    const { templateNodeId: _templateNodeId, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, templateNodeId: '1' })).toBe(false);
  });

  it('rejects when templatePath is missing or not a string', () => {
    const { templatePath: _templatePath, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, templatePath: 7 })).toBe(false);
  });

  it('rejects when type is missing or not a string', () => {
    const { type: _type, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, type: 123 })).toBe(false);
  });

  it('rejects when component is missing or falsy', () => {
    const { component: _component, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, component: null })).toBe(false);
  });

  it('rejects when schema is missing or falsy', () => {
    const { schema: _schema, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, schema: undefined })).toBe(false);
  });

  it('rejects when regions is missing or falsy', () => {
    const { regions: _regions, ...rest } = validNode;
    expect(isTemplateNode(rest)).toBe(false);
    expect(isTemplateNode({ ...rest, regions: 0 })).toBe(false);
  });
});
