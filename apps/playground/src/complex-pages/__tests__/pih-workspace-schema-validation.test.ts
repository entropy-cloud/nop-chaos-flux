import { describe, expect, it } from 'vitest';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { showcaseRegistry } from '../shared/render-host';
import schema from '../page-schemas/pih-workspace.json';

/**
 * Compiler-side validation of the pih-workspace replica schema.
 *
 * `validateSchema` wires a diagnostics reporter internally and returns the full
 * issue list, so this test is the compiler gate for the page (unknown renderer
 * types / prop-shape / action-selector / strict-mode issues) — the runtime
 * probes alone cannot catch a silently-dropped node (e.g. an unregistered
 * `type`, which renders nothing without an error).
 */
describe('pih-workspace schema validation', () => {
  it('passes strict validation with no error diagnostics', () => {
    const issues = validateSchema({
      schema: schema as never,
      registry: showcaseRegistry,
      options: {
        schemaUrl: 'showcase://pih-workspace/page',
        validation: { strictMode: true },
        diagnostics: { enabled: true },
      },
    });

    const errors = issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      console.log('pih-workspace diagnostics:\n' + JSON.stringify(errors, null, 2));
    }
    expect(errors).toEqual([]);
  });

  it('flags an unregistered renderer type (gate is discriminative)', () => {
    const issues = validateSchema({
      schema: { type: 'page', body: [{ type: 'definitely-not-a-renderer' }] } as never,
      registry: showcaseRegistry,
      options: {
        schemaUrl: 'showcase://pih-workspace/bad',
        validation: { strictMode: true },
        diagnostics: { enabled: true },
      },
    });
    expect(issues.some((issue) => issue.code === 'unknown-renderer-type')).toBe(true);
  });
});
