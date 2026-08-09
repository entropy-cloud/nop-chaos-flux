# I2 对抗探查 Round 01 — 执行 session 探查记录

> 批次：Cycle 1 / I2（plan `2026-08-09-1826-3-i2-invariant-driven-audit.md` Phase 2）
> 执行者：执行 session（mission-driver 2026-08-09-182611）
> 方法：按 `docs/skills/open-ended-adversarial-review-prompt.md` 对 `engine/create-engine.ts` + `adapters/use-conversation.ts` 做「门禁未表达」路径探查；全部候选以临时 vitest 复现（`i2-probe-temp.test.ts`，已删除，工作区零残留）
> 复现基线：临时测试全部 RED（缺陷确认）；git 工作区恢复干净

## 探查覆盖

- 跨方法交错：abort + delete + switch + clearAll + createConversation 并发组合（storage 路径 loadMessages await 间隙）
- await 后状态读取/写入边界：switch promotion、delete fixup、bootstrap 落盘、rename 闭包读取
- storage 失败/时序注入：saveMessages vs deleteConversation 交错、loadConversations vs createConversation
- 流式/backpressure：chunk 累积、失败轮残留、abort 对 generator 的强制终结
- refactor 风险点：身份守卫模式的不对称（成功路径无守卫）、位移敏感逻辑重复（promotion/evict/bootstrap）

## 确认的 RED 复现（编号 = 族归属见 `cycle1-findings.md`）

| probe | 场景                                                    | 观测（RED）                                              | 族         |
| ----- | ------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| 1     | switch A→B 在途；await 间隙 delete B                    | activeConversationId='A' 但 activeEngine=B 的引擎        | N1         |
| 1b    | switch A→B 在途；await 间隙 clearAll                    | activeId=null 但 activeEngine 非空                       | N1         |
| 1c    | switch A→B 在途；await 间隙 create X                    | activeId=X 但 activeEngine 被 B 引擎覆盖                 | N1         |
| 2     | bootstrap loadConversations 在途；create X              | 列表被覆盖为 [A]，activeId 仍是 X（X 出列表）            | N2         |
| 3     | regenerate + connector-missing                          | 下一正常 turn 的 assistant 被戳 branchId='branch-1'      | N3         |
| 4     | plugin onTurnStart reject                               | requestState='processing'/isProcessing=true 永久卡死     | N4         |
| 6     | in-flight autoSave saveMessages 晚于 deleteConversation | storage 残留已删会话的消息（ghost）                      | K3         |
| A     | abort 于 onTurnStart await 期间；新 sendMessage         | 陈旧 turn 完成路径把新 turn 的 processing 写成 completed | K1         |
| B     | 同 id 快速二次 switch（storage）                        | 存储消息永不 hydrate（engine 0 条）                      | N1         |
| C     | storage 模式 delete active 会话                         | activeId=next 但 activeEngine=null                       | N1         |
| D     | connector 失败轮后再次 send                             | 空 assistant placeholder 进入下一请求历史                | N5         |
| E     | failing connector + plugin.onError throw                | onError 抛错跳过状态写入 → processing 卡死               | N4         |
| K4    | create+rename 同 tick                                   | saveConversation 只收到原名（rename 未持久化）           | K4/已知族② |

## 未复现 / watch-only 观察

- abort 对 signal-ignoring connector 无强制终结（loading ghost + controller 泄漏）——需永不 settle 的 generator，静态证据成立（K2）
- abort() 窗口期 processingState/abortController 陈旧 + 二次 abort clobber（W1）
- setMessageEditing 流式期间写入被 chunk 提交覆盖（W2，矩阵 uncovered 格）
- delete 的 `await removed.abort()` 在 try/catch 外（W3）
