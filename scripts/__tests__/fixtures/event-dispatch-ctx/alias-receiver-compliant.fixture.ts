// Synthetic fixture for check:audit-event-dispatch-ctx (alias receiver form).
// A dispatch through an aliased receiver (`owner.events.X`) WITH the full
// { event, evaluationBindings, scope } ctx must NOT be flagged.
export function FixtureAliasReceiverCompliant(props: unknown) {
  const owner = props;
  const itemScope = {} as never;
  const payload = { type: 'list:item-click', item: {}, index: 0, key: 'k1' };
  void owner.events.onItemClick?.(payload, {
    event: payload,
    evaluationBindings: payload,
    scope: itemScope,
  });
  return null;
}
