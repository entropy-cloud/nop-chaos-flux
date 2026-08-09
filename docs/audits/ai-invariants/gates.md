# AI Engine 不变式门禁清单（Gates Registry）

> Status: active（Cycle 1 / I1 产出，棘轮单调追加登记处）
> Last Updated: 2026-08-09
> Source: `docs/audits/ai-invariants/invariant-catalog.md`（I0 不变式目录）+ plan `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md`
> 下游消费: I2（门禁运行审计）、Loop Rule（新族派生 → 追加新门禁到此）

## 门禁清单

| 不变式                                                              | 覆盖方法                                                                                          | 检测方式                                                  | 运行命令                                                                                                    | 棘轮状态                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| ① 异步变更入口 `isProcessing` 守卫                                  | `sendMessage`/`send`/`regenerate`（异步）+ `clear`/`setMessages`（同步 in-flight）                | 参数化穷举测试（方法表驱动）                              | `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts` | 基线绿（536 tests 含不变式套件） |
| ② await 后状态读取用 `activeIdRef`/`conversationsRef`（非闭包捕获） | `switchConversation`/`deleteConversation`（adapter 异步方法）                                     | 参数化测试 + 静态扫描器                                   | 同上 + `pnpm check:ai-engine-invariants`                                                                    | 基线零命中                       |
| ③ catch/finally controller 身份守卫                                 | `runTurn`/`runOnce` 的 catch/finally                                                              | 参数化测试（abort→send race）+ 静态扫描器                 | 同上 + `pnpm check:ai-engine-invariants`                                                                    | 基线零命中                       |
| ④ storage 变更经 `reportStorageError`                               | `createConversation`/`renameConversation`/`deleteConversation`/`clearAll`（adapter storage 调用） | 参数化测试（mock rejection → onStorageError）+ 静态扫描器 | 同上 + `pnpm check:ai-engine-invariants`                                                                    | 基线零命中                       |
| ⑤ abort 路径清理 controller                                         | `abort()`（同步复位）+ `deleteConversation`/`clearAll`（adapter in-flight engine abort）          | 参数化测试                                                | 同上                                                                                                        | 基线绿                           |

## 表完备性门禁

| 断言面                              | 机制                                                                                         | 运行位置                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| engine 公共成员集 ⊆ 测试表 ∪ 白名单 | `Object.keys(createMessageEngine())` 运行时枚举                                              | `engine-invariants.test.ts` Table completeness gate       |
| adapter 公共成员集 ⊆ 测试表         | `renderHook(useConversation)` 返回值函数字段                                                 | `conversation-invariants.test.ts` Table completeness gate |
| 白名单                              | `getState`/`subscribe`/`setConnector`/`registerPlugin`/`getMessages`（非变更，不写会话状态） | 同上                                                      |
| `runTurn` 不入表                    | 内部管道，非 `MessageEngine` 公共成员（I0 §4.2 裁定）                                        | 同上                                                      |

**新增/重命名公共变更方法 → 运行时枚举发现新键但不在表/白名单 → 测试红。** 这是「治反应式盲区」的核心机制——不再依赖人工记住把新方法加入测试。

## 静态扫描器

| 命令                              | 覆盖不变式        | 扫描目标                                                                                      |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `pnpm check:ai-engine-invariants` | ②③④（静态可检测） | `packages/flux-renderers-ai/src/engine/create-engine.ts` + `src/adapters/use-conversation.ts` |

- 纯行为不变式（①⑤）不静态化（误报率高，运行时参数化测试已穷举覆盖）。
- committed 回归：`scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（4 用例：清洁 fixture exit 0 + ④/③/② 违规 fixture 各 exit 1）。
- `FLUX_AUDIT_SCAN_ROOT` env 覆盖扫描根（对齐 `find-event-dispatch-without-ctx.mjs` 先例）。

## 棘轮规则

- 门禁**只增不减**：弱化或移除任一门禁需人工确认（在 plan 中记录裁决理由）。
- 新不变式族由 Loop Rule 派生（I2 审计发现新族 → Cycle 2 / I1 追加新门禁到此）。
- 表完备性门禁白名单的新增同样需裁决（在 catalog §4 记录理由）。
