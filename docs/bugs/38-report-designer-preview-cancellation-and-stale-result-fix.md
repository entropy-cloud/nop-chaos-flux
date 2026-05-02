# 38 Report Designer Preview Cancellation And Stale Result Fix

## Problem

- In `@nop-chaos/report-designer-core`, preview requests were not truly cancellable.
- Starting a newer preview or dispatching `report-designer:stopPreview` could still let an older in-flight preview publish state afterward.
- The visible symptom was that `preview.running` and `preview.lastResult` could reflect a stale request instead of the current preview owner.

## Diagnostic Method

- Diagnosis was not just a missing `stopPreview` flag check; the preview path already flipped local state, so the bug looked partially implemented.
- Audited the live runtime path across `core-dispatch.ts`, `runtime/preview-commands.ts`, and `adapters.ts` instead of only inspecting the command type definitions.
- Confirmed there was no preview request token, no `AbortController` owner, and no adapter-level abort signal passed into preview work.
- The decisive evidence was that the preview command always wrote completion state unconditionally after `await runPreviewCommand(...)`, so any older request that resolved later could still clear `running` and overwrite `lastResult`.

## Root Cause

- `packages/report-designer-core/src/core-dispatch.ts` treated preview as a plain async command with no request ownership tracking.
- `packages/report-designer-core/src/runtime/preview-commands.ts` and `packages/report-designer-core/src/adapters.ts` had no `AbortSignal` contract, so `stopPreview` could only clear local state and could not cancel adapter work.
- Because completion writes were unconditional, stale results from superseded requests were indistinguishable from the current request.

## Fix

- Added single-owner preview sequencing in `packages/report-designer-core/src/core.ts` using `AbortController` plus a monotonically increasing preview request id.
- Extended the preview adapter/runtime contract so preview adapters can observe `args.signal` and abort in-flight work.
- Gated preview completion in `packages/report-designer-core/src/core-dispatch.ts` so only the active preview owner may clear `preview.running` or publish `preview.lastResult`.
- Updated `report-designer:stopPreview` to abort the active preview request instead of only clearing local state.

## Tests

- `packages/report-designer-core/src/__tests__/designer-core.test.ts` - verifies a superseded older preview cannot overwrite the latest preview result.
- `packages/report-designer-core/src/__tests__/designer-core.test.ts` - verifies `report-designer:stopPreview` aborts the active request and stale completion cannot publish after stop.

## Affected Files

- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-core/src/runtime/preview-commands.ts`
- `packages/report-designer-core/src/adapters.ts`
- `packages/report-designer-core/src/__tests__/designer-core.test.ts`
- `docs/architecture/report-designer/design.md`

## Notes For Future Refactors

- Any new async designer command that can be superseded should use the same owner-token pattern rather than relying only on local `running` flags.
- Adapter contracts must stay aligned with runtime cancellation semantics; a local stop action is not enough if the adapter work cannot observe cancellation.
- Treat preview completion as an ownership-sensitive write, not as a generic async success path.
