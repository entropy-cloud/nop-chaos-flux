import { describe, expect, it } from 'vitest';
import { buttonVariants } from '../components/ui/button.js';

/**
 * V12e 族2 (G1-R2-视角3-02, plan 487, proof-first): the flux button renderer
 * emits `aria-pressed` / `data-active` (plan 485 emission side) but the ui
 * Button cva table had no visual branch — the pressed state was invisible.
 * The cva must consume both tokens with a subtle pressed treatment consistent
 * with the existing variant hovers (aria-expanded trio precedent).
 */
describe('ui button — pressed-state visual branches (G1-R2-视角3-02)', () => {
  const variants = ['default', 'primary', 'outline', 'secondary', 'ghost'] as const;

  it('every common variant consumes aria-pressed', () => {
    for (const variant of variants) {
      expect(buttonVariants({ variant })).toMatch(/aria-pressed:/);
    }
  });

  it('every common variant consumes data-active', () => {
    for (const variant of variants) {
      expect(buttonVariants({ variant })).toMatch(/data-active:/);
    }
  });

  it('pressed treatment is consistent with the variant hover weight (muted overlay trio)', () => {
    for (const variant of ['outline', 'ghost'] as const) {
      const classes = buttonVariants({ variant });
      expect(classes).toContain('aria-pressed:bg-muted');
      expect(classes).toContain('data-active:bg-muted');
    }
    const secondary = buttonVariants({ variant: 'secondary' });
    expect(secondary).toContain('aria-pressed:bg-secondary/80');
    expect(secondary).toContain('data-active:bg-secondary/80');
    for (const variant of ['default', 'primary'] as const) {
      const classes = buttonVariants({ variant });
      expect(classes).toContain('aria-pressed:bg-primary/85');
      expect(classes).toContain('data-active:bg-primary/85');
    }
  });
});
