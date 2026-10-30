# 806 M3-K1 AI 知识库对话页复刻（business-page-replication roadmap M3-K1）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-K1（依赖 M2 done；前置 C1/C2 done——crm mock 模块与 AI 装配先例就绪）
> Related: D1 总体设计；D3 §2.1（K1 页设计，D6 MAJ-A/B 裁决块所在——评审 MAJ-1 勘误：原错引 D2）；R2 §1 K1；R4 §1 K1（G11）

## Purpose

落地 M3-K1「AI 知识库对话页」（**host override 页**——D6 MAJ-B 裁决）：ai-chat 整页编排（会话列表/消息流 streaming/引用来源卡片/反馈按钮/token 用量）+ RAG connector mock（streaming fixture/护栏/HITL 场景），复用 showcase-env 既有 AI 装配，focused e2e + axe 分支 A 登记。收口为 roadmap §2 K1 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、showcase-env `/r/ReplCrm__` 等分支、**AI 装配**：showcase-env L574-583 `createMockAiStream/createMockAiConnector/createAiImportLoader` 既有装配（C1 交付前在案）；ai-\* 族 14 type 已注册（ai-renderer-definitions）；ai-conversations-demo.tsx 专用 host 先例（plan 633 UR-4：activeId 所有权归 host store、`conversationsDemo:setActive` namespace action）。
- D3 §2.1 K1 设计（D6 裁决后——评审 MAJ-1 勘误：K1 设计 owner 为 D3 非 D2）：**实现形态裁决块**——K1 为 host override 页（registry 特例非纯 JSON）：ai-chat 绑定 conversationController/engine/activeConversationId（host 注入）；选中态经 host namespace action（`replAi:setActive`→switchConversation）；onResponseComplete 链绑 `${message}` 整快照（D6 MAJ-A：payload `{message}` 非 `${result}`）；messageSave args.data `{message}` 透传；citations/feedback/token-usage 为 message 级独立 widget 落 afterMessages 绑 `${activeAnswer}`；G11 护栏 alert（finishReason 透出路径 payload.message.metadata.finishReason）；sources/refused/usage 非 ChatMessage 一等字段——M3 前置义务：mock 流完成时 cloneMessage 快照须携带（D6 复审披露）。
- D3 §4.3 ai 端点表 K1 子集（messageFindPage/conversationSave/messageSave 等按表原名——评审 MAJ-1 勘误）+ mock fixture 四类预设（引用/护栏/HITL/慢流——D3 §4.2 特别节）。
- G11 缺口口径：护栏/频控提示 alert/status 组合（无专用 type）。

## Goals

- `mock-backend-repl-ai.ts`（RAG connector mock fixture 四类预设+K1 端点）+ K1 host override 组件（registry 特例）+ entry + e2e `tests/e2e/replication-ai-knowledge-chat.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D3 §5.1 K1 清单（streaming 逐帧渲染+停止按钮/引用来源卡片/反馈按钮/G11 护栏提示/会话切换/新建会话；focus 3 条）。

## Non-Goals

- 不实现 K2/K3 页；不落地 G11 专用 type（alert/status 组合口径已定）；不做语音输入面（ai-voice-input 非设计枚举）。

## Scope

### In Scope

- K1 页 host override + AI mock fixture + entry + e2e + axe 登记；roadmap §2 K1 回写。

### Out Of Scope

- 其余 13 页；G11 缺口落地；kanban 键盘层缺口修复（C1 遗留，kanban owner 面）。

## Failure Paths

| 编号           | 触发                            | 行为                                                                         | 可重试 | 用户可见表现   |
| -------------- | ------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------- |
| e2e-fail       | focused e2e 失败                | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿       |
| stream-fixture | connector mock 流行为与断言不符 | 以 engine/types.ts ChatMessage 契约与 mock-ai-env 实况为准调整/勘误 D2       | 是     | streaming 可验 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - K1 页全链实现

Status: planned
Targets: `shared/mock-backend-repl-ai.ts`（新建）、`replication/ai-knowledge-chat-host.tsx`（host override）、`complex-pages-registry.tsx`（特例覆盖）、`complex-pages-model.ts`（entry）、`page-schemas/ai-knowledge-chat.json`（host 消费的 schema 面）、`tests/e2e/replication-ai-knowledge-chat.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock：`mock-backend-repl-ai.ts`——K1 端点（messageFindPage/conversationSave/messageSave 逐名对齐 D3 §4.3 ai 表）+ connector mock 四类 fixture 预设（正常引用流〔sources 携带〕/护栏拒绝流〔refused+finishReason〕/HITL 工具调用流/慢流〔停止按钮可验〕；复用 createMockAiStream/createMockAiConnector 契约，cloneMessage 快照携带 sources/refused/usage——D6 复审前置义务）
- [x] host override 组件：`replication/ai-knowledge-chat-host.tsx`——registry 特例覆盖（pih-workspace 先例），ai-chat 绑定 conversationController/engine/activeConversationId（host store）+ `replAi:setActive` namespace action（plan 633 UR-4 先例）+ onResponseComplete `${message}` 快照链 + afterMessages 三件套（ai-citations/ai-feedback/ai-token-usage）+ G11 护栏 alert + mobile/desktop 无画布（普通页）
- [x] registry 特例 + complex-pages-model.ts entry
- [x] page-schemas/ai-knowledge-chat.json（host 消费的 schema 面：ai-chat 参数/afterMessages 三件套/护栏 alert）
- [x] e2e spec 三支柱（D3 §5.1 K1：新建会话/提问→streaming 逐帧+完成→引用卡片+反馈按钮+token 用量/护栏流→alert 可见/会话切换 replAi:setActive→历史回显/停止按钮慢流；axe 分支 A；focus 3 条）
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-ai-knowledge-chat.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1-C3 回归 + playground typecheck + strict 校验

Exit Criteria:

- [x] K1 页可达可交互且列表页收录（host override 特例），strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（断言含 \_\_replAiCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 K1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 3 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - MAJ-1：8 处 D2→D3 改指 + §4.2→§4.3 + §5→§5.1 + Closure Gate 勘误落点改 D3
  - MIN-1：showcase-env/registry 行号刷新（L584/L587/L588、L20-22）
  - MIN-2：mock 项补 **replAiCalls/**replAiTestHooks 钩子面点名
  - MIN-3：HEAD 指称更新 43047a2ba

## Closure Gates

- [x] in-scope 工作全部落地（K1 页 + AI mock + roadmap 回写）
- [x] 行为/契约结果已达成（D3 §5.1 K1 断言清单全绿，--retries=0）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log；D3 §4.3/§2.1 勘误登记；设计勘误如有）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（触达面绿：playground typecheck 过；全仓现状见 Deferred）
- [x] `pnpm build`（OK）
- [x] `pnpm lint`（OK）
- [x] `pnpm test`（OK）
- [x] `pnpm check`（触达面零新增红；链上失败=check:duplicates〔869 clones/17.05%——**扫描范围仅 packages/**（check-duplicates.mjs L62），本计划触达面 apps/playground+tests/e2e 不在扫描面内，增量全部来自并行会话 packages/ WIP 修改〔flux-formula/evaluator、renderers-scheduling ×7 等，git status 实证〕——见 Deferred；oversized 3 exempt 既有；其余子项过含 scanner/i18n ✅）

## Deferred But Adjudicated

### check:duplicates（并行 packages/ WIP 归因）

- Classification: `watch-only residual`——check:duplicates 红（869 clones/17.05%，棘轮基线 597/8% 失败）**扫描范围仅 packages/**（check-duplicates.mjs L62 `path.join(rootDir, 'packages')`），归因并行会话 packages/ WIP 修改（flux-formula/evaluator、flux-renderers-scheduling ×7、flux-compiler fields.ts 等，git status 实证；另 packages/flux-formula/flux-formula 空骨架目录为其意外产物）；lint/typecheck/build/test 本轮 OK 或触达面绿。
- Why Not Blocking: 与本计划触达面（playground complex-pages + tests/e2e + docs）零交集；触达面自身验证全绿（playground typecheck、K1 spec 9/9 retries=0、axe 16/16、回归 59/59、unit 71/71）
- Successor Required: `yes`
- Successor Path: 由并行会话自行收口；F2 统一登记

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: K1 全链落地（host override+registry 特例+七端点 mock+connector 四类 fixture 含 cloneMessage 快照 sources/refused/usage 双通道投影〔D6 复审义务兑现〕+G11 护栏 alert+\_\_replAiTestHooks 全四键）。closure audit 首轮 issues（1 Major：D3 owner-doc 勘误未落盘 + 4 Minor）→ 修复（D3 §4.2/§2.1/§5.1 三处就地勘误落盘+focus ②③ 裁决登记+plan 残项清理）→ 无需重跑（审计员声明机械修复后可 completed）。审计员独立实跑 K1 9/9、C1/C2 回归 19/19、axe 16/16、unit 336/336、strict 53/53、typecheck；duplicates 红精确复现归因实证。K1 可关，M3 累计 9/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `issues`（1 Major：D3 owner-doc 勘误未落盘〔Non-Degradable：owner-doc 与 live baseline 不一致〕+ 4 Minor：L62 行号/replCrmCalls 残留/Record 回填/Deferred symlink 措辞）→ 修复（D3 §4.2 connector 通道勘误/§2.1 onResponseComplete 勘误+activeAnswer 种子/§5.1 focus ②③ 裁决登记三处落盘 + plan L62/replCrmCalls/Record 回填/Deferred symlink 措辞）→ 无需重跑（审计员声明机械修复后可 completed）；审计员独立实跑 K1 9/9、C1/C2 19/19、axe 16/16、53/53、336/336、typecheck、duplicates 红精确复现；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- tool-round-hitl/forceStreamError/failNextMutation 三通道已实现未入 e2e 断言（§5.1 K1 未列，K2/K3 复用面）
- 全量 test:e2e 归 P1 阶段
