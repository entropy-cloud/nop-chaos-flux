import { describe, expect, it } from 'vitest';
import vectors from '../../../../../docs/components/cron-editor/golden-vectors.json';
import { fireSequence, parseCron, nextRunAfter, type CronScheduleValue, type ParsedCron } from '../index';

function mustParse(expr: string): ParsedCron {
  const r = parseCron(expr);
  if (!r.ok) throw new Error(`parse failed: ${expr} (${r.code})`);
  return r.value;
}



interface GoldenNextRun {
  id: string;
  category: string;
  expr: string;
  tz: string;
  after: string;
  expectNext: string[];
  expectExhaustedAfter?: string;
}

interface GoldenDiagnostic {
  id: string;
  category: string;
  expr: string;
  tsCode: string;
  javaValid: boolean;
  javaNextRun?: string;
}

interface GoldenValueCase {
  id: string;
  category: string;
  cron: string;
  repeat?: { every: number; unit: string; anchor?: string };
  range?: { start?: string; end?: string; count?: number };
  tz: string;
  after: string;
  expectNext: string[];
  expectExhaustedAfter?: string;
}

const NEXT_RUN = vectors.nextRun as GoldenNextRun[];
const DIAGNOSTICS = vectors.diagnostics as GoldenDiagnostic[];
const VALUE_CASES = [...(vectors.repeat as GoldenValueCase[]), ...(vectors.range as GoldenValueCase[])];

function iso(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

describe('cron golden vectors (C1 契约, plan 539)', () => {
  describe('nextRun 节', () => {
    it.each(NEXT_RUN.map((v) => [v.id, v] as const))('%s', (_id, v) => {
      const parsed = mustParse(v.expr);
      let t: number | null = Date.parse(v.after);
      for (const expectIso of v.expectNext) {
        expect(t, `${v.id}: sequence terminated before ${expectIso}`).not.toBeNull();
        t = nextRunAfter(parsed, t as number);
        expect(t, `${v.id}: sequence terminated at ${expectIso}`).not.toBeNull();
        expect(iso(t as number)).toBe(expectIso);
      }
      if (v.expectExhaustedAfter !== undefined) {
        expect(nextRunAfter(parsed, Date.parse(v.expectExhaustedAfter)), `${v.id}: expected exhaustion`).toBeNull();
      }
    });
  });

  it('静态 impossible：步进物化路径钉裁决（plan 539 M-2，min(daySet) > 允许月集最大天数）', () => {
    expect(parseCron('0 0 0 30/2 2 ?')).toEqual({ ok: false, code: 'impossible' });
  });

  describe('diagnostics 节', () => {
    it.each(DIAGNOSTICS.map((v) => [v.id, v] as const))('%s', (_id, v) => {
      const parsed = parseCron(v.expr);
      if (parsed.ok) throw new Error(`${v.id}: expected diagnostic ${v.tsCode}`);
      expect(parsed.code, `${v.id}: diagnostic code`).toBe(v.tsCode);
      if (v.javaNextRun === 'runaway-error') {
        // 两端不对称：TS parse 级即拦截 impossible（Java 构造通过、运行期 runaway）
        expect(parsed.code).toBe('impossible');
      }
    });
  });

  describe('repeat / range 节（fireSequence 全链路）', () => {
    it.each(VALUE_CASES.map((v) => [v.id, v] as const))('%s', (_id, v) => {
      const limit = Math.max(1, v.expectNext.length);
      const result = fireSequence(v as CronScheduleValue, Date.parse(v.after), limit);
      expect(result.fires.map(iso), `${v.id}: sequence`).toEqual(v.expectNext);
      if (v.expectExhaustedAfter !== undefined) {
        expect(result.exhaustedAfter, `${v.id}: expected exhaustion`).toBeNull();
      }
    });
  });
});
