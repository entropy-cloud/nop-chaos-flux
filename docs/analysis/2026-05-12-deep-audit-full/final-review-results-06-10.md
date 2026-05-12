# Final Review Results: Dimensions 06-10

> 状态：最终独立复核记录。基于第 1 轮完整重建正文、第 2-5 轮 raw findings 与 live repo 复核。第 5 轮达到本次执行上限，仍有新增，因此结论表述为“达到上限后进入复核”，不声称自然收敛。

## 误报修正

- [07-01] 驳回：React-owned lifecycle 是该 hook 的预期 ownership，cleanup 存在。
- [07-02] 驳回：`useSourceValue` observer wiring 与当前 design 一致，cleanup 存在。
- [07-06] 驳回：同 target summary update 正确覆盖同一 scope path；effect cleanup 覆盖 unmount，未证明 per-summary cleanup defect。

## 维度 06：异步模式与取消安全

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                                                 |
| ----- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 06-01 | 保留     | P2           | schema import preparation 无法取消底层 import loads；`AbortSignal` 只在 `prepare()` settle 后检查，未传入 `prepareSchema/importLoader.load`。            |
| 06-02 | 保留     | P3           | report designer field-source refresh failure 可发布 stale warning；建议 effect-local stale flag/request id。                                             |
| 06-03 | 保留     | P2           | auto-layout cleanup 不失效 pending layout request id，unmount 后 promise 仍可 setState。                                                                 |
| 06-04 | 保留     | P2           | create-dialog failures 仅 console.warn 或静默忽略，缺用户可见反馈。                                                                                      |
| 06-05 | 降级保留 | P3           | SourceObserver `allSettled().then(...)` 链尾缺 catch。source rejection 已由 allSettled 处理，剩余风险是 then processing/listener notification 意外失败。 |
| 06-06 | 保留     | P2           | WordEditor save provider 在 host save hook await 后不检查 abort，可能清 dirty/发布 stale saved。                                                         |
| 06-07 | 保留     | P3           | CRUD query submit promise 被按钮 `void` 丢弃，capability reject 无反馈。                                                                                 |
| 06-08 | 保留     | P2           | Spreadsheet edit save 在 async dispatch 成功前清 draft/退出编辑。                                                                                        |
| 06-09 | 保留     | P3           | Spreadsheet keyboard shortcuts 调用 async commands 无 catch。                                                                                            |
| 06-10 | 保留     | P3           | Report field-panel keyboard insert async failure 被丢弃。                                                                                                |
| 06-11 | 保留     | P3           | Flow Designer toolbar host actions floated without failure feedback。                                                                                    |
| 06-12 | 保留     | P3           | object-field non-form commit revalidation rejection can leak。                                                                                           |
| 06-13 | 保留     | P2           | object-field transformOut 有 overlap sequence guard，但没有 unmount/dependency invalidation，最后一个 pending transform 仍可能 stale write。             |
| 06-14 | 保留     | P3           | detail open transform failures 仅 console.warn，无用户可见错误。                                                                                         |
| 06-15 | 保留     | P3           | report spreadsheet field-drop callback typed/called as sync，async reject 后 drop state 已清。                                                           |
| 06-16 | 保留     | P2           | CodeEditor SQL execution 缺 latest-request/unmount guard，旧请求可覆盖新结果。                                                                           |
| 06-17 | 保留     | P3           | WordEditor image insert FileReader 只处理 onload，缺 onerror/onabort/command error handling。                                                            |

## 维度 07：生命周期与副作用归属

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                                     |
| ----- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 07-01 | 驳回     | 无           | React hook owns mount/unmount，runtime controller owns execution；cleanup 已存在。                                                           |
| 07-02 | 驳回     | 无           | observer 创建、subscribe、run、dispose wiring 与当前 design 一致。                                                                           |
| 07-03 | 保留     | P3           | API request parent abort listener 正常 settlement 后未移除；`once` 只在 abort 触发后清理。                                                   |
| 07-04 | 降级保留 | P3           | ActionScope 有 per-namespace unregister/listNamespaces，SchemaRenderer 已手动 loop；缺的是 scope-wide dispose convenience，不是已证实 leak。 |
| 07-05 | 保留     | P1           | RenderNodes 在 render/useMemo 阶段创建 child scope 并 mutate WeakMap cache；aborted render cleanup 不会运行。                                |
| 07-06 | 驳回     | 无           | status path 同 target summary update 覆写同一值，unmount cleanup 清当前 target；未证明缺陷。                                                 |
| 07-07 | 降级保留 | P3           | ArrayEditor focus RAF 未保存/取消；多数 stale refs 会 no-op，降级为生命周期卫生问题。                                                        |

## 维度 08：验证系统一致性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                    |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------- |
| 08-01 | 保留     | P1           | `useCurrentValidationScope()` 可优先返回 ancestor `ValidationContext` 而不是 current form。 |
| 08-02 | 保留     | P1           | disposed/unactivated validation resolve 为 successful empty result。                        |
| 08-03 | 保留     | P3           | `summary-gate` 名称掩盖其仍会 trigger validation 的行为；语义歧义保留。                     |
| 08-04 | 保留     | P1           | mixed sync+async field rules 延迟 sync error publication。                                  |
| 08-05 | 保留     | P1           | TagList 直接 validateField/validateAt('change')，绕过 validateOn。                          |
| 08-06 | 保留     | P2           | ArrayEditor parent array structural validation 无条件执行，忽略 validateOn。                |

## 维度 09：渲染器契约合规性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                             |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------ |
| 09-01 | 保留     | P3           | Flex renderer hardcodes layout utility mapping；作为 marker-only contract 张力保留。 |
| 09-02 | 保留     | P2           | Tree repeated node region 缺 runtime instance path。                                 |
| 09-03 | 保留     | P3           | Tabs change event data 为 null，只在 scope bindings 中提供 `{ value, index }`。      |
| 09-04 | 保留     | P3           | CRUD refresh event data 为 undefined，只依赖 `$crud` scope。                         |
| 09-05 | 保留     | P2           | ObjectField 使用 `flux-react/unstable` contexts 作为 projection boundary。           |

## 维度 10：样式系统合规性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                 |
| ----- | -------- | ------------ | ---------------------------------------------------------------------------------------- |
| 10-01 | 保留     | P2           | error fallback JSX emit BEM-style modifier/element classes，包括 root 与 node fallback。 |
| 10-02 | 保留     | P2           | `default-spacing.css` 强化 BEM fallback selectors。                                      |
| 10-03 | 保留     | P3           | playground Flow Designer 同时使用 BEM-like modifiers 与 data attributes 表达状态。       |
| 10-04 | 保留     | P2           | Container layout renderer emits hardcoded flex/gap/align classes。                       |
| 10-05 | 保留     | P3           | Word editor renderer 依赖 app-level `--nop-*` variables。                                |
