// Synthetic fixture for check:audit-event-dispatch-ctx (alias receiver form).
// A native DOM / React synthetic event forward through an aliased receiver
// (`parentProps.events.X` with the raw `event` as first arg) is an
// adjudicated category (renderer-runtime.md:673-675, CG C3.x ruling) and must
// NOT be flagged — class-level adjudication, no allowlist entry.
export function FixtureAliasReceiverNativeForward(props: unknown) {
  const parentProps = props;
  const rowScope = {} as never;
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    void parentProps.events.onRowClick?.(event, { scope: rowScope });
  };
  void handleRowClick;
  return null;
}
