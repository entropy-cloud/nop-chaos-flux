# AI Engine 不变式门禁清单（Gates Registry）

> Status: active（Cycle 1 / I1 产出 + I4 扩展 + Cycle 2 / I1 追加 ⑥-⑩，棘轮单调追加登记处）
> Last Updated: 2026-08-09
> Source: `docs/audits/ai-invariants/invariant-catalog.md`（I0 不变式目录 + I4 §7 扩展 + Cycle 2 §9）+ plan `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md` + plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（②③④⑤ 补强）+ plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`（⑥-⑩ 第二批门禁）
> 下游消费: I2（门禁运行审计）、I5（全量验证）、Loop Rule（新族派生 → 追加新门禁到此）

## 门禁清单

| 不变式                                                              | 覆盖方法                                                                                                                                                                                                                                | 检测方式                                                                                                                        | 运行命令                                                                                                                                                       | 棘轮状态                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ① 异步变更入口 `isProcessing` 守卫                                  | `sendMessage`/`send`/`regenerate`（异步）+ `clear`/`setMessages`（同步 in-flight）                                                                                                                                                      | 参数化穷举测试（方法表驱动）                                                                                                    | `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts`                                                    | 基线绿（536 tests 含不变式套件）                                       |
| ② await 后状态读取用 `activeIdRef`/`conversationsRef`（非闭包捕获） | `switchConversation`/`deleteConversation`（adapter 异步方法）+ **变更方法 sync 读取（I4/K4：create/rename/delete/clearAll 全方法，首语句豁免）**                                                                                        | 参数化测试 + 静态扫描器（`scanPostAwaitClosureReads` + `scanAdapterSyncClosureReads`）                                          | 同上 + `pnpm check:ai-engine-invariants`                                                                                                                       | 基线零命中                                                             |
| ③ catch/finally controller 身份守卫                                 | `runTurn`/`runOnce` 的 catch/finally + **成功路径完成 mutate（I4/K1：`requestState='completed'` recipe）**                                                                                                                              | 参数化测试（abort→send race）+ 静态扫描器（`scanControllerIdentityGuard` + `scanCompletionIdentityGuard`）                      | 同上 + `pnpm check:ai-engine-invariants`                                                                                                                       | 基线零命中                                                             |
| ④ storage 变更经 `reportStorageError`                               | `createConversation`/`renameConversation`/`deleteConversation`/`clearAll`（adapter storage 调用）+ **save-after-delete/clearAll 时序守卫（I4/K3：排空→删除顺序）**                                                                      | 参数化测试（mock rejection → onStorageError；**时序守卫 = 运行时参数化测试，扫描器不扩展**）                                    | 同上 + `pnpm check:ai-engine-invariants`                                                                                                                       | 基线零命中                                                             |
| ⑤ abort 路径清理 controller                                         | `abort()`（同步复位）+ `deleteConversation`/`clearAll`（adapter in-flight engine abort）+ **abort 强制终结在途 generator（I4/K2：`activeGenerator` + 每迭代 abort 检查，纯行为不静态化）**                                              | 参数化测试（含 signal-ignoring 有限 yield connector）                                                                           | 同上                                                                                                                                                           | 基线绿                                                                 |
| ⑥ active 位移完整性（N1）                                           | `createConversation`/`deleteConversation`/`clearAll`（位移面，全部必须 bump `switchVersionRef`）+ `switchConversation`（post-await 提升/复水以 ref/version 裁决 + 同 id 重 switch hydration 不丢弃 + delete active 后 build-on-demand） | 参数化测试（`it.fails` × 5，`conversation-invariants-cycle2.test.ts`）+ 静态扫描器（`scanDisplacementVersionBumps`）            | `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/adapters/__tests__/conversation-invariants-cycle2.test.ts` + `pnpm check:ai-engine-invariants` | **预期红（注册 3：create/delete/clearAll，待 Cycle 2 / I4 修复清零）** |
| ⑦ storage bootstrap 列表合并（N2）                                  | mount bootstrap（`use-conversation.ts` `loadConversations` post-await `setConversations`）                                                                                                                                              | 参数化测试（`it.fails` × 2，`conversation-invariants-cycle2.test.ts`）；**不静态化**（functional updater 为行为面，静态误报高） | `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/adapters/__tests__/conversation-invariants-cycle2.test.ts`                                     | **预期红（待 Cycle 2 / I4）**                                          |
| ⑧ branch 戳消费/清除（N3）                                          | `runTurn` 提前返回路径（`pendingBranchId` 不得泄漏）；`runOnce` 消费面                                                                                                                                                                  | 参数化测试（`it.fails` × 1 + 消费控制 1）+ 静态扫描器（`scanBranchStampReset`）                                                 | 同上 + `pnpm check:ai-engine-invariants`                                                                                                                       | **预期红（注册 1：connector-missing 早退，待 Cycle 2 / I4 清零）**     |
| ⑨ plugin 错误隔离（N4）                                             | `runTurn`/`runOnce` 的 plugin hook 调用面（onTurnStart/onError/onTurnEnd）                                                                                                                                                              | 参数化测试（`it.fails` × 3）；**不静态化**（plugin 回调交错为行为面，静态误报高）                                               | `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts`                                                    | **预期红（待 Cycle 2 / I4）**                                          |
| ⑩ 失败轮产物清理（N5）                                              | `runOnce` catch（失败 placeholder 提交面）+ `buildContext`（请求历史排除面）                                                                                                                                                            | 参数化测试（`it.fails` × 1 + 正常轮控制 1）；**不静态化**（buildContext 排除谓词为行为面，静态误报高）                          | 同上                                                                                                                                                           | **预期红（待 Cycle 2 / I4）**                                          |

## 表完备性门禁

| 断言面                              | 机制                                                                                         | 运行位置                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| engine 公共成员集 ⊆ 测试表 ∪ 白名单 | `Object.keys(createMessageEngine())` 运行时枚举                                              | `engine-invariants.test.ts` Table completeness gate       |
| adapter 公共成员集 ⊆ 测试表         | `renderHook(useConversation)` 返回值函数字段                                                 | `conversation-invariants.test.ts` Table completeness gate |
| 白名单                              | `getState`/`subscribe`/`setConnector`/`registerPlugin`/`getMessages`（非变更，不写会话状态） | 同上                                                      |
| `runTurn` 不入表                    | 内部管道，非 `MessageEngine` 公共成员（I0 §4.2 裁定）                                        | 同上                                                      |

**新增/重命名公共变更方法 → 运行时枚举发现新键但不在表/白名单 → 测试红。** 这是「治反应式盲区」的核心机制——不再依赖人工记住把新方法加入测试。

## 静态扫描器

| 命令                              | 覆盖不变式          | 扫描目标                                                                                      |
| --------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm check:ai-engine-invariants` | ②③④⑥⑧（静态可检测） | `packages/flux-renderers-ai/src/engine/create-engine.ts` + `src/adapters/use-conversation.ts` |

- 纯行为不变式（①⑤ + I4 K2 强制终结 + I4 K3 时序守卫 + **⑦⑨⑩（Cycle 2：functional merge / plugin 回调交错 / buildContext 排除谓词均为行为面）**）不静态化（误报率高，运行时参数化测试已穷举覆盖；K3 时序守卫静态误报理由记录于 invariant-catalog §7.3；⑦⑨⑩ 理由记录于 invariant-catalog §9）。
- **Cycle 2 注册红（⑧ 静态可行性已验证）**：`scanBranchStampReset` 静态化成立——`pendingBranchId`/`runTurn`/`runOnce` 同属 `createMessageEngine` 闭包作用域（create-engine.ts），同函数扫描 sound；豁免面 = `isProcessing` 入口早退（设戳路径不可达：regenerate 设戳前自有 isProcessing 守卫 + runTurn 在设戳后同步调用），connector-missing 早退（`create-engine.ts:210-229`）为扫描目标。
- committed 回归：`scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（9 用例：清洁 fixture（含 K1 守卫 + K4 豁免 + ⑥ bump + ⑧ 清除样例）exit 0 + ④/③/③-K1/②/②-K4/**⑥/⑧** 违规 fixture 各 exit 1 + **⑧ 清洁 fixture** exit 0）。
- `FLUX_AUDIT_SCAN_ROOT` env 覆盖扫描根（对齐 `find-event-dispatch-without-ctx.mjs` 先例）。

## 注册红（本 plan 显式登记，非 CI 新增）

> Cycle 2 / I1 沉淀 ⑥-⑩ 门禁时，live 代码仍违反 ⑥⑧（N1-N5 全部已复现 RED）——静态扫描器对 live 的预期命中在此显式注册。`pnpm check` 口径 = 零**未注册**新增命中；Cycle 2 / I4 修复后清零。

| 规则                                | 注册命中（live 行号）                                                                                | 状态                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------- |
| `scanDisplacementVersionBumps`（⑥） | 3：`use-conversation.ts:280`（createConversation）/ `:370`（deleteConversation）/ `:427`（clearAll） | 预期红（待 Cycle 2 / I4） |
| `scanBranchStampReset`（⑧）         | 1：`create-engine.ts:228`（connector-missing 早退）                                                  | 预期红（待 Cycle 2 / I4） |

## 棘轮规则

- 门禁**只增不减**：弱化或移除任一门禁需人工确认（在 plan 中记录裁决理由）。
- 新不变式族由 Loop Rule 派生（I2 审计发现新族 → Cycle 2 / I1 追加新门禁到此）。
- 表完备性门禁白名单的新增同样需裁决（在 catalog §4 记录理由）。
