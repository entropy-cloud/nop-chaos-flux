import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';

// Plan 552 / IS-lab-hidden-001 + IS-lab-hidden-002 regression coverage.
//
// Root cause fixed under plan 552: mount-time form-value writes (the hidden
// field's schema `value` default push, and the clearValueWhenHidden policy
// clear) fired scope changes BEFORE later sibling nodes had subscribed; the
// composite scope store only tracked lastChange inside listener handlers, so
// the change was never replayed and sibling templates latched their first
// evaluation forever (echo stayed empty / kept the pre-clear value).

function makeRenderer() {
  return createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
}

function renderSchema(schema: SchemaInput) {
  const SchemaRenderer = makeRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://hidden-value-scope-seeding"
      schema={schema}
      env={baseEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('hidden field scope seeding reactivity (plan 552)', () => {
  // IS-lab-hidden-001: a hidden field with a schema `value` must be readable
  // by sibling renderers — the seeded value lands in the form scope and the
  // sibling template re-evaluates once the push lands.
  it('hidden schema value seeds the form scope and sibling templates re-evaluate', async () => {
    renderSchema({
      type: 'form',
      name: 'seededHidden',
      body: [
        { type: 'hidden', name: 'tenantId', value: 'seed' },
        { type: 'text', testid: 'echo', text: 'ECHO[${tenantId ?? "UNSET"}]' },
      ],
    });

    const echo = () => document.querySelector('[data-testid="echo"]');
    await waitFor(
      () => {
        expect(echo()?.textContent).toContain('seed');
      },
      { timeout: 3000 },
    );
  });

  // IS-lab-hidden-002: clearValueWhenHidden clears the scope value on mount,
  // and sibling templates must re-evaluate to the cleared state (no stale
  // pre-clear latch).
  it('clearValueWhenHidden clears the scope value and sibling templates re-evaluate', async () => {
    renderSchema({
      type: 'form',
      name: 'clearPolicy',
      data: { tenantId: 'T1' },
      body: [
        {
          type: 'hidden',
          name: 'tenantId',
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        },
        {
          type: 'text',
          testid: 'echo',
          text: 'POLICY[${tenantId ?? "undefined"}]',
        },
      ],
    });

    const echo = () => document.querySelector('[data-testid="echo"]');
    await waitFor(
      () => {
        expect(echo()?.textContent).toContain('undefined');
      },
      { timeout: 3000 },
    );
    expect(echo()?.textContent).not.toContain('T1');
  });
});
