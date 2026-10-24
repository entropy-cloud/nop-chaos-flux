import { describe, expect, it } from 'vitest';
import { parseNopTaskDSL } from '../dsl.js';

// P1-MA9.3-001 regression guard: parseNopTaskDSL must reject explicit
// non-taskflow kind values while accepting absent kind (legacy) and
// explicit 'taskflow' (current exports emit kind at :192/:219).
describe('parseNopTaskDSL kind validation (P1-MA9.3-001)', () => {
  const validDsl = { steps: [{ name: 's1', type: 'script' }] };

  it('accepts absent kind (legacy docs)', () => {
    const result = parseNopTaskDSL({ ...validDsl });
    expect(result).not.toBeNull();
  });

  it("accepts explicit kind: 'taskflow'", () => {
    const result = parseNopTaskDSL({ ...validDsl, kind: 'taskflow' });
    expect(result).not.toBeNull();
  });

  it('rejects explicit non-taskflow kind', () => {
    expect(() => parseNopTaskDSL({ ...validDsl, kind: 'bpmn' })).toThrowError(
      /Unsupported DSL kind.*bpmn/,
    );
  });

  it("accepts 'nop-taskflow' kind (legacy format)", () => {
    const result = parseNopTaskDSL({ ...validDsl, kind: 'nop-taskflow' });
    expect(result).not.toBeNull();
  });

  it('treats empty-string kind as absent (falsy = legacy)', () => {
    const result = parseNopTaskDSL({ ...validDsl, kind: '' });
    expect(result).not.toBeNull();
  });
});
