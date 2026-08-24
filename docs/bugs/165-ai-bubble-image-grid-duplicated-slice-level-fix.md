# 165 ai-bubble image grid rendered duplicated for mixed content (slice-level renderer projected the whole message)

> Fixed: 2026-08-24 (`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts`)
> Discovered: e2e for `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md` Phase 2 (2.3 图片内容)

## Symptom

An assistant message with content `[text, image_url, image_url]` rendered the `ai-bubble-image` grid TWICE (strict-mode locator violation in the e2e; users see every image duplicated).

## Root Cause

`ImageContentRenderer` projects the WHOLE message (`extractImages(message)`) but was registered at slice level (no `messageLevel: true`). The bubble content pass invokes slice-level renderers once per content slice, so each image slice re-rendered the full grid — N images ⇒ N grids of N images.

## Fix

Register the image renderer `messageLevel: true` (tools/reasoning/error precedent, P1-9): the grid renders exactly once per message alongside text slices. Also replaced the prior session's `index`-based React key (violated `react/no-array-index-key`) with occurrence-suffixed URL keys that stay unique for duplicate URLs.

## Protection

`tests/e2e/ai-bubble-content.spec.ts` "image content renders a responsive grid of image items" (asserts exactly 2 `ai-bubble-image-item` for the 2-image fixture).
