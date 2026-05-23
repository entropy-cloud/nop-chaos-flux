# 深度审核汇总报告

## 审核范围

- 执行的维度: `01 依赖图与包边界`、`04 状态所有权与单一事实来源`、`15 安全与性能红线`
- 覆盖的主要包: `flux-react`, `flux-runtime`, `flux-renderers-*`, `flow-designer-*`, `report-designer-*`, `spreadsheet-renderers`, `nop-debugger`
- 审核日期: `2026-05-11`
- 执行方式: 第一批优先维度，按“第 1 轮初审 -> 串行深挖 -> 维度复核 -> 必要的子项/批量复核”执行

## 深挖统计

- 维度总数: `3`
- 各维度深挖轮次: `维度01=4轮`, `维度04=1轮(零发现)`, `维度15=8轮`
- 深挖总轮次: `13`
- 深挖总发现数: `29`

## 复核统计

- 深挖发现总数: `29`
- 已独立复核条目数: `29`
- 维度级复核完成数: `3`
- 子项/批量复核会话数: `7`
- 子项/批量复核覆盖条目数: `17`
- 保留: `19`
- 降级: `0`
- 驳回: `8`
- 合并并入: `2`

## P0 清单（按文件分组）

本批次未发现经独立复核仍保留的 `P0` 条目。

## P1 清单（按文件分组）

| 文件                                                       | 编号    | 摘要                                                              |
| ---------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `packages/flux-runtime/src/async-data/reaction-runtime.ts` | `15-06` | source/reaction depth counter 是模块级共享状态，会跨 runtime 串扰 |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                               | 维度 | 说明                                              |
| ------------------------------------------------------------------ | ---- | ------------------------------------------------- |
| `packages/flux-runtime/src/action-adapter.ts`                      | `15` | surface 打开路径上的 compile failure 退化语义不清 |
| `packages/flow-designer-renderers/src/designer-command-adapter.ts` | `15` | graph fallback 结构插入命令存在 O(n^2) 残留       |
| `packages/flux-runtime/src/async-data/reaction-runtime.ts`         | `15` | 级联保护既有可观测性缺口，也有模块级共享状态问题  |
| `packages/flux-renderers-form/package.json`                        | `01` | 测试 support 面与真实发布面脱节                   |

## 跨维度模式

- **测试依赖边界失真**: 维度 01 的主要结果集中在测试真实导入未回写 manifest，以及 test-only 依赖混入生产 `dependencies`；按 v1 基线这些都是现行设计错误，不再作为“仅 hygiene”降级。
- **console-only 失败路径**: 维度 15 多处保留项都属于“降级已发生，但 host/debugger 侧看不到结构化失败信号”。
- **模块级共享状态仍是高风险模式**: 当前保留的 P1/P2 更集中在跨 runtime / 多实例串扰和退化路径不可观测，而不是零拷贝只读读面本身。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 未发现 `@nop-chaos/*/src/*` 形式的跨包内部实现路径导入。
- 未发现 manifest 层面的循环依赖。
- 所有包均存在 `tsconfig.build.json` 与 `build` script。
- 本批次未发现 `eval(` / `new Function(` live 使用。

## 建议新增的自动化检查

- 校验 `package.json` 的 `@nop-chaos/*` 生产依赖是否真的出现在构建输入，而不是只出现在 `*.test.*` / `test-support*`。
- 校验 workspace alias 指向的 `@nop-chaos/*` 子路径是否同时存在于对应包的 `exports`，或显式标记为 test-only internal alias。
- 为 runtime observability 增加 contract test，覆盖 cascade limit、formula publish、surface compile failure、auto-layout failure 等退化路径必须进入 host reporting 的要求。
- 为多 runtime / 多 designer 并存场景增加隔离测试，证明模块级共享状态不会串扰。

## 可暂缓项（有问题但 ROI 暂时不高）

无。当前按 `v1 / 无兼容负担 / 直接收敛到最优设计` 基线审计，不再以 legacy、fallback、过渡态或兼容残留作为暂缓理由。

## 误报排除清单（看起来像问题但不建议动）

- 维度 04 在独立复核后维持零发现；`object-field`、`table-quick-edit-controller`、`use-surface-renderer`、`designer-tree-mode` 当前都落在 live owner 文档允许的 tradeoff / bridge 边界内。
- `flow-designer-core` 上的 `flux-formula` 依赖虽更准确地属于“未使用依赖”，但在当前 v1 基线下仍作为错误主边界保留。
- `createApiRequestExecutor()` 对 pre-aborted signal 继续调用 fetcher 的行为，按当前文档更像 transport boundary contract gap，不足以认定为现行 P5 违约。
- `getState()` / `getSnapshot()` / host projection / capability result 的 by-reference readonly view，在当前架构基线下默认合法；不能仅因未 clone 就判定缺陷。
