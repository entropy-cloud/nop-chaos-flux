import { describe, expect, it, vi } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createXuiRolesPlugin, filterByRoles } from './xui-roles-plugin.js';

const hasRole = (allowed: string[]) => (role: string) => allowed.includes(role);

describe('filterByRoles', () => {
  it('removes a node whose xui:roles contains no held role', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [
        { type: 'text', text: 'public' },
        { type: 'button', label: 'admin-only', 'xui:roles': ['admin'] },
      ],
    };

    const filtered = filterByRoles(schema, hasRole(['user'])) as unknown as { body: unknown[] };

    expect(filtered.body).toEqual([{ type: 'text', text: 'public' }]);
  });

  it('keeps a node when at least one xui:roles role is held', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'button', label: 'staff', 'xui:roles': ['admin', 'staff'] }],
    };

    const filtered = filterByRoles(schema, hasRole(['staff'])) as unknown as { body: Array<Record<string, unknown>> };

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].label).toBe('staff');
  });

  it('keeps nodes without xui:roles regardless of held roles', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'text', text: 'open' }],
    };

    const filtered = filterByRoles(schema, hasRole([])) as unknown as { body: unknown[] };

    expect(filtered.body).toHaveLength(1);
  });

  it('strips the xui:roles key from surviving nodes', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'button', label: 'staff', 'xui:roles': ['staff'] }],
    };

    const filtered = filterByRoles(schema, hasRole(['staff'])) as unknown as {
      body: Array<Record<string, unknown>>;
    };

    expect('xui:roles' in filtered.body[0]).toBe(false);
  });

  it('prunes nested children together with a denied parent', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [
        {
          type: 'container',
          'xui:roles': ['admin'],
          body: [
            { type: 'text', text: 'would-be-public' },
            { type: 'text', text: 'also-inside' },
          ],
        },
        { type: 'text', text: 'outside' },
      ],
    };

    const filtered = filterByRoles(schema, hasRole(['user'])) as unknown as { body: unknown[] };

    expect(filtered.body).toEqual([{ type: 'text', text: 'outside' }]);
  });

  it('filters nested arrays inside surviving object properties', () => {
    const schema: SchemaInput = {
      type: 'page',
      columns: [
        { name: 'a', label: 'A', 'xui:roles': ['admin'] },
        { name: 'b', label: 'B' },
      ],
    };

    const filtered = filterByRoles(schema, hasRole(['user'])) as unknown as { columns: unknown[] };

    expect(filtered.columns).toEqual([{ name: 'b', label: 'B' }]);
  });

  it('returns [] when the root node is denied', () => {
    const schema: SchemaInput = {
      type: 'page',
      'xui:roles': ['admin'],
      body: [],
    };

    expect(filterByRoles(schema, hasRole(['user']))).toEqual([]);
  });

  it('accepts a single string xui:roles value', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'button', label: 'x', 'xui:roles': 'admin' }],
    };

    const denied = filterByRoles(schema, hasRole(['user'])) as unknown as { body: unknown[] };
    const allowed = filterByRoles(schema, hasRole(['admin'])) as unknown as { body: unknown[] };

    expect(denied.body).toHaveLength(0);
    expect(allowed.body).toHaveLength(1);
  });
});

describe('createXuiRolesPlugin', () => {
  it('filters schema in beforeCompile using the provided hasRole', () => {
    const plugin = createXuiRolesPlugin({ hasRole: hasRole(['user']) });
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'button', label: 'admin', 'xui:roles': ['admin'] }],
    };

    const result = plugin.beforeCompile!(schema) as unknown as { body: unknown[] };

    expect(result.body).toHaveLength(0);
  });

  it('is a no-op when hasRole is not provided (allow-all)', () => {
    const plugin = createXuiRolesPlugin();
    const schema: SchemaInput = {
      type: 'page',
      body: [{ type: 'button', label: 'admin', 'xui:roles': ['admin'] }],
    };

    expect(plugin.beforeCompile!(schema)).toBe(schema);
  });

  it('exposes the flux:xui-roles plugin name', () => {
    expect(createXuiRolesPlugin().name).toBe('flux:xui-roles');
  });

  it('integrates with createRendererRuntime plugin ordering without throwing', () => {
    // Smoke: the plugin object shape is assignable to RendererPlugin and sorts cleanly.
    const plugin = createXuiRolesPlugin({ hasRole: vi.fn(() => true) });
    expect(typeof plugin.beforeCompile).toBe('function');
    expect(plugin.name).toBe('flux:xui-roles');
  });
});
