import { describe, expect, it } from 'vitest';
import { createPageDesignerDomainAdapter } from '../session.js';

// P1-MA9.4-001 regression guard: the import channel must validate body/region
// shape and props type, not just the top-level isSchema check. Malformed docs
// like {body:'oops'} or {body:[{props:'oops'}]} previously passed validation
// and silently emptied the canvas (audit MA9.4 adversarial, O1 round).

function makeAdapter() {
  const registry = {
    list: () => [
      { type: 'text' },
      { type: 'container' },
      { type: 'page' },
    ],
  };
  return createPageDesignerDomainAdapter(registry as never);
}

describe('page-designer import shape validation (P1-MA9.4-001)', () => {
  it('accepts a well-formed page document', () => {
    const adapter = makeAdapter();
    const result = adapter.validate({
      type: 'page',
      body: [{ type: 'text', props: { text: 'hello' } }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects body as string (malformed import)', () => {
    const adapter = makeAdapter();
    const result = adapter.validate({
      type: 'page',
      body: 'oops',
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes('body'))).toBe(true);
  });

  it('rejects child node with string props (malformed import)', () => {
    const adapter = makeAdapter();
    const result = adapter.validate({
      type: 'page',
      body: [{ type: 'text', props: 'oops' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes('props'))).toBe(true);
  });
});
