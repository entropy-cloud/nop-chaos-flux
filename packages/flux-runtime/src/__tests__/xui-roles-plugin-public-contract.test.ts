import { describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createXuiRolesPlugin, filterByRoles } from '../index.js';

describe('xui-roles plugin public contract (package entry)', () => {
  it('exposes createXuiRolesPlugin and filterByRoles from the public entry', () => {
    expect(typeof createXuiRolesPlugin).toBe('function');
    expect(typeof filterByRoles).toBe('function');
  });

  it('prunes xui:roles-denied nodes when consumed from the public surface', () => {
    const plugin = createXuiRolesPlugin({ hasRole: (role) => role === 'admin' });
    expect(plugin.name).toBe('flux:xui-roles');

    const schema: SchemaInput = {
      type: 'page',
      body: [
        { type: 'text', text: 'public' },
        { type: 'button', label: 'admin-only', 'xui:roles': ['admin'] },
        { type: 'button', label: 'manager-only', 'xui:roles': ['manager'] },
      ],
    };

    const filtered = plugin.beforeCompile!(schema) as unknown as { body: Array<Record<string, unknown>> };
    expect(filtered.body.map((node) => node.label ?? node.text)).toEqual(['public', 'admin-only']);
    for (const node of filtered.body) {
      expect('xui:roles' in node).toBe(false);
    }
  });

  it('prunes whole subtrees from the public filterByRoles surface', () => {
    const schema: SchemaInput = {
      type: 'page',
      body: [
        {
          type: 'container',
          'xui:roles': ['admin'],
          body: [{ type: 'text', text: 'inside-denied-parent' }],
        },
        { type: 'text', text: 'outside' },
      ],
    };

    const filtered = filterByRoles(schema, (role) => role === 'user') as unknown as { body: unknown[] };
    expect(filtered.body).toEqual([{ type: 'text', text: 'outside' }]);
  });
});
