# I2（Cycle 2）对抗探查 Round 02 — 独立 fresh-session 探查记录

> 批次：Cycle 2 / I2（plan `2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md` Phase 2）
> 执行者：独立子 agent（fresh session，round-02），不复用执行轮上下文；独立读码（create-engine.ts + use-conversation.ts + react-adapter + tool-execution + ai-chat 引擎绑定面）+ 独立临时复现
> 方法：按 `docs/skills/open-ended-adversarial-review-prompt.md`；聚焦 ⑥-⑩ 门禁未表达的失效路径（新交错组合 / refactor 盲区 / 跨方法组合状态）
> 去重背景：Cycle 1 K1-K4/N1-N5/W1-W4 与 round-01 probes A/B/C/C2/D/F/E 不重复报告；本轮发现的同族新成员均显式标注「新成员」
> 复现基线：全部候选以临时 vitest 复现（`src/adapters/__tests__/zz-round02-probe-temp.test.ts` + `src/engine/__tests__/zz-round02-probe-temp.test.ts`，7/7 RED，**已删除，工作区零残留**）

## 确认的 RED 复现（P1-P7，全部为既有不变式族的未表达成员）

| probe | 场景（文件:行）                                                                                                                                                                                                                                | 观测（RED）                                                                                                                                                  | 族 / 分类                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| P1    | 同 tick `renameConversation('A','T2')` + `clearAll()`；gated saveConversation 晚于 storage.clearAll resolve（`use-conversation.ts:422-424` rename save / `:444` clearAll 不同步写 `conversationsRef` / `:452-474` drain 只排 saveMessages 链） | rename 的 saveConversation 在 clear 之后落盘——storage 残留 `{A: title:'T2'}` 幽灵记录（remount 复生）                                                        | **K-K4/② 新成员**（probe D 兄弟：delete+rename → clearAll+rename；根因 = clearAll 缺 conversationsRef 同步写，K4/② 镜像写面） |
| P2    | 同 tick `createConversation(X)` + `clearAll()`；create 的 saveConversation（`:309-311` fire-and-forget）不在 pendingSaves 排空链（K3/§7.3 类别清扫只纳入 saveMessages）                                                                        | storage.clearAll 之后 X 的元数据落盘——storage 幽灵会话（remount 列表复生 X）                                                                                 | **K-K3/④ 新成员**（时序守卫族：saveConversation 元数据写不入排空链，门禁④/K3 未表达该成员）                                   |
| P3    | 失败轮空 placeholder 被 autoSave 持久化：runOnce catch commit `{content:'',loading:false}`（`create-engine.ts:484-486`）→ autoSave `isDone` 含 'error'（`use-conversation.ts:190`）→ `saveMessages` 落盘                                       | `savedMessages[A]` 含空 assistant 残留——⑩ 排除只作用于内存 buildContext（`:511`），残留经 storage 跨会话/跨 eviction-rehydrate 存活                          | **K-⑩ 新成员**（持久化臂：门禁⑩ 两成员只测内存历史排除）                                                                      |
| P4    | `regenerate` + connector-throw：截断旧 turn（`create-engine.ts:594-596`）→ runOnce catch commit 空残留                                                                                                                                         | 旧 assistant 内容被销毁 + 空 placeholder 残留入 messages（错误轮产物 = 原回答丢失 + 残留）                                                                   | **K-⑩ 新成员**（regenerate 臂：破坏性截断 × 失败轮残留叠加，数据丢失形态）                                                    |
| P5    | aborted turn 的 `onTurnEnd` rejection（`create-engine.ts:362-364` finally `await`）：abort → 流结算 → finally onTurnEnd reject                                                                                                                 | 状态正确落 'aborted' 但 host-facing `sendMessage` promise **reject**（`void engine.sendMessage()` 场景 = unhandled rejection）                               | **K-⑨ 新成员**（abort 变体：门禁⑨ 成员 3 只覆盖「遮蔽原错误」非 abort 面）                                                    |
| P6    | 零 chunk connector：`firstChunkReceived=false` → `loading=false` commit（`:456-458`）→ requestState='completed'                                                                                                                                | 完成轮也产出空 assistant 残留，下一请求历史携带 `{role:'assistant', content:''}`（⑩ 陈述只覆盖 failed/aborted 轮）                                           | **K-⑩ 新成员**（退化成功臂：非失败轮的空响应同样污染）                                                                        |
| P7    | mount bootstrap 选中 `convs[0]` 为 active（`use-conversation.ts:242-246`）但不 build/promote 引擎                                                                                                                                              | `activeConversationId='A'` 而 `activeEngine=null` → ai-chat `engine-null-switch`（`ai-chat.tsx:343-352`）渲染空态——默认会话的存储消息不可见，直到手动 switch | **K-⑥ 新成员**（mount-bootstrap 臂：注册成员「delete active → build-on-demand」的镜像形态「select active → 无引擎」）         |

## 观察（非 RED，watch-only 候选）

| #   | 观察（文件:行）                                                                                                                                  | 证据                                          | 分类                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| W1  | connector-missing 早退（`create-engine.ts:210-229`）不触发 onTurnStart（`:246-249`）也不触发 onTurnEnd（`:362-364`）——onError 无配对的 start/end | 静态                                          | W-⑨ 相邻（plugin 生命周期不对称；插件计数/日志类 hook 失步） |
| W2  | P7 的伴生契约面：bootstrap-active 会话的 chat 面回退自建引擎不在 hook engineCache → 不挂 autoSave → 默认会话消息在首次 switch 前不持久化         | 静态（documented "null before first switch"） | W（设计面，随 P7 裁决评估）                                  |
| W3  | `clear()`/`setMessages()` 不重置 `lastError`（`:146-158`/`:564-569`）——reset 后 stale 错误在下一 turn 启动（`:241` 清除）前可见                  | 静态                                          | W（低严重度 UI 残留）                                        |

## 排除 / 复核结论（记录以免重复探查）

- **⑧ 面新增泄漏路径：无**——regenerate 设戳后同步进入 runTurn（无 await 窗口）；runOnce 首语句即消费戳（`:397`）；`clear()`/`setMessages()` 只能见到「已注册泄漏」态的戳（纯防御面，非独立缺陷）；runTurn 全部提前返回复核 = 仅 connector-missing（注册面，零新成员）
- **⑥ × ⑦ 交错：被注册成员覆盖**——bootstrap resolve × create = ⑦ 成员 1（probe-2 同型）；bootstrap resolve × create × switch = switch 只能命中 cache（created 会话）无 gated await → 无新交错面；bootstrap resolve × clearAll = round-01 probe F
- **⑨ × abort：onBeforeRequest 变体** = round-01 probe B 同型（rejection → loading 幽灵），不重复；onAfterRequest rejection 落入 runOnce catch → 状态落 `requestState/lastError`（⑨ 陈述满足，round-01 已排除）
- **kind-channel 错位**（connector-missing 在 `mutate('requestState')` 下 push messages）：`useEngineView` 走 full 订阅 → React 面不受影响；ai-bubble 的 'messages' 订阅者仍会经 requestState 通知收到最新快照 → 无可见缺陷（排除）
- **executeToolCalls 仅 abort 返回 false**（tool-execution.ts:42）→ runTurn `!shouldContinue` 早退无状态写入缺口（abort() 已同步置 'aborted'）
- **streaming backpressure / tool-execution 并发**：维持 Cycle 1 §5 登记（未触及新违背面）

## 盲区自评

- StrictMode 双 effect（mount bootstrap / mirror 同步）未系统探查（cycle1 round-02 同盲区）
- `use-message.ts` / `react-adapter` / renderers（除 ai-chat engine-null-switch 静态确认外）不在本轮 scope（对齐 cycle1 先例）
- P1/P2 依赖 gated（异步）storage 才可确定性复现；localStorage（同步）类 host 无此窗口，IndexedDB/服务端（异步）host 真实可达——严重度随 storage 实现而异
- P5 依赖「可 settle 的 gated generator + onTurnEnd 拒绝」组合，实际 connector 多为 fetch-stream，命中面需 onTurnEnd 插件真实抛错
- 未对 `clearAll` 与 in-flight `switchConversation` 的「bump 缺失」叠加（⑥ 注册红 3 处）做新的行为组合复现——注册面已表达，补门禁属 I3/I4 裁决
