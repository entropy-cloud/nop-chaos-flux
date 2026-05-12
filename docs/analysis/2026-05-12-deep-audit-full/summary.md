# 深度审核最终报告

> 状态：最终归档。第 2-5 轮追加深挖已补跑并记录完整原始发现；第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 审核范围

- 执行维度：01-20 全量维度。
- 覆盖范围：`packages/`、`apps/`、`tests/e2e/`、`docs/architecture/`、`docs/references/`、`docs/discussions/`。
- 审核日期：2026-05-12。
- 代码修改：无运行时代码修改；本次仅补齐审计归档与复核记录。

## 归档结构

- 第 1 轮完整正文：`stage-1-full-findings-01-05.md`、`stage-1-full-findings-06-10.md`、`stage-1-full-findings-11-15.md`、`stage-1-full-findings-16-20.md`。
- 第 2-5 轮追加 raw findings：`round-2-to-5-raw-findings.md`、`raw-findings-03-06.md`、`raw-findings-07-20.md`。
- 最终逐条复核：`final-review-results-01-05.md`、`final-review-results-06-10.md`、`final-review-results-11-15.md`、`final-review-results-16-20.md`。
- 旧 `review-results.md`：仅保留为 Stage-1 历史复核记录，不再作为最终结论来源。

## 执行统计

- 深挖轮次：第 1 轮初审 + 第 2-5 轮追加深挖。
- 收敛状态：第 5 轮达到本次执行上限，仍有新增，进入最终复核。
- 最终复核条目数：118。
- 最终保留条目数：112。
- 最终驳回条目数：6。
- 最终 P1：7。
- 最终 P2：61。
- 最终 P3：44。
- 零最终发现维度：维度 01。

## 驳回与重大修订

- [04-02] 驳回：report/spreadsheet dual-core bridge 被架构文档明确允许，不作为状态所有权缺陷。
- [07-01] 驳回：React-owned anonymous source hook lifecycle 与当前设计一致，cleanup 存在。
- [07-02] 驳回：`useSourceValue` observer wiring 与当前 observer design 一致。
- [07-06] 驳回：status publication 的 same-target summary update 未证明 per-summary cleanup 缺陷。
- [12-02] 驳回：live compiler 已支持 deep parameterized `$slot` symbol propagation。
- [16-04] 驳回：API adaptor `${...}` 示例会被 formula compiler expression normalization 接受。
- [03-05] 修订保留：原“build 不产物”部分为误报；最终问题改为 public `test-support` subpath 的 undeclared testing dependency 与全局 i18n side effects。
- [19-01] 修订降级：广义 ajax retry claim 过宽；最终问题改窄为 `submitForm` action-level retry 被跳过。

## P1 清单

| 编号  | 文件                                                                                                     | 最终结论                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 04-03 | `packages/flow-designer-renderers/src/designer-tree-mode.tsx`, `packages/flow-designer-core/src/core.ts` | Tree mode `TreeDocument` 在 React state 与 core history 双重维护，history 可能保存 Graph/Tree 错配快照。   |
| 07-05 | `packages/flux-react/src/render-nodes.tsx`                                                               | `RenderNodes` 在 render/useMemo 阶段创建 child scope 并写 WeakMap cache，aborted render cleanup 不会运行。 |
| 08-01 | `packages/flux-react/src/hooks/use-form-hooks.ts`                                                        | current validation scope 可优先返回 ancestor owner 而非 current form。                                     |
| 08-02 | `packages/flux-runtime/src/form-runtime-validation.ts`                                                   | disposed/unactivated validation resolve 为 successful empty result。                                       |
| 08-04 | `packages/flux-runtime/src/form-runtime-validation.ts`                                                   | mixed sync+async field rules 延迟 sync error publication。                                                 |
| 08-05 | `packages/flux-renderers-form-advanced/src/tag-list.tsx`                                                 | TagList 直接触发 change validation，绕过 `validateOn`。                                                    |
| 16-03 | `packages/flux-runtime/src/action-adapter.ts`                                                            | form context 下 `setValues.args.path` 被忽略，写入语义与文档冲突。                                         |

## 高密度 P2 区域

- 模块边界：维度 02 保留 14 个 P2，集中在 compiler/runtime import/reaction、form advanced renderers、spreadsheet grid、测试巨文件与 unstable context 依赖。
- 异步安全：维度 06 保留 7 个 P2，集中在取消传播、stale save、edit draft 清理、transformOut/SQL 竞态。
- API/跨包契约：维度 03、18 共保留 10 个 P2，集中在 public subpath/alias、manifest/provider discovery 与 scope export drift。
- 可访问性：维度 20 保留 9 个 P2，集中在 label/error association、first invalid focus、interactive row semantics、chart data alternative 与 virtualized grid active descendant。

## 建议优先级

1. 先修 P1：`TreeDocument` history owner、render-phase fragment cache、validation owner precedence/lifecycle result、sync+async validation publication、TagList validateOn、`setValues.args.path`。
2. 然后修 P2 中会导致 runtime 行为错误或用户可见失败的项：06-01、06-06、06-08、06-13、06-16、08-06、19-01、19-02、20-01 到 20-07、20-09、20-10。
3. 再整理 API/docs/tooling contract：03-02 到 03-07、16-01、16-02、17-02、18-01 到 18-04。
4. 最后处理边界与样式卫生：02 系列、10 系列、11 系列、14 系列、17 系列低风险项。

## 验证状态

- 本次没有修改运行时代码，未运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- 审计期间曾运行 oversized code file 检查并观察到多个 >700 行文件；最终复核将相关测试巨文件从 P1 降级为 P2，因为未在最终复核中重新确认 hard check failure。
