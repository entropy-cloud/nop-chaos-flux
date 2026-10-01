import { describe, expect, it } from 'vitest';
import { resolveTokenColor } from './map-renderer.js';

describe('resolveTokenColor（ux-r3 RC-3）', () => {
  it('裸 HSL 三元组包装为 hsl()（shadcn token 形态，裸取会退化为黑）', () => {
    expect(resolveTokenColor('217 91% 60%')).toBe('hsl(217 91% 60%)');
    expect(resolveTokenColor('217, 91%, 60%')).toBe('hsl(217, 91%, 60%)');
    expect(resolveTokenColor('0 0% 0%')).toBe('hsl(0 0% 0%)');
  });

  it('完整色值直通', () => {
    expect(resolveTokenColor('#0969da')).toBe('#0969da');
    expect(resolveTokenColor('rgb(9, 105, 218)')).toBe('rgb(9, 105, 218)');
    expect(resolveTokenColor('hsl(217 91% 60%)')).toBe('hsl(217 91% 60%)');
  });

  it('空值/非法值回退 fallback，不产出退化黑', () => {
    expect(resolveTokenColor('', '#0969da')).toBe('#0969da');
    expect(resolveTokenColor('   ', '#0969da')).toBe('#0969da');
    // 非法片段（无法组成任何合法色函数）→ fallback
    expect(resolveTokenColor('nonsense', '#0969da')).toBe('#0969da');
  });
});
