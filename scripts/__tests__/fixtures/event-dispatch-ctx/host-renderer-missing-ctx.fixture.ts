// Synthetic fixture for check:audit-event-dispatch-ctx host-package coverage
// (DG gate widening). A dispatch through an aliased receiver in a host
// renderer package (flow-designer-renderers) WITHOUT the
// { event, evaluationBindings, scope } ctx must be flagged.
export function FixtureHostRendererMissingCtx(props: unknown) {
  const owner = props;
  void owner.events.onNodeClick?.({ type: 'designer:node-click', nodeId: 'n1' });
  return null;
}
