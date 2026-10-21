# 688 审计修复 R2·MA4.4：测试有效性审计—designer+office+platform+print+xlang 簇（C8–C12 二十一包）契约覆盖

> Plan Status: completed
> Last Reviewed: 2026-10-21
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA4.4；`missions/audit-remediation-r2.json`；方法论 `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` 为权威 + 工具输出消费；owner docs `docs/architecture/renderer-runtime.md`（本项 Owner Doc）、`flow-designer/design.md`、`report-designer/design.md`、`styling-system.md`、`docs/testing/e2e-standards.md`
> Related: matrix MA4 节（报告名模式 `*arm2-MA4.4-designer-office-tests.md`）、`docs/audits/arm2-index.md`、MA1.7/1.8/1.9、MA2.4、MA3.12–3.18（同簇已审面不预载）、MA4.1/4.2/4.3（机制先例）；`docs/architecture/flux-runtime-module-boundaries.md`（designer/office 注册面）
> 前提勘误注记（live vs roadmap 簇表快照）：ui 84→**87 src**（merge `bce166dbc` 触及 ui 包）——以 live 实测为准，报告落勘误。C8–C12 live 合计 **482 src / 363 test / 300 export 行**。
> 方法先例沿用（MA4.1–4.3 closure 定案）：`_tmp/arm2-ma44/` 中间件（收口清理）；P1 注册前执行者 grep 复核；单一 BUILD_VERIFY 运行；显式路径提交；声称复核禁用截断式 `git show --stat` grep（M1' 教训）。

## Purpose

对 C8 designer 族（flow-designer-core/renderers、editor-core、page-designer-core/renderers）+ C9 office 族（spreadsheet-core/renderers、word-editor-core/renderers、report-designer-core/renderers）+ C10 platform（ui/theme-tokens/tailwind-preset/flux-i18n/flux-code-editor/nop-debugger）+ C11 print ×2 + C12 xlang ×2 共 **21 包**执行**测试有效性审计**（matrix MA4.4）：专审**现有单元测试对稳定契约的守护效力**（编辑器 undo/redo 与序列化往返、长会话状态、ui 原语门面、debugger 调试面、print 预览、xlang 编译调试链、历史 bug family 回归）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-21 live 实测，HEAD `b11c7ee07`）

- **工作树**：并发 mobile 线残留未提交文件（`docs/index.md`、`platform-hardening-roadmap.md`）不含之；无其他 agent 活跃（live 核对）。
- **规模（口径同 arm2-index）**：

  | 包                        | src | test | export 行 |     | 包                   | src     | test    | export 行 |
  | ------------------------- | --- | ---- | --------- | --- | -------------------- | ------- | ------- | --------- |
  | flow-designer-core        | 30  | 14   | 15        |     | ui                   | 87      | 75      | 72        |
  | flow-designer-renderers   | 57  | 49   | 4         |     | theme-tokens         | 1       | 2       | 4         |
  | editor-core               | 6   | 2    | 5         |     | tailwind-preset      | 1       | 1       | 2         |
  | page-designer-core        | 13  | 10   | 21        |     | flux-i18n            | 6       | 2       | 3         |
  | page-designer-renderers   | 26  | 22   | 34        |     | flux-code-editor     | 26      | 17      | 14        |
  | spreadsheet-core          | 29  | 21   | 10        |     | nop-debugger         | 28      | 21      | 3         |
  | spreadsheet-renderers     | 49  | 28   | 18        |     | flux-print-core      | 10      | 9       | 11        |
  | word-editor-core          | 15  | 15   | 25        |     | flux-print-renderers | 11      | 8       | 10        |
  | word-editor-renderers     | 30  | 24   | 5         |     | flux-xlang-lang      | 4       | 2       | 3         |
  | report-designer-core      | 14  | 12   | 9         |     | flux-xlang-debug     | 18      | 6       | 18        |
  | report-designer-renderers | 21  | 23   | 14        |     | **合计**             | **482** | **363** | **300**   |

- **工具口径基线（本日实测）**：`check:audit-test-global-leaks` 108 = M0，C8–C12 命中 **13 处**（执行期逐处定性）；`check:jsdom-pragma-whitelist` no new entries；`check:audit-todo-exitless` 1 = M0（scheduling 注册件，C8–C12 预期 0，执行期复核）。
- **mutation**：C8–C12 不在 stryker mutate 范围——本项口径 N/A（扩展归 MA4.5）。
- **历史材料**：`docs/bugs/` 点名 C8–C12 的 bug note **42 份**（路径锚定 grep `packages/(<21 包名>)/` 实测；md5 去重 0 对；Round I 实核时再验）。MA4.1–4.3 确立的 systemic（引用存活性零机制、测试重组销毁守卫、门禁清单范围漂移、「分段绿、贯通零」、双峰覆盖）仅作检测启发。
- **执行状态**：roadmap MA4.4 `todo`；arm2-index MA4.4 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-21-HHmm-arm2-MA4.4-designer-office-tests.md`：双风格，七要素发现，P0–P3 分级（P1 ID `P1-MA4.4-<nnn>` 入 arm2-index），归族。
- 四口径：① 契约 → 测试映射（21 包导出面 + editor undo/序列化往返/长会话 + ui 门面原语 + debugger/print/xlang 面）；② 历史 bug family（42 份）；③ 跨层贯通（designer 命令→undo→序列化链、office 编辑器保存链、xlang 编译→调试链、print schema→预览链）；④ 卫生消费（leaks 13 处 / jsdom / todo-exitless）。
- 每簇「高价值无守护契约」清单 + Coverage Assessment + Recommended Next Tests（3–7 条）。
- 登记 arm2-index（MA4.4 行 + P1 行如有）；BUILD_VERIFY 全量 `pnpm test`（与 Closure Gates 共用同一次运行）。

## Non-Goals

- 零代码变更（修复归 MR2；e2e/mutation/探针归 MA4.5；组织归 MA4.4 报告仅记录）。不预载 MA1.7/1.8/1.9、MA2.4、MA3.12–3.18 finding。
- 不执行 MA4.5+；浏览器实操归 MA5.1/5.3。
- 不新建 `docs/analysis/` 目录（先例沿用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA4.4 报告 + arm2-index 登记回填。
- 只读取证：21 包导出面/renderer 或组件定义/owner docs/现有测试/bug notes/三卫生工具输出。
- `docs/logs/2026/10-21.md` 追加 MA4.4 条目；roadmap MA4.4 行状态流转；本 plan 状态流转；收口提交 `fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 除外）；MA4.5+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                     | 行为                                                       | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 六类之一（本簇典型：编辑器序列化往返数据损坏被必过空断言掩盖、XSS 渲染） | P0 即时通道：plan 内追加 Fix Phase 或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:audit-test-global-leaks` ≠108 / `check:audit-todo-exitless` ≠1 / jsdom 新增       | 停止收口，归因，报告记录                                   | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：契约清单 + 多轮子代理映射（四口径）

Status: completed
Targets: `_tmp/arm2-ma44/round-*.md`（中间件）

- Item Types: `Proof | Decision`

- [x] **契约清单**（执行者）：21 包 `src/index.ts(x)` 导出面 dump（19 包入口 index.ts，flow-designer-renderers/nop-debugger 两包为 index.tsx）+ editor 定义/命令契约提炼
- [x] **Round A（子代理）**：flow-designer-core + flow-designer-renderers（87/63，双文档 orchestrator/命令/树投影/画布适配）
- [x] **Round B（子代理）**：page-designer-core + page-designer-renderers + editor-core（45/34，round-trip INV/树命令/会话核心）
- [x] **Round C（子代理）**：spreadsheet-core + spreadsheet-renderers（78/49，公式引擎/选区/undo-dirty 守卫 CX-18 面）
- [x] **Round D（子代理）**：word-editor-core + word-editor-renderers（45/39，document-io recovery/normalize/dataset）
- [x] **Round E（子代理）**：report-designer-core + report-designer-renderers（35/35，core 状态机/UndoCommandStack/page-renderer）
- [x] **Round F（子代理）**：ui + theme-tokens + tailwind-preset + flux-i18n（95/80，原语门面/CSS 变量/token/i18n sink）
- [x] **Round G（子代理）**：flux-code-editor + nop-debugger（54/38，CodeMirror 装配/debug-client WS 编排/panel）
- [x] **Round H（子代理）**：print ×2 + xlang ×2（43/25，print schema→预览、xlang 编译→调试）
- [x] **Round I（子代理）**：42 份点名 C8–C12 的 bug note → defect family → 点名回归测试 live 核对
- [x] **Round J（子代理）**：跨层贯通——编辑器命令→undo→序列化往返链（五编辑器）、ui 门面→宿主消费链、xlang 编译→调试链、print schema→预览链、debugger attach→面板链
- [x] **工具消费**（执行者）：global-leaks 108（C8–C12 13 处逐处定性）/ jsdom pragma / todo-exitless
- [x] 交叉去重 + 八类分类 + P 级判定 + 归族；P1 注册前执行者逐条 grep 复核

Exit Criteria:

- [x] 21 包契约 → 测试映射清单落字（有守护 / 弱守护 / 无守护三列）
- [x] 十轮子代理产物在 `_tmp/arm2-ma44/`，每轮回答「本轮新发现了什么」
- [x] 三项工具输出消费行落字；全部 P1 有执行者复核记录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问，每轮有证据与「新增了什么」
- [x] 深化机会与 MA4.5 / MG / MA5 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且最后一轮显式停止
- [x] 全部发现归族 + P 级判定；P2/P3 入 deferred 附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-21-HHmm-arm2-MA4.4-designer-office-tests.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-21.md`

- Item Types: `Proof | Decision`

- [x] 报告按 MA4.1–4.3 同构格式落盘（含前提勘误注记）
- [x] arm2-index：MA4.4 行回填 + P1 行（如有）+ Last Updated 滚动，grep 复核
- [x] daily log 10-21 追加 MA4.4 条目（计数 = 报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，共用同一次运行）并登记；复跑三卫生扫描器核对 = 基线
- [x] 清理 `_tmp/arm2-ma44/`（closure audit 通过、提交前执行）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（实数记录入报告收口补记 + log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA4.4 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA4.4 `planned`→`done`，本 plan→`completed`
- [x] 提交前 `grep -nE "^- \[ \]|^Status: (planned|in progress)"` 本 plan 零残留 + grep roadmap MA4.4 行字面值 `done` + prettier 五文件
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`；显式路径提交，并发线文件不入 stage

Exit Criteria:

- [x] roadmap MA4.4 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_18baa6ba`（五项检查 + 全量复算：21 包规模表逐格 + 轮次 sub-total 求和、前提勘误归因〔ui merge 8 文件恰解释 +3/+3〕、三卫生工具实跑〔108/C8-C12 恰 13 处分布、todo-exitless 1、jsdom no new〕、bug note 42 路径锚定 + md5 去重 0 对、HEAD/roadmap/index 三方、contract-surface 300 行、Round J 与 MA4.3 H 零重叠、引用路径、五个 systemic 标签实存）
- Verdict: `pass-with-minors`（0B/0M/2m）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。m1 入口括注改为「19 包 .ts、2 包 .tsx」；m2 bug note 计数附 grep 口径（路径锚定 + md5 去重）——均已落字

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、七要素齐全、收口补记实数）
- [x] arm2-index 登记（MA4.4 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:audit-test-global-leaks`=108 / `check:jsdom-pragma-whitelist` no new / `check:audit-todo-exitless`=1
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA4.4 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（`agent_cef2bf7c` R1 `approved` 0B/0M/1m——六项全过：十一条 P1 亲自实跑复现〔P1-011 深挖三处 EVAL 发射点 :224/:291/:313 确证 3/7 精确〕+ 三扫描器独立实跑 + P2 降级抽样 3 条成立 + 并发提交 c4571cc92 零包变更与 10-21.md 零删除核验；m1 docs-only→docs+mission 措辞随收口 hunk 落地）
- [x] `pnpm typecheck`（当前全绿，零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: MA4.4 全部 Phase 交付完成——C8–C12 二十一包（live 482 src/363 test）测试有效性审计双风格落盘（multi 十轮子代理 A–J + open 三轮），P0=0/**P1=11**（flow readonly 全链零守护 / xyflow remove 翻译空回归面 / 端口六步校验三层脱节 / page-designer transient 分离零负证 / spreadsheet isFormulaError 漏判 #NAME?/#N/A〔live defect〕/ word save-recovery 链 unit 零贯通+失败类零守护 / theme-tokens↔preset 变量闭合零 guard / code-editor label 转发零 unit〔bug 19 已复发〕+ 模型→编辑器方向零覆盖 / xlang-debug env 适配+compile-service 零行为测试 / bind.ts 错误分类 3/7 裸奔）/P2=14（「测试守护的死接口」新族五实例、宿主 31/53 全量替换 ui 原语 systemic）/P3 若干；arm2-index 登记 MA4.4 行 + 11 条 P1（累计 40 open 待 MR）。**MA4.1–4.4 契约覆盖四项收官（C1–C12 全簇扫完）**。前提勘误（ui 87/75）与范围勘正（debug-client/bind.ts 归属）在案。closure audit R1 `approved`（0B/0M/1m）。零代码变更经审计员独立复验。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_cef2bf7c`（R1 `approved`，0B/0M/1m）
- Evidence: 六项全过——A 残留恰为后置链 8 处；B 双风格 + P1×11 七要素 + P2×14 定级句；C 十一条 P1 亲自实跑复现（P1-011 深挖确证 3/7 精确）+ 三扫描器独立实跑 + 前提勘误 8 文件复现 + 并发提交核验（零包变更、10-21.md 零删除）；D 降级抽样 3 条成立 + P0 排除论证成立；E 零代码变更（恰 7 项）；F 五处一致 + Evidence 未自填。

Follow-up:

- no remaining plan-owned work（MR2.0 消费 11 条 P1；MA4.5 消费 trio pin 计数与断言级漂移预筛；MG 候选见报告"建议新增的自动化检查"5 条）
