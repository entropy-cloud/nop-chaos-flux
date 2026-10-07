import { describe, expect, it } from 'vitest';
import vectors from '../../../../../docs/components/cron-editor/golden-vectors.json';
import { parseCron, serializeCron, type ParsedCron } from '../index';

function mustParse(expr: string): ParsedCron {
  const r = parseCron(expr);
  if (!r.ok) throw new Error(`parse failed: ${expr} (${r.code})`);
  return r.value;
}



interface GoldenNextRun {
  id: string;
  expr: string;
}

const NEXT_RUN = vectors.nextRun as GoldenNextRun[];

describe('serializeCron canonical 往返', () => {
  it('全部合法向量表达式 parse→serialize→parse 幂等', () => {
    let roundTripped = 0;
    for (const v of NEXT_RUN) {
      const first = mustParse(v.expr);
      const text = serializeCron(first);
      const second = parseCron(text);
      expect(second.ok, `${v.id}: reserialize parse failed for "${text}"`).toBe(true);
      expect((second as { value: ParsedCron }).value).toEqual(first);
      // 二次序列化稳定（幂等）
      expect(serializeCron((second as { value: ParsedCron }).value)).toBe(text);
      roundTripped++;
    }
    expect(roundTripped).toBe(NEXT_RUN.length);
  });

  it('canonical 形状：月名/周名 → 数字、? → *、7 段保年', () => {
    expect(serializeCron(mustParse('0 0 0 1 jan,mar *'))).toBe('0 0 0 1 1,3 *');
    expect(serializeCron(mustParse('0 0 12 ? * sun'))).toBe('0 0 12 * * 0');
    expect(serializeCron(mustParse('0 0 9 ? * MON-FRI'))).toBe('0 0 9 * * 1-5');
    expect(serializeCron(mustParse('0 0 0 1 1 ? 2026-2030'))).toBe('0 0 0 1 1 * 2026-2030');
    expect(serializeCron(mustParse('0  0  9  *  * *'))).toBe('0 0 9 * * *');
  });

  it('canonical 形状：动态日与步进/区间保形', () => {
    expect(serializeCron(mustParse('0 0 0 L * ?'))).toBe('0 0 0 L * *');
    expect(serializeCron(mustParse('0 0 0 ? * MON#1'))).toBe('0 0 0 * * 1#1');
    expect(serializeCron(mustParse('0 0 0 1W 8 ?'))).toBe('0 0 0 1W 8 *');
    expect(serializeCron(mustParse('0 0 2/6 * * *'))).toBe('0 0 2/6 * * *');
    expect(serializeCron(mustParse('0 0 23 28-31 * *'))).toBe('0 0 23 28-31 * *');
  });
});
