# 695 审计修复 R2·MA5.6：功能交互审计—ai 族功能走查（流式/工具调用/HITL/会话）

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA5.6；`docs/audits/arm2-scope-and-dimension-matrix.md` MA5.6 行（报告名注册 `*arm2-MA5.6-ai-walkthrough.md`）；方法论 `docs/skills/interaction-state-audit-prompt.md` + `docs/skills/complex-component-display-operability-audit-prompt.md`（虚拟滚动 C4/流式状态机 C7/HITL 键盘+句柄 C9/C10 适用）；owner doc `docs/architecture/renderer-runtime.md`（:608 ai 覆盖声明 "100% (14 renderer types covered)" 为契约参照）
> Related: matrix MA5 节、`docs/audits/arm2-index.md`、MA4.5 Round B 线索（**非预载**：B-08 ai-attachments maxFiles e2e 弱上界断言 P3，`ai-attachments.spec.ts:40`，unit 面已有 `ai-attachments-limit-feedback.test.tsx`）、MA5.1–5.5 方法先例（plan 690–694）
> 方法先例沿用：`_tmp/arm2-ma56/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对 ai 族 14 条 playground 路由做 browser-use 实操走查：真实操作（发送/流式接收/工具调用回合/HITL 批准拒绝/会话切换/持久化刷新往返）+ 程序化读数定罪（V1–V7）+ 六态核对，产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-22 live，HEAD `310b176b2`）

- **走查面**（`apps/playground/src/domain-route-entries.ts`，14 条 ai 路由）：`ai-chat`（:430，mock 流式 send→stream→bubble）、`ai-conversations`（:437，`ai` ActionScope namespace + 外部 ai:send + streaming markdown buffer + a11y）、`ai-tools`（:444，agentic tool loop + ai-tool-call 卡）、`ai-attachments`（:451，多模态 drag-drop/paste/maxSize/maxFiles）、`ai-component-handle`（:458，Layer C component:sendMessage 跨组件驱动）、`ai-virtual-scroll`（:465，1000 条种子消息窗口化挂载）、`ai-persistence`（:472，localStorage ConversationStorageStrategy + autoSaveMessages 刷新存活）、`ai-citations`（:479，[N]/[N,M] 标记 hoverable sup 卡）、`ai-hitl`（:486，approve/reject + focus trap Tab/Esc + decided badge）、`ai-p4`（:493，voice-input/token-usage/suggestions）、`ai-linkage`（:500，branchId 分支 + 平台联动 messages→form field/data-source reload）、`ai-rich-text`（:507，Tiptap 富文本 sender：@mention/template bar/slash/纯文本序列化）、`ai-widgets`（:514，11 widget 全家福 showcase）、`ai-coverage`（:521，deterministic slow/flaky/eof connectors + chat states processing/error/empty/no-connector + sender modes + widget edge states）。
- **既有 e2e（对照）**：`tests/e2e/ai-*.spec.ts` 21 个 spec。
- **生产面**：`packages/flux-renderers-ai`（renderers 14 类 + `engine/`：branching/tool-execution/regenerate/snapshot-cache-detection/native-adapter/plugins）。
- **待消费线索（非预载）**：MA4.5 B-08（ai-attachments maxFiles e2e 弱断言 P3——unit 已有 limit-feedback 守护，本轮验真实拒绝反馈面）；renderer-runtime.md:608 "14 renderer types covered" 覆盖声明对照实渲染面。
- **执行状态**：roadmap MA5.6 `todo`；arm2-index MA5.6 行 `—`。
- **环境**：dev server 4175 已在跑（HTTP 200）。

## Goals

- 产出 `docs/audits/2026-10-22-HHmm-arm2-MA5.6-ai-walkthrough.md`（矩阵注册名 ai-walkthrough）：双风格，finding A–G + V1–V7 + P0–P3（P1 ID `P1-MA5.6-<nnn>`）+ 归属归族。
- 覆盖面（IS 台账；三轮，字母批拆分预授权见 Failure Paths）：
  - ① **会话核心环**（ai-chat/ai-conversations/ai-component-handle/ai-rich-text）：mock 流式 send→stream→bubble 全链（buffer 增量可见、完成态落定）、`ai` namespace 外部 send 按钮、Layer C component:sendMessage 跨组件驱动、富文本 sender（@mention/template/slash → 纯文本序列化送达 engine）+ 六态 + V7
  - ② **agentic 回合 + HITL + 多模态**（ai-tools/ai-hitl/ai-linkage/ai-attachments）：tool_calls 回合（卡渲染→toolExecutor→follow-up 流式回复）、HITL approve/reject + focus trap（Tab/Esc）+ decided badge + 中断恢复语义、branchId 分支切换 + onResponseComplete 平台联动（form field 写入 + data-source reload）、attachments drag-drop/paste/maxSize/maxFiles 拒绝反馈（B-08 真实拒绝面复核）+ 六态 + V7
  - ③ **状态/性能/持久化/widget**（ai-coverage/ai-virtual-scroll/ai-persistence/ai-citations/ai-p4/ai-widgets）：deterministic connectors 三态（slow/flaky/eof）+ chat states（processing/error/empty/no-connector）、1000 条窗口化挂载（DOM 节点数程序化核对）、localStorage 刷新往返（conversations+messages 存活）、citations inline/list 双模式 hover 卡、p4 三 widget（voice 非 IO 直调声明核对/token SVG ring 读 metadata.usage/suggestions 双模式溢出）、widgets showcase 全 11 widget 在场 + 六态 + V7
  - ④ **F/G 专项**：toast 全量映射 + `env.notify`/`console.(log|debug)` 静态扫描
- 登记 arm2-index（MA5.6 行 + P1 行 + P0 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明）。

## Non-Goals

- 不修改入库代码（P0 除外）；性能阈值归 MA7.1（`[PERF]` 仅记录）；视觉走查归 MA6.2；voice-input 真实麦克风路径不测（Web Speech API 非 IO 声明仅核对代码面）；MA5.4 已覆盖的通用表单/弹层语义不重开。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA5.6 报告 + arm2-index 登记回填；`_tmp/arm2-ma56/` 探针实跑；daily log 追加；roadmap MA5.6 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA6+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                        | 行为                                                                                          | 可重试 |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| e2e-env-failure | dev server/连接器 mock 失效 | 归因修复后重跑（mock connector 不依赖外部 key；VITE_OPENAI_API_KEY 在场时行为分支须显式核对） | 是     |
| probe-flaky     | 流式时序读数漂移            | 重跑 ≥2；仍不稳 → watch-only                                                                  | 是     |
| audit-p0-found  | Rule 2 六类之一             | 即时通道                                                                                      | 否     |
| subagent-quota  | 限流/模型失败               | fresh 重启一次；再败执行者亲跑                                                                | 是     |
| round-overflow  | 单轮超上限                  | **字母批拆分（MA5.6-a/-b/-c，Cross-Cutting 5 预授权）或移交 Phase 2 台账留痕**                | 否     |

（"用户可见表现"列不适用——本表各行为流程性失败路径，非产品行为场景。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：三域实操走查

Status: completed
Targets: `_tmp/arm2-ma56/round-{A,B,C}.md`、`_tmp/arm2-ma56/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · 会话核心环**（子代理）：ai-chat/ai-conversations/ai-component-handle/ai-rich-text 交互序列（send→流式增量→完成态/外部 send/Layer C 驱动/富文本序列化）+ 六态 + V7
- [x] **Round B · agentic + HITL + 多模态**（子代理）：ai-tools/ai-hitl/ai-linkage/ai-attachments（tool 回合/HITL 批准拒绝+焦点陷阱+中断恢复/分支+平台联动/附件校验拒绝反馈——B-08 复核）+ 六态 + V7
- [x] **Round C · 状态/性能/持久化/widget**（子代理）：ai-coverage/ai-virtual-scroll/ai-persistence/ai-citations/ai-p4/ai-widgets（connectors 三态/1000 条窗口挂载/localStorage 刷新往返/citations 双模式/p4 三件/showcase 在场核对）+ 六态 + V7
- [x] **执行者对账**：F/G 静态扫描；交叉去重 + 分级归属归族；P1 live 复核（既有 ID 命中引用 + 本轮证据）

Exit Criteria:

- [x] 三轮台账 + 六态表 + toast 映射落字
- [x] 分类/分级/归属/归族 + P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 聚焦家族不对称源码证实 + P1-001 unit 网核实；R2 showcase 逐 widget 清点 + 诊断家族归并），末轮显式停止
- [x] MR3 / MG / MA6.2 交叉线索分栏（MR3 +P1-MA5.6-001；MG +聚焦第 5 面/数据丢失 demo 面/元数据诊断家族；MA6.2 +P3-008 文案对齐；MA7.1 +[PERF]×3）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch-only 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-22-0014-arm2-MA5.6-ai-walkthrough.md`：三轮 + KEY LEAD B-08 resolved-confirm + P1 ×1 + watch-only 7 + open 两轮 + 收口补记）
- [x] arm2-index：MA5.6 行 + P1-MA5.6-001 行 + Last Updated 滚动（累计 60），grep 复核
- [x] daily log 追加（计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0）
- [x] 清理 `_tmp/arm2-ma56/`（closure audit R1 通过后执行；round 台账已按 m7 结转关键 defensible 注记入报告 §6 后删除；4175 为共享既有 server 保留）（closure audit 通过后、提交前执行；4175 dev server 为本批审计共享既有 server 非本 plan 自启，保留供并发线；`git status --porcelain -- packages/ apps/ tests/` 须无本轮新增——并发 P0-MA5.1 修复线的 staged+unstaged+untracked 变更除外）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA5.6-001 双侧命中；MA5.6 行路径实存）
- [x] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA5.6 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_56698bb3`）R1 `approved`（0B/0M/7m）后：roadmap MA5.6 `planned`→`done`（行号 surgery + sed 回读核验——prettier 列宽漂移致 replace 断言拦截一次），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + ai 族 diff 0（`git diff HEAD --name-only -- packages/flux-renderers-ai apps/ tests/` = 0；并发 P0-MA5.1 线变更除外）
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_0c6f2ac7`（14 路由行号逐一核实〔grep `id: 'ai-` 恰 14 无遗漏〕、e2e 计数 21、HEAD `310b176b2`、roadmap `todo` :77 / arm2-index `—` :87、矩阵注册名 `*arm2-MA5.6-ai-walkthrough.md` :114、renderers 14 类 + engine 五件、renderer-runtime.md:608 覆盖声明、B-08 线索 MA4.5 报告 :201 + unit 文件实存、方法论两 skill 存在、4+4+6=14 轮次分配无遗漏、字母批预授权 roadmap :272、4175 HTTP 200 复核）
- Verdict: R1 pass-with-minors（0B/0M/5m）
- Rounds: 1
- Findings addressed: m1 Phase Status `open`→`planned`（词汇表内）；m2 Failure Paths 补"用户可见表现不适用"注记；m3 Last Reviewed 落日期；m4 全量门禁位置判定可辩护不动；m5 Phase 4 Item Types 去 Follow-up——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma56/` 清理）
- [x] roadmap Work Item Status MA5.6 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 14 条 ai 路由全走查收官（P1 ×1 新案〔ai-conversations 会话切换 engine 缺绑〕+ KEY LEAD B-08 resolved-confirm + P2 ×3 + P3 ×7 + watch-only 7+1 结转；聚焦损失家族第 5 面 + 数据丢失类 demo 面 + 元数据诊断新家族 → MG 候选）；字母批裁定：未拆分——三轮全覆面（A 4 + B 4 + C 6 = 14）；零入库代码变更核验通过（ai 族 diff 0）。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_56698bb3`（R1）
- Evidence: R1 **`approved`**（0B/0M/7m，7m 均已随本 closure commit 落地：m1 报告家族行 ID 冲突改 P3-004 家族行 + 交叉引用修正、m2 F3 计数口径对账行、m3 Phase 3 Status 词汇、m4 Draft Review verdict 词汇 pass-with-minors、m5 并发残留表述修正 + 提交前 ai 族 diff 0 复核、m7 round-C W 台账结转入报告 §6；m6 文件名时间戳按审计员裁定保持原样——引用完整性无损）。审计员独立复核：84 探针计数（23+25+36）、P1/P2/P3 ↔ round 台账 1:1 映射零丢失零静默改级、arm2-index 60 open 逐行清点、P1-001/P2-003/P2-006 源码行级锚点逐一命中、B-08 resolved-confirm 源码（ai-attachments.tsx rejection note role=alert）+ round-B 双证、Phase 4 无预勾选、roadmap `planned` 未越权、ai 族 diff 空 + 四门禁 exit 0。

Follow-up:

- no remaining plan-owned work；P1-MA5.6-001 修复行在 MR3 队列；MG 候选 +3：聚焦损失家族第 5 面（rich-text 弹层 preventDefault）、数据丢失类 demo 守卫（分支快照）、元数据诊断噪声治理；MA6.2 线索 +1（citations hover/click 文案对齐 P3-008）；MA7.1 +[PERF]×3。

Follow-up:
