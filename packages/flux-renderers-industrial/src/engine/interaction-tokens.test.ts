import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  INTERACTION_STYLE_PRESETS,
  EDITOR_SELECTED_RING_VAR,
  EDITOR_SELECTED_RING_FALLBACK,
  readIndTokenVar,
  resolveInteractionStyles,
} from './interaction-tokens.js';

function stubComputedStyles(tokens: Record<string, string>) {
  return vi
    .spyOn(window, 'getComputedStyle')
    .mockReturnValue({ getPropertyValue: (name: string) => tokens[name] ?? '' } as unknown as CSSStyleDeclaration);
}

const makeContainer = () => document.createElement('div');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('interaction tokens (plan 530 S1: --ind-* 语义令牌解析链)', () => {
  it('should fall back to preset constants when the container carries no --ind-* tokens', () => {
    const styles = resolveInteractionStyles(makeContainer());
    expect(styles.hover).toEqual(INTERACTION_STYLE_PRESETS.hover);
    expect(styles.press).toEqual(INTERACTION_STYLE_PRESETS.press);
    expect(styles.selected).toEqual(INTERACTION_STYLE_PRESETS.selected);
    expect(styles.disabled).toEqual(INTERACTION_STYLE_PRESETS.disabled);
  });

  it('should fall back to preset constants when the container is missing', () => {
    const styles = resolveInteractionStyles(null);
    expect(styles.hover.stroke).toBe(INTERACTION_STYLE_PRESETS.hover.stroke);
    expect(styles.selected.shadow).toBe(INTERACTION_STYLE_PRESETS.selected.shadow);
  });

  // 判别性测试（plan 530 When Drafting 13）：旧实现直接消费常量、无解析链，令牌注入后值不会
  // 翻转必挂；新实现经 computed style 解析，注入值生效。
  it('should resolve injected --ind-* tokens over the fallback constants (distinguishing)', () => {
    const restore = stubComputedStyles({
      '--ind-interaction-hover': '#010203',
      '--ind-interaction-hover-fill': 'rgba(1, 2, 3, 0.5)',
      '--ind-interaction-press': '#040506',
      '--ind-interaction-selected': '#070809',
      '--ind-interaction-selected-fill': 'rgba(7, 8, 9, 0.4)',
      '--ind-interaction-selected-shadow': '0 8px 24px rgba(0, 0, 0, 0.6)',
      '--ind-interaction-disabled': '#0a0b0c',
    });
    expect(restore).toBeDefined();
    const styles = resolveInteractionStyles(makeContainer());
    expect(styles.hover).toEqual({ stroke: '#010203', strokeWidth: 2, fill: 'rgba(1, 2, 3, 0.5)' });
    expect(styles.press).toEqual({ stroke: '#040506', strokeWidth: 2, fill: INTERACTION_STYLE_PRESETS.press.fill });
    expect(styles.selected).toEqual({
      stroke: '#070809',
      strokeWidth: 2,
      fill: 'rgba(7, 8, 9, 0.4)',
      shadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
    });
    expect(styles.disabled).toEqual({ stroke: '#0a0b0c', strokeWidth: 1, opacity: 0.55 });
  });

  it('should fall back per key for malformed values while valid keys stay resolved', () => {
    const restore = stubComputedStyles({
      '--ind-interaction-hover': 'junk-value!!',
      '--ind-interaction-hover-fill': '#654321',
      '--ind-interaction-selected-shadow': 'soft-shadow',
    });
    expect(restore).toBeDefined();
    const styles = resolveInteractionStyles(makeContainer());
    expect(styles.hover.stroke).toBe(INTERACTION_STYLE_PRESETS.hover.stroke);
    expect(styles.hover.fill).toBe('#654321');
    expect(styles.selected.shadow).toBe(INTERACTION_STYLE_PRESETS.selected.shadow);
  });

  it('should accept named and modern color syntax tokens', () => {
    const restore = stubComputedStyles({
      '--ind-interaction-hover': 'orange',
      '--ind-interaction-press': 'oklch(0.7 0.1 40)',
    });
    expect(restore).toBeDefined();
    const styles = resolveInteractionStyles(makeContainer());
    expect(styles.hover.stroke).toBe('orange');
    expect(styles.press.stroke).toBe('oklch(0.7 0.1 40)');
  });

  it('should expose the three-state formula with distinct ring colors and layered fill/shadow', () => {
    const { hover, press, selected, disabled } = INTERACTION_STYLE_PRESETS;
    expect(hover.stroke).not.toBe(press.stroke);
    expect(press.stroke).not.toBe(selected.stroke);
    expect(hover.stroke).not.toBe(selected.stroke);
    expect(selected.shadow).toBeDefined();
    expect(selected.fill).toBeDefined();
    expect(press.fill).toBeDefined();
    expect(disabled.opacity).toBeLessThan(1);
    expect(disabled.fill).toBeUndefined();
  });

  it('should read the editor selected-ring token with fallback', () => {
    expect(readIndTokenVar(null, EDITOR_SELECTED_RING_VAR, EDITOR_SELECTED_RING_FALLBACK)).toBe(
      EDITOR_SELECTED_RING_FALLBACK,
    );
    const restore = stubComputedStyles({ [EDITOR_SELECTED_RING_VAR]: '#123123' });
    expect(restore).toBeDefined();
    expect(readIndTokenVar(makeContainer(), EDITOR_SELECTED_RING_VAR, EDITOR_SELECTED_RING_FALLBACK)).toBe('#123123');
  });
});
