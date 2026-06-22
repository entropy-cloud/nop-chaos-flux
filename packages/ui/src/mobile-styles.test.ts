import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync('src/styles/mobile.css', 'utf8');

describe('mobile.css safe-area helper classes (M0.1a)', () => {
  it('defines nop-safe-top with safe-area-inset-top', () => {
    expect(mobileCss).toMatch(/\.nop-safe-top\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top\)/);
  });

  it('defines nop-safe-bottom with safe-area-inset-bottom', () => {
    expect(mobileCss).toMatch(
      /\.nop-safe-bottom\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom\)/,
    );
  });

  it('defines nop-safe-left with safe-area-inset-left', () => {
    expect(mobileCss).toMatch(/\.nop-safe-left\s*\{[^}]*padding-left:\s*env\(safe-area-inset-left\)/);
  });

  it('defines nop-safe-right with safe-area-inset-right', () => {
    expect(mobileCss).toMatch(
      /\.nop-safe-right\s*\{[^}]*padding-right:\s*env\(safe-area-inset-right\)/,
    );
  });
});

describe('index.css loads mobile.css', () => {
  it("imports mobile.css so dist consumers inherit the helpers", () => {
    const indexCss = readFileSync('src/styles/index.css', 'utf8');
    expect(indexCss).toContain("mobile.css");
  });
});

describe('mobile.css hairline helper classes (M0.1b)', () => {
  it('defines --nop-hairline-color token on :root', () => {
    expect(mobileCss).toMatch(/:root\s*\{[^}]*--nop-hairline-color:/);
  });

  it('defines nop-hairline as positioning context', () => {
    expect(mobileCss).toMatch(/\.nop-hairline\s*\{[^}]*position:\s*relative/);
  });

  it('defines all 4 direction modifiers with ::after pseudo-element rules', () => {
    for (const dir of ['top', 'right', 'bottom', 'left']) {
      expect(mobileCss).toContain(`.nop-hairline--${dir}::after`);
    }
    expect(mobileCss).toMatch(/background-color:\s*var\(--nop-hairline-color,\s*currentColor\)/);
  });

  it('uses transform scale(0.5) for default + 2x DPI media query', () => {
    expect(mobileCss).toMatch(/transform:\s*scale[XY]\(0\.5\)/);
    expect(mobileCss).toMatch(/@media\s*\(-webkit-min-device-pixel-ratio:\s*2\)/);
  });

  it('adapts scale to 0.333 on 3x DPI', () => {
    expect(mobileCss).toMatch(/@media\s*\(-webkit-min-device-pixel-ratio:\s*3\)/);
    expect(mobileCss).toMatch(/scale[XY]\(0\.333\)/);
  });
});

describe('mobile.css haptics helper class (M0.1c)', () => {
  it('defines nop-haptic with cursor:pointer and opacity transition', () => {
    expect(mobileCss).toMatch(/\.nop-haptic\s*\{[^}]*transition:\s*opacity\s+0\.1s\s+ease/);
    expect(mobileCss).toMatch(/\.nop-haptic\s*\{[^}]*cursor:\s*pointer/);
  });

  it('dims opacity to 0.7 on :active', () => {
    expect(mobileCss).toMatch(/\.nop-haptic:active\s*\{[^}]*opacity:\s*0\.7/);
  });
});
