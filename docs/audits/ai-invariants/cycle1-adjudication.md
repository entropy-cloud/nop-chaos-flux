# Cycle 1 / I3 — 发现裁决与工作项拟制（Cycle 1 Adjudication）

> Status: active（Cycle 1 / I3 产出，供 I4 修复开工与 I6 收口引用；零悬挂）
> Last Updated: 2026-08-09
> Source: `docs/audits/ai-invariants/cycle1-findings.md`（I2 产出，唯一裁决输入）+ `docs/backlog/ai-invariant-loop-roadmap.md`（I3 + Loop Rule）
> Produced By: plan `docs/plans/2026-08-09-2007-1-cycle1-i3-adjudication.md`（纯文档计划）
> 先例: `docs/audits/cr-inventory-adjudication.md`（分类 + 来源 file:line + 一句理由，零未分类）、`docs/audits/round2-dr-adjudication.md`（P2 路由登记表格式）、round-2 裁决表（roadmap I3 明示「对齐 checklist v2 裁决表」）
> 下游消费: I4（K1-K4 修复 + 门禁补强，plan `2026-08-09-2007-2`）、I6（新族 → Cycle 2 / I1 回写，Loop Rule）、Cycle 2+（watch-only 复触发核对）

## 1. 判级标准（对齐 checklist v2）

依据 `docs/audits/component-audit-checklist.md:56-59`：

| 级别 | 定义（原文摘录）                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------- |
| P0   | 数据丢失/错误提交/崩溃/安全漏洞（XSS、任意 URL）/存储损坏/违反 CI 或硬性架构红线（含 INV-1 env IO 边界） |
| P1   | 契约漂移（DOM/marker/schema/事件 shape）、交互缺陷、a11y 阻断、错误行为                                  |
| P2   | 体验/文档/测试加固、非阻断 a11y/i18n、性能优化                                                           |
| P3   | 风格 nit、注释、可选优化                                                                                 |

处理路径（checklist §3）：P0/P1 = 自动修复（本 Cycle I4，test-first）；P2 = 低成本当场修复否则入 backlog；P3 = 审计卡记录。本 plan 的 P2/P3 入本图 Follow-up Backlog。

## 2. 计数汇总

| 分类                      | 条目数 | 说明                                                         |
| ------------------------- | ------ | ------------------------------------------------------------ |
| K1-K4（已知族 → I4）      | 4      | ③/⑤/④/② 门禁漏覆盖；P1 ×2 + P0 ×2（诚实判级，见 §3）         |
| N1-N5（新族 → Cycle 2）   | 5      | 全部按 Loop Rule 预授权路由 Cycle 2 / I1（非延期裁定）       |
| W1-W4（watch-only）       | 4      | 维持登记，复触发条件引用 findings §4                         |
| **合计**                  | **13** | findings §3.1(4) + §3.2(5) + §4(4)，逐条一一对应，零悬挂     |
| §5 未触发候选族（不裁决） | 2      | streaming backpressure / tool-execution 并发——按设计保持登记 |

## 3. 逐条裁决表（findings ↔ 裁决，一一对应）

### K1-K4 — 已知族（门禁漏覆盖）→ 路由 **I4**（plan `2026-08-09-2007-2-cycle1-i4-fix-execution.md`）

| ID  | 优先级 | 族归属                                                | 来源（findings §3.1 证据）                                                                                                                                                         | 门禁补强要求（I4 输入契约）                                                                                           | 理由（checklist 依据）                                                                                                                                                                                                                                                                             |
| --- | ------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | **P1** | ③ controller 身份守卫族（成功路径完成 mutate 漏守卫） | `create-engine.ts:318-323`（完成 mutate 仅判 `draft.requestState === 'aborted'` 字符串，无身份守卫）+ `:240-242`（onTurnStart 于 try 外）；probe-A RED                             | ③ 门禁扩展至**成功路径完成 mutate**（参数化测试 + 扫描器规则）                                                        | 交互缺陷/错误行为：abort→send 竞态使新 turn 状态被陈旧 turn 完成写入 clobber（isProcessing=false 而 turn 在流式、第三次 send 越过守卫 → 双 turn 并发写 messages），属 1757 P1 同型路径复活；无持久化面（内存态错位，probe-A 复现）→ P1（对齐 1757 先例）                                           |
| K2  | **P1** | ⑤ abort 清理族（终止责任未显式归属的未尽面）          | `create-engine.ts:417-429`（chunk 循环无 per-iteration signal 检查）+ `:509-519`（abort 只 `controller.abort()`，不持 generator 句柄）                                             | ⑤ 门禁扩展：**abort 强制终结在途 generator + per-iteration 检查**（与 I4 plan Phase 2 一致，不开放「新增 ⑤b」二选一） | 交互缺陷/错误行为：signal-ignoring connector 迟到 chunk 仍被提交、永不 settle 的 generator 使 catch/finally 永不执行 → placeholder `loading=true` 永久 + abortController 残留，破坏 host 侧「aborted 即终态」契约（F1.6 前提）→ P1                                                                 |
| K3  | **P0** | storage 幽灵族（P1-b 兄弟路径）                       | `use-conversation.ts:183-196`（attachAutoSave fire-and-forget saveMessages）vs `:348-372/:390-423`（storage 删除时序）；`:394-398` abort 循环先于 `:399` detachEngine；probe-6 RED | ④ 门禁扩展：**delete/clearAll 前排空在途 save（时序守卫）**                                                           | **P0（诚实判级）**：已删会话消息在 storage delete 之后被 in-flight save 重新落盘 → 持久化数据幽灵（remount 后 orphan ghost 复现），命中 checklist P0「数据丢失/损坏 / 存储损坏」判据（P1-b 只修了 clearAll 缺 delete 路径，本发现是同族逆序漏网，静默重写存储）→ P0；路由不受影响（P0/P1 均进 I4） |
| K4  | **P0** | ② stale-closure 族（同步变体门禁 scope 缺口）         | `use-conversation.ts:374-388`（`renameConversation` :377 读 render 闭包 `conversations`）；probe-K4 RED                                                                            | ② 门禁扩展至 **adapter 变更方法的 sync 闭包读取**                                                                     | **P0（诚实判级）**：同 tick create+rename 时 `updated` undefined → saveConversation 永不调用 → rename 静默不持久化（内存列表已改，刷新后丢失），命中 checklist P0「数据丢失」判据（持久化静默丢失）；② 门禁现仅约束 await 后读取，sync 闭包读取在 scope 外 → P0；路由不受影响（P0/P1 均进 I4）     |

### N1-N5 — 新族 → 路由 **Cycle 2 / I1**（Loop Rule 预授权派生，非延期裁定）

> 打包说明：每条含触发证据引用（findings §3.2 `文件:行` + 不变式陈述），供 I6 回写 roadmap 时直接引用，**不重复造数据**。N3/N4 为 I0 §3 登记候选族（branching/fork、plugin 生命周期）的正式触发。

| ID  | 新族名称                                                  | 触发证据引用（findings §3.2）                                                                                                                                                                                                                             | 不变式陈述（I6 派生 Cycle 2 / I1 直接引用）                                                                                                                                                                                                                                                                                                                     | 派生路径                                        |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| N1  | active 提升/复水位移完整性（未登记新族）                  | `use-conversation.ts:293-346`（switch post-await promotion `:325` 无位移校验 + hydration `:315` 被 version guard 丢弃）/ `:348-372`（delete 不 bump switchVersionRef）/ `:390-423`（clearAll 不 bump）/ `:263-291`（create 不 bump）；5 成员 probe 全 RED | adapter 的 post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）必须以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；位移方法（delete/clearAll/create）必须 bump `switchVersionRef` 使在途 switch 失效；删除 active 后 next 引擎 build-on-demand（禁 `setActiveEngine(null)` 悬挂）；同 id 快速重 switch hydration 不得被整体丢弃 | Loop Rule → Cycle 2 / I1（I6 回写）             |
| N2  | mount bootstrap 列表覆盖（未登记新族）                    | `use-conversation.ts:221-229`（bootstrap `setConversations(convs)` :226 整体覆盖）；probe-2 RED                                                                                                                                                           | storage bootstrap 的 post-await `setConversations` 必须合并当前状态（functional updater），不得覆盖加载期间由 `createConversation` 创建的会话                                                                                                                                                                                                                   | Loop Rule → Cycle 2 / I1（I6 回写）             |
| N3  | branch 戳泄漏（**登记候选族 branching/fork 触发**）       | `create-engine.ts:100`（pendingBranchId 声明）+ `:385`（runOnce 消费一次）+ `:542-566`（regenerate 设戳 + `await runTurn([])`）；泄漏路径 = connector-missing 早退 `:202-222`（runOnce 之前 return）；probe-3 RED                                         | pendingBranchId 必须在使用前被消费或清除；任何 runTurn 提前返回路径不得遗留待消费的 branch 戳（防泄漏到无关 turn）。触发条件「I2 发现 fork/分支状态不一致」成立                                                                                                                                                                                                 | Loop Rule → Cycle 2 / I1（候选族触发，I6 回写） |
| N4  | plugin 错误隔离缺失（**登记候选族 plugin 生命周期触发**） | `create-engine.ts:240-242`（onTurnStart 在 try 外，rejection 卡死 processing，probe-4 RED）+ `:324-341/:459-478`（catch 内 onError 先于状态写入，抛错跳过 mutate，probe-E RED）+ `:350-352`（onTurnEnd 无守卫，静态证据）                                 | plugin hook 的 rejection 不得使 turn 状态卡死或绕过状态写入：onTurnStart 必须纳入 try/finally 清理面；onError 调用不得先于状态写入（或写入不得被 hook 抛错跳过）；onTurnEnd rejection 不得遮蔽原错误（所有错误必须落在 `requestState`/`lastError`）。触发条件「I2 发现 plugin hook 交错/错误传播违背」成立                                                      | Loop Rule → Cycle 2 / I1（候选族触发，I6 回写） |
| N5  | 失败轮残留污染（未登记新族）                              | `create-engine.ts:459-478`（runOnce catch 提交 `loading=false, content=''` placeholder）+ `:482-487`（buildContext 只排除 `loading===true` 尾消息）；probe-D RED                                                                                          | failed/aborted 轮的残留空 placeholder 不得进入后续请求历史（应移除或排除）；失败轮必须清理自身产物                                                                                                                                                                                                                                                              | Loop Rule → Cycle 2 / I1（I6 回写）             |

### W1-W4 — watch-only residual（维持登记，不重开）

| ID  | 观察（findings §4 引用）                                                                                                     | 复触发条件（findings §4 逐条登记）                                                                            | K2 修复面重叠注记                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| W1  | abort 不重置 `processingState`/`abortController`（:509-519）；clear/setMessages 不 null controller；窗口期二次 abort clobber | abort→(clear 或 setMessages)→再 abort 窄窗口；自愈：陈旧轮 finally 身份守卫清理 + 新 turn 覆盖；低严重度      | **I4 附带收敛预期**：K2 修复（abort 强制终结 + 清理面）预计覆盖 abortController 残留面，附带收益不作承诺 |
| W2  | setMessageEditing 流式期间写入被 chunk 提交覆盖（:153-170 vs :401-409）                                                      | isProcessing 期间 host 调 setMessageEditing 于流式 placeholder；内容零损坏，设计面语义（host 不应流式中编辑） | —                                                                                                        |
| W3  | deleteConversation 的 `await removed.abort()`（:353-355）在 storage try/catch 之外                                           | engine 订阅者抛错使 abort() reject → activeId fixup 跳过；病态 listener，低概率                               | —                                                                                                        |
| W4  | abort 于 onTurnStart 期间留下未回答 user 消息（:227-235）                                                                    | K1 同触发面；语义上 abort 保留 user 消息供 regenerate 属设计行为；「未回答历史进下一请求」为轻微上下文污染    | —                                                                                                        |

## 4. P2/P3 裁决结论

**零 P2/P3 项。** findings 全部 13 条目均落入 K1-K4（P0/P1 → I4）/ N1-N5（新族 → Cycle 2，Loop Rule 强制派生路径，不属 P2/P3 降级）/ W1-W4（watch-only）三态，无条目落入 P2（体验/文档/测试加固）或 P3（nit）区间 → Follow-up Backlog **无 P2/P3 填充项**（roadmap Follow-up Backlog 节维持空登记，稳态期 watch-only 项由 W1-W4 承担）。

## 5. 零悬挂核对

| 核对面                               | 结论                                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| findings §3.1（K1-K4）×4 ↔ 裁决表 §3 | 一一对应（K1/P1、K2/P1、K3/P0、K4/P0），无遗漏无重复                                                                                                                                                                                                   |
| findings §3.2（N1-N5）×5 ↔ 裁决表 §3 | 一一对应（N1-N5 全部路由 Cycle 2 / I1，附触发证据引用），无遗漏无重复                                                                                                                                                                                  |
| findings §4（W1-W4）×4 ↔ 裁决表 §3   | 一一对应（全部 watch-only，复触发条件引用在案），无遗漏无重复                                                                                                                                                                                          |
| **合计 13 条目**                     | 13 = 4 + 5 + 4，逐条 ID 勾对零悬挂                                                                                                                                                                                                                     |
| findings §5 未触发候选族 ×2          | streaming backpressure / tool-execution 并发按设计排除（保持登记，非裁决对象），I2 探查结论「未发现违背」在案                                                                                                                                          |
| 修正痕迹                             | 零修正：Phase 1 live 行号勾对全部一致（K1 `create-engine.ts:318-323`/`:240-242`、K2 `:417-429`/`:509-519`、K3 `use-conversation.ts:183-196`/`:394-399`、K4 `:374-388`/`:377`、N1/N2/N3/N4/N5 触发证据行号全部吻合），findings 文档零改动，无痕迹需记录 |
| 静默降级检查                         | 不存在被静默降级到 deferred 的 in-scope live defect：K1-K4 = P0/P1 → I4 修复项；N1-N5 = Cycle 2 / I1（Loop Rule 预授权强制路径，已写明非延期裁定）；W1-W4 = 低严重度/窄窗口/已登记复触发条件的 watch-only residual（findings §4 逐条理由）             |

## 6. 路由摘要（供 I4 / I6 直接消费）

- **I4（本 Cycle）**：K1（P1）+ K2（P1）+ K3（P0）+ K4（P0），附 §3 门禁补强要求契约（③ 成功路径 / ⑤ 强制终结 + per-iteration / ④ 排空时序守卫 / ② sync 读取）——I4 plan 已按此契约起草（`2026-08-09-2007-2` Phase 1-4 对齐）。
- **Cycle 2 / I1（Loop Rule 派生，I6 回写）**：N1-N5，触发证据 = §3 N 表「不变式陈述」+ findings §3.2 `文件:行`（I6 回写 roadmap 直接引用，不重复造数据）。
- **watch-only（维持登记）**：W1-W4；W1 的 abortController 残留面列「I4 附带收敛预期」（K2 修复覆盖时 I5/I6 从 watch-only 移除并记录）。
