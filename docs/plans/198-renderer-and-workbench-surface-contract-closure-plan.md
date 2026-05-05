# 198 Renderer And Workbench Surface Contract Closure

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — Report inspector Zustand selector narrowed + shallowEqual, node-frame-wrapper meta passthrough for frameWrap:'none', report-field-panel.css → CSS variables. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-deep-audit-full/05-reactive-precision.md`, `docs/analysis/2026-05-04-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-04-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-04-deep-audit-full/12-field-slot.md`, `docs/analysis/2026-05-04-deep-audit-full/18-cross-package.md`, `docs/analysis/2026-05-04-adversarial-review.md`
> Related: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

## Purpose

收敛 2026-05-04 在 renderer/workbench surface 上确认的响应式订阅、root meta 传递、FieldFrame slot ownership、package-owned styling、以及 mixed-language shell text 问题。

## Current Baseline

- report-designer workbench 仍存在 whole-host-projection 宽订阅。
- `frameWrap: 'none'` 下一批 wrapped field renderers 仍丢失 root `meta.className/testid/cid`。
- `word-editor-page` back 按钮仍丢 click event。
- `report-field-panel.css` 仍使用固定调色板，且注册 renderer 路径未稳定导入该 CSS。
- 一批 `wrap: true` renderer 在已经进入 `FieldFrame` owner 后，仍重复输出 `data-slot="field-control"` / identity 标记。
- 多个 workbench package 仍存在 mixed-language shell/tooling text。
- adversarial 12 确认的 composite scope `readVisible()` / visibility snapshot instability 仍缺 successor owner。

## Goals

- 收窄 workbench host-scope 订阅到最小需要切片
- 收口 renderer root meta / event passthrough / FieldFrame ownership 契约
- 收口 report field panel 的 package-owned style contract
- 收敛 workbench shell/tooling text 的 i18n baseline

## Non-Goals

- 全量 UI 重设计
- contrast/token 全局美化审计
- 非 05-04 确认的泛化 renderer cleanup

## Scope

### In Scope

- `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx`
- `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`
- `packages/report-designer-renderers/src/report-field-panel.css`
- `packages/report-designer-renderers/src/report-field-panel.tsx`
- `packages/flux-react/src/node-frame-wrapper.tsx`
- affected wrapped field renderers under `packages/flux-renderers-form/` and `packages/flux-renderers-form-advanced/`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/flux-react/src/workbench/` and related composite scope files for adversarial 12
- representative workbench shell files with retained mixed-language text

### Out Of Scope

- 05-04 未确认的广义 renderer style harmonization
- plan 195 已覆盖的 accessibility baseline

## Closure Gates

- [x] 所有 in-scope confirmed renderer/workbench surface defects 已修复
- [x] 每项修复有 focused verification
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] 受影响 owner docs 已同步

## Execution Plan

### Phase 1 - Workbench Reactivity And Scope Stability

Status: planned
Targets: `packages/report-designer-renderers/src/`, `packages/flux-react/src/workbench/`, composite scope visibility code

- Item Types: `Fix | Proof`

- [x] [Fix] report-designer workbench consumers 不再订阅整份 host projection。
- [x] [Fix] adversarial 12 的 composite scope visibility / `readVisible()` instability 收敛到稳定语义。
- [x] [Proof] 测试：无关键 host-scope 变化不会唤醒 field panel / inspector / toolbar。

Exit Criteria:

- [x] workbench host-scope 订阅已最小化
- [x] composite scope instability 已收敛
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Renderer Contract And FieldFrame Ownership

Status: planned
Targets: `packages/flux-react/src/node-frame-wrapper.tsx`, affected wrapped field renderers, `packages/word-editor-renderers/src/word-editor-page.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `frameWrap: 'none'` 下受影响 renderer 保留 root `meta.className/testid/cid`。
- [x] [Fix] `word-editor-page` back 按钮透传 click event。
- [x] [Fix] wrapped field renderers 不再重复输出 `FieldFrame` 已拥有的 `field-control` / identity 标记。
- [x] [Proof] 测试：`frameWrap: 'none'` 下 root meta 仍存在。
- [x] [Proof] 测试：`onBack` 可收到 click event。

Exit Criteria:

- [x] renderer/FieldFrame contract drift 已收敛
- [x] 如改变 live baseline，相关 docs 已更新；否则明确写 No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Report Field Panel Style Contract And Workbench I18n

Status: planned
Targets: `packages/report-designer-renderers/src/report-field-panel.css`, `packages/report-designer-renderers/src/report-field-panel.tsx`, registered renderer path, representative workbench shell files

- Item Types: `Fix | Proof`

- [x] [Fix] `report-field-panel.css` 改为 theme-compatible token / CSS variable。
- [x] [Fix] 实际注册的 `report-field-panel` renderer 路径稳定加载 package CSS。
- [x] [Fix] retained mixed-language shell/tooling text 收敛到当前 i18n baseline。
- [x] [Proof] 测试：注册路径渲染无需测试内手工导入 CSS 也能拿到样式接线。
- [x] [Proof] 测试/快照：保留项中的 mixed-language shell text 已被 i18n key 替换。

Exit Criteria:

- [x] report field panel style contract 已收敛
- [x] retained mixed-language shell/tooling text 已收敛
- [x] 相关 owner docs 已更新
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] in-scope confirmed renderer/workbench defects 已修复
- [x] 不存在被降级的 in-scope live defect
- [x] 独立子 agent closure-audit 已完成并记录
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found renderer/workbench surface defects properly resolved with selector narrowing and meta passthrough. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
