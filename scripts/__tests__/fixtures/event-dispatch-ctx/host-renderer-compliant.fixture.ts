// Synthetic fixture for check:audit-event-dispatch-ctx host-package coverage
// (DG gate widening). A dispatch through an aliased receiver in a host
// renderer package (report-designer-renderers) WITH the full
// { event, evaluationBindings, scope } ctx must NOT be flagged.
export function FixtureHostRendererCompliant(props: unknown) {
  const owner = props;
  const payload = { type: 'designer:field-drop', fieldId: 'f1' };
  void owner.events.onFieldDrop?.(payload, {
    event: payload,
    evaluationBindings: payload,
    scope: {},
  });
  return null;
}
