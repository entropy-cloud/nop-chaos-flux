# 维度 19: 错误传播保真度

## 深挖轮次

- 第 1 轮: submitForm catch replacement, timeout retry count, code editor resolver error replacement。
- 第 2 轮: compileTemplate `[error]`, onSettled failure, compile continueOnError unknown renderer。
- 第 3 轮: onSettled result failure, formula data source refresh candidate。
- 第 4 轮: reaction action failure, parallel aggregate error。
- 第 5 轮: async validation action `ok:false` swallowed。

## 维度复核结论

| 条目                                            | 结论 | 严重程度 | 证据/说明                                                                                          |
| ----------------------------------------------- | ---- | -------- | -------------------------------------------------------------------------------------------------- |
| submitForm catch replaces registry error        | 保留 | P2       | `action-adapter.ts` catches `componentRegistry.resolve` and returns `Form not found` without cause |
| timeout result stops retry/failureCount         | 降级 | P3       | policy/semantic dispute; tests encode current behavior                                             |
| code editor resolver replaces original Error    | 保留 | P3       | keeps message only, loses cause/stack/custom fields                                                |
| compileTemplate returns `[error]` success       | 保留 | P2       | template segment eval failure returns literal string after monitor report                          |
| onSettled throw/result failure swallowed        | 保留 | P2       | `dispatch(onSettled)` result ignored; thrown error only attached as `settledError`                 |
| compile continueOnError unknown renderer throws | 保留 | P2       | `compile()` still throws unknown renderer despite diagnostics continueOnError                      |
| formula data source refresh state failure       | 驳回 | -        | refresh failure state handling exists in live path                                                 |
| reaction action `ok:false` misreported success  | 保留 | P1       | `reaction-runtime.ts` checks cancelled only; `ok:false` still settles succeeded                    |
| parallel aggregate error missing                | 保留 | P2       | aggregate has `ok:false/results` but no representative `error`                                     |
| async validation action `ok:false` swallowed    | 保留 | P1       | `runtime-action-helpers.ts` checks data.valid/cancelled but not `ok:false`                         |

## 子项复核

Error-propagation batch confirmed reaction `ok:false`, async validation `ok:false`, onSettled result ignore, parallel aggregate missing error, and compileTemplate `[error]` all成立。

## 最终保留项

- P1: propagate `ActionResult.ok === false` consistently in reaction and async validation helper。
- P2: onSettled/parallel/compileTemplate/compile diagnostics error fidelity。
