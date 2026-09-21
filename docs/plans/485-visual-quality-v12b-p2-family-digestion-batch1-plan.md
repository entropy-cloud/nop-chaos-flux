# 485 视觉质量 V12b：一致性 P2 候选池按族消化——首批（族9 + 族5）Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V12b-consistency-p2-digestion.md`（169 条全面复核报告；本 plan 以其 §2 已消化台账、§3 批次裁定、§4 开放项台账为准）、`docs/backlog/visual-quality-roadmap.md` V12b 行、`docs/audits/visual-quality/exemption-baseline-v1.json`（红线基线）
> Related: `docs/plans/483-visual-quality-v12a-consistency-governance-plan.md`（v1 基线与 STRUCTURED_ERROR_CHANNEL_FILES/文件级豁免先例）、`docs/plans/481-visual-quality-v11a-scheduling-plan.md`（守卫单测 + 类别清扫先例）

## Purpose

把 roadmap V12b 的首批（根因族 9 + 族 5，共 26 条开放项）按类别清扫收口：族9 = i18n/语义色硬编码 + 枚举直出（14 条），族5 = 失败/错误静默（12 条）；顺带收编 V12a 转入的 P2-15 与 P2-18 残余 3 子项（form/ui 行为类，与本批 Phase 2 同清扫面）。后续批次按报告 §3.2 滚动（V12d/V12e/V12f）。

## Current Baseline

- 复核基线：169 条 P2 候选中 159 条仍开放（三路 fresh-session 扫描，报告 §4 台账带 file:line 证据）；9 条已被 plans 470–483 顺带消化、1 条随死代码清理失效（报告 §2）。
- 红线基线：`exemption-baseline-v1.json` = 225 instances / 68 files / 69 entries，newHits=0；`check:audit-ui-consistency-gaps` 对 v1 红线生效（plan 483 收口时审计独立复跑 cmp 字节级一致）。
- 通道先例：错误/诊断统一走 `t(类别键, { message })` + `env.notify`（plan 483 A3，31 处先例）；语义令牌消费 + dark 变体（plans 476/481/482 先例）；dev 诊断门 `isDevRuntime()`（plan 483 批 a 先例）。
- 已知行为缺陷随批：transfer `data-indeterminate` 裸布尔恒真（G2-视角3-01，不在本批族内但同在 form-advanced 上传/选择面，随 Phase 2 顺带）、upload 单选重选不 abort（G2-R2-视角5-01）、editor 聚焦期外部同步丢弃（G2-R4-视角5-01）、ai retry 重复追加（G5-R4-视角10-01）。
- e2e 环境注记：收口会话实测显示器 50Hz 模态下 rAF 上限 ~50fps（探针 `_tmp/raf-ceiling-probe.mjs`），perf 类绝对阈值规格在该环境态不可满足（见 daily log）；本批不触及 perf 规格。

## Goals

- 族9 14 条：硬编码色全量接语义令牌（含 dark 变体）、硬编码英文/字形接 i18n 或 lucide 图标、aria-label 语义化；其中 2 条 schema 演示数据类（G7-R3-视角4-02、G7-R2-视角10-01）如属复刻页数据语义裁决则显式转入 V12f schema 批并落卡。
- 族5 12 条：每条失败/静默路径有用户可见反馈（或显式 adjudicated watch-only 带理由）；行为缺陷（upload abort、editor 同步队列、retry 去重）先红后绿修复。
- V12a 转入 4 子项收编：P2-15（input-number badInput 与存储脱钩）、P2-18 残余（card 键盘可达 / fieldset collapsed 验证可见 / alert onClose payload 形状核验闭合）。
- 红线：v1 基线 instances/entries 不增、newHits 持续 0、新增豁免 0；消化计数入 daily log（159 → ≤133）。

## Non-Goals

- 族10/族8/族1/族2/族6/族3/族4/族7 各项（V12d/V12e/V12f 批次）。
- playground 复刻页 schema 的结构性重写（仅收本批清单内枚举/术语/数据语义条目，且允许裁决转入 V12f）。
- perf 规格（gantt/kanban perf）阈值调整（50Hz 环境界另行处理，见 daily log）。
- ui 包新组件抽象（Spinner/Empty 统一原语归 V12d——本批 loading 类仅 2 条且均在族5 列）。

## Scope

### In Scope

- 报告 §4 族9 全部 14 条、族5 全部 12 条（逐条落点见台账）。
- V12a 转入：P2-15、P2-18 三子项（来自 `docs/backlog/audit-followups-2026-08-11-1929.md` P2-15/P2-18 行的去向声明）。
- 顺带面：G2-视角3-01（transfer data-indeterminate，与 upload-field 同文件域）。
- owner docs：受影响 `docs/components/*/design.md`、证据卡 `consistency-debt.md`（F5 面不动，新增 V12b 消化记录）、audit-followups-08-11 台账 open-audit 节 P2-15/P2-18 两行回写、roadmap V12b 行执行注记、daily log。

### Out Of Scope

- 报告 §3.2 中 V12d/V12e/V12f 全部条目；P3 池（V12c）。
- 任何新豁免登记；任何对 v1 基线文件的重写。

## Failure Paths

| 可测场景编号     | 触发             | 行为                                                 | 可重试 | 用户可见表现       |
| ---------------- | ---------------- | ---------------------------------------------------- | ------ | ------------------ |
| i18n-key-missing | 新增键未登记     | `check:i18n-keys` 红，构建不通过                     | 是     | 无（门禁拦截）     |
| token-missing    | 新增令牌无定义   | 组件回退裸值即守卫单测红                             | 是     | 无（先红后绿拦截） |
| notify-flood     | 反复触发同一失败 | 一次性 dev warn / notify 有界（warnedStatuses 先例） | 是     | 单次提示           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**（一般 UI 面清扫）；其中已确认 live defect（G2-R2-视角5-01 upload abort、G2-R4-视角5-01 同步丢弃、G5-R4-视角10-01 retry 重复、G2-视角3-01 data-indeterminate 恒真、G4-R3-视角10-02 不在本批）采用先红后绿。门禁可守护面（硬编码色/i18n 键）以负断言或守卫测试钉住。

## Execution Plan

### Phase 1 - 族9：i18n/语义色/字形/枚举直出（14 条）

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/`、`packages/flux-renderers-content/src/styles.css`、`packages/flux-renderers-data/src/stat-tile-renderer.tsx`、`packages/flux-renderers-form-advanced/src/{combo-renderer.tsx,array-editor.tsx,editor-toolbar-config.ts}`、`packages/flux-renderers-basic/src/dynamic-renderer.tsx`（错误态着色属族5 邻接，随本条）、`packages/flux-renderers-scheduling/src/gantt/*`、`packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx`、`packages/flux-renderers-ai/src/renderers/ai-conversations.tsx`、`packages/flux-renderers-industrial/src/editor/toolbox/`、`packages/ui/src/components/ui/sidebar-layout.tsx`、`packages/flux-renderers-dashboard/src/editor/`、`packages/flux-i18n/src/locales/*`

- Item Types: `Fix | Decision | Proof`

- [x] Proof（先红锚点）：守卫/断言先行——①content progress 令牌化负断言（styles.css 三变体零 oklch 字面）；②stat-tile 语义类断言（emerald/red → success/destructive 令牌类）；③sidebar-layout aria-label 断言走 `t('flux.sidebar.*')`；④gantt 展开指示符随 `isOpen` 断言
- [x] Fix（硬编码色 → 令牌）：diff-three-column bg-gray-50 → var(--nop-diff-nav-bg) 消费对齐；progress 三变体 → success/warning/destructive 语义链（含 dark）
- [x] Fix（硬编码英文/字形 → i18n/图标）：combo 校验文案、array-editor Item N/Move up-down、ai-conversations ✎/×、gantt −/+/‹/›/×/’>’ 图标化（lucide）、industrial toolbox 生僻字形、sidebar-layout label
- [x] Fix（dashboard editor 面板 i18n）：editor-inspector/editor-palette/editor-canvas/dashboard-editor-renderer 面板可见文案接 i18n（zh/en 对称）
- [x] Decision：G7-R3-视角4-02（deptId 列名映射）与 G7-R2-视角10-01（垃圾箱术语/变体分裂）——属复刻页 schema 数据语义，裁定修 or 显式转 V12f（落卡带理由）
- [x] Fix：G4-视角3-01 展开指示符随 store.isOpen 联动（aria 已联动，补字符/图标）
- [x] Fix：G2-R3-视角4-01 editor link.run（`editor-toolbar-config.ts:94-103`）——废弃 window.prompt 走既有 Image URL 交互先例；unsafe scheme 静默丢弃改 inline 反馈（cross 族5，与 Phase 2 反馈先例同构）

Exit Criteria:

- [x] 族9 14 条逐条落地或显式转批落卡（14/14 landed；G2-R3-视角4-01 带裁决：window.prompt 沿 plan 480 Image 先例保留，新增 unsafe-scheme inline 反馈——见偏差注记）；新增 i18n 键 36 个 zh/en 对称且 `check:i18n-keys` 绿
- [x] 受影响包 focused test 绿（content 320/data 1135/ui 172/ai 810/scheduling 981/form-advanced 1103/industrial 1455/dashboard 67/playground 352）；四处先红锚点有先红记录

Phase 1 执行偏差注记（2026-09-21）：G2-R3-视角4-01 的「prompt 交互先例」即同文件 Image 的 window.prompt（plan 480 裁决面）——本批实质增量 = unsafe scheme 从静默丢弃改为 `ToolbarRunFeedback` inline `role="status"` destructive 反馈（`flux.editor.unsafeLink`）；prompt→popover 属设计升级，登记 Non-Blocking Follow-up。工业 toolbox 选 i18n 短标签而非 lucide（industrial 无 lucide-react 依赖，「零新依赖」硬约束）。邻接记录：input-table-renderer 同款英文校验模板（族9 顺带候选，转 V12d 清扫）。

### Phase 2 - 族5：失败/错误静默 + V12a 转入行为项（12 + 4 条）

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx`、`packages/flux-renderers-content/src/markdown.tsx`、`packages/flux-renderers-form-advanced/src/upload-field.tsx`、`packages/flux-renderers-form-advanced/src/editor-renderer.tsx`、`packages/flux-renderers-data/src/list-renderer.tsx`、`packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx`、`packages/flux-renderers-mobile/src/pull-refresh.tsx`、`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts`、`packages/flux-renderers-scheduling/src/calendar/calendar.tsx`（:230-235 失实注释）、`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`、`packages/flux-renderers-ai/src/{renderers/ai-message-list,renderers/ai-attachments}.tsx`、`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/error.tsx`、`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`、`packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`、`packages/ui/src/components/ui/{card,alert}.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [x] Proof（先红）：行为缺陷四项——①upload 单选重选 abort 在途控制器 + 完成回调丢弃陈旧结果（G2-R2-视角5-01）；②editor 聚焦期外部同步 pending 队列（G2-R4-视角5-01）；③ai retry 不重复追加用户消息（G5-R4-视角10-01）；④transfer data-indeterminate 传 `someChecked && !allChecked` 布尔改为 'true'/undefined（G2-视角3-01）
- [x] Fix：上述四项落地（沿 env.notify / 事件反馈先例）
- [x] Fix（反馈补齐）：list-renderer 失败 retry（crud 先例）；editor-inspector JSON 校验错误内联反馈；pull-refresh 失败态/重试；calendar export error 接 UI（消费 exportError，订正 calendar.tsx:230-235 失实注释）；ai-message-list aborted 视觉态；ai-attachments 超限走既有 i18n 键 + onError（fileTooLarge/tooManyFiles 已在）；upload reject/maxFiles 截断可见反馈；dynamic-renderer/markdown 错误态 destructive 语义
- [x] Fix：G4-R2-视角4-01 barcode-input 校验错误被 fixed z-50 overlay 遮蔽（barcode-input.tsx:181-184）——错误面提升至 overlay 内或渲染序后置，扫描错误经 overlay live region 可见
- [x] Fix（V12a 转入）：P2-15 input-number badInput 中间态与存储脱钩；P2-18 残余三子项——card 键盘可达、fieldset collapsed 校验错误可见化、alert onClose payload 形状核验闭合（核验类直接回写台账）
- [x] Follow-up（去向回写）：`docs/backlog/audit-followups-2026-08-11-1929.md` open-audit 节 P2-15/P2-18 两行 `[x]` + plan 485 引用（注意：同文件 multi-audit 节的同名 P2-15/P2-18 行是不同条目，不得勾选）

Exit Criteria:

- [x] 族5 12 条 + 转入 4 子项逐条「有用户可见反馈」或显式 adjudicated 落卡（16/16 landed，见执行注记）；四项行为缺陷先红后绿有记录（upload-abort/external-sync/retry-dedupe/transfer-indeterminate 各有专项测试）
- [x] 受影响包 focused test 绿（九包 812/608/321/1136/177/984/823/1111/69 全绿）；08-11 open-audit 节 P2-15/P2-18 两行回写与本 plan 一致（multi-audit 节同名行未触碰）

Phase 2 执行注记（2026-09-21；执行子线中断后由收口会话接续补完）：16/16 落地——①upload 单选重选 abort + 陈旧完成丢弃（upload-rejection-feedback.test）；②editor 聚焦期外部同步 pending 队列（editor-external-sync.test）；③ai retry 去重（error-retry.test）；④transfer data-indeterminate 'true'/undefined（transfer-indeterminate.test）；⑤list-renderer 失败 retry（list-infinite-retry.test）；⑥inspector JSON 内联反馈；⑦pull-refresh 错误态；⑧calendar exportError 接 UI + calendar.tsx:230-235 注释订正；⑨ai-message-list aborted 视觉态；⑩ai-attachments 超限走既有键 + notify；⑪upload reject/maxFiles 可见反馈；⑫dynamic-renderer/markdown 错误态 destructive；⑬barcode 校验错误 overlay 内可见（overlay test 扩展）；⑭P2-15 draft/commit 解耦（收口会话补 pin 测试 input-number-badinput-decoupling.test 3/3）；⑮P2-18 fieldset 错误感知自动展开（收口会话补：MutationObserver aria-invalid 通道 + interaction 测试先红后绿 9/9）、card 键盘/alert payload 两子项核验闭合；⑯backlog 两行回写。执行子线因账户用量上限中断于收尾段，接续工作由收口会话完成（fieldset/pin 测试/回写），全量 focused 复跑九包绿。

### Phase 3 - 对账 + docs + 守卫

Status: completed
Targets: `scripts/audit/find-ui-consistency-gaps.mjs`（如可收紧）、`docs/audits/visual-quality/consistency-debt.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/2026/09-21.md`（或当日 log）

- Item Types: `Fix | Decision | Proof`

- [x] 对账：消化计数入台账（159 → 实际残余；转 V12d/V12e/V12f 的条目逐条列名）；族9/族5 中可门禁化的面（如 progress oklch、stat-tile 调色板类）评估补负断言或收紧豁免——新增豁免 0 为硬约束
- [x] 门禁复跑：`check:audit-ui-consistency-gaps` exit 0 且 --json totals 相对 v1 单调不增；`check:i18n-keys` 绿
- [x] docs：受影响 `docs/components/*/design.md` 同步；`consistency-debt.md` 增 V12b 消化记录（V12b-F 项）；roadmap V12b 行执行注记 + V12d/V12e/V12f 后续批次声明（引用报告 §3.2 预授权）；daily log 记录

Exit Criteria:

- [x] 受影响九包 focused test 全绿；`pnpm typecheck` 全绿（归入 Closure Gates 全链复跑确认）
- [x] 对账三方一致（报告台账 ↔ 本 plan ↔ daily log）；roadmap V12b 行注记与 V12d/V12e/V12f 批次声明落位

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session（ZCode plan-review auditor，2026-09-21，只读核对 live repo）
- Verdict: `revised`（1 Major，0 Blocker；修订后 pass，已升 active）
- Rounds: 1
- Findings addressed: M-1 执行项覆盖缺口——族5 #5 G4-R2-视角4-01（barcode-input 校验错误被 z-50 overlay 遮蔽）全 plan 零提及、族9 #13 G2-R3-视角4-01（editor-toolbar-config.ts:94-103 prompt+unsafe-scheme 静默）仅入 Targets 无 checklist——两条执行项+Targets 均已补。Minor：m-1 先红锚点计数两处→四处、68 pairs→68 files；m-2 Targets 补漏（dashboard src/editor/、calendar-header、form-advanced/editor-renderer.tsx）纠错（ai-bubble 真实路径 src/renderers/ai-bubble/、editor-toolbar-config .ts）并删族10 游标（crud-infinite-scroll-area、form-load-action）；m-3 audit-followups 回写面收敛为 08-11 open-audit 节两行（multi-audit 节同名行不得勾）；m-4 :231-235 注释文件限定 calendar.tsx。可想象性抽验 16 条 ledger→live 机制全部成立；格式完整；批量规模与红线设定合规。

## Closure Gates

- [x] Phase 1–3 Exit Criteria 全勾
- [x] 族9 + 族5 26 条 + 转入 4 子项逐条 landed / adjudicated / moved-with-record，无静默 deferred
- [x] in-scope live defect（upload abort / editor 同步 / retry 重复 / transfer indeterminate）已先红后绿修复
- [x] v1 红线：instances/entries 不增、newHits=0、新增豁免 0
- [x] 受影响 owner docs 已同步（design.md / consistency-debt / 两份 backlog / roadmap / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无 —— 本批不预设 deferred；执行中确需延期的逐条落入本节并带 Why Not Blocking）

## Non-Blocking Follow-ups

- G7-R3-视角4-02 / G7-R2-视角10-01 若裁定转 V12f：在其台账行登记指针。
- V12d 预备：ui 包 Spinner/Empty 原语统一的设计裁决（V12d plan 起草时定）。
- editor link.run 的 prompt→popover 设计升级（本批保留 window.prompt 沿 plan 480 Image 先例；unsafe-scheme inline 反馈已落地）。
- input-table-renderer.tsx 与 combo 同款英文校验模板（族9 顺带候选，V12d 清扫吸收）。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session ×2（2026-09-21 closure audit 首轮 + 轻量复审）
- Evidence: 首轮 verdict `issues`（F-1 Major 文档同步未做 + F-2/F-3/F-4）→ 修复后轻量复审：F-1/F-2/F-4 FIXED（4 抽查对照 live 全符）、F-5 一致性 OK、F-3 补录后闭环。审计独立复跑门禁 223/66/69 newHits=0；三包 focused 复跑绿（form-advanced 1111 / ai 812 / form 827）。Phase 1/2 逐条对照表见两轮审计输出；daily log `docs/logs/2026/09-21.md` §plan 485。

Follow-up:

- no remaining plan-owned work（prompt→popover、input-table 同款模板、V12d Spinner 原语均已登记 Non-Blocking Follow-ups，归 V12d/V12e/V12f 滚动批次）
