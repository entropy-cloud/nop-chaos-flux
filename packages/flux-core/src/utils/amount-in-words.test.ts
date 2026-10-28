import { describe, expect, it } from 'vitest';
import { amountInWords } from './amount-in-words.js';

describe('amountInWords (zh-CN)', () => {
  it('converts zero', () => {
    expect(amountInWords(0)).toBe('零元整');
  });

  it('converts integers without decimals to ...整', () => {
    expect(amountInWords(1)).toBe('壹元整');
    expect(amountInWords(10)).toBe('壹拾元整');
    expect(amountInWords(100)).toBe('壹佰元整');
  });

  it('converts two-digit and three-digit numbers with zero placeholders', () => {
    expect(amountInWords(101)).toBe('壹佰零壹元整');
    expect(amountInWords(110)).toBe('壹佰壹拾元整');
    expect(amountInWords(2005)).toBe('贰仟零伍元整');
  });

  it('handles 万/亿 group boundaries and inter-group zeros', () => {
    expect(amountInWords(10000)).toBe('壹万元整');
    expect(amountInWords(100000000)).toBe('壹亿元整');
    expect(amountInWords(100000001)).toBe('壹亿零壹元整');
    expect(amountInWords(1000100)).toBe('壹佰万零壹佰元整');
    expect(amountInWords(123456789.05)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元零伍分');
  });

  it('converts two decimal places as 角/分', () => {
    expect(amountInWords(0.5)).toBe('伍角');
    expect(amountInWords(0.05)).toBe('伍分');
    expect(amountInWords(0.56)).toBe('伍角陆分');
    expect(amountInWords(1.2)).toBe('壹元贰角');
    expect(amountInWords(12.34)).toBe('壹拾贰元叁角肆分');
  });

  it('emits 零 between yuan and 分 when 角 is zero', () => {
    expect(amountInWords(1.05)).toBe('壹元零伍分');
  });

  it('handles negative amounts with 负 prefix', () => {
    expect(amountInWords(-1)).toBe('负壹元整');
    expect(amountInWords(-12.34)).toBe('负壹拾贰元叁角肆分');
  });

  it('rounds beyond two decimal places (抹零 to fen)', () => {
    expect(amountInWords(1.234)).toBe('壹元贰角叁分');
    expect(amountInWords(1.235)).toBe('壹元贰角肆分');
  });

  it('returns empty string for non-finite or non-numeric input', () => {
    expect(amountInWords(Number.NaN)).toBe('');
    expect(amountInWords(Number.POSITIVE_INFINITY)).toBe('');
    expect(amountInWords(Number.NEGATIVE_INFINITY)).toBe('');
    expect(amountInWords('abc' as unknown as number)).toBe('');
    expect(amountInWords(null as unknown as number)).toBe('');
    expect(amountInWords(undefined as unknown as number)).toBe('');
  });

  it('returns empty string for values whose fen-scaled magnitude exceeds MAX_SAFE_INTEGER', () => {
    expect(amountInWords(1e15)).toBe('');
    expect(amountInWords('1e15')).toBe('');
  });

  it('accepts numeric strings', () => {
    expect(amountInWords('12.34')).toBe('壹拾贰元叁角肆分');
    expect(amountInWords('0')).toBe('零元整');
  });
});
