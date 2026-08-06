# Round 02 — 事件派发 ctx 家族残留扫描（跨包）

> 执行：open-audit 2026-08-06（mission `component-audit`）
> 视角：跨边界信使（payload 跨 schema/renderer/action 边界时形状与绑定是否保持）
> 去重：multi-audit 22-09（graph）/22-11（wizard）已报告同型缺陷；本目录沿同一根因继续全仓扫描，报告其**未覆盖**的组件实例。transfer/picker 的空参派发（`onAdd?.()`）属 checklist v2 维度 7 显式豁免类别（空参派发），不报告；button/notice-bar 原生 DOM 转发已在 CG 分析中豁免，不报告；table onRowClick 传 row scope 已在 table 卡 dim 7 显式留痕（row-scope 契约），不报告。

## 背景（机制确认）

checklist v2 维度 7 + CX-10/bug-83 家族约定：schema 事件派发必须携带 `{ event, evaluationBindings, scope }` ctx 作为第二参；runtime args 求值仅合并 evaluationBindings + scope（`getEvaluationScope`，flux-action-core/src/action-core.ts:206-208），单参派发 = 模板键静默空值（成员访问模板甚至抛 TypeError，CX-11）。C1.1/C3.5 审计卡在 v2 规则出台前写成，其 dim 7「pass」只验证了 payload 形状，未覆盖 ctx 第二参。

## 发现

### [P2] dialog/drawer surface 事件（onOpen/onClose/onConfirm）payload 携带但单参派发，无 ctx

- **在哪里**：`packages/flux-renderers-basic/src/use-surface-renderer.ts:176,181,224-226`（`onClose?.({ surfaceId, kind, open: false })` 等 4 处）
- **是什么**：eventContracts（`surface-renderer-definitions.ts:5-43`）定义 payload `{surfaceId, kind, open}`，派发形状一致但缺第二参 ctx。schema 作者在 `onClose` action args 写 `${surfaceId}` 类模板键 → 静默 undefined。dialog/drawer 卡（C1.1，v2 前）dim 7「pass」仅对账了 payload 形状，无 ctx 留痕；CG Phase 2「not-mechanizable ~33 处单参派发点 100% 落在已 closed 卡裁决 pass 面」的归类对 surface 派发不成立（非空参、非原生 DOM 转发、非 C3.x）。
- **为什么值得关心**：与 22-11（wizard）同根同型；surface 事件是 dialog/drawer 最常用的宿主集成点（onConfirm 提交后回调），模板键不可解析影响真实集成；且 CG 的「100% 已裁决」断言因此类点而失真。
- **信心水平**：确定（代码 4 处单参派发 + 卡文本 + CG 分析文本三方对读）。

### [P2] upload-field 家族（input-file/input-image）7 个事件 payload 携带但单参派发，无 ctx

- **在哪里**：`packages/flux-renderers-form-advanced/src/upload-field.tsx:261,281,300,367,381,393`（onUploadSuccess/onUploadError/onReject/onDelete/onDeleteSuccess/onDeleteFail）
- **是什么**：payload 形状与 design §8.1 一致（`{type, file:{name,size,type}, item}` / `error` 等），但全部单参派发。CG Phase 2 把「upload-field design §8.1」当作 ctx 豁免依据——**design §8.1 只文档化 payload 形状，从未文档化单参派发/ctx 豁免**，属循环引用式裁决。input-file 卡 dim 7「pass」同样只对账 payload。
- **为什么值得关心**：上传结果回调用法高频（`args: { url: "${item.url}" }` 等），模板键静默空值或 TypeError（成员访问）直接破坏上传后处理链路；同族空参派发（onAdd/onPick）已有豁免，payload 携带者按 22-11 同标准应补 ctx。
- **信心水平**：确定（代码 + design §8.1 + CG 文本三方对读；design §8.1 原文无 ctx 条款）。

## 汇总

22-11 报告了 wizard 6 点；本目录补充 dialog/drawer 4 点 + upload-field 7 点，全部与 22-09/22-11 同型（payload 携带 + 无 ctx）。建议并入 22-09/22-11 的统一「事件 ctx 全量扫描」修复计划（multi-audit 跨维度模式 1 已提议该计划，本目录为其扩面输入）。
