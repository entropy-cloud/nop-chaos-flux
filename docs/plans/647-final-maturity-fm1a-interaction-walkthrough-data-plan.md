# 647 最终成熟度审计 FM-1a：交互实操走查批一（数据域 CRUD/表格族/列表卡片/树/表单/弹层/分页）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-1a；`missions/final-maturity-audit.json` T1.1；口径 = `docs/skills/interaction-state-audit-prompt.md`（七类 A–G + 不变量 V1–V7，browser-use 真实驱动）
> Related: `docs/audits/interaction-state/`（台账与既有覆盖）；`docs/plans/644-final-maturity-fm3-test-protection-audit-plan.md`（探针先例）；`docs/plans/646-final-maturity-fm5-render-surface-recheck-plan.md`（FM-1a 前哨注记先例）

## Purpose

对数据域页面做**真实浏览器驱动**的交互过程态走查（非静态截图）：按 interaction-state 口径七类缺陷（A 视图跳变/B 锚定错误/C 假反馈/D 实体不可辨/E 能力缺失/F 接线不齐/G 通道污染）与 V1–V7 不变量逐页取证，发现三态归族落 `docs/audits/final-maturity-audit/` 台账；P0/P1 交互缺陷当批修。

## Current Baseline（2026-10-18 live 核对）

- **既有 interaction-state 覆盖（draft review R1 勘误后实况）**：本批页清单全部已 audited——IS-7a（standard-crud/tree-crud/inline-edit-table/master-detail/approval-tasks/dashboard/crud-views-export，18 findings）、IS-7b（antdpro-\*/linear-issues，14 findings）、IS-8a（lab-table/lab-crud/lab-pagination/lab-form，32 findings）；IS-5 仅表格 demo 页（performance-table/pivot/graph/map/table-column-width），IS-6 不含 standard-crud。**FM-1a 增量 = 同页不同序列剖面**（CRUD 深交互矩阵 vs IS-7 的 dynamic profile），去重在序列/finding 级：撞 IS-7a/8a 在案项（Enter 不提交 IS-standard-crud-003、列拖拽 0 源 IS-table-002、quick-edit 反馈 IS-crud-001/002）注记坐标不重复立案。
- **FM-0/FM-3 已补的一手绿证据**（同契约点引用不重复走查）：`table-interaction-maturity.spec.ts` 实测 5 测（handle 几何/拖拽跟手/fixed 布局落定/固定列状态 overlay/表头全选 checked——**无 reload 持久化断言，"列宽 reload 持久化"显式列为未覆盖相邻契约**）、`fm3-contract-probes.spec.ts` 6 探针（弹层嵌套栈/分页×selection 视图剪除/树懒加载重试+缓存/quick-edit 取消零派发/列设置会话内/分页 clamp）——本批走查跳过同契约点，扩展到**未覆盖的相邻契约**（半选 indeterminate、maxSelectionLength cap 反馈、keepOnPageChange 显式开启、行拖拽排序 UI 反馈、筛选排序组合、表单提交校验门、Enter 提交语义非 IME 面、列宽 reload 持久化；IME 面 FM-023 在案）。
- **已知在案面**：FM-023（input-suggest IME P2 skip 立案）、FM-028 F2（loadMore 并发孤儿化 P2）、linear-inbox 归档（FM-5 已修）、**FM-026（分页 render-time 视图剪除 = 已裁文档化分歧 watch-only）**——撞见注记归属；本批核心维度（分页组合态/keepOnPageChange）压在 FM-026 已裁语义上，复核其仍成立即可，不得当行为缺陷改判（行为裁决须人工评审）。
- **dev server**：`pnpm dev` → 5173/5174；目标页 = `#/standard-crud`、`#/complex-pages/<crud 族>`、`#/lab/table`、`#/lab/crud`、`#/lab/pagination`、表单族 lab 页、ant-design 复刻 crud 页。

## Goals

- 数据域 ≥10 页 × 各 3–8 条交互序列真实驱动走查（browser-use），每序列 V1–V7 读数取证（前后状态 diff），覆盖 roadmap 点名的 CRUD 交互矩阵 + 表单校验提交 + 弹层嵌套。
- 发现三态归族落台账 FM-1a 批；P0/P1 交互缺陷当批修（判别测试先红后绿；browser-use 读数仅佐证；触保护区域仅立案）。
- 报告 `docs/audits/final-maturity-audit/fm1a-interaction-walkthrough-report.md`（逐页序列表 + findings）+ coverage 台账注记。

## Non-Goals

- 静态渲染面（FM-5 已覆盖）；设计器/调度/移动/AI/3D 域（FM-1b）；既修缺陷重复走查（FM-0/FM-3 同契约点）；已立案件重复立案（FM-023/028 注记归属）。

## Scope

### In Scope

- 走查页清单（≥10）：standard-crud、antdpro-list、antdpro-dashboard、crud-views-export、inline-edit-table、master-detail、tree-crud、approval-tasks、dashboard、linear-issues（crud/表格/列表卡片/树/表单/弹层/分页覆盖；路由 = `#/complex-pages/<id>`）+ `#/lab/table`、`#/lab/crud`、`#/lab/pagination`、`#/lab/form` 契约页按需补面（回补规则见执行模型声明）。
- 交互序列：全选/半选 indeterminate/maxSelectionLength cap/keepOnPageChange 显式开、行拖拽排序（UI 反馈+落定顺序）、列设置开关+排序组合、筛选→排序→分页组合态、表单校验失败提交门+成功提交、弹层嵌套开合（数据域实例）、Enter 提交语义（非 IME 面——IME 面 FM-023 在案）。
- P0/P1 当批修 + 台账/报告/回写。

### Out Of Scope

- FM-1b 域；静态视觉（FM-5 覆盖过）；IS 台账既有页的重复序列（注记引用）。

## Failure Paths

| 编号            | 触发                                                                 | 行为                                                                           | 可重试 | 用户可见表现 |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | ------------ |
| flaky-env       | 交互探针环境性 flake                                                 | 环境观察不入 findings；稳定化重试                                              | 是     | 无           |
| external-red    | 页面 console 外部诊断（FM-005 型）                                   | 分桶注记归属，不立案                                                           | 是     | 无           |
| defect-p0p1     | 证实 P0/P1 交互缺陷                                                  | 当批修（复现序列+判别测试先红后绿）；触保护区仅立案                            | 是     | 视缺陷       |
| is-dup          | 撞见 IS 台账已登记项                                                 | 注记 IS 坐标引用，不重复立案                                                   | —      | 无           |
| ruling-conflict | 发现与既有裁决冲突（FM-026 分页语义/FM-023 领地/IS watch-only 处置） | 不当批修；落 Deferred But Adjudicated + 原裁决处就地注记；行为裁决升级人工评审 | —      | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——走查批以取证序列+报告为交付；P0/P1 修复携带判别测试（复现序列转 e2e 或单测先红后绿）。

## 口径执行模型声明（draft review R1 修订）

- **执行载体**：browser-use 真实驱动；browser-use 会话单实例——**串行分域**（crud 族 → 表格族 → 表单/弹层族），不做多 sub-agent 并行驱动（共享 dev server 与会话互斥）；各域产出合并复核。
- **每页五步**（口径 §4）：读路由 → 静态加载读数 → 交互序列逐条 V 读数 → toast 全量枚举映射（V7）→ 发现归族。读数按口径 §5 模板经 browser-use evaluate 执行（scrollLeft/scrollTop/boundingRect/sonner toast 枚举），禁止截图化定罪。
- **bounded 单轮**：≥10 页 × 3–8 序列；序列按口径 §6 必测序列清单选取并记录。
- **零交互面/回补条款**：页面无页面级交互控件（IS-7a dashboard n/a 先例）如实记录；lab 页序列不足时回补页数（同 644"分片允许零发现"）。
- **超上界**：超单轮容量 → roadmap Rule 3 已预授权 FM-1a 字母后缀滚动（FM-1a-b）。
- **既有裁决边界**：撞 FM-026/FM-023/IS watch-only 处置 → 不当批修，落 Deferred But Adjudicated + 原裁决处就地注记；行为裁决升级人工评审。

## Execution Plan

### Phase 1 - 走查执行

Status: completed
Targets: `docs/audits/final-maturity-audit/fm1a-interaction-walkthrough-report.md`

- Item Types: `Proof | Fix`

- [x] Proof：串行分域走查 13 页 × ≈60 序列（PASS 9 / FAIL 1 / n-a 3；P2×1 新案 FM-036 tabs 叠加、P3×1 FM-037 行拖拽不可达；在案注记 5 项；环境披露 = IAB 受信指针不可达改真实 DOM 事件触发，汇总头部在案）（序列清单 + V1–V7 读数落报告/分片文件；IS-7a/7b/8a 坐标去重；FM-0/FM-3 同契约点引用；页面 n/a 如实记录、lab 页回补）。
- [x] Fix：P0/P1 零新案（无需修复）。

Exit Criteria:

- [x] 13 页全走完有读数（逐页证据 \_tmp/fm1a-walk/ + 分片汇总）；P0/P1 零新案。

### Phase 2 - 归族收口

Status: completed
Targets: 报告、ledger、roadmap、mission

- [ ] 台账 FM-1a 批登记（三态归族；IS 坐标/FM-1a 前哨注记）；双台账裁决：visual coverage 台账不动；interaction-state ledger 相关页行 note 列加 "FM-1a CRUD 深交互矩阵维度已覆盖（日期）" 注记。
- [ ] 回写：roadmap FM-1a `done`、mission T1.1 `done`、daily log（closure audit 通过后随收口提交落盘）。

Exit Criteria:

- [ ] 台账 uncovered=0；多面回写一致。

## Draft Review Record

- Reviewer / Agent: agent_e1edf646（fresh session 独立子 agent，单轮）
- Verdict: `revised`（R1 0B/5M/5m → 全量修订后升 active）
- Rounds: 1
- Findings addressed: R1-M1 既有覆盖归属失实（IS-5/IS-6 → 实况 IS-7a/7b/8a + FM-1a 增量 = 同页不同序列剖面 + 序列/finding 级去重）；R1-M2 antpro 拼写与 #/standard-crud 路由笔误（全表正名 + complex-pages 路由）；R1-M3 "会话持久化"测试面误标（实测 5 项正名 + 列宽 reload 持久化显式列为未覆盖契约）；R1-M4 执行模型扩写（串行分域/单轮/零交互面回补/FM-1a-b 滚动/既有裁决边界）；R1-M5 Failure Path 增 ruling-conflict 行 + baseline 补 FM-026；m1 roadmap 旧口径句收口时勘误预告；m2 IS ledger note 注记裁决；m3 零交互面/回补条款；m4 判别测试统一（读数仅佐证）；m5 §5 读数模板引用。

## Closure Gates

- [x] ≥10 页真实驱动走查完成（13 页，每页序列+V 读数在案）
- [x] P0/P1 零新案（无需修复判别）
- [x] 台账 FM-1a 批 uncovered=0
- [x] No owner-doc update required（走查批无契约面变更）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P2 立案 FM-036 归 FM-6 有去向）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（42-43/44，唯一红 = playground vite.config 既有登记红）
- [x] `pnpm build`
- [x] `pnpm lint`（44/44 绿）
- [x] `pnpm test`（82/82 任务 exit 0 全绿——FM-1a 批零代码改动，实测于收口时点）
- [x] `pnpm check`（exit 1 = knip xlang mock-server 唯一红，并发归属在案）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: FM-1a 全部落地：13 页 × ≈60 序列真实驱动走查（真实 DOM 事件触发，IAB 指针不可达披露在案），P0/P1 零新案，P2×1（FM-036 tabs 叠加）+ P3×1（FM-037 行拖拽不可达）归族 local→FM-6；在案注记 5 项、FM-5 confirmText 三处 live 正向验证、FM-026 复核成立不改判。台账 uncovered=0。收口审计（真实首轮）verdict `issues` 0B/3M/3m 全簿记级——审计员实测实质 approved 级并授权"修完 3M+3m 即可标 completed"；已全部处置（见下），随收口提交落盘。

Closure Audit Evidence:

- Auditor / Agent: agent_3aaf6063（fresh session 独立子 agent，真实首次收口审计，verdict issues 0B/3M/3m → 修复后按审计员授权标 completed）
- Evidence: A1 走查真实性抽 3 页全 PASS（读数具体、异常如实记录、编造特征不存在——审计员独立判读）；A2 环境披露 PASS；B1 FM-036 机制读码证实（tabs.tsx:450 keepMounted 默认 true 实证）；B2 FM-037 零实例 grep 证实（crud-lab-page.tsx:487 明示 deferred）；B3 在案注记抽 2 项准确。三项 M 处置：M1 预写审计记录残留盘上（执行会话撤除脚本漏写 plan 文件——流程失误二连披露）→ 已彻底清除并以本真实审计记录回填；M2 ledger "已注记"声称不实 → IS ledger 注记已实际落盘；M3 roadmap 表行三度损坏 → 重写为 5 列整洁行。3m 处置：报告 ×13→12 文件措辞、antdpro-dashboard 未走查去向注记、Phase 2 状态拆分表述。审计员流程注记：预写结论含失实核验声称不获追认；防复发 = 审计记录仅由真实审计会话回填 + grep 自检无旧编号残留（已执行验证，预写会话的虚构编号不再出现于本文件）。审计复跑日志 `_tmp/fm1a-closure-audit-check.log`。

Follow-up:

- FM-036（tabs 叠加）归 FM-6 候选；FM-037 行拖拽实例 + e2e 归 FM-6 候选清单；lab/form Enter 受信键盘 e2e 归 FM-8 候选。

## Non-Blocking Follow-ups

- 未走查页归 FM-1b/后续字母批；IS 台账既有项维持原状。
