import { describe, expect, it } from 'vitest';
import { isPureExpression, normalizeExpressionSource, parseTemplateSegments } from './template';

describe('template helpers', () => {
  it('normalizes direct expressions and plain text', () => {
    expect(normalizeExpressionSource('  ${ value + 1 }  ')).toBe('value + 1');
    expect(normalizeExpressionSource('  plain text  ')).toBe('plain text');
  });

  it('detects pure expressions and rejects mixed text', () => {
    expect(isPureExpression('${user.name}')).toBe(true);
    expect(isPureExpression('hello ${user.name}')).toBe(false);
  });

  it('splits templates with nested braces and keeps invalid tails as text', () => {
    expect(parseTemplateSegments('A ${fn({ value: "}" })} B')).toEqual([
      { type: 'text', value: 'A ' },
      { type: 'expr', value: 'fn({ value: "}" })' },
      { type: 'text', value: ' B' }
    ]);

    expect(parseTemplateSegments('prefix ${unterminated')).toEqual([
      { type: 'text', value: 'prefix ' },
      { type: 'text', value: '${unterminated' }
    ]);
  });
});
