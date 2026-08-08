// Synthetic fixture for check:audit-event-dispatch-ctx negative scope
// (DG gate widening). A dispatch in a non-renderer package
// (flow-designer-core) is OUTSIDE the gate's renderer-package scope and must
// be ignored even though it lacks the { event, evaluationBindings, scope } ctx.
export function FixtureHostCore(props: unknown) {
  const owner = props;
  void owner.events.onSomething?.({ type: 'core:event' });
  return null;
}
