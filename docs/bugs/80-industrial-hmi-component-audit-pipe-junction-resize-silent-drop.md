# 80 Industrial HMI Component Audit — pipe-junction `width`/`height` Resize Silent Drop

> Source: HCA6 P2-1（symbol shapes 审计，HCA5 P3-2 转交复核升级，test-first 修复）；审计记录 `docs/audits/2026-08-08-1121-hca6-symbol-shapes.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- 改变 pipe-junction（管道接头）图元的 `width` / `height`（经 `setSymbolProps` / 绑定）不生效——junction 尺寸不变。
- body 容器 + 各 stub（管口）连接点的几何未重算 → junction 静默保留 create 时的旧尺寸。

## Diagnostic Method

- 诊断难度：表面像「绑定没生效」或「applyProps 没路由」，但实际根因在 composite 框架的 `EXTENT_FIELDS` 静默丢弃机制。
- 调查路径：HCA5 P3-2 转交项（逐图元核查 resize hook 注册 / extent part 声明）→ HCA6 复核发现 pipe-junction 是唯一缺口：12 个 composite 族图元全部有 extent(3) 或 resize hook(9)，唯独 pipe-junction 自定义 `applyProps` 借用 `applyCompositeProps` 但其 parts（`body` / `stubs`）无 extent 字段也无 `parts.resize` hook。
- 决定性证据：`pipe-junction.ts:109-124` 修复后 create↔applyProps 几何公式一致（2 条 failing-first 测试断言重算结果值）。

## Root Cause

- `pipe-junction.ts` 用自定义 `applyProps` 委托给 composite 框架的 `applyCompositeProps`。
- 但 pipe-junction 的 parts（`body` 容器 + `stubs` 连接点）既未声明 `extent` 字段，也未注册 `parts.resize` hook → composite 框架的 `EXTENT_FIELDS` 分支静默丢弃 `width` / `height`。
- create 时由 `connection.x * width - centerX` 等公式派生的 body 尺寸 / stub points，在 applyProps 改尺寸时从不被重算。

## Fix

- `symbols/pipe/pipe-junction.ts:109-124` — `applyProps` 检测到 `width` / `height` 变更时，重算 body 容器尺寸 + 各 stub 的 points（`connection.x * width - centerX` / `connection.y * height - centerY`），与 `create()` 公式对齐。

## Tests

- `src/symbols/pipe/pipe-symbols.test.ts` — 2 条 failing-first 回归测试，断言 create↔applyProps 在 resize 后几何一致（断言重算结果值，非 not.toThrow）。

## Affected Files

- `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`

## Notes For Future Refactors

- 自定义 `applyProps` 若借用 `applyCompositeProps`，且 parts 无 extent / resize hook，必须自行处理 `width` / `height` 重算（composite 框架会静默丢弃）。
- 重构 pipe-junction 的 applyProps 时，确保 resize 重算路径保留；create 与 applyProps 的几何公式必须保持一致（failing-first 测试锁定此不变量）。
- **Lesson 回链（HCA-LL）**：已沉淀为 industrial 专项检查点——`docs/audits/component-audit-checklist.md` §2.1 IND-4（applyProps 路由 / extent-resize / create↔applyProps 几何 parity）。catalog 终态见 `docs/plans/2026-08-08-1527-2` §裁定结果 L-SYM-1。
