/**
 * 编辑装配投影测试（S1 §5.2/INV-B/INV-E）：`xui:sid` → `testid` 只发生在编译副本，
 * working 文档逐字保留；预览态剥离由 core 提供（此处断言投影纯函数本身）。
 */

import { createSeededRandom, injectSessionIds, stripSessionIds } from '@nop-chaos/page-designer-core';
import { describe, expect, it } from 'vitest';
import { projectSessionIdsToTestids } from './edit-assembly.js';

describe('edit-assembly projection', () => {
  it('projects xui:sid to testid on every schema node (deep, arrays included)', () => {
    const doc = injectSessionIds(
      { type: 'page', body: [{ type: 'container', body: [{ type: 'text', text: 'a' }] }] },
      createSeededRandom(3),
    );
    const projected = projectSessionIdsToTestids(doc) as Record<string, unknown>;
    expect(typeof projected.testid).toBe('string');
    const body = projected.body as Record<string, unknown>[];
    expect(typeof body[0].testid).toBe('string');
    const nested = (body[0].body as Record<string, unknown>[])[0];
    expect(nested.testid).toMatch(/^psid-/);
  });

  it('keeps existing user keys verbatim and does not mutate the input document', () => {
    const doc = injectSessionIds(
      { type: 'page', body: [], 'xui:custom': { keep: true }, className: 'p-4' },
      createSeededRandom(5),
    );
    const snapshot = JSON.stringify(doc);
    const projected = projectSessionIdsToTestids(doc) as Record<string, unknown>;
    expect(JSON.stringify(doc)).toBe(snapshot);
    expect(projected.className).toBe('p-4');
    expect(projected['xui:custom']).toEqual({ keep: true });
  });

  it('does not inject into non-schema plain objects', () => {
    const doc = injectSessionIds(
      { type: 'page', data: { notA: 'schema' }, body: [] },
      createSeededRandom(6),
    );
    const projected = projectSessionIdsToTestids(doc) as Record<string, unknown>;
    expect((projected.data as Record<string, unknown>).testid).toBeUndefined();
  });

  it('export projection (stripSessionIds on working doc) never carries the injected testid', () => {
    const doc = injectSessionIds(
      { type: 'page', body: [{ type: 'text', text: 'x' }] },
      createSeededRandom(8),
    );
    const projected = projectSessionIdsToTestids(doc) as Record<string, unknown>;
    expect(typeof projected.testid).toBe('string');
    const stripped = stripSessionIds(doc) as Record<string, unknown>;
    expect(stripped.testid).toBeUndefined();
    expect(JSON.stringify(stripped)).not.toContain('psid-');
  });
});
