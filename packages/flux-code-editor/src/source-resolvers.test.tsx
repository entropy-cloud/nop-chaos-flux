import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import {
  useResolvedFunctions,
  useResolvedSQLVariables,
  useResolvedTables,
  useResolvedVariables,
} from './source-resolvers.js';

function createScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 'scope-1',
    path: '$',
    value: data,
    get(path) {
      return path.split('.').reduce<unknown>((current, key) => {
        if (!current || typeof current !== 'object') {
          return undefined;
        }
        return (current as Record<string, unknown>)[key];
      }, data);
    },
    has(path) {
      return this.get(path) !== undefined;
    },
    readOwn() {
      return data;
    },
    readVisible() {
      return data;
    },
    materializeVisible() {
      return data;
    },
    update() {},
    merge() {},
    replace() {},
  } as ScopeRef;
}

function ResolverProbe(props: {
  expressionConfig?: Record<string, unknown>;
  sqlConfig?: Record<string, unknown>;
  scope: ScopeRef;
}) {
  const variables = useResolvedVariables(props.expressionConfig as any, props.scope);
  const functions = useResolvedFunctions(props.expressionConfig as any);
  const tables = useResolvedTables(props.sqlConfig as any, props.scope);
  const sqlVariables = useResolvedSQLVariables(props.sqlConfig as any, props.scope);

  return (
    <pre data-testid="resolver-output">
      {JSON.stringify({ variables, functions, tables, sqlVariables })}
    </pre>
  );
}

describe('source resolver hooks', () => {
  afterEach(() => {
    cleanup();
  });

  it('passes through static expression config arrays', () => {
    render(
      <ResolverProbe
        scope={createScope({})}
        expressionConfig={{
          variables: [{ label: 'Foo', value: 'foo' }],
          functions: [{ groupName: 'Math', items: [{ name: 'sum', description: 'sum()' }] }],
        }}
      />,
    );

    expect(screen.getByTestId('resolver-output').textContent).toContain('"value":"foo"');
    expect(screen.getByTestId('resolver-output').textContent).toContain('"name":"sum"');
  });

  it('resolves variables, tables, and sql variables from scope-backed refs', () => {
    render(
        <ResolverProbe
          scope={createScope({
            editor: {
            variables: [{ label: 'Foo', value: 'foo' }],
            sql: {
              tables: [{ name: 'users', columns: [{ name: 'id', type: 'int' }] }],
              variables: [{ label: 'Tenant', value: 'tenantId' }],
            },
          },
        })}
        expressionConfig={{
          variables: { source: 'scope', scopePath: 'editor', path: 'variables' },
        }}
        sqlConfig={{
          tables: { source: 'scope', scopePath: 'editor.sql', path: 'tables' },
          variablePanel: {
            variables: { source: 'scope', scopePath: 'editor.sql', path: 'variables' },
          },
        }}
      />,
    );

    const output = screen.getByTestId('resolver-output').textContent ?? '';
    expect(output).toContain('"value":"foo"');
    expect(output).toContain('"name":"users"');
    expect(output).toContain('"value":"tenantId"');
  });

  it('returns empty arrays when scope-backed branches are missing', () => {
    render(
      <ResolverProbe
        scope={createScope({})}
        expressionConfig={{
          variables: { source: 'scope', scopePath: 'missing', path: 'variables' },
          functions: { source: 'scope', scopePath: 'missing', path: 'functions' },
        }}
        sqlConfig={{
          tables: { source: 'scope', scopePath: 'missing', path: 'tables' },
          variablePanel: {
            variables: { source: 'scope', scopePath: 'missing', path: 'variables' },
          },
        }}
      />,
    );

    expect(screen.getByTestId('resolver-output').textContent).toBe(
      JSON.stringify({ variables: [], functions: [], tables: [], sqlVariables: [] }),
    );
  });

  it('filters malformed static and scope-backed resolver items', () => {
    render(
      <ResolverProbe
        scope={createScope({
          editor: {
            variables: [null, { label: 'Tenant', value: 'tenant.id' }, { label: 'Broken' }],
            tables: [
              { name: 'users', columns: [{ name: 'id', type: 'BIGINT' }] },
              { name: 'broken', columns: [{ name: 'oops' }] },
            ],
            sqlVariables: [{ label: 'Env', value: 'env.id' }, { value: 'broken' }],
          },
        })}
        expressionConfig={{
          variables: { source: 'scope', scopePath: 'editor', path: 'variables' },
          functions: [
            { groupName: 'Logic', items: [{ name: 'IF' }, { description: 'broken' }] },
            { groupName: 'Broken', items: [] },
          ],
        }}
        sqlConfig={{
          tables: { source: 'scope', scopePath: 'editor', path: 'tables' },
          variablePanel: {
            variables: { source: 'scope', scopePath: 'editor', path: 'sqlVariables' },
          },
        }}
      />,
    );

    expect(screen.getByTestId('resolver-output').textContent).toBe(
      JSON.stringify({
        variables: [{ label: 'Tenant', value: 'tenant.id', children: [] }],
        functions: [{ groupName: 'Logic', items: [{ name: 'IF' }] }],
        tables: [{ name: 'users', columns: [{ name: 'id', type: 'BIGINT' }] }],
        sqlVariables: [{ label: 'Env', value: 'env.id', children: [] }],
      }),
    );
  });
});
