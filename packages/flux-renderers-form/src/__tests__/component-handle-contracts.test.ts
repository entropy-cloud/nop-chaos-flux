import { describe, expect, it } from 'vitest';
import { formRendererDefinitions } from '../index.js';

describe('input renderer component capability contracts (X1)', () => {
  function handlesFor(type: string): string[] {
    const def = formRendererDefinitions.find((d) => d.type === type);
    return (def?.componentCapabilityContracts ?? []).map((c) => c.handle);
  }

  it('input-text / input-email / input-password publish clear/reset/focus', () => {
    for (const type of ['input-text', 'input-email', 'input-password']) {
      expect(handlesFor(type), type).toEqual(['clear', 'reset', 'focus']);
    }
  });

  it('textarea publishes clear/reset/focus', () => {
    expect(handlesFor('textarea')).toEqual(['clear', 'reset', 'focus']);
  });

  it('input-number publishes clear/reset/focus', () => {
    expect(handlesFor('input-number')).toEqual(['clear', 'reset', 'focus']);
  });

  it('select publishes clear/focus/open', () => {
    expect(handlesFor('select')).toEqual(['clear', 'focus', 'open']);
  });

  it('switch / radio-group / checkbox-group publish focus only', () => {
    expect(handlesFor('switch')).toEqual(['focus']);
    expect(handlesFor('radio-group')).toEqual(['focus']);
    expect(handlesFor('checkbox-group')).toEqual(['focus']);
  });
});
