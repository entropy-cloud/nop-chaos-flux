import { useEffect, useRef, useState } from 'react';
import type { EnvLocation, ScopeRef } from '@nop-chaos/flux-core';

/**
 * filter↔URL sync (host-channels contract, plan 512 L3.5): bridges a crud's
 * query state with `env.location` for deep links.
 *
 * Contract semantics (docs/discussions/2026-09-26-host-channels-*.md §5):
 * - restore once on mount, write always with `replace` (no history entries),
 *   never subscribe to popstate (back = remount = restore — self-consistent);
 * - reserved host keys are never read or written;
 * - serialization: arrays comma-join, empty values dropped; restore decodes
 *   back to arrays when the query default for that key is an array;
 * - multi-instance collision: the first instance claims the URL bag, later
 *   ones degrade to disabled with a dev warning.
 */

const RESERVED_URL_KEYS = new Set(['page', 'pageSize', 'perPage', 'orderBy', 'orderDir', 'tab']);

const claimedInstances = new Set<string>();

// Contract §5 diagnostic: session-once so a host without the location channel
// learns why syncLocation is inert without spamming per crud instance.
let warnedMissingLocation = false;

export function isUrlKeyReserved(key: string): boolean {
  return RESERVED_URL_KEYS.has(key);
}

/** Encode a filter value for the URL: arrays comma-join, empties dropped. */
export function encodeFilterValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const joined = value.filter((entry) => entry !== '' && entry != null).join(',');
    return joined === '' ? undefined : joined;
  }
  if (typeof value === 'string') return value === '' ? undefined : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** Decode a URL string back into a filter value, honoring the default's shape. */
export function decodeFilterValue(raw: string, defaultValue: unknown): unknown {
  if (Array.isArray(defaultValue)) {
    return raw === '' ? [] : raw.split(',');
  }
  return raw;
}

/** Pick the URL-projectable subset of a query record (reserved keys excluded). */
export function queryToUrlValues(
  query: Record<string, unknown>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (isUrlKeyReserved(key)) continue;
    const encoded = encodeFilterValue(value);
    if (encoded !== undefined) out[key] = encoded;
  }
  return out;
}

export function useUrlFilterSync(args: {
  enabled: boolean;
  instanceId: string;
  location: EnvLocation | undefined;
  scope: ScopeRef | undefined;
  queryStatePath: string;
  /**
   * Push restored values into the embedded query form's inputs (form-handle
   * `setValues`). The committed query-state writes alone do not re-render
   * form inputs — the form owns its field state.
   */
  applyToForm?: (values: Record<string, unknown>) => boolean | Promise<boolean>;
  query: Record<string, unknown>;
  defaultQuery: Record<string, unknown>;
}): boolean {
  const { enabled, instanceId, location, scope, queryStatePath, applyToForm, query, defaultQuery } = args;
  const [degraded, setDegraded] = useState(false);
  const restoredRef = useRef(false);
  const lastWrittenRef = useRef<string>('');
  const firstSyncSeenRef = useRef(false);

  // Registration + one-shot restore.
  useEffect(() => {
    if (enabled && !location && !warnedMissingLocation) {
      warnedMissingLocation = true;
      console.warn(
        '[url-sync] syncLocation is enabled but the host does not provide env.location — filter↔URL sync stays off.',
      );
    }
    if (!enabled || !location || !scope) return;
    if (claimedInstances.has(instanceId)) {
      // Deferred: degradation is not urgent, and synchronous setState inside
      // the effect would cascade renders (react-compiler rule).
      setTimeout(() => setDegraded(true), 0);
      console.warn(
        `[url-sync] instance '${instanceId}' collides with an earlier syncLocation instance — URL sync disabled for it (first-come-first-served).`,
      );
      return;
    }
    claimedInstances.add(instanceId);

    const incoming = location.getQuery();
    const restored: Record<string, unknown> = {};
    const patch: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(incoming)) {
      if (isUrlKeyReserved(key)) continue;
      const value = decodeFilterValue(raw, defaultQuery[key]);
      restored[key] = value;
      patch[`${queryStatePath}.${key}`] = value;
    }
    if (Object.keys(patch).length > 0) {
      for (const [path, value] of Object.entries(patch)) {
        scope.update(path, value);
      }
      // Echo the restored values into the query-form inputs. The form handle
      // registers in a child effect, so retry briefly if it is not up yet.
      if (applyToForm) {
        let attempts = 0;
        const push = () => {
          const applied = applyToForm(restored);
          if (!applied && attempts < 5) {
            attempts += 1;
            setTimeout(push, 50);
          }
        };
        void push();
      }
    }
    restoredRef.current = true;
    return () => {
      claimedInstances.delete(instanceId);
    };
    // One-shot mount restore guarded by refs; the query itself flows through
    // the write effect below.
  }, [applyToForm, defaultQuery, enabled, instanceId, location, queryStatePath, scope]);

  // Write-back: whenever the query state changes post-restore, replace the URL.
  // The first pass only records the baseline (post-restore state is already
  // reflected in the URL) — actual rewrites happen on subsequent changes.
  useEffect(() => {
    if (!enabled || !location || degraded || !restoredRef.current) return;
    const values = queryToUrlValues(query);
    const serialized = JSON.stringify(values);
    if (firstSyncSeenRef.current) {
      if (serialized === lastWrittenRef.current) return;
      lastWrittenRef.current = serialized;
      location.setQuery(values, { replace: true });
      return;
    }
    firstSyncSeenRef.current = true;
    lastWrittenRef.current = serialized;
  }, [degraded, enabled, location, query]);

  return enabled && !!location && !degraded;
}
