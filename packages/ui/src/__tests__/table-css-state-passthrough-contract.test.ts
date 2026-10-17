import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// FM-0 plan 642 Proof-unit-3: row-state passthrough onto sticky fixed cells.
// The state tokens are semi-transparent (color-mix over transparent), so the
// overlay composites ON TOP of the opaque fixed background via background-image
// — never as background-color (that would reintroduce the see-through defect
// the `[data-fixed]` opaque rule prevents). Precedence is selected > hover >
// striped, pinned by source order (selected rule last).

const styles = readFileSync('src/styles/table.css', 'utf8');

function ruleIndex(fragment: string): number {
  const index = styles.indexOf(fragment);
  expect(index, `missing css fragment: ${fragment}`).toBeGreaterThanOrEqual(0);
  return index;
}

describe('fixed-cell row-state overlay contract (FM-0 plan 642)', () => {
  it('keeps the opaque fixed-cell base rule', () => {
    expect(styles).toContain('.nop-table [data-fixed]');
    expect(styles).toContain('background: var(--table-fixed-bg,');
  });

  it('layers the selected state over the opaque base via background-image', () => {
    const index = ruleIndex("tbody tr[data-state='selected'] > [data-fixed]");
    const ruleBody = styles.slice(index, index + 220);
    expect(ruleBody).toContain('background-image: linear-gradient(var(--table-selected-bg)');
  });

  it('layers the hover state over the opaque base via background-image', () => {
    const index = ruleIndex('tbody tr:hover > [data-fixed]');
    const ruleBody = styles.slice(index, index + 220);
    expect(ruleBody).toContain('background-image: linear-gradient(var(--table-hover-bg)');
  });

  it('layers the striped state over the opaque base via background-image', () => {
    const index = ruleIndex("tbody tr[data-striped]:not(:hover):not([data-state='selected']) > [data-fixed]");
    const ruleBody = styles.slice(index, index + 280);
    expect(ruleBody).toContain('background-image: linear-gradient(var(--table-striped-bg)');
    // closure audit R1 Major-1: :not(:hover) adds specificity, so the striped
    // overlay must exclude selected rows explicitly or it beats the selected
    // gradient on striped+selected rows.
    expect(ruleBody).toContain(":not([data-state='selected'])");
  });

  it('orders rules so selected wins over hover and hover over striped', () => {
    const hover = ruleIndex('tbody tr:hover > [data-fixed]');
    const striped = ruleIndex("tbody tr[data-striped]:not(:hover):not([data-state='selected']) > [data-fixed]");
    const selected = ruleIndex("tbody tr[data-state='selected'] > [data-fixed]");
    expect(selected).toBeGreaterThan(hover);
    expect(hover).toBeGreaterThan(striped);
  });

  it('gives row drag-sort visible dragging and drop-target feedback (FM-0 plan 642 sweep)', () => {
    const dragging = ruleIndex('tbody tr[data-dragging]');
    const dragOver = ruleIndex('tbody tr[data-drag-over]');
    expect(styles.slice(dragging, dragging + 160)).toContain('opacity');
    expect(styles.slice(dragOver, dragOver + 200)).toContain('box-shadow');
  });
});
