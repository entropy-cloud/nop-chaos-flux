import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Gantt — splitter & two-way scroll sync.
 *
 * Migrated from tests/e2e/gantt-splitter-scroll.spec.ts (E3 batch 2, engine swap +
 * expect.poll(...) replaced by explicit ft.evaluate poll loops with the same 5s
 * budget, locator.evaluate reads replaced by ft.evaluate document.querySelector,
 * and assertTrackedPageErrors upgraded to kernel white-box expectNoPageErrors).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openGantt() bounces through '/#/' with a stability gate so the route remounts
 * (the splitter value persists in the scope store across bounces, so cases are
 * sequenced to not depend on a reset — each case reads a fresh "before" value).
 */

const HEADING = /Gantt Chart Demo/i;

async function openGantt(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/gantt');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING })).toBeVisible({ timeoutMs: 25_000 });
  await ft.expectWeb(ft.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeoutMs: 15_000 });
}

// TODO(migrate-debt): evaluate fallback (aria-valuenow read + poll replacement
// for expect.poll — attribute polling has no locator-level numeric compare)
async function pollSplitterValue(
  ft: FtGlobal,
  target: number,
  compare: 'greater' | 'equal',
): Promise<void> {
  let lastValue = Number.NaN;
  for (let i = 0; i < 50; i++) {
    const raw = await ft.evaluate(
      `(() => { const el = document.querySelector('[role="separator"]'); return el ? (el.getAttribute('aria-valuenow') ?? '0') : '0'; })()`,
    );
    lastValue = parseFloat(String(raw));
    if (compare === 'greater' && lastValue > target) return;
    if (compare === 'equal' && lastValue === target) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `splitter aria-valuenow: expected ${compare === 'greater' ? `> ${target}` : `= ${target}`}, last actual ${lastValue}`,
  );
}

export default async function ganttSplitterScroll(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: mouse drag on the splitter widens the grid panel
  await openGantt(ft);
  const splitter = ft.locator('[role="separator"]');
  const beforeRaw = await splitter.attr('aria-valuenow');
  const before = parseFloat(beforeRaw ?? '0');
  const box = await splitter.boundingBox();
  if (!box) throw new Error('splitter bounding box missing');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await ft.mouse.move(cx, cy);
  await ft.mouse.down();
  for (let i = 1; i <= 6; i++) {
    // two sub-steps per 20px hop, mirroring the old { steps: 2 }
    await ft.mouse.move(cx + i * 20 - 10, cy);
    await ft.mouse.move(cx + i * 20, cy);
  }
  await ft.mouse.up();

  await pollSplitterValue(ft, before, 'greater');
  await expectNoPageErrors(ft, 'gantt:mouse-drag');

  // Case 2: keyboard resizes the splitter in 20px steps
  await openGantt(ft);
  await splitter.click(); // focus via real CDP click (locator.focus not in driver API)
  const beforeKbRaw = await splitter.attr('aria-valuenow');
  const beforeKb = parseFloat(beforeKbRaw ?? '0');
  await splitter.press('ArrowRight');
  await pollSplitterValue(ft, beforeKb + 20, 'equal');
  await splitter.press('ArrowLeft');
  await pollSplitterValue(ft, beforeKb, 'equal');
  await expectNoPageErrors(ft, 'gantt:keyboard-resize');

  // Case 3: timeline scroll propagates back to the grid (two-way sync)
  // A short viewport forces both panes to be scrollable (14 rows exceed it).
  // 行虚拟化 + h-full 布局下 480px 恰好容纳 14 行（无溢出）——用更矮的视口保证前提。
  await ft.setViewportSize(1280, 360);
  await openGantt(ft);
  // TODO(migrate-debt): evaluate fallback (scroll overflow probing + scrollTop
  // manipulation on internal pane elements — no driver-level scroll API)
  const canScroll = await ft.evaluate(
    `(() => { const grid = document.querySelector('[data-slot="gantt-grid"]'); const scale = document.querySelector('[data-slot="gantt-scale"]'); const gp = grid && grid.parentElement; const tp = scale && scale.parentElement; return { gridCanScroll: !!(gp && gp.scrollHeight > gp.clientHeight), timelineCanScroll: !!(tp && tp.scrollHeight > tp.clientHeight) }; })()`,
  );
  if (!canScroll || canScroll.gridCanScroll !== true) {
    throw new Error(`grid pane should overflow at 360px height: ${JSON.stringify(canScroll)}`);
  }
  if (!canScroll || canScroll.timelineCanScroll !== true) {
    throw new Error(`timeline pane should overflow at 360px height: ${JSON.stringify(canScroll)}`);
  }

  await ft.evaluate(
    `(() => { const scale = document.querySelector('[data-slot="gantt-scale"]'); const ts = scale && scale.parentElement; if (ts) { ts.scrollTop = 120; ts.dispatchEvent(new Event('scroll', { bubbles: true })); } })()`,
  );
  // The two panes have different content heights (the timeline carries the
  // scale header), so the synced position may clamp to the grid's own max
  // scroll — what matters is the grid FOLLOWED the timeline (> 0).
  let gridFollowed = false;
  let lastGridScrollTop = -1;
  for (let i = 0; i < 50; i++) {
    const st = await ft.evaluate(
      `(() => { const grid = document.querySelector('[data-slot="gantt-grid"]'); return grid ? grid.scrollTop : -1; })()`,
    );
    lastGridScrollTop = Number(st);
    if (lastGridScrollTop > 0) {
      gridFollowed = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!gridFollowed) {
    throw new Error(`grid scrollTop never followed timeline scroll, last value ${lastGridScrollTop}`);
  }
  await expectNoPageErrors(ft, 'gantt:two-way-scroll');

  // Case 4: grid rows and timeline bars keep a constant row pitch (alignment
  // invariant) — back to a normal viewport
  await ft.setViewportSize(1280, 800);
  await openGantt(ft);
  // The grid header and the time scale have different heights, so a fixed
  // header offset between row N and bar N is expected — the alignment
  // invariant is that the OFFSET IS CONSTANT: consecutive rows and their
  // bars advance by the same pitch (store rowHeight), never drifting.
  // TODO(migrate-debt): evaluate fallback (getBoundingClientRect aggregation
  // across row/bar sets in a single round trip)
  const pitch = await ft.evaluate(
    `(() => { const rowTops = Array.from(document.querySelectorAll('[data-slot="gantt-grid-row"]')).slice(0, 3).map((el) => el.getBoundingClientRect().top); const barTops = Array.from(document.querySelectorAll('[data-slot="gantt-bar"]')).slice(0, 3).map((el) => el.getBoundingClientRect().top); const rowPitch = rowTops[1] - rowTops[0]; const barPitch = barTops[1] - barTops[0]; const offset1 = barTops[0] - rowTops[0]; const offset2 = barTops[1] - rowTops[1]; const offset3 = barTops[2] - rowTops[2]; return { rowPitch, barPitch, drift: Math.max(offset2 - offset1, offset3 - offset2) }; })()`,
  );
  if (!pitch || !(pitch.rowPitch > 0)) throw new Error(`row pitch should be > 0: ${JSON.stringify(pitch)}`);
  if (!pitch || !(pitch.barPitch > 0)) throw new Error(`bar pitch should be > 0: ${JSON.stringify(pitch)}`);
  if (!pitch || Math.abs(pitch.barPitch - pitch.rowPitch) > 1) {
    throw new Error(`bar pitch ${JSON.stringify(pitch)} deviates from row pitch by more than 1px`);
  }
  if (!pitch || Math.abs(pitch.drift) > 1) {
    throw new Error(`row/bar offset drift exceeds 1px: ${JSON.stringify(pitch)}`);
  }
  await expectNoPageErrors(ft, 'gantt:alignment');

  return { cases: 4 };
}
