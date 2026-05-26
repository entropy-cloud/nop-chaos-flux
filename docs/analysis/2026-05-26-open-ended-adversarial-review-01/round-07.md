# Open-Ended Adversarial Review — 2026-05-26 — Round 07

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: projected-owner coverage closure, adjacent readOnly write channels, React 19 memoization sanity check  
**Outcome**: 本轮未发现新的问题。

---

## Stop-Check Notes

The projected-owner substrate was checked for additional production users. `createProjectedOwnerScope(...)` and `createProjectedInlineForm(...)` are used by `object-field`, `array-field`, and `variant-field`, all already covered by Round 06.

Nearby non-projected advanced controls were sampled for the same readOnly/write-through shape. `array-editor`, `key-value`, and `tag-list` guard their local write handlers directly; `detail-field` and `detail-view` may open read-only draft surfaces for viewing, but their confirm/writeback paths are guarded by `readOnly`. This did not justify a new finding beyond Round 03 and Round 06.

The React 19 sanity scan found broad existing use of `useMemo`, `useCallback`, and a few `React.memo` sites, but no fresh high-confidence issue for this execution. The scan also re-surfaced a previously documented lifecycle problem around render/useMemo resource allocation, so it was not re-reported here.

## Overall Assessment

The strongest theme from this execution is that several runtime contracts are expressed as data or documentation but not enforced at the authority boundary. The projected composite readOnly issue is the clearest example: publishing `readOnly` into a child payload is weaker than preventing writes at the projected owner proxy. The same class of risk appears in cancellation APIs and source-enabled prop execution context, where lower layers expose enough information for the happy path but omit the cross-boundary capability needed by composed scenarios.

The second theme is tooling trust. The CSS export checker had a silent coverage gap exactly in the package family where new renderer entrypoints are expected to grow. That kind of guardrail needs tests of its own, not just use in `pnpm check`.

The third theme is UI-state authority. Basic controls and composite controls currently disagree on whether `readOnly` is a visual affordance, a local handler guard, or an owner-level write prohibition. The project should choose the strongest interpretation and encode it in shared helpers/proxies rather than relying on every renderer to rediscover it.

## Blind-Spot Self-Assessment

This execution was discovery-oriented rather than exhaustive. It likely under-sampled security boundaries for untrusted schemas, large-scale performance behavior, and accessibility beyond the specific controls touched by the readOnly thread. A good next adversarial entry point would be to follow another cross-cutting contract, such as cancellation, ownership disposal, or action context, from schema compilation through runtime helpers and renderer adapters.
