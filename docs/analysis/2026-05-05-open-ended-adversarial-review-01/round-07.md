# 对抗性审查 — 2026-05-05 第 7 轮（Refined Rubric）

## 发现 1：`flux-formula` 仍把 canonical instance registry 和 compatibility global registry 一起冻结在 root public API

- 在哪里
  - `packages/flux-formula/src/registry.ts:26-102`
  - `packages/flux-formula/src/index.ts:5-12`
- 是什么
  - 包内已经有 `createFormulaRegistry()` 这条 instance-local canonical 路径。
  - 但 root entry 仍同时公开 `registerFunction`、`registerNamespace`、`getFormulaRegistrySnapshot`、`resetFormulaRegistry` 这些 process-global mutable wrapper。
  - `registry.ts` 还直接写明默认全局实例是 `for backward compatibility`。
- 为什么这次仍然成立
  - 按 refined rubric，`derived convenience projection` 可以接受，但这里不是 projection，而是两套不同 owner model：
    - 一套是显式实例持有的 registry。
    - 一套是进程级共享的默认 registry。
  - 这不是“更好用一点的读接口”，而是公开 contract 同时承认两条扩展路径，且可变范围不同、隔离语义不同、测试/SSR 风险不同。
  - 在 v1 无兼容负担下，继续把 compatibility model 固化到 root exports，会让 canonical registry 永远降格成“其中一种用法”。
- 信心水平
  - 确定

## 发现 2：`nop-debugger` 自动化/控制器合同仍同时公开 `inspectByCid()` 和 `inspectNode()` 这两个同义 inspect 入口

- 在哪里
  - `packages/nop-debugger/src/controller.ts:138,239,414-417`
  - `packages/nop-debugger/src/types.ts:363-365,452-454`
  - 对照文档：`docs/architecture/debugger-runtime.md:214-239`
- 是什么
  - `controller.ts` 中 `inspectNode` 只是 `currentInspectByCid(cid)` 的直接别名。
  - `NopDebuggerAutomationApi` 与 `NopDebuggerController` 都同时暴露 `inspectNode(cid)` 和 `inspectByCid(cid)`。
  - 但 active architecture doc 的 stable automation-facing methods 只列 `inspectByCid()`，没有把 `inspectNode()` 作为 canonical peer。
- 为什么这次仍然成立
  - 这不是 convenience projection，因为返回值、计算方式、信息层级都没有变化；它只是同一语义的第二个公开名字。
  - 也不是像 `hasError` 这类从 core state 派生出的 helper 字段；这里没有 derivation，只有 alias。
  - 一旦 controller、automation、测试继续共同背书这两个入口，debugger inspect contract 就会长期停留在“双 canonical 名字”的状态。
- 信心水平
  - 确定

## 本轮结论

- refined rubric 下，前一轮把 `createFlowDesignerRegistry()` 之类命名残留当作 closure blocker 并不稳，这类问题更适合归到 deferred naming residual。
- 但 `flux-formula` 的双注册表和 `nop-debugger` 的 inspect 双入口，仍然是明确的 compatibility alias / parallel public surface，而不是可接受的 convenience projection。
