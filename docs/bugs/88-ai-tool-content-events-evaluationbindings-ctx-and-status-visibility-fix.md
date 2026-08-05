# 88 AI Tool-Content Family Events Missing evaluationBindings Ctx + Invisible Upload Status (C8.2 P1)

## Problem

- The `flux-renderers-ai` tool-content family (ai-feedback / ai-attachments / ai-citations / ai-token-usage) dispatched their structured semantic events **without** the `event` / `evaluationBindings` / `scope` dispatch context — the family convention previously fixed in `cards` (bug 83) / `diff-view` (C6.5 P1-10) / mobile family (bug 86) and wired into the ai main chain by C8.1 / CX-10.
- Consequence: action args templates could NOT read the event payload fields:
  - `ai-feedback` `onAction` args like `${action}` / `${message.id}` resolved to nothing.
  - `ai-attachments` `onChange` / `onError` / `onUpload` args like `${reason}` / `${attachments}` resolved to nothing.
  - `ai-citations` `onSourceClick` args like `${source.title}` / `${index}` resolved to nothing.
  - `ai-token-usage` `onClick` dispatched an **empty payload** (no `type`, no usage) — the worst case: nothing at all was resolvable.
- Secondary P1: `ai-attachments` items never rendered their host-driven `status` (`uploading` / `error`, renderers.md §9.1 model) — a failed/ongoing upload was invisible to the user (four-state contract violation, failure path `host-attach-upload`).
- Secondary P2: `ai-token-usage` display root was `aria-hidden` — token usage data unreachable by screen readers despite the unused `flux.ai.tokenUsage` i18n key.

## Diagnostic Method

- C8.2 ai tool-content family audit (2026-08-05), dimension 7 (事件与 action 契约) + dimension 10 (四态覆盖) + dimension 8 (a11y): compared every dispatch site against the CX-10 family convention; the attachment model contract was compared against the rendering path; the a11y attributes were checked against the i18n key inventory.
- Existing unit tests asserted payload shapes partially (`objectContaining({ action: 'copy' })`, `toHaveBeenCalled()` with no shape) — false-green blind spot (same gap as bug 83/86).

## Root Cause

- Each renderer independently dispatched `props.events.onX?.(payload)` without the second `ctx` argument (`Partial<ActionContext>`). The runtime resolves action-args templates from `evaluationBindings` + scope only (`getEvaluationScope`, flux-action-core/src/action-core.ts:206-208) — a bare payload never leaks into `${x}` bindings.
- `ai-attachments` `AttachmentItemView` rendered only name/size/thumbnail and ignored the documented `status` field.
- `ai-token-usage` hid its display root from the accessibility tree.

## Fix

- Added a local `dispatchCtx` helper (ai-chat.tsx:63-69 `eventCtx` / ai-conversations.tsx:29-33 `dispatchCtx` precedent) to `ai-feedback.tsx:13-20`, `ai-attachments.tsx:15-22`, `ai-citations.tsx:16-23`, `ai-token-usage.tsx:14-21` and wired it into all 10 dispatch sites; `ai-token-usage` `onClick` now dispatches `{ type: 'ai:token-usage-click', usage }` (resolved usage).
- `ai-attachments`: new `AttachmentStatus` renders `data-status` + spinner/`上传中` + destructive `上传失败` copy (i18n keys `flux.ai.uploading` / `flux.ai.uploadFailed`, en-US + zh-CN); retry path = re-click the upload button (host-driven state machine unchanged).
- `ai-token-usage`: `aria-hidden` → `aria-label={t('flux.ai.tokenUsage')}` + `role="group"`.
- Docs: renderers.md event payload tables/schema comments synced to live shapes; §14.3 example `items` → `value`; citations §11b sanitize claim rewritten to the controlled-text-node model; §13 added the missing ai-token-usage row; DOM list gained `ai-token-usage-text`.

## Verification

- Test-first: `ai-feedback.test.tsx` (6 new), `ai-attachments.test.tsx` (+9: ctx ×3, status ×3, safety ×2, upload payload ×1), `ai-token-usage.test.tsx` (+2 incl. payload+ctx), `ai-citations.test.tsx` (+1 renderer-level ctx), `p1-renderers.test.tsx` assertion tightening — all red before implementation, green after.
- `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test` — 495/495 green; `flux-i18n` 26/26 green; `check:i18n-keys` pass.
- Host surfaces: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts` (Phase 3) proves `${action}|${message.id}`, `${index}|${source.title}`, `${total}` resolution in real browsers.

## Notes

- Same family root cause as bug 83/86 → fixed in-plan per roadmap §7, CX-10 事后回写 records the C8.2 coverage extension (no new CX-n).
