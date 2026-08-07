// Synthetic fixture for check:audit-event-dispatch-ctx (alias receiver form).
// A dispatch through an aliased receiver (`owner.events.X`) WITHOUT the
// { event, evaluationBindings, scope } ctx must be flagged by the scanner.
export function FixtureAliasReceiverMissingCtx(props: unknown) {
  const owner = props;
  const itemScope = {} as never;
  void owner.events.onItemClick?.(
    { type: 'list:item-click', item: {}, index: 0, key: 'k1' },
    { scope: itemScope },
  );
  return null;
}
