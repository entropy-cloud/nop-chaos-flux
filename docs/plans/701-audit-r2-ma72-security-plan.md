# 701 审计修复 R2·MA7.2：安全审计—XSS sanitize/动态执行/依赖/浏览器 IO 边界

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA7.2；`docs/audits/arm2-scope-and-dimension-matrix.md` MA7.2 行（报告名注册 `*arm2-MA7.2-security.md`；HTML 渲染 sanitize 门禁全量路径验证；动态执行 eval/Function/new Function 路径；`audit:semgrep` + `audit:deps`；`check:audit-renderer-browser-io`）；owner doc `docs/architecture/renderer-env.md`
> Related: matrix MA7 节、`docs/audits/arm2-index.md`、MA2.4 运行时正确性（浏览器 IO/生命周期线索如已立案则引用）
> 方法先例沿用：`_tmp/arm2-ma72/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

全仓安全审计：HTML 渲染 sanitize 门禁全量路径验证；动态执行路径盘点；semgrep + 依赖漏洞扫描；浏览器 IO 边界扫描；产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-23 live，HEAD `248d0d0bf`）

- **扫描器/工具**：`audit:semgrep`（**本机未安装**——arm2-index :240 在案「semgrep: command not found」并指定 MA7.2 现场裁决安装补测 vs 手动等价扫描）、`audit:deps`（depcruise 结构规则）、`check:audit-renderer-browser-io`、`pnpm audit`（CVE 面）。
- **已知 sanitize 面（Round A 预置锚点，closure 可 grep 核对全覆盖）**：`packages/flux-renderers-content/src/html.tsx:53`（schema 驱动 raw HTML + DOMPurify——主 sanitize 门禁）、`packages/ui/src/components/ui/chart.tsx`、`packages/flux-print-core/src/export-pdf.ts`（innerHTML）、`flux-renderers-ai` message-text/bubble markdown、diff-view diff-line/three-column、`rich-text/`（tiptap）。
- **执行状态**：roadmap MA7.2 `todo`；arm2-index MA7.2 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA7.2-security.md`（矩阵注册名 security）：finding P0–P3（P1 ID `P1-MA7.2-<nnn>`）。
- 覆盖面（单轮子代理 + 执行者扫描；字母批拆分预授权）：
  - ① **sanitize 门禁全量路径**（子代理）：`dangerouslySetInnerHTML`/`innerHTML`/`insertAdjacentHTML`/`document.write` 全仓盘点 → 逐路径验证 sanitizer 覆盖（输入源→净化→输出）；markdown/html 渲染器（message-text、bubble、diff 等）为重点
  - ② **动态执行路径**（子代理）：`eval(`、`new Function(`、`Function(`、`setTimeout(` 字符串形态、`import(` 动态表达式盘点 → 逐个定罪或豁免（表达式求值器为产品语义，需明确边界：公式/表达式引擎的求值面 = 设计内；组件代码路径出现 = 缺陷）
  - ③ **执行者 · 工具扫描**：`audit:semgrep`（未安装在案——现场裁决安装补测 vs 手动等价扫描）+ `audit:deps`（**依赖结构规则：环/跨包导入**，非漏洞扫描）+ **`pnpm audit --json`（CVE 漏洞面，severity 分级记录）** + `check:audit-renderer-browser-io`（localStorage/cookies/fetch 边界）
  - ④ **执行者对账**：交叉去重 + 分级归族；P0/P1 live 复核
- 登记 arm2-index（MA7.2 行 + P0/P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复安全缺陷（P0 即时通道除外）；不升级依赖版本（漏洞归 MR/依赖治理批）；渗透测试/ fuzzing 不在范围（静态+代码路径审计）；MA2.4 已立案项不重开（引用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA7.2 报告 + arm2-index 登记回填；`_tmp/arm2-ma72/` 实跑；daily log 追加；roadmap MA7.2 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 安全修复实现；依赖升级；MA7.1/7.3 / MA8+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号   | 触发                  | 行为                                                 | 可重试 |
| -------------- | --------------------- | ---------------------------------------------------- | ------ |
| tool-failure   | semgrep/deps 工具失效 | 归因后重跑或手动等价扫描留痕                         | 是     |
| audit-p0-found | XSS 可达路径证实      | 即时通道                                             | 否     |
| subagent-quota | 限流/模型失败         | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow | 单轮超上限            | **字母批拆分（MA7.2-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - single：安全路径盘点 + 工具扫描

Status: completed
Targets: `_tmp/arm2-ma72/round-A.md`、`_tmp/arm2-ma72/tool-*.log`

- Item Types: `Proof | Decision`

- [x] **Round A · sanitize + 动态执行全路径盘点**（子代理；首派配额限额 → 重置后 fresh 重启即成）：16 路径台账全净化/转义链（R1-R16）+ DOMPurify 配置充分性验证 + 动态执行零缺陷（公式引擎手写解释器）+ P2 ×2 + P3 ×3
- [x] **执行者 · 工具扫描**：semgrep 未安装→**现场裁决手动等价扫描**（报告 §3）+ deps 57=M0 基线 + pnpm audit 125 advisories（5C/55H/52M/13L）记录 + browser-io 0 命中
- [x] **执行者对账**：P2-001 render-html.ts:139 亲读定罪；CVE 面分级归治理批；deps 57=基线核对

Exit Criteria:

- [x] sanitize 路径台账（§0 16 路径）+ 动态执行定罪/豁免清单落字
- [x] 四工具结果落字（含 CVE 面）；P0/P1 零立案核验

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 P2-001 源码定罪；R2 CVE 面处置归属依赖治理批），末轮显式停止
- [x] MR3 / MG 交叉线索分栏（MR3 +P2-001/P2-002；依赖治理批 +CVE 125 + semgrep 安装可选；MG 零新增）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0847-arm2-MA7.2-security.md`：§0 台账 16 路径 + 工具结果 + P2 ×2 + P3 ×3 + watch 4 + open 两轮 + 收口补记）
- [x] arm2-index：MA7.2 行 + Last Updated 滚动（P0/P1 零立案、累计 64 不变），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma72/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：MA7.2 行路径实存；P0/P1 零立案核验）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0，closure auditor 删除前核验）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA7.2 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_28fe3608`）R1 **`approved`**（0B/0M/2m——审计员独立源码复现两 P2〔render-html.ts:139 原样内插 vs 同行 :134 escapeHtml 对照 / 三守卫分歧 + react-dom 19.2.4 兜底正则 :1410-1411 实证〕+ 125 advisories 数字复对 + 零修复声明核验；2m 均随本 commit 落地：m1 本项勾选+裁决括注 + Phase 3 状态流转、m2 RA-P3-1 并入 P2-002 修复面对账注记）后：roadmap MA7.2 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_fecdd07b`（roadmap :83 / 矩阵 :132 / arm2-index :93、HEAD `248d0d0bf`、三工具 package.json 在册、audit:deps 语义核实（depcruise 结构规则非 CVE）、semgrep 未安装在案 :240、sanitize 面预置锚点核对、guide 合规全绿）
- Verdict: R1 `revised`（0B/1M/2m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 audit:deps 语义勘误（结构规则非漏洞）+ CVE 面补 `pnpm audit --json` 步骤；m1 semgrep 未安装在案入 Baseline + 现场裁决义务；m2 sanitize 面预置锚点（html.tsx:53/chart.tsx/export-pdf.ts/rich-text/diff-line）——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma72/` 清理）
- [x] roadmap Work Item Status MA7.2 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 全仓安全审计收官（P0/P1 零立案；P2 ×2 新案〔print background 未净化 style 路径 / URL 守卫分歧——React 兜底覆盖无可达 XSS〕+ P3 ×3 + sanitize 16 路径全净化链 + 动态执行零缺陷 + CVE 面 125 记录归治理批 + browser-io 0 命中 + semgrep 手动等价裁决）；字母批裁定：未拆分；零业务代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_28fe3608`（R1）
- Evidence: R1 **`approved`**（0B/0M/2m，2m 均随本 commit 落地）。审计员独立复核：**P2-001 源码复现**（render-html.ts:139 原样内插 + schemas.ts:224 自由 string 类型 + 同行 :134 escapeHtml 对照）；**P2-002 三守卫逐一核实**（url.ts:41-54 无规范化 ^ 锚定正则 / toolbar trim-only / ai-citations 黑名单）+ **React 兜底实证**（react-dom 19.2.4 产品包 :1410-1411 空白容忍 isJavaScriptProtocol + sanitizeURL）；零 P0/P1 抽检全过（html.tsx sanitizeHtml + FORBID_TAGS、bubble markdown :105 先净化、formula 零 Function 构造、evaluator.ts:251 switch 解释器）；125 advisories 数字复对；deps 57=基线；semgrep 裁决在案核验（index :240）。

Follow-up:

- no remaining plan-owned work；P2-MA7.2-001/002 修复行在 MR3 队列（P2-001 一行修复+回归测试；P2-002 收敛共享 isSafeNavigationUrl + 前规范化，补 RA-P3-1 回归测试）；依赖治理批 +CVE 125 条 + semgrep 安装可选；MA7.3（样式）为下一工作项。

Follow-up:
