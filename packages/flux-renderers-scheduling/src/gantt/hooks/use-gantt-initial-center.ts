import { useEffect, useRef } from 'react';

/**
 * plan 545 seed-6 fix (V1): centers the timeline on today exactly once when
 * the gantt becomes ready. The deps are EXPLICIT (including the scaleRange
 * identity) so the behavior is identical with and without the React Compiler
 * — the pre-fix inline effect relied on compiler-enhanced deps, so every drag
 * commit (updateTask recomputes scaleRange) re-ran it and scrollToToday wrote
 * `max(0, todayX - clientWidth/2)`; with `scroll-behavior: smooth` that
 * decayed the user's scroll position to 0. The didInitialCenter guard keeps
 * later scaleRange identity changes from re-centering; user-triggered
 * commands (Today button, scrollToTask/scrollToToday actions) are unaffected.
 */
export function useGanttInitialCenter(
  ganttReady: boolean,
  scrollToToday: () => void,
  scaleRange: { start: Date; end: Date },
): void {
  const didInitialCenterRef = useRef(false);
  useEffect(() => {
    if (!ganttReady || didInitialCenterRef.current) {
      return;
    }
    didInitialCenterRef.current = true;
    const today = new Date();
    if (today >= scaleRange.start && today <= scaleRange.end) {
      scrollToToday();
    }
  }, [ganttReady, scrollToToday, scaleRange]);
}
