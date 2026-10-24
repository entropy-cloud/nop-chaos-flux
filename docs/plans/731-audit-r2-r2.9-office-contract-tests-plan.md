# 731 审计修复 R2·R2.9：契约补测—office 族（P1-MA4.4-005 live defect 修复 + P1-MA4.4-006）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.9（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-2001-arm2-MA4.4-designer-office-tests.md` §P1-MA4.4-005（live defect，最小补强=矩阵表驱动+**修复谓词为错误值枚举匹配**）+ §P1-MA4.4-006（integration 最小补强=真实 save→load 往返 + storage-unavailable/bridge-read-failed 两失败类判别）；owner doc `docs/architecture/report-designer/design.md`
> Related: 先例 plan 727/729（live defect 修复+钉同构）；R2.8 同日姊妹行
> 编号 runway：730 为 R2.8（本线）；731 本 plan；ARC 线从 732 起避开

## Purpose

005 为 spreadsheet 公式错误值分类 **live defect 修复**（`isFormulaError = startsWith('#') && endsWith('!')` 漏判 `#NAME?`〔? 结尾〕/`#N/A`〔无 !〕——引擎自产 #NAME?（:343/:544——closure m1 行号勘正）被自身谓词漏判，传播语义破坏；审计最小补强=五类错误值 × 算术/聚合/比较矩阵表驱动 + **修复谓词为错误值枚举匹配**）+ 表驱动测试。006 为 word save/recovery 链 integration（真实 save→load 往返等价 + storage-unavailable/bridge-read-failed 两失败类判别——五边界每段至少一侧 mock、无一条单流程测试、失败类 grep 0 命中）。双 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `6f1910913` 实测）

- **005**：`packages/spreadsheet-core/src/formula/formula-engine.ts:24-26` 谓词；引擎自产错误集：#CIRC!（visiting）/ #NAME?（:343/:544——closure m1 行号勘正）/ #DIV/0! / #REF! / #ERROR! / #VALUE!（:371）；消费点 `recalc-document.ts:100`（display 传播）。既有 formula-engine.test.ts/recalc-document.test.ts 存在但 #VALUE! 零出现、唯一传播用例恰采样 #DIV/0!。
- **006**：`packages/word-editor-core/src/document-io.ts`——saveDocument :386（captureDocumentSnapshot :337〔bridge-read-failed :348〕→ persistSavedDocument :369〔storage-unavailable/write-failed〕）；loadDocument :393-436（storage-unavailable/read-failed/json-parse-failed）；loadRecoveredState :541；setRecoveryLoadErrorHandler :77；getStorage :83-89（typeof 检查——review R1 m1）。harness：`document-io-test-utils.ts:13-38` installDocumentIoTestHooks（localStorage 全局 per-test stub + handler 重置）+ `document-io-persist.test.ts:19-58` bridge mock 惯用法（review R1 m2 勘正归并）。
- roadmap R2.9 行 `todo`（:106）；arm2-index :159（005）/:160（006）状态 `open`、修复列 R2.9。

## Goals

- 005 谓词修复（枚举匹配）+ 矩阵表驱动测试（五错误值 × 算术/聚合/比较 + 谓词直断言）。
- 006 integration：真实 save→load 往返等价 + storage-unavailable/bridge-read-failed 两失败类判别。
- 双 finding 回填 `closed`；roadmap R2.9 翻转。

## Non-Goals

- 不扩展公式引擎错误值产出面（#N/A 为外部 resolver/Excel 兼容面，引擎不产）；不处理 MA4.4 其余 finding；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/spreadsheet-core/src/formula/formula-engine.ts`（005 修复：isFormulaError 枚举匹配）
- `packages/spreadsheet-core/src/formula/formula-error-classification.test.ts`（新建，005 矩阵表驱动）
- `packages/word-editor-core/src/__tests__/document-io-roundtrip.test.ts`（新建，006 往返+两失败类）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.9 翻转（激活/收口两提交）

### Out Of Scope

- 公式引擎其他面；word-editor 其他边界；R2.10-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号 | 触发                                                                                               | 行为                                              | 可重试 | 用户可见表现 |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ | ------------ |
| api-shape    | 矩阵驱动/engine API 形状与规格不符                                                                 | 以既有 formula-engine.test.ts 先例校正，plan 补记 | 是     | 不适用       |
| contract-gap | 005 修复后矩阵出现非预期传播结果（枚举外错误值在产）                                               | 停：枚举补全为引擎实际产出全集并 plan 补记        | 否     | 不适用       |
| flake        | 006 node 环境 localStorage stub 串扰（word-editor-core vitest 环境为 node 非 jsdom——review R1 m3） | vi.stubGlobal + unstub 隔离；仍不稳 plan 补记     | 是     | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：005 修复回退（谓词还原 startsWith/endsWith）→ 矩阵 #NAME?/#N/A 行红（审计判别原文「现谓词必挂」）；006 删 saveDocument 的 persist 段 → 往返断言红（load 侧 normalize 删除不可判别——载荷已预归一化，review R1 M1）。判别机制（Rule 13）：005 变异=缺陷谓词本体；006 变异=链路断裂本体。

## Execution Plan

### Phase 1 - 修复与两测试落地

Status: completed
Targets: formula-engine.ts + 两测试文件

- Item Types: `Fix | Proof`

- [x] T1（005，formula-error-classification.test.ts）：谓词直断言（七枚举各 true + '#NAME'/'#N'/'name?' 等 near-miss false）+ 矩阵表驱动：五错误值（#CIRC!/#NAME?/#N/A/#DIV/0!/#VALUE!）× 三操作类（算术 `=A1+1` / 聚合 `=SUM(B1:B2)` / 比较 `=A1<5`，A1/B1 预置错误值经 resolver 注入）→ 断言传播（结果=同错误值，Excel 语义）。红证：**M-A** 谓词还原 startsWith/endsWith → #NAME?/#N/A 行红。
- [x] T2（006，document-io-roundtrip.test.ts，沿 document-io-test-utils.ts installDocumentIoTestHooks 全局 stub 惯用法——review R1 m2）：**A 往返** — bridge（getValue 返回含 header/main/charts/codes + getPaperSettings 的真实结构）→ saveDocument → loadDocument → 深等价（data 各段 + charts/codes + paperSettings + savedAt）；**A2 损坏载荷**（review R1 M1 配套：钉 load 侧归一化语义须手写损坏 JSON，非往返等价——往返载荷 capture 时已归一化，删 normalize 段不翻红）— storage 预置畸形 JSON → loadDocument 返回 null + recovery handler 收 json-parse-failed；**B storage-unavailable** — 测试内 `vi.stubGlobal('localStorage', undefined)` 覆盖 harness stub → saveDocument 抛 SaveDocumentError reason='storage-unavailable' + loadDocument 返回 null 且 recovery handler 收 reason='storage-unavailable'；**C bridge-read-failed** — bridge.getValue 抛错 → SaveDocumentError reason='bridge-read-failed'。红证：**M-B** 删 saveDocument 的 persist 段（persistSavedDocument 调用删除，save 不再落 storage）→ 往返断言红（loadDocument null——与 Test Strategy :52 一致，review R1 M1 勘正：删 load 侧 normalize 段不翻红，载荷已预归一化）。

Exit Criteria:

- [x] 双测试绿证 + 双红证留痕：**M-A** 谓词还原（red-before-fix 首跑：3 红=谓词+#NAME?/#N/A 矩阵行，缺陷本体）；**M-B** 删 persist 段红 2（A 断链 + B 语义）——005 修复保留为唯一实现 diff
- [x] 两包套件全绿：spreadsheet-core 22 文件/337 用例、word-editor-core 16 文件/278 用例

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 两行回填：:159（005）/:160（006）→ `closed` + 注记；Last Updated 滚动（open 41→39）
- [x] roadmap R2.9 `planned`→`done` 翻转（IN closure commit；激活提交 8c3c8eb94 已先行翻转）

Exit Criteria:

- [x] arm2-index 两行状态与注记实测一致（open 41→39 grep 复核）；roadmap R2.9 行 `done`（收口提交内）
- [x] daily log R2.9 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82
- [x] `pnpm check` 零失败全链绿
- [x] 双红证全部复员（formula-engine.ts 修复保留为唯一实现 diff；document-io.ts checkout 复员）
- [x] 独立 closure audit（fresh sub-agent `agent_81c3f969`，输入=plan+diff summary+验证输出）：**approved** 0B/0M/2m（m1 基线行号漂移随收口提交勘正、m2 检查清单算术注记非本 plan 层）——checklist 1-8 全 PASS，auditor 独立重演 M-A（3 红精确）+ M-B（2 红精确）+ 枚举=引擎产出集 grep 核验零 blast radius
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **005 枚举口径**：枚举集=引擎产出全集（#CIRC!/#NAME?/#DIV/0!/#REF!/#ERROR!/#VALUE!）∪ Excel 兼容面（#N/A）；非前缀式开放匹配（避免 '#custom!' 类误判扩散）。Classification: watch-only residual。Why Not Blocking Closure: 枚举=审计最小补强明示口径。Successor Required: 否。
- **006 e2e 一道网**：persistence e2e 单点既存——本行 unit/integration 补强后 e2e 保持不扩。Classification: out-of-scope improvement。Why Not Blocking Closure: 最小补强即全量规格。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_f685f11c，2026-10-24）：**FAIL** 0B/1M/3m——M1 M-B 红证空洞（载荷 capture 时已预归一化，删 load 侧 normalize 段往返仍绿——改判=删 persist 段〔与 Test Strategy 一致〕+ 新增 A2 损坏载荷用例钉 load 侧归一化）；m1 行号（loadDocument :393-436/getStorage :83-89）；m2 harness 出处（installDocumentIoTestHooks document-io-test-utils.ts:13-38）；m3 环境为 node 非 jsdom。T1 判定 sound（evaluateFormulaBody+makeCtx 惯用法、传播路径调 isFormulaError、#NAME?/#N/A 行缺陷本体即红证；枚举七值完备零 blast radius）。随激活落。

## Non-Blocking Follow-ups

- 无（005/006 最小补强即全量规格）。

## Closure

- [x] R1 共识路径（reviewer 明示 Fix M1+三 minors 即 pass）后激活提交（Status→`active` + roadmap R2.9 `todo`→`planned` IN commit `8c3c8eb94`）
- [x] 执行 Phase 1/2 → Closure Gates 全过 → closure audit **approved**（`agent_81c3f969`，0B/0M/2m）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：005 修复面最小性（3 hunks 恰谓词+枚举+注释；枚举=产出集 grep 核验）；M-A/M-B 独立重演（3 红/2 红精确）+ byte-identical 复员；open 39 程序化验证；T2 四用例语义核验（A2 钉 load 侧归一化、B/C=审计点名两失败类）。
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
