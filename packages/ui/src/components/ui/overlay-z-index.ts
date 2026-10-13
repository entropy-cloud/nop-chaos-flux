import * as React from 'react';

/**
 * Per-family overlay z-index context factory (plan 587 WA-ui-003).
 *
 * Each modal family (Dialog / Drawer / Sheet / AlertDialog) calls this ONCE at
 * module scope and owns a PRIVATE context instance. Do NOT collapse the four
 * instances into one shared singleton context: an orphan overlay rendered
 * inside a foreign family's provider would then read that family's z-index —
 * an undeclared increment (plan 587 draft review M3). The global stacking
 * order itself still comes from useGlobalZIndex(); this context only
 * propagates a family's own reserved value down to that family's overlay.
 */
export function createOverlayZIndex(): {
  ZIndexContext: React.Context<number | undefined>;
  useOverlayZIndex: () => number | undefined;
} {
  const ZIndexContext = React.createContext<number | undefined>(undefined);
  return {
    ZIndexContext,
    useOverlayZIndex(): number | undefined {
      return React.useContext(ZIndexContext);
    },
  };
}
