# I2 对抗探查 Round 02 — 独立 fresh-session 探查记录

> 批次：Cycle 1 / I2（plan `2026-08-09-1826-3-i2-invariant-driven-audit.md` Phase 2）
> 执行者：独立子 agent（fresh session，task `ses_019a8dbaeffeCjg3XMH7KqCUR2`），不复用执行者上下文
> 方法：按 `open-ended-adversarial-review-prompt.md`；独立读码 + 独立临时复现（`i2-probe-independent-temp.test.ts`，已删除）
> 去重背景：已知 F-1..F-4（执行者已确认族）不重复报告

## 独立发现（executor 已复核）

| #   | 发现（文件:行）                                                                                                                                                                                                 | 结论                                                                         | 复现 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| 1   | runTurn 成功路径完成 mutate（`create-engine.ts:318-323`）只判 `requestState==='aborted'`，无 controller 身份守卫 → abort 于 onTurnStart await 间隙 + 新 send → 陈旧 turn 把新 turn 的 processing 写成 completed | **确认 RED（probe-A）** → K1 已知族③门禁漏覆盖                               | ✅   |
| 2   | `plugin.onError` 在状态写入 mutate 之前调用（`:326-328`/`:463-465`），onError 抛错 → mutate 被跳过 → processing 永久卡死；finally 清 controller 后 abort() 变 no-op                                             | **确认 RED（probe-E）** → N4 新族（plugin 候选族触发）                       | ✅   |
| 3   | 同 id 快速二次 switch：v1 建引擎 + await loadMessages；v2 命中缓存路径跳过 hydrate；v1 迟到结果被 version guard 丢弃 → 存储消息永不应用；下轮 autoSave 覆盖存储 → 数据丢失                                      | **确认 RED（probe-B）** → N1 新族                                            | ✅   |
| 4   | storage 模式 delete active 会话：`engineCache.get(next.id)` 为 null → `setActiveEngine(null)`，chat 面回退自建空引擎 → 下一会话显示空                                                                           | **确认 RED（probe-C）** → N1 新族                                            | ✅   |
| 5   | 失败轮空 assistant placeholder（`loading=false, content=''`）留在 messages；buildContext 只排除 `loading===true` → 空消息进下一请求（严格后端拒绝空块）                                                         | **确认 RED（probe-D）** → N5 新族                                            | ✅   |
| 6   | autoSave saveMessages fire-and-forget vs delete/clearAll 时序 → ghost 重落盘；clearAll abort 循环先于 detachEngine 触发 autoSave                                                                                | **确认 RED（probe-6）** → K3 已知族（P1-b ghost 兄弟路径）                   | ✅   |
| 7   | abort() 不重置 processingState/abortController；窗口期二次 abort clobber clear/idle 状态                                                                                                                        | 静态证据成立，未独立复现 → W1 watch-only                                     | —    |
| 8   | abort 于 onTurnStart 期间留下未回答 user 消息进后续历史                                                                                                                                                         | K1 的伴生后果 → W4 watch-only                                                | —    |
| 9   | 同 tick create+rename / create+switch：rename 读闭包 `conversations`（`:377`）→ saveConversation 永不调用；switch `exists` 检查（`:294`）→ 静默 no-op                                                           | **K4 确认 RED（probe-K4）**；switch 部分未复现 → K4 已知族②扩展 + watch-only | ✅   |
| 10  | chunk 循环每迭代不检查 signal（`:417-429`）；signal-ignoring connector 持续增长已 abort turn 的消息；never-ending generator → loading=true 永久；无 generator.return()                                          | 静态证据成立 → K2 已知族⑤门禁漏覆盖                                          | —    |
| 11  | onTurnEnd rejection 无路由（`:350-352`）：拒绝 sendMessage promise，无 onError/lastError，遮蔽原错误                                                                                                            | 静态证据成立 → N4 新族 member                                                | —    |

## 独立 session 盲区自评

- #7/#10 依赖永不 settle 的 generator / 异步 storage，未确定性脚本化
- StrictMode 双 effect（mount bootstrap / onStorageErrorRef）未探查
- renderers（ai-chat 等）与 ai-component-handle 不在本轮 scope
- pendingBranchId 泄漏经 regenerate+isProcessing 早退路径不可达（guard 与 runTurn 守卫同同步块，无交错点）——已排除
