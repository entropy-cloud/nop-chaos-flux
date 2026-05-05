# 维度 16：文档-代码一致性

## 第1轮初审

### [维度16] `AGENTS.md` 的 Report Designer 路由指向了不存在的路径

- **文档路径**: `AGENTS.md:202`
- **代码路径**: `docs/architecture/report-designer/contracts.md`
- **严重程度**: P2
- **漂移类型**: 路径失效

### [维度16] `AGENTS.md` 的包结构说明已不再反映 live workspace 形态

- **文档路径**: `AGENTS.md:371-400`
- **代码路径**: `packages/flux-react/src/index.tsx`, `packages/flow-designer-renderers/src/index.tsx`, `apps/playground/package.json`
- **严重程度**: P2
- **漂移类型**: 行为不一致

### [维度16] `flux-runtime-module-boundaries.md` 仍声称 `flux-renderers-basic` 保留本地 `resolveGap` 副本

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:393-395`
- **代码路径**: `packages/flux-renderers-basic/src/container.tsx:3`, `packages/flux-renderers-basic/src/flex.tsx:5`
- **严重程度**: P1
- **漂移类型**: owner 漂移

### [维度16] `renderer-runtime.md` 的稳定 hook 清单遗漏了已导出的 live hooks

- **文档路径**: `docs/architecture/renderer-runtime.md:505-559`
- **代码路径**: `packages/flux-react/src/index.tsx:16-48`, `packages/flux-react/src/hooks.ts:326-331,499-505`
- **严重程度**: P2
- **漂移类型**: 行为不一致

### [维度16] `styling-system.md` 的“Current Implementation”代码片段已落后于真实容器实现

- **文档路径**: `docs/architecture/styling-system.md:521-587`
- **代码路径**: `packages/flux-renderers-basic/src/container.tsx:1-68`
- **严重程度**: P2
- **漂移类型**: 行为不一致

## 深挖第2轮追加

### [维度16] `renderer-runtime.md` 的 error hook 签名落后于 live API

- **文档路径**: `docs/architecture/renderer-runtime.md:527-539`
- **代码路径**: `packages/flux-react/src/hooks.ts:342-349,430-437`, `packages/flux-core/src/types/renderer-hooks.ts:148`
- **严重程度**: P2
- **漂移类型**: 行为不一致

### [维度16] `terminology.md` 仍把 `RenderRegionHandle` 定义成 React 专属概念

- **文档路径**: `docs/references/terminology.md:73-78`
- **代码路径**: `packages/flux-core/src/types/renderer-hooks.ts:63-90`, `packages/flux-react/src/react-contracts.ts:13-15`
- **严重程度**: P2
- **漂移类型**: 术语过时

### [维度16] `terminology.md` 对 `ValidationContributor`` 的定义遗漏了已落地 owner-boundary 语义

- **文档路径**: `docs/references/terminology.md:330-338`
- **代码路径**: `packages/flux-core/src/types/renderer-core.ts:69-82`
- **严重程度**: P2
- **漂移类型**: 术语过时

## 深挖第3轮追加

### [维度16] `renderer-runtime.md` 在同一节里把 `RenderRegionHandle` 又写回了 React 专属签名

- **文档路径**: `docs/architecture/renderer-runtime.md:583-610`
- **代码路径**: `packages/flux-core/src/types/renderer-hooks.ts:63-90`, `packages/flux-react/src/react-contracts.ts:13-15`
- **严重程度**: P2
- **漂移类型**: 行为不一致

### [维度16] `flux-runtime-module-boundaries.md` 留着一个已不存在测试文件的历史注记

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:397`
- **代码路径**: 仓库中不存在 `schema-compiler-registry.test.ts*`
- **严重程度**: P3
- **漂移类型**: 路径失效

## 深挖第4轮追加

### [维度16] `maintenance-checklist.md` 仍把 spreadsheet/report-designer 包写成“future packages”

- **文档路径**: `docs/references/maintenance-checklist.md:247-252`
- **代码路径**: `packages/spreadsheet-core/package.json`, `packages/spreadsheet-renderers/package.json`, `packages/report-designer-core/package.json`, `packages/report-designer-renderers/package.json`
- **严重程度**: P2
- **漂移类型**: 术语过时

## 深挖统计

- 第1轮发现数：5
- 第2轮新增：3
- 第3轮新增：2
- 第4轮新增：1

## 维度复核结论

- 初审与深挖共 11 项，独立复核后保留 7 项、降级 3 项、驳回 1 项。
- 保留项主要集中在 active docs 中仍描述旧 API、旧术语或已删除文件；模板化概述与轻度措辞陈旧条目被降级。

## 子项复核结论

- `[维度16] AGENTS.md 的 Report Designer 路由指向了不存在的路径`: 驳回。`docs/architecture/report-designer/contracts.md` 实际存在。
- `[维度16] AGENTS.md 的包结构说明已不再反映 live workspace 形态`: 降级。确有 `index.tsx` / app 特例，但更像过度概括的模板陈述。
- `[维度16] flux-runtime-module-boundaries.md 仍声称 flux-renderers-basic 保留本地 resolveGap 副本`: 保留。`container.tsx` / `flex.tsx` 已直接从 `@nop-chaos/flux-react` 导入。
- `[维度16] renderer-runtime.md 的稳定 hook 清单遗漏了已导出的 live hooks`: 保留。`useCurrentValidationValues`、`useFormLayout`、`useStrictMode` 已导出但文档未列出。
- `[维度16] styling-system.md 的 Current Implementation 代码片段已落后于真实容器实现`: 降级。文档抓住了核心原则，但省略了当前 slot 细节。
- `[维度16] renderer-runtime.md 的 error hook 签名落后于 live API`: 保留。live API 中 `useCurrentFormError` 与 `useAggregateError` 已支持 `options?: { enabled?: boolean }`。
- `[维度16] terminology.md 仍把 RenderRegionHandle 定义成 React 专属概念`: 保留。core 层已定义 host-neutral 版本。
- `[维度16] terminology.md 对 ValidationContributor 的定义遗漏了已落地 owner-boundary 语义`: 保留。live 类型已包含 `ownerResolution` 与 `childContractMode`。
- `[维度16] renderer-runtime.md 在同一节里把 RenderRegionHandle 又写回了 React 专属签名`: 保留。代码块默认泛型仍是 `React.ReactNode`，与后文 host-neutral 说明不一致。
- `[维度16] flux-runtime-module-boundaries.md 留着一个已不存在测试文件的历史注记`: 保留。仓库内确无 `schema-compiler-registry.test.ts*`。
- `[维度16] maintenance-checklist.md 仍把 spreadsheet/report-designer 包写成 future packages`: 降级。确实过时，但只是措辞陈旧、影响较轻。
