import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { createDebuggerStore } from './store.js';
import { collectDiagnosticBundle, type DiagnosticBundleDeps } from './diagnostic-bundle.js';
import { buildAiRepairInput } from './ai-repair-input.js';
import devSessionSchema from '../protocol/dev-session.schema.json';
import methodsSchema from '../protocol/methods.schema.json';

function makeDeps(overrides: Partial<DiagnosticBundleDeps> = {}) {
  const store = createDebuggerStore({
    enabled: true, sessionId: 's', maxEvents: 100, defaultOpen: false, defaultTab: 'overview',
    position: { x: 0, y: 0 }, errorBufferKeepEarliest: 5, errorBufferKeepLatest: 5,
  });
  store.append({ kind: 'assertion', group: 'assertion', level: 'error', source: 'waitFor', summary: 'why:disabled failed after 3 attempts', screenshotId: 'shot-why-1' });
  store.append({ kind: 'compile:start', group: 'compile', level: 'info', source: 'compiler', summary: 'compile start' });
  return {
    sessionId: 'diag-session',
    store,
    collector: null,
    buildSession: () => ({
      version: 1,
      meta: { startedAt: 1 },
      clock: { origin: 1, events: [] },
      inputs: [],
      envFrames: [],
      checkpoints: [],
      logs: [],
    }),
    screenshotTagRefs: () => [],
    redact: (value) => value,
    ...overrides,
  } as DiagnosticBundleDeps;
}

describe('diagnostic bundle (M7)', () => {
  it('collects keyframes from assertion failures and why verdict tags', () => {
    const bundle = collectDiagnosticBundle(makeDeps());
    expect(bundle.version).toBe(1);
    expect(bundle.keyframes.some((frame) => frame.tag.includes('why:'))).toBe(true);
    expect(bundle.keyframes.some((frame) => frame.screenshotId === 'shot-why-1')).toBe(true);
    expect(bundle.patchAudit.length).toBeGreaterThan(0);
    expect(bundle.uploadPath).toBe('local');
  });

  it('session passes the frozen M0 schema validation and round-trips JSON', () => {
    const bundle = collectDiagnosticBundle(makeDeps());
    const ajv = new Ajv({ strict: false, allErrors: true });
    ajv.addSchema([methodsSchema, devSessionSchema]);
    const validate = ajv.compile({ $ref: 'https://nop-chaos.dev/schemas/devtools/dev-session.schema.json' });
    expect(validate(bundle.session)).toBe(true);
    const roundTripped = JSON.parse(JSON.stringify(bundle));
    expect(roundTripped.session).toEqual(bundle.session);
  });

  it('redaction terminal check runs over the session', () => {
    const deps = makeDeps({
      redact: (value) => {
        const record = value as Record<string, unknown>;
        return { ...record, redacted: true };
      },
    });
    const bundle = collectDiagnosticBundle(deps);
    expect((bundle.session as unknown as Record<string, unknown>).redacted).toBe(true);
  });

  it('malformed bundle is rejected by replayDiagnosticBundle', async () => {
    const { replayDiagnosticBundle } = await import('./diagnostic-bundle.js');
    const deps = { runtime: { dispatch: async () => ({}) }, getScopes: () => ({}) };
    await expect(
      replayDiagnosticBundle({ version: 1, sessionId: 'x', createdAt: 1 } as never, deps as never),
    ).rejects.toMatchObject({ code: 'bundle-invalid' });
  });
});

describe('buildAiRepairInput (M7)', () => {
  it('aggregates why verdict + divergence + visual diff evidence', () => {
    const input = buildAiRepairInput({
      whyReport: {
        cid: 7,
        question: 'why',
        verdict: 'visible=false → 节点不渲染',
        confidence: 'high',
        evidence: [],
        parts: [],
      },
      divergences: [{ step: 5, path: 'root.form', expected: 'h5', actual: 'h6' }],
      visualDiff: { diffRatio: 0.02, regions: [{ cid: 'c-1', diffRatio: 0.02 }] },
    });
    expect(input.kind).toBe('ai-repair-input');
    expect(input.evidence).toHaveLength(3);
    expect(input.evidence.some((item) => item.kind === 'why-verdict')).toBe(true);
    expect(input.evidence.some((item) => item.kind === 'replay-divergence' && item.expected !== undefined && item.actual !== undefined)).toBe(true);
  });

  it('rejects disallowed suggestedPatchArea characters (ai-boundary direction: types in nop-debugger)', () => {
    expect(() => buildAiRepairInput({ suggestedPatchArea: '<script>alert(1)</script>' })).toThrow(/suggestedPatchArea/);
    expect(() => buildAiRepairInput({ suggestedPatchArea: 'form.username' })).not.toThrow();
  });
});

describe('AI package boundary direction (M7)', () => {
  it('nop-debugger sources contain no AI package marker', async () => {
    const { readFileSync } = await import('node:fs');
    const here = dirname(fileURLToPath(import.meta.url));
    const aiRepair = readFileSync(join(here, 'ai-repair-input.ts'), 'utf8');
    expect(aiRepair.includes(['@nop-chaos', 'nop-debugger-ai'].join('/'))).toBe(false);
    expect(aiRepair.includes(['@nop-chaos', 'flux-renderers-ai'].join('/'))).toBe(false);
    void (await import('./types.js'));
  });
});
