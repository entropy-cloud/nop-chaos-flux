// fire() is a fire-and-forget forwarder whose safety rests on the spreadsheet
// core's in-band error protocol: every bridge.dispatch command is wrapped in
// try/catch (spreadsheet-core core-dispatch) and reports failures as
// `{ ok: false, error }` instead of rejecting. Only pass functions honoring
// that contract — a function that can reject here becomes a silent unhandled
// rejection and must carry its own catch.
export function fire(fn: () => Promise<unknown>): void {
  void fn();
}
