# 159 Renderer/UI P2 修复族：citations 显式空 sources + timestamp 非法值崩溃 + 空态 className + region 命名（R2-F1 / R3-F1 / FIND-13 / FIND-20）

## Problem

- `ai-citations` 显式 `sources: []` 不覆盖 `metadata.sources` / `data-sources`（R2-F1，`docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`）——host 无法按消息禁用引用渲染；schemas.ts 承诺 "Explicit sources (overrides metadata.sources / data-sources)" 但 `resolveSources` 要求 `length > 0`。
- `TimestampContentRenderer` 对 host 可写非法 `metadata.createdAt` 无防护（R3-F1，同审计）：`new Date(NaN).toISOString()` / `new Date(Number.MAX_VALUE).toISOString()` 抛 RangeError，崩整棵气泡树（ai-chat 无 Error Boundary）。
- `ai-message-list` 空态分支丢弃 `props.meta.className`（FIND-13，`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`）——canonical-root className 路由契约在空会话断链（非空分支与 ai-prompts/ai-suggestions 先例均保留）。
- `ai-attachments` 根 `role="region"` 无 accessible name（FIND-20，同 multi-audit）——未命名 region 不作为 landmark 暴露（WCAG 4.1.2/1.3.1）。

## Diagnostic Method

- R2-F1：比对 ai-feedback 的 P2-7 修复（2026-08-10，显式 `actions: []` = 显式意图）与 `resolveSources` 的 `length > 0` 条件——同一「显式空数组」家族，citations 是漏网 sibling。RED 测试（显式 `[]` + metadata 非空 → 断言零引用卡）先红后绿。
- R3-F1：`new Date(Number.MAX_VALUE)` 仍是 Invalid Date（Date 有效范围 ±8.64e15 ms），`Number.isFinite` 单独不够——`date.getTime()` 对 NaN/±Infinity/越界有限值统一返回 NaN，单点检查即可覆盖全部非法形状。RED 测试（NaN / MAX_VALUE / ±Infinity → 断言渲染 null 不抛）先红后绿。
- FIND-13：空态早退分支 `cn('nop-ai-message-list')`（无 `props.className`）vs 非空分支 `:81`——DOM 断言根 class 缺失即红。
- FIND-20：`role="region"` 上无 `aria-label`/`aria-labelledby`——断言 aria-label 非空即红。

## Root Cause

- R2-F1：显式空数组与「缺省」被同一 `length > 0` 条件混为一谈——显式意图（含空）被静默默认覆盖。
- R3-F1：`typeof !== 'number'` 守卫放行 NaN/越界值，`toISOString()` 的 RangeError 在 `formatTimestamp` 的 try/catch 之外（JSX 属性求值处）。
- FIND-13：空态分支复制时漏掉 className 参数（非空分支有）。
- FIND-20：region 根节点漏命名属性。

## Fix

- R2-F1：`resolveSources` 改 `Array.isArray(explicitSources)` 即权威返回（含 `[]` → 零引用）；metadata / data-sources fallback 仅在 explicit 为 undefined/非数组时触发。
- R3-F1：`new Date(createdAt)` 后 `Number.isNaN(date.getTime())` 早退返回 null（一次检查覆盖 NaN/±Infinity/越界有限值），`toISOString()` 不再接触非法 Date。
- FIND-13：空态分支改 `cn('nop-ai-message-list', props.className)`（对齐非空分支与包内先例）。
- FIND-20：根节点补 `aria-label={t('flux.ai.attachments')}`，i18n en/zh 对称注册新 key。

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-citations.test.tsx` — R2-F1 ×2 RED→GREEN（显式 `[]` 覆盖 metadata / data-sources）+ 非数组 explicit 回退 metadata（契约边界）。
- `packages/flux-renderers-ai/src/renderers/__tests__/p1-renderers.test.tsx` — R3-F1 ×3（NaN / Number.MAX_VALUE / ±Infinity → 不抛 + 无 timestamp 元素）。
- `packages/flux-renderers-ai/src/renderers/__tests__/renderers.test.tsx` — FIND-13（空态根 class 含 schema className）。
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-attachments-a11y.test.tsx` — FIND-20（region aria-label 非空）；既有「非 button 表面」断言保留 role/tabindex 面、aria-label 断言随契约更新。
- 既有 metadata 路径 / 合法 timestamp / 空态 / attachments 用例零回归。

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`（resolveSources）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/timestamp.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx`
- `packages/flux-i18n/src/locales/en-US.ts` / `zh-CN.ts`（`flux.ai.attachments`）

## Notes For Future Refactors

- 「显式空数组 = 显式意图」是跨组件契约（ai-feedback P2-7 / ai-citations R2-F1）：凡显式输入覆盖 metadata 的解析器，`Array.isArray(x)` 即权威，不要加 `length > 0`。
- Date 守卫用 `Number.isNaN(date.getTime())` 而非 `Number.isFinite(ms)` 单查——isFinite 放行 `Number.MAX_VALUE` 这类 Date 不可表示值。
- 空态/缺省分支与主分支必须共享同一 className 路由；新增 region 根节点时必须带 accessible name（role="region" 无名字 = 不暴露为 landmark）。
