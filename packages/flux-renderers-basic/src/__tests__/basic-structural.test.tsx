import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createBasicSchemaRenderer,
  env,
  formulaCompiler,
  scopeProbeRenderer,
} from '../test-support.js';

describe('basicRendererDefinitions structural rendering', () => {
  it('renders fragment body with inherited scope data', () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [{ type: 'fragment', body: [{ type: 'text', text: 'Hello ${user.name}' }] }],
        }}
        data={{ user: { name: 'Alice' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Hello Alice')).toBeTruthy();
    cleanup();
  });

  it('supports fragment data with isolate', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'fragment',
              data: { localOnly: 'inside' },
              isolate: true,
              body: [{ type: 'scope-probe', value: '${localOnly}' }],
            },
          ],
        }}
        data={{ localOnly: 'outside' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('scope-probe').textContent).toContain('|inside'));
    cleanup();
  });

  it('renders loop item scopes with inherited parent bindings and stable instancePath', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${users}',
              keyBy: 'item.id',
              body: [
                {
                  type: 'scope-probe',
                  testid: 'loop-probe',
                  value: '${$slot.item.name + ":" + currentRole}',
                },
              ],
            },
          ],
        }}
        data={{ currentRole: 'admin', users: [{ id: 'u1', name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      const text = screen.getByTestId('loop-probe').textContent ?? '';
      expect(text).toContain('u1');
      expect(text).toContain('Alice:admin');
    });
    cleanup();
  });

  it('renders loop empty region when items are empty', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${users}',
              body: [{ type: 'text', text: '${$slot.item.name}' }],
              empty: [{ type: 'text', text: 'No users' }],
            },
          ],
        }}
        data={{ users: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('No users')).toBeTruthy();
    cleanup();
  });

  it('evaluates loop itemData in item scope and preserves reserved bindings', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${users}',
              itemData: {
                label: '${item.name + ":" + index}',
                item: 'shadowed-item',
                index: 999,
                $parent: 'shadowed-parent',
              },
              body: [
                {
                  type: 'scope-probe',
                  testid: 'loop-itemdata-probe',
                  value: '${$slot.label + "|" + $slot.item.name + "|" + $slot.index + "|" + (($slot.$parent === undefined) ? "true" : "false")}',
                },
              ],
            },
          ],
        }}
        data={{ users: [{ name: 'Alice' }, { name: 'Bob' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const texts = screen
        .getAllByTestId('loop-itemdata-probe')
        .map((node) => node.textContent ?? '');
      expect(texts).toContain(
        '[{"repeatedTemplateId":"loop:_.body_0_","instanceKey":"Alice"}]|Alice:0|Alice|0|true',
      );
      expect(texts).toContain(
        '[{"repeatedTemplateId":"loop:_.body_0_","instanceKey":"Bob"}]|Bob:1|Bob|1|true',
      );
    });
    cleanup();
  });

  it('reuses the nearest loop body for recurse', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${nodes}',
              keyBy: 'item.id',
              body: [
                { type: 'text', text: '${$slot.item.label}' },
                {
                  type: 'fragment',
                  when: '${$slot.item.children && $slot.item.children.length > 0}',
                  body: [{ type: 'recurse', items: '${$slot.item.children}' }],
                },
              ],
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Root')).toBeTruthy();
      expect(screen.getByText('Child')).toBeTruthy();
    });
    cleanup();
  });

  it('inherits enclosing loop bindings for recurse when not overridden', async () => {
    const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${nodes}',
              itemName: 'node',
              indexName: 'nodeIndex',
              keyName: 'nodeKey',
              keyBy: 'item.id',
              body: [
                {
                  type: 'scope-probe',
                  testid: 'node-probe',
                  value: '${$slot.node.label + ":" + $slot.nodeIndex + ":" + $slot.nodeKey}',
                },
                {
                  type: 'fragment',
                  when: '${$slot.node.children && $slot.node.children.length > 0}',
                  body: [{ type: 'recurse', items: '${$slot.node.children}' }],
                },
              ],
            },
          ],
        }}
        data={{
          nodes: [
            {
              id: 'root',
              label: 'Root',
              children: [{ id: 'child', label: 'Child', children: [] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      const texts = screen.getAllByTestId('node-probe').map((node) => node.textContent ?? '');
      expect(texts.some((text) => text.includes('Root:0:root'))).toBe(true);
      expect(texts.some((text) => text.includes('Child:0:child'))).toBe(true);
    });
    cleanup();
  });

  it('stops recurse when maxDepth is reached', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/structural"
        schema={{
          type: 'page',
          body: [
            {
              type: 'loop',
              items: '${nodes}',
              body: [
                { type: 'text', text: '${$slot.item.label}' },
                {
                  type: 'fragment',
                  when: '${$slot.item.children && $slot.item.children.length > 0}',
                  body: [{ type: 'recurse', items: '${$slot.item.children}', maxDepth: 1 }],
                },
              ],
            },
          ],
        }}
        data={{
          nodes: [
            {
              label: 'Root',
              children: [{ label: 'Child', children: [{ label: 'Grandchild', children: [] }] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Root')).toBeTruthy();
      expect(screen.queryByText('Grandchild')).toBeNull();
    });
    cleanup();
  });
});
