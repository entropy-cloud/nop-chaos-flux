/**
 * react19 window-rule comment blind spot (2026-08-09): comment mentions of the
 * target keywords must not be flagged. Mentions below appear ONLY in comments.
 * useCallback(() => {}) / useMemo(() => 1, []) / React.memo(Component)
 */
export function plainComponent() {
  return <div />;
}
