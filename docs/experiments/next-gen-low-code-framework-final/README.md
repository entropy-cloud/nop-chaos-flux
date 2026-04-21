# 下一代低代码底层框架最终设计

> Status: final clean-slate spec proposal
>
> Scope: 这是从零重新落地的新一代低代码底层框架总纲与分册规范。它吸收了 `docs/experiments` 全部实验稿和当前 Flux 架构中最强的判断，但不以当前实现为兼容约束。

## 1. 最终结论

最终采用：

**Execution Package + Minimal Execution Kernel + Independent Owner Evolution**

这套方案明确拒绝两条路线：

1. 不走当前实现那种“语义判断对，但 execution boundary 还不够硬”的增量形态。
2. 不走 v6 graph-kernel 那种“大一统图平台”路线。

最终保留的核心判断：

1. 运行时输入必须是 `Execution Package`，不是 authoring DSL。
2. 顶层公开语义原语保持七个：`Template`、`Scope`、`Value`、`Resource`、`Reaction`、`Capability`、`Host Projection`。
3. `Capability` 是唯一作者可见效果出口。
4. `Owner` 是运行时组织骨架，不是第八个 primitive。
5. 所有写入、发布、异步 settle、remote reconcile 都必须进入 transaction pipeline。
6. 复杂域宿主继续采用 `projection + namespaced command` 的窄协议接入。

## 2. 文档地图

按阅读顺序：

1. `01-architecture-overview.md`
2. `02-execution-package-and-admission.md`
3. `03-kernel-transaction-and-async.md`
4. `04-owner-validation-and-data-model.md`
5. `05-renderer-and-host-protocol.md`
6. `06-persistence-journal-collaboration.md`
7. `07-diagnostics-security-performance-conformance.md`
8. `08-end-to-end-lowering-example.md`
9. `09-repo-and-package-blueprint.md`
10. `10-runtime-module-map.md`
11. `11-implementation-sequence-and-milestones.md`
12. `12-conformance-case-catalog.md`
13. `13-field-json-design-examples.md`
14. `14-concrete-technical-solution.md`
15. `15-performance-and-extensibility-strategy.md`
16. `16-current-implementation-comparison.md`
17. `17-execution-package-ir-spec.md`
18. `18-mvp-kernel-pseudocode.md`
19. `19-composite-field-lowering-and-identity.md`
20. `20-mvp-implementation-task-matrix.md`

各文件职责：

| File | Owns |
| --- | --- |
| `01-architecture-overview.md` | 总体目标、分层、原语闭包、顶层不变量 |
| `02-execution-package-and-admission.md` | package IR、版本协商、compiler determinism、session/admission/recovery |
| `03-kernel-transaction-and-async.md` | scope/value/dependency、transaction phases、commit 语义、async governance、failure taxonomy |
| `04-owner-validation-and-data-model.md` | owner substrate、validation、composite value、table/collection、structural sharing |
| `05-renderer-and-host-protocol.md` | renderer contract、React host、domain bridge、host projection、command/handle 协议 |
| `06-persistence-journal-collaboration.md` | persistence、snapshot/journal、undo/redo、协作编辑、SSR/worker 恢复边界 |
| `07-diagnostics-security-performance-conformance.md` | debugger、diagnostics、安全、性能、合规测试矩阵 |
| `08-end-to-end-lowering-example.md` | authoring -> package -> runtime 的端到端示例 |
| `09-repo-and-package-blueprint.md` | 从零实现的仓库布局、package 结构、目录职责 |
| `10-runtime-module-map.md` | 关键模块、核心接口、代码落点、模块间依赖图 |
| `11-implementation-sequence-and-milestones.md` | 从零实施顺序、阶段里程碑、阶段退出条件、风险控制 |
| `12-conformance-case-catalog.md` | 合规用例目录、case ID 体系、phase gate 对应关系 |
| `13-field-json-design-examples.md` | `object-field`、`variant-field`、`array-field` 等具体 JSON 设计示例 |
| `14-concrete-technical-solution.md` | 具体实现技术方案、数据结构、调度模型、第三方技术选择 |
| `15-performance-and-extensibility-strategy.md` | 高性能与高扩展性工程策略、热点优化与扩展边界 |
| `16-current-implementation-comparison.md` | 与当前实现的逐项对比、保留点、替换点、迁移启示 |
| `17-execution-package-ir-spec.md` | `ExecutionPackage` IR 字段级规范、canonicalization、不变量、host/owner/field 相关 IR |
| `18-mvp-kernel-pseudocode.md` | MVP 内核伪代码、transaction/async/owner/resource/reaction/recovery 的执行步骤 |
| `19-composite-field-lowering-and-identity.md` | `array-field` identity lowering、`rowEditor` commit target、variant project revalidation 的 bridge 规范 |
| `20-mvp-implementation-task-matrix.md` | MVP 可执行任务矩阵、物理 owner、前置依赖、完成证据 |

## 3. 共识边界

本目录中的“最终”表示：

1. 实验路线已经收敛，不再继续在 graph-kernel、统一 binding、runtime authoring 这些方向摇摆。
2. 已经给出足以指导从零实现的顶层协议和主不变量。
3. 允许继续细化子系统实现，但不得破坏这里定义的 primitive closure、transaction 语义、capability 单出口、owner 组织边界和 host/domain 窄协议。

## 3.1 跨文件唯一 owner

为避免 split 后重复发明协议，以下概念只允许在一个文件中作为规范 owner 出现：

1. `03-kernel-transaction-and-async.md` 是唯一 `RuntimeFailureKind` owner。
2. `02-execution-package-and-admission.md` 是 `ExecutionPackage`、admission/session 的高层协议 owner；`17-execution-package-ir-spec.md` 负责字段级 IR refinement、program 表、引用闭包和 composite/host/import 细化，但不得违背 `02` 的顶层协议。
3. `04-owner-validation-and-data-model.md` 是唯一 owner lifecycle、validation edge case、collection field-state migration owner。
4. `05-renderer-and-host-protocol.md` 只定义 host/renderer/bridge/command envelope，不再发明第二套 failure taxonomy。
5. `06-persistence-journal-collaboration.md` 是 persistence/recovery/journal/collaboration 的高层协议 owner；`17-execution-package-ir-spec.md` 只在需要时给出 shared DTO 细化，不改变 `06` 的生命周期语义。
6. `07-diagnostics-security-performance-conformance.md` 只定义 diagnostics、安全与 conformance，不再重复运行时协议。 

## 4. 与旧总稿关系

旧文件 `docs/experiments/next-gen-low-code-framework-final-design.md` 现在只保留为目录入口和兼容跳转。
