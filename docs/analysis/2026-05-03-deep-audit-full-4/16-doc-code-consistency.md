# 维度16 文档-代码一致性

- 初审发现数: 4
- 复核结果: 保留 2 / 降级 2 / 驳回 0

### [维度16] `docs/index.md` authoritative routing 仍指向已归档计划路径

- **文档路径**: `docs/index.md:59,61,62,66,67,117`
- **代码路径**: `docs/archive/plans/`
- **严重程度**: P2
- **漂移类型**: 路径失效 / authoritative routing drift
- **文档描述**: 顶层导航仍把读者导向 `docs/plans/71...`, `13...`, `41...`, `18...`, `39...`, `23...`。
- **代码现状**: 这些文件已不在 `docs/plans/`，而在 `docs/archive/plans/`。
- **建议**: 更新为 archive 路径或 successor 文档路径。
- **为什么值得现在做**: 这是顶层 authoritative 入口，不是普通正文引用。
- **误报排除**: 不是内容丢失；问题是入口导航仍然错误。
- **历史模式对应**: top-level navigation drift after archive move。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: `已降级`

### [维度16] `resolveGap` owner 迁移文档与 live code 不一致

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-react/src/resolve-gap.ts`, `packages/flux-renderers-basic/src/utils.ts`, `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-renderers-basic/src/flex.tsx`
- **严重程度**: P2
- **漂移类型**: owner 漂移 / 行为不一致
- **文档描述**: 文档写明 `resolveGap` 已从 basic 移到 react。
- **代码现状**: live code 中两边同时存在实现，basic renderers 仍在用本地版本。
- **建议**: 要么真正完成迁移，要么把文档改成“过渡态，双实现并存”。
- **为什么值得现在做**: 共享 primitive 双副本会持续制造未来分叉风险。
- **误报排除**: 不是 dist 产物误判；`src` 源码中存在真实调用。
- **历史模式对应**: migration declared complete before code converged。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `维度复核通过`

### [维度16] `schema-compiler-registry.test.ts` 代码锚点已过时

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-compiler/src/schema-compiler-registry-core.test.ts`, `packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts`, `packages/flux-compiler/src/schema-compiler-registry-features.test.ts`
- **严重程度**: P3
- **漂移类型**: 路径失效 / stale anchor
- **文档描述**: 文档仍引用已不存在的 `schema-compiler-registry.test.ts`。
- **代码现状**: 测试已拆分成 3 个新文件。
- **建议**: 删除旧文件名，改成新的 split anchors。
- **为什么值得现在做**: 可直接减少读者定位成本。
- **误报排除**: 不是说 underlying 行为已失效，只是锚点名过时。
- **历史模式对应**: stale file anchor after test split。
- **参考文档**: `docs/references/maintenance-checklist.md`
- **复核状态**: `已降级`

### [维度16] `terminology.md` 未纳入 `ImportFrame` / `ImportStack`

- **文档路径**: `docs/references/terminology.md`
- **代码路径**: `packages/flux-core/src/types/compilation.ts`, `packages/flux-runtime/src/import-stack.ts`, `packages/flux-react/src/contexts.ts`
- **严重程度**: P3
- **漂移类型**: 术语过时
- **文档描述**: 术语表应覆盖 active architecture docs 里的共享核心词汇。
- **代码现状**: `ImportFrame` / `ImportStack` 已是多份 architecture 文档和 live code 的一等概念，但术语表没有词条。
- **建议**: 补入这两个词条，必要时再补相关 owner/runtime 术语。
- **为什么值得现在做**: 可直接降低跨文档理解成本。
- **误报排除**: 不是要求术语表穷举所有类型；这里只针对跨多个 active doc 的共享概念。
- **历史模式对应**: active concept missing from shared glossary。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`
- **复核状态**: `维度复核通过`

## 复核备注

- 维度复核还发现 `docs/architecture/module-cache-and-import-stack.md` 的接口描述落后于 live code，风险高于术语遗漏，但因不在初审条目中，本轮仅作为 follow-up note 记录。
