/**
 * Shared opt-in test-hook types for the business-replication mock backends
 * (plan 820 A5: lives in a neutral module so the wms fetcher branch and the
 * stock-ledger delegate can both depend on it without forming an import
 * cycle — `mock-backend-repl-wms.ts` ← `mock-backend-repl-wms-stock.ts` was
 * the flagged edge in `scripts/baselines/deps-baseline.json`).
 */
export interface ReplWmsTestHooks {
  asnMiss?: boolean;
  duplicateIdempotencyKey?: boolean;
  forceOffline?: boolean;
  /** Force the putaway `invalid location` guard (e2e drives the error branch
   * without dragging the wheel-cascader). */
  forcePutawayInvalid?: boolean;
  lastAsnReceiveBody?: Record<string, unknown>;
  lastPutawayBody?: Record<string, unknown>;
  /** G2 (D2 §3.3 ③): mirror of the last `waveMove` request body for the
   * field-by-field request assertion (waveId ↔ card id, fromStatus ↔ source
   * column id, toStatus ↔ target column id). */
  lastWaveMoveBody?: Record<string, unknown>;
  lastWaveReleaseBody?: Record<string, unknown>;
  /** W3 G7: read at `reconCheck` fetch time — flipping it mid-session and
   * refreshing the source switches the banner to the drifted face. */
  forceReconDrift?: boolean;
  /** W3 G6: mirror of the last `ledgerReport` payload (download-URL shape). */
  lastLedgerReportData?: Record<string, unknown>;
  /** W3 cell-click param chain: batchNo the last `batchTrace` fetch carried. */
  lastBatchTraceBatchNo?: string;
}
