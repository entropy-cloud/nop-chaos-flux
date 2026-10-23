# 704 审计修复 R2·MA8.2：i18n + deprecation + todo 审计

> Plan Status: active
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA8.2；`docs/audits/arm2-scope-and-dimension-matrix.md` MA8.2 行（报告名注册 `*arm2-MA8.2-i18n-deprecation.md`；`check:i18n-keys` + 硬编码字符串 grep；`@deprecated` 注记与移除流程合规〔`docs/skills/deprecated-feature-cleanup.md`〕；`check:audit-todo-exitless`）；owner doc `flux-guide/README.md`（i18n 契约域 = `flux-guide/12-i18n.md`——initFluxI18n/t/useFluxTranslation）
> Related: matrix MA8 节、`docs/audits/arm2-index.md`、MA6.2 记录级文案线索（EN/CN 混排等——引用归并）
> 方法先例沿用：`_tmp/arm2-ma82/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

i18n 键完整性 + 硬编码字符串盘点；`@deprecated` 注记与移除流程合规审计；exitless todo 扫描；产出 arm2 报告并登记 arm2-index；零入库变更。

## Current Baseline（2026-10-23 live，HEAD `8de058f2a`）

- **扫描器**：`check:i18n-keys`（M0：PASS 1843 defined / 1443 used / **400 potentially unused**）+ `check:audit-todo-exitless`（M0：**1**——`packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:194`）。
- **执行状态**：roadmap MA8.2 `todo`；arm2-index MA8.2 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA8.2-i18n-deprecation.md`（矩阵注册名 i18n-deprecation）：finding P0–P3（P1 ID `P1-MA8.2-<nnn>`）。
- 覆盖面（单轮子代理 + 执行者扫描；字母批拆分预授权）：
  - ① **i18n 键完整性**（子代理）：`check:i18n-keys` 复跑；locale 键 × 消费点对照（缺键/幽灵键/硬编码字符串漏网——用户可见 UI 面优先）
  - ② **deprecation 流程合规**（子代理）：**packages 源码 `@deprecated` 注记**（约 20 处/11 文件）逐条对照 deprecated-feature-cleanup.md 流程（注记要素齐全？替代方案指明？移除时限/批次记录？）+ skill 定义的 docs 侧候选来源（plans/architecture/bugs 记录；audit 报告/logs 为排除噪声）
  - ③ **todo 治理**（子代理）：`check:audit-todo-exitless` 复跑；exitless todo 逐条分类（带 issue/带批次/无主）
  - ④ **执行者对账**：与 MA6.2 记录级文案线索归并；P1 live 复核
- 登记 arm2-index（MA8.2 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复（P0 即时通道除外）；不新增 i18n 键/不清理 todo（归治理批）；MA6.2 视觉文案审计不重开（引用归并）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA8.2 报告 + arm2-index 登记回填；`_tmp/arm2-ma82/` 实跑；daily log 追加；roadmap MA8.2 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA8.1 / MA8.3 / MA9+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号   | 触发            | 行为                                                 | 可重试 |
| -------------- | --------------- | ---------------------------------------------------- | ------ |
| tool-failure   | 扫描器失效      | 归因后重跑或手动等价 grep 留痕                       | 是     |
| audit-p0-found | Rule 2 六类之一 | 即时通道                                             | 否     |
| subagent-quota | 限流/模型失败   | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow | 单轮超上限      | **字母批拆分（MA8.2-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - single：三专项盘点

Status: completed
Targets: `_tmp/arm2-ma82/round-A.md`、`_tmp/arm2-ma82/tool-*.log`

- Item Types: `Proof | Decision`

- [x] **Round A · 三专项**（子代理）：i18n 对称完美 + 400 短名单全量分类（71.5% 假阳性/~114 真死键）+ 硬编码 sweep（print 域 23+ 处）+ deprecation 20 注记全查 + FIXME/XXX 0 开放
- [x] **执行者 · 扫描器实跑**：i18n live 1848/1448/400（unused 恒定）；todo 1 基线钉死
- [x] **执行者对账**：MA6.2 文案线索归并；P1 live 复核

Exit Criteria:

- [x] i18n 台账 + deprecation 合规表（§2）+ todo 分类清单（§3）落字
- [x] MA6.2 归并 + P1 零新案核验

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] open 轮 4 项移交执行者裁决（§6），末轮显式停止
- [x] MR3 / 治理批 交叉线索分栏（治理批 +扫描器增强+死键清单+print 接线+批次模板；文案批 +P3-1/2+MA6.2 归并；a11y 线索 +1；MA7.2 lint guard carry-over 引用）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-1103-arm2-MA8.2-i18n-deprecation.md`：§0 扫描器对比 + P2 ×2 + P3 ×4 + §2 合规表 + §3 todo + 裁决框 + watch 6 + 收口补记）
- [x] arm2-index：MA8.2 行 + Last Updated 滚动（P0/P1 零立案、累计 64 不变），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma82/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep 双侧命中；closure R1 M1 修正：累计 67 非 64——MA8.1 +3 后沿抄 64 为陈旧读数）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA8.2 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_c52f3908`）R1 `issues`（0B/1M/3m——M1 累计计数 64→67 勘误〔沿抄陈旧读数〕；m1/m2 勾选滞后；m3 BUILD*VERIFY 措辞对齐——均随本 commit 落地；审计员独立复现 400 分类数学 + 4 wrapper FP + PRINT*\* 17 键零消费 + streamingHint 反向漂移 + 20 注记全查）approved 后：roadmap MA8.2 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_43b9f405`（roadmap :86 / 矩阵 :140 / arm2-index :96、HEAD `8de058f2a`、双扫描器 live 复现 M0 形态、deprecated-feature-cleanup.md 70 行对照、MA6.2 记录级归并目标实存、guide 合规、locale 语料 2084/2085 行可行性）
- Verdict: R1 `revised`（0B/1M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 owner doc 勘正（flux-guide/README.md + 12-i18n.md，非 docs/architecture）；m1 Last Reviewed 落日期；m2 @deprecated 盘点限界（源码 20 处 + docs 侧候选，排除报告噪声）；m3 M0 基线具体值引用（1843/1443/400；todo=1）——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma82/` 清理）
- [x] roadmap Work Item Status MA8.2 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: i18n+deprecation+todo 审计收官（P0/P1 零立案；P2 ×2 新案〔扫描器盲区 71.5% FP + ~114 真死键 / print 域 i18n 通道旁路〕+ P3 ×4 + deprecation 20 注记全查 + todo 化石裁决 + FIXME/XXX 0 开放 + MA6.2 文案归并 + open 轮 4 项执行者裁决）；字母批裁定：未拆分；零业务代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_c52f3908`（R1）
- Evidence: R1 **`issues`**（0B/1M/3m）→ 回修 → 全部落地。审计员独立复核：**400 分类数学精确复现**（286/400=71.5%；A237/B26/C137 求和 400）+ **4 wrapper FP file:line 实证**（shared.tsx:25/toolbar-button.tsx:26-27/markdown-editor.tsx:75,281-282/editor-palette.tsx:23-28）+ 2 死键零消费（streamingHint/ganttCanvasLabel）+ **PRINT\_\* 17 键零 t() 消费**（validate 15+bind 8+layout+schemas 计数吻合）+ streamingHint 反向漂移（design.md:793 vs ai-sender.tsx:176/187）+ 20 注记全查逐条 + FIXME 独立扫 10 命中皆良性；M1 累计 67 勘正核验（64 为 MA7.3 期陈旧读数沿抄）。

Follow-up:

- no remaining plan-owned work；P2-MA8.2-001/002 修复行在治理批（DYNAMIC_KEY_MAPS 扩容 + 死键清理清单 + print 接线）；文案批 +P3-1/2；a11y 线索 +1（gantt canvas aria-label）；MA7.2 P2 lint guard carry-over 引用；MA8.3（运维域剩余）为下一工作项。

Follow-up:
