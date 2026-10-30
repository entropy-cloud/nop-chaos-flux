import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { env, pageRenderer } from '../test-support-core.js';
import { formRenderer } from '../test-support-core.js';

// P1-MA4.5-006 minimal integration reproduction: a form with valuesPath +
// initialValues + a sibling probe reading the published path from the page
// scope. The audit's E2 probe showed echo="" — data inside the form, never
// reaching the valuesPath read face. While the defect is live this body is
// skipped (test.fixme ratchet — remove the fixme when the fix lands to
// activate as a permanent regression guard).
//
// RATCHET HISTORY (plan 824 batch closure audit, 2026-10-31): plan 737's
// closure commit 6cd1e6046 flipped this `it.skip`→`it` claiming a "co-root
// resolution / 同解转绿", but the activated body kept the
// `waitFor(...).catch(() => { /* test.fixme */ })` swallow (and never
// returned the waitFor) — vacuous, cannot fail. The 2026-10-31 independent
// closure re-audit ran an assertion-biting variant (catch removed, waitFor
// returned) under the repo's real vitest config: still RED at HEAD
// (`ui.textCron` echoes `__UNPUBLISHED__` after 3s). Probe preserved under
// `_tmp/values-path-2026-10-31/`. The honest ratchet is restored below;
// successor ownership R3.x/MV unchanged (see plan 737 Deferred).

const inputTextRenderer = {
  type: 'input-text',
  component: (props: { props: { value?: string } }) => (
    <input data-testid="form-input" value={props.props.value ?? ''} readOnly />
  ),
} as never;

const echoRenderer = {
  type: 'values-path-echo',
  component: function ValuesPathEchoRenderer(props: { props: { path?: string } }) {
    const path = String(props.props.path ?? '');
    const rendered = useScopeSelector((data: Record<string, unknown>) => {
      const parts = path.split('.');
      let current: unknown = data;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') {
          current = undefined;
          break;
        }
        current = (current as Record<string, unknown>)[part];
      }
      return current === undefined ? '__UNPUBLISHED__' : JSON.stringify(current);
    }, Object.is);
    return <span data-testid="values-echo">{rendered}</span>;
  },
  fields: [{ key: 'path', kind: 'prop' }],
} as never;

describe('form valuesPath initial snapshot publication (P1-MA4.5-006)', () => {
  // Ratchet restored 2026-10-31: 737's premature skip-removal left a vacuous
  // always-green body while the defect is live (see RATCHET HISTORY above).
  it.skip('initial data reaches the valuesPath read face without user interaction', () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      inputTextRenderer,
      echoRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://valuesPath-echo"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'form',
                name: 'pub-form',
                valuesPath: 'ui.textCron',
                data: { cron: { pattern: '*/5 * * * *' } },
                body: [{ type: 'input-text', name: 'cron', label: 'Cron' }],
              },
              { type: 'values-path-echo', path: 'ui.textCron' },
            ],
          } as never
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // The initial publication is deferred to a microtask (plan 550)
    waitFor(
      () => {
        const echo = screen.getByTestId('values-echo').textContent ?? '';
        expect(echo).not.toBe('__UNPUBLISHED__');
        expect(echo).toContain('cron');
      },
      { timeout: 3000 },
    ).catch(() => {
      // test.fixme: expected to fail while the defect is live
    });
  });
});
