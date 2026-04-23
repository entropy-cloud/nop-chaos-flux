# 维度 02：模块职责与文件边界

- 初审发现：29
- 维度复核：完成
- 子项复核：未单独展开，后续可按高优先级文件继续拆分

## 保留

1. [维度复核通过] `packages/flux-runtime/src/async-data/data-source-runtime.ts`（747 行）职责明显过宽，混合 formula/api source、polling、cache、dedup、abort、executor。
2. [维度复核通过] `packages/flux-formula/src/compile.ts`（723 行）同时承载 pipe 改写、diagnostics、static eval、compiler factory、generic compileNode。
3. [维度复核通过] `packages/flux-action-core/src/action-dispatcher.ts`（715 行）已从调度壳膨胀为 built-in/component/namespaced dispatch 与 retry/debounce/timeout/branch 总线。
4. [维度复核通过] `packages/flux-compiler/src/schema-compiler/shape-validation.ts`（600 行）仍混合 host boundary、namespace 校验、字段巡检、遍历分析。
5. [维度复核通过] `packages/flow-designer-renderers/src/designer-page.tsx`（524 行）混合 tree mode、shortcut、dialogs、status publication、provider wiring、shell composition。
6. [维度复核通过] 多份超大测试文件已形成测试主题聚合热点。
7. [维度复核通过] `packages/flux-formula/src/` 缺少二级结构，已被 `compile.ts`/`parser.ts` 的体量放大。
8. [维度复核通过] `docs/architecture/flux-runtime-module-boundaries.md` 对 `schema-compiler.ts` 的 owner 描述已落后于当前 `schema-compiler/` 子模块化现实。

## 降级

1. [已降级] `packages/flux-runtime/src/form-runtime-owner.ts`
2. [已降级] `packages/flux-compiler/src/schema-compiler.ts`
3. [已降级] `packages/flux-runtime/src/form-runtime.ts`
4. [已降级] `packages/flux-renderers-form/src/renderers/form.tsx`
5. [已降级] `packages/flux-runtime/src/async-data/reaction-runtime.ts`
6. [已降级] `packages/flux-formula/src/parser.ts`
7. [已降级] `packages/flux-renderers-basic/src/index.tsx`
8. [已降级] `packages/flux-renderers-data/src/index.tsx`
9. [已降级] `packages/flux-runtime/src` 根层扁平化问题
10. [已降级] `packages/report-designer-renderers/src` 全平铺问题
11. [已降级] 文档对 `form-runtime.ts` 的 owner 描述不够贴近现状

## 驳回

1. [已驳回] `packages/flow-designer-renderers/src/index.tsx` 作为“入口文件泄露实现”
2. [已驳回] `packages/word-editor-renderers/src/index.ts` 作为“入口文件泄露实现”
3. [已驳回] 文档对 `form-runtime-owner.ts` 的 owner 描述偏离

## 复核摘要

- 保留：8
- 降级：11
- 驳回：3

## 备注

- 主 agent 基线：`pnpm check:oversized-code-files` 当前有 3 个 `>700` 行文件和 16 个 `>500` 行文件。
