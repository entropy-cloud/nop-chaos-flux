import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// C-02 Proof (compile-once contract): the dynamic-renderer must consume loadAction
// through the compiled prop channel (`props.props.loadAction`, declared
// `kind: 'prop'` so the compiler pre-compiles its `${}` templates into the node's
// propsProgram exactly once) instead of re-compiling the raw action schema on
// every load / scope change via `props.helpers.evaluate(props.schema.loadAction)`.
//
// The behavioral half of this Proof — that scope-driven loadAction resolution still
// triggers a reload (proving the prop channel re-resolves reactively, with no
// per-render helpers.evaluate) — is covered by
// `basic-dynamic-renderer.test.tsx > "reloads when the resolved loadAction changes
// through scope data"`. This test pins the source invariant that makes it compile-once.

const dynamicRendererSource = readFileSync(
  join(import.meta.dirname, '..', 'dynamic-renderer.tsx'),
  'utf8',
);

describe('C-02: dynamic-renderer loadAction compile-once contract', () => {
  it('consumes loadAction from the compiled prop channel (props.props.loadAction)', () => {
    expect(dynamicRendererSource).toContain('props.props.loadAction');
  });

  it('does not re-compile loadAction from raw schema via helpers.evaluate', () => {
    expect(dynamicRendererSource).not.toContain('helpers.evaluate(props.schema');
    expect(dynamicRendererSource).not.toMatch(/props\.schema\.loadAction\b/);
  });
});
