# I2（Cycle 2）对抗探查 Round 01 — 执行 session 探查记录

> 批次：Cycle 2 / I2（plan `2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md` Phase 2）
> 执行者：执行 session（mission-driver 2026-08-09-182611）
> 方法：按 `docs/skills/open-ended-adversarial-review-prompt.md` 对 `engine/create-engine.ts` + `adapters/use-conversation.ts` 做「⑥-⑩ 门禁未表达」路径探查；全部候选以临时 vitest 复现（`cycle2-i2-probe-temp.test.ts` + `zz-mirror-probe.test.ts`，均已删除，工作区零残留）
> 复现基线：临时测试全部 RED（缺陷确认）；git 工作区恢复干净（仅 docs 变更）

## 探查覆盖（聚焦 plan 三盲区）

1. **门禁表达面之外的新交错组合**：⑩ abort-before-first-chunk 残留 × 下一请求历史；⑨ plugin hook（onBeforeRequest / onAfterRequest）× abort/error 交错；⑦ bootstrap × clearAll 交错；⑥ 同 tick 位移组合（clearAll+create+delete / delete+switch）
2. **refactor / 新早退路径**：runTurn 全部提前返回路径逐一复核（isProcessing / connector-missing / tool-no-executor / executeToolCalls-abort / tool-loop-max）——branch 戳消费面：`runOnce` 首条语句即消费戳（`create-engine.ts:397`，早于 `await connector.stream`），connector-missing 早退为唯一设戳路径可达的泄漏面（**与 Cycle 2 / I1 注册红一致，无新泄漏路径**）；`onBeforeRequest`（`create-engine.ts:407-410`）在 try 之外为新增复查面
3. **跨方法组合状态**：⑩ 残留 × ⑥ 位移（clearAll+create+delete 幽灵 activeId）；K4 镜像写面 × storage 删除（delete+rename 同 tick 幽灵重存）

## 确认的 RED 复现（编号 = 族归属见 `cycle2-findings.md`）

| probe | 场景                                                                                  | 观测（RED）                                                                                                                     | 族                             |
| ----- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| A     | `sendMessage` 后首 chunk 到达前 `abort()`；释放 gate 让 generator 产出迟到 chunk      | 迟到 chunk 被抑制（K2 生效）但**空 placeholder 以 `loading=false` commit**；下一轮请求历史携带 `{role:'assistant', content:''}` | K-⑩（abort 成员）              |
| B     | plugin `onBeforeRequest` reject（`create-engine.ts:407-410`，try 外）                 | requestState='error' 但 placeholder 以 `loading=true` 永不 commit——消息列表永久 loading 幽灵（UI ghost）                        | K-⑩（hook 拒绝路径，⑨ 相邻）   |
| C     | 同 tick `clearAll()` + `createConversation(X)` + `deleteConversation(X)`（单 act 内） | `activeConversationId='A'`（幽灵——列表为空、A 已被 clearAll 清除）、`activeEngine=null`                                         | K-⑥（同 tick 位移 + 镜像写面） |
| C2    | 同 tick `deleteConversation(X)` + `switchConversation(X)`                             | switch 走闭包 exists 检查（读到已删 X）→ 重建引擎 + 提升——`activeConversationId=X` 但列表已无 X（dangling）                     | K-⑥（同 tick 位移组合成员）    |
| D     | 同 tick `deleteConversation(X)` + `renameConversation(X,'T2')`                        | rename 从 `conversationsRef`（delete 未同步写镜像）找到 X → `saveConversation(X)` 重存——storage 幽灵重创建                      | K-K4/②（镜像写面）             |
| F     | `loadConversations` 在途时 `clearAll()`；随后释放 bootstrap gate                      | bootstrap 迟到 resolve 整体覆盖 `setConversations(convs)`——已清列表复活（[A,B] 回列表，activeId=A）                             | K-⑦（clearAll 成员）           |

## 观察（非 RED，watch-only 候选）

| #   | 观察                                                                                                                                                           | 复现/静态  | 分类               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ |
| E   | `onAfterRequest`（`create-engine.ts:466-468`）对 abort-before-first-chunk 轮仍触发，回调收到空 assistant（`content:''`）——aborted 轮被当作「请求完成」通知插件 | 脚本化记录 | W-⑨ 相邻 hook 语义 |

## 未复现 / 排除（记录以免重复探查）

- **⑧ branch 戳 × ⑥ hydration 交错**：戳在 `runOnce` 同步段消费（早于任何 await），与 adapter hydration 无同 tick 交叠面；runTurn 全部提前返回路径复核 = 仅 connector-missing 泄漏（注册面，无新成员）
- **clearAll+create+delete 跨 act（渲染 flush 后）**：mirror 经无依赖 effect 重同步为最新状态 → 一致（无幽灵）——幽灵仅存在于**同 tick** 窗口（即 probe C 形态）
- **⑨ onAfterRequest rejection**：落入 runOnce catch → `requestState='error'` + `lastError`（⑨ 陈述「所有错误落在 requestState/lastError」已满足），无状态卡死——不构成违背
- **tool-no-executor / tool-loop-max / executeToolCalls-abort 早退**：均在 runOnce 消费戳之后，无 ⑧ 面；状态写入先于 `plugin.onError`（⑨ 面满足）
- **streaming backpressure / tool-execution 并发**：维持 Cycle 1 §5 登记（本轮未触及新违背面）

## 盲区自评

- StrictMode 双 effect（mount bootstrap / mirror 同步）未系统探查（cycle1 round-02 同盲区）
- `react-adapter` / `use-message.ts` / renderers 面不在本轮 scope（对齐 cycle1 先例）
- 同 tick 组合依赖 host 调用序（delete+switch / delete+rename 为病态序），真实触发面待 I3 裁决评估
