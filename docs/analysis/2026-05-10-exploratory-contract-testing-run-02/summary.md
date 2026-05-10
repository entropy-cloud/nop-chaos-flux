# Summary

## 执行概况

- 主执行者共做了 3 轮：调度切分 (round-01)、Batch 1 复核 (round-02)、Batch 2 复核 (round-03)。
- 一共启用了 **10 个** 全新独立子 agent (A-J)，覆盖 10 个不重叠方向。
- 每个子 agent 在自己负责的方向内完整执行了探索循环。

## 问题发现

| 批次    | 子 agent               | 是否发现新问题        |
| ------- | ---------------------- | --------------------- |
| Batch 1 | A (formula)            | 否                    |
| Batch 1 | B (action-core)        | 是 — ECT-001          |
| Batch 1 | C (compiler)           | 是 — ECT-002, ECT-003 |
| Batch 1 | D (flux-react)         | 否                    |
| Batch 1 | E (core utils)         | 否                    |
| Batch 2 | F (runtime scope)      | 是 — ECT-004          |
| Batch 2 | G (renderer contracts) | 否                    |
| Batch 2 | H (async data source)  | 是 — ECT-005          |
| Batch 2 | I (validation rules)   | 否                    |
| Batch 2 | J (i18n/form-status)   | 否                    |

## 最终问题清单

| ID      | Title                                          | Status  | 发现者 |
| ------- | ---------------------------------------------- | ------- | ------ |
| ECT-001 | withRetry failureCount soft-fail undercount    | `open`  | B      |
| ECT-002 | validate() double analyzeSchemaInput           | `open`  | C      |
| ECT-003 | compileNode() opaque crash on unknown renderer | `fixed` | C      |
| ECT-004 | isolated scope get()/has() parent leak         | `open`  | F      |
| ECT-005 | generateCacheKey falsy data collision          | `fixed` | H      |

## 代码修复

1. **ECT-003**: `packages/flux-compiler/src/schema-compiler.ts` — 在 `compileNode` 中添加 `registry.get()` 检查
2. **ECT-005**: `packages/flux-runtime/src/async-data/api-cache.ts` — 将 truthy 检查改为 undefined 检查

## 测试文件新增

| 包                   | 文件数 | 测试数  |
| -------------------- | ------ | ------- |
| flux-formula         | 1      | 95      |
| flux-action-core     | 2      | 40      |
| flux-compiler        | 1      | 90      |
| flux-react           | 1      | 16      |
| flux-core            | 8      | 235     |
| flux-runtime         | 5      | 325     |
| flux-i18n            | 1      | 16      |
| flux-renderers-basic | 4      | 36      |
| flux-renderers-form  | 2      | 18      |
| flux-renderers-data  | 2      | 18      |
| **Total**            | **27** | **889** |

## 最终停止依据

Batch 2 的最新全新子 agent (J: i18n/form-runtime-status) 在完成自身内部循环后，没有发现新的高价值问题类别。同时 Batch 2 中 F 和 H 发现了新问题（已处理），但 G、I、J 三个方向未发现新问题。

## 本次执行实际覆盖的主方向

1. flux-formula 评估契约
2. action-core 调度与控制流
3. compiler schema 契约与诊断
4. flux-react hook 与 surface 生命周期
5. core 工具与数据结构契约
6. runtime scope & ownership 边界
7. renderer contracts (basic/form/data)
8. async data source & API cache
9. validation rules & lifecycle
10. i18n & form-runtime-status

## 仍可继续探索的方向

若进行下一轮，可优先补盲：

1. cross-package composition (core→runtime→react→renderer 端到端数据流)
2. flow-designer / report-designer / spreadsheet 内部契约
3. word-editor 模板与表达式编辑契约
4. debugger runtime 契约
5. concurrent/race condition in source reactions
