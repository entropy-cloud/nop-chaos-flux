# main-round-01

- 执行者身份：主执行者
- 本轮检查的契约或方向：搜索空间切分与首批调度

## 背景

run-01 覆盖了 form validation / statusPath / valuesPath / hidden-field participation / owner-lifecycle，结论是没有发现新的高价值问题类别。

本轮 (run-02) 需要覆盖完全不同的方向，避免重复 run-01 的搜索空间。

## 搜索空间切分

本轮首批覆盖 5 个不重叠方向：

| 子 agent | 方向                                | 包                 | 稳定契约来源                                                                                                                   | 攻击重点                                                                                                            |
| -------- | ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A        | flux-formula 评估契约               | `flux-formula`     | `docs/references/terminology.md`, `packages/flux-formula/src/index.ts`, 公开 evaluate/scope/parser API                         | null/undefined 边界、嵌套表达式、错误传播、作用域泄漏、内置函数契约                                                 |
| B        | action-core 调度与控制流            | `flux-action-core` | `docs/architecture/action-algebra-formal-spec.md`, `packages/flux-action-core/src/index.ts`                                    | result 链接、error 传播、timeout/retry、parallel 执行、abort 语义                                                   |
| C        | compiler schema 契约与诊断          | `flux-compiler`    | `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md`, 公开 compile/diagnose API | prop 覆盖、shape 校验、诊断准确性、host contract 验证、strict mode                                                  |
| D        | flux-react hook 与 surface 生命周期 | `flux-react`       | `docs/architecture/renderer-runtime.md`, `docs/architecture/surface-owner.md`, 公开 hooks API                                  | hook 订阅稳定性、scope selector memoization、dialog/drawer teardown、owner 边界                                     |
| E        | core 工具与数据结构契约             | `flux-core`        | `packages/flux-core/src/index.ts`, `docs/references/terminology.md`                                                            | path 操作 (parsePath/getIn/setIn) 边界、array ops (move/swap/insert/remove) 边界、value adapter 契约、class aliases |

## 去重规则

- run-01 已排除的 form validation / statusPath / valuesPath 方向不纳入本轮
- 同一根因出现在多个包中只记一次
- 子 agent 之间如果发现重叠，合并到同一问题类别

## 本轮新增问题类别

（待子 agent 返回后填写）

## 调度状态

- [ ] 子 agent A: flux-formula
- [ ] 子 agent B: action-core
- [ ] 子 agent C: compiler
- [ ] 子 agent D: flux-react hooks/surface
- [ ] 子 agent E: core utilities
