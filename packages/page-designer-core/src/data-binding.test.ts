/**
 * 数据绑定投影测试（S3-1）：文档内数据源名称扫描（去重保序）、
 * `${source.field}` 模板构建/解析往返、非模板值不失真。
 */

import { describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import {
  buildDataBindingExpression,
  collectDataSourceNames,
  parseDataBindingExpression,
} from './data-binding.js';

describe('collectDataSourceNames', () => {
  it('collects named data-source and source nodes in document order, deduped', () => {
    const doc: SchemaInput = {
      type: 'page',
      body: [
        { type: 'data-source', name: 'users' },
        { type: 'container', body: [{ type: 'source', name: 'profile' }, { type: 'data-source', name: 'users' }] },
        { type: 'source' },
        { type: 'text', text: 'x' },
      ],
    };
    expect(collectDataSourceNames(doc)).toEqual(['users', 'profile']);
  });

  it('returns empty for documents without data sources', () => {
    expect(collectDataSourceNames({ type: 'page', body: [{ type: 'text', text: 'a' }] })).toEqual([]);
    expect(collectDataSourceNames({ type: 'page', body: [] })).toEqual([]);
  });
});

describe('buildDataBindingExpression', () => {
  it('builds ${source.field} templates and trims whitespace', () => {
    expect(buildDataBindingExpression('users', 'name')).toBe('${users.name}');
    expect(buildDataBindingExpression(' users ', ' full.name ')).toBe('${users.full.name}');
  });

  it('returns null for incomplete bindings', () => {
    expect(buildDataBindingExpression('', 'name')).toBeNull();
    expect(buildDataBindingExpression('users', '  ')).toBeNull();
    expect(buildDataBindingExpression('users', '')).toBeNull();
  });
});

describe('parseDataBindingExpression', () => {
  it('round-trips with buildDataBindingExpression', () => {
    const built = buildDataBindingExpression('users', 'name')!;
    expect(parseDataBindingExpression(built)).toEqual({ source: 'users', field: 'name' });
  });

  it('parses single-segment one-hop templates only', () => {
    expect(parseDataBindingExpression('${profile.avatarUrl}')).toEqual({ source: 'profile', field: 'avatarUrl' });
  });

  it('returns null for non-template or non-one-hop values (no guessing)', () => {
    expect(parseDataBindingExpression('plain text')).toBeNull();
    expect(parseDataBindingExpression('${sourceField} suffix')).toBeNull();
    expect(parseDataBindingExpression('${nodot}')).toBeNull();
    expect(parseDataBindingExpression('${.leading}')).toBeNull();
    expect(parseDataBindingExpression('${trailing.}')).toBeNull();
    expect(parseDataBindingExpression('${nested.${inner}}')).toBeNull();
    expect(parseDataBindingExpression(42)).toBeNull();
    expect(parseDataBindingExpression(undefined)).toBeNull();
    expect(parseDataBindingExpression(null)).toBeNull();
  });
});
