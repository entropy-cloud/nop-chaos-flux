# 657 审计修复 R2·MA1.4：content 族定义与样式契约审计

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.4；`missions/audit-remediation-r2.json`；方法论 `docs/skills/flux-component-design-review-prompt.md` + `docs/skills/deep-audit-prompts.md`（§A + 附录 A）+ `docs/skills/architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1–MA1.3 plan 654–656（方法先例，不预载结论）、owner doc `docs/architecture/renderer-markers-and-selectors.md`

## Purpose

对 C4 content 渲染器簇（flux-renderers-content / layout / dashboard / pivot / mobile）执行结构与契约层审计，核心口径 = **定义与样式契约**（matrix MA1.4 取证要点），叠加依赖/导出面/注册共享方法。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `c67e0c37c`，干净树）

- **簇构成与规模**（roadmap 口径）：content 40 src/45 test、layout 21/23、dashboard 15/12、pivot 8/4、mobile 9/16，合计 93/100（A 级，5 包）。
- **依赖方向**：五包 deps 均含 {core, i18n, react, ui}；extras——content + qrcode/diff-match-patch/lowlight；layout + react-resizable-panels；**dashboard + `@nop-chaos/editor-core`（designer 族跨簇边——执行时核对用途）**；pivot + `@visactor/vtable`；mobile 无 extras。
- **`audit:deps` 现状**：全仓 57 条全 no-circular；**C4 命中 0 条**（与 M0 基线一致）。
- **deep import**：代码侧（TS/JS `from` 位点）未声明穿透 **0 条**；`./styles.css` subpath 引用 19 处（playground styles.css×5、vite.workspace-alias×5、tsconfig.base.json×4、flux-bundle style.css×2、index.test×2、mobile 注释×1）全部为五包 package.json **已声明 exports**（属 MA1.9 CSS exports 口径，非本项 finding；draft review M1 勘正——不写绝对「0 条」）
- **注册机制**：五包各一薄注册函数（content index.ts:63 / layout index.ts:36 / dashboard index.ts:35 / pivot index.ts:23 / mobile index.ts:22）；definition 文件每包独立（content `content-renderer-definitions.ts`；layout 多文件含 wizard/resizable/process-display；dashboard `dashboard-definitions.ts` + editor 侧 definitions；pivot/mobile 各单文件）。
- **样式契约面（本项核心）**：`check:audit-missing-renderer-markers` 0（include 正是 `flux-renderers-*`，C4 在扫描面内）；**`check:audit-styling-suspects` 本轮实跑 240（=M0 基线），C4 命中 6 条**——layout `styles.css:39`（wizard-step-nav 属性选择器 ×1）+ mobile `styles.css:37/63/68/73/78`（`[data-slot='notice-bar']` 变体选择器 ×5）；零新增命中（styling-suspects 注册基线 240 内；`pnpm check` 本身 exit 1=既有 knip-baseline 红 1 条，见 arm2-index M0——draft review m1 勘正，不写「check 绿」）。owner doc 锚点：Marker Layers 1–3 / Root Marker Rules / Universal Root Anchors（`data-renderer`/`data-cid`）/ Structural Flatness / Layer 3 Visual classes。
- **相关扫描器 M0 基线**（执行时复跑）：missing-markers 0、styling-suspects 240、renderer-definition-fields-only PASS、schema-prop-coverage PASS、audit-ui-consistency-gaps 0 新增、hardcoded-type-dispatch 0。
- **入口面**：index 行数 content 65 / layout 38 / dashboard 40 / pivot 25 / mobile 24；knip（R2 勘正口径，不误标全仓数）：`Unlisted dependencies` 全仓 35 行（=M0）中 **C4 相关 8 行**（pivot×4 + visual-inventory 脚本 layout/content/mobile/dashboard 各×1）；C4 的 unused-exports/types 执行时按 `packages/flux-renderers-{content,layout,dashboard,pivot,mobile}/` 过滤复跑登记（R2 粗计 ~16+26，以复跑为准）。
- **30 天 churn 热点**：dashboard `editor/dashboard-editor-renderer.tsx`(10)、content `diff-view/diff-view-renderer.tsx`(7)、layout `wizard-renderer.tsx`/`schemas.ts`/`layout-renderer-definitions.ts`(6×3)、dashboard `editor/dashboard-editor-definitions.ts`(6)、pivot `pivot-renderer.tsx`(5)。
- **执行状态**：roadmap MA1.4 当前 `todo`；`docs/audits/` 无 `arm2-MA1.4-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.4-content-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA1.4-<nnn>`；P2/P3 留报告 deferred 区）。
- 覆盖面（matrix MA1.4 + MA1 共享方法）：① 依赖图与跨包引用（含 dashboard→editor-core 跨簇边核对）；② **定义正确性**（definition 字段集 vs renderer-runtime.md Renderer-Level Static Metadata 口径 + definition-fields/prop-coverage 复扫）；③ **样式契约**（missing-markers 复扫 = 主扫描面；styling-suspects C4 6 条逐条裁定〔widget 自样式经 data-slot 钩子 vs 契约违反〕；marker 发射抽样对照 Marker Layers；layout/renderer 分工契约〔布局渲染器只发 marker〕抽验）；④ 导出面与注册完整性（5 入口 + 注册薄委托 + knip C4 过滤口径分段〔unlisted-deps 8 + exports/types 复跑〕）；⑤ 深化机会（systemic 记录不落地）。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.4 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记，修复归 MR 批量。
- 不排 MR/R\*.n 行；不改写历史文档；不预载 MA1.1–MA1.3 结论。
- 组件行为归 MA5、视觉走查（light/dark 页面级）归 MA6——本项样式契约只做 marker/样式**结构合规面**（发射面存在性、契约层归属、扫描器裁定）；页面级视觉质量线索记交叉引用。
- 不执行 MA1.5 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.4 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`（C4 包名正则过滤口径，勿用全仓分节总数）、`check:audit-styling-suspects`（C4 过滤）、`check:audit-missing-renderer-markers`/`renderer-definition-fields-only`/`schema-prop-coverage`/`audit-ui-consistency-gaps`/`audit-hardcoded-type-dispatch`、5 注册函数与 definition 集合、5 入口、owner doc renderer-markers-and-selectors.md + renderer-runtime.md 对照、git churn、deep-import 复扫。
- `docs/logs/` 当日 log 追加 MA1.4 条目；roadmap MA1.4 行状态流转。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）。
- 定级命中的修复；MA1.5+ / MR / MV / MG 执行或立项。
- 并发线未提交变更（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                              | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类均适用（本簇高概率实例：样式契约破坏致 marker 面塌陷/核心渲染循环断裂、公共导出面破坏性变更未通知、运行时崩溃；不限于所列） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index M0 基线                                                                                                             | 停止收口，归因（应零变更），报告记录                                                                 | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 定义 / 样式契约 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`（取证输出）

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑/复核 `audit:deps` C4=0（=M0）；**dashboard→editor-core 跨簇边**核对 import 内容与用途（designer primitive 复用 vs 边界突破——对照 flux-runtime-module-boundaries 包边界口径）；deep-import 复扫：未声明穿透预期 0，已声明 subpath（styles.css 等）单独归族不计违规
- [x] 定义正确性：五包 definition 集合逐包核对（单源数组 + 注册函数薄委托 + 条目计数）；抽样 ≥3 定义对照 Renderer-Level Static Metadata（hostContract 仅 domain-host、fields contract 单源、rendererClass 部分覆盖=设计）；复跑 `renderer-definition-fields-only` + `schema-prop-coverage`（=M0 PASS）
- [x] **样式契约**：`check:audit-missing-renderer-markers` 复跑 0（C4 主扫描面）；**styling-suspects C4 6 条逐条裁定**（layout wizard-step-nav ×1 + mobile notice-bar ×5：widget 自样式经 `data-slot` 钩子 vs Layer 3 visual class 归属——对照 owner doc Marker Layers/Root Marker Rules 给出合规/违规判定与 P 级）；marker 发射抽样 3 包各 1 组件（`data-slot`/`data-renderer` 盖章存在性 vs Layer 1/2 口径）；**layout 分工契约抽验**（布局渲染器只发 marker 类不硬编码 gap/flex——抽 layout 2 个布局组件 JSX + `audit-ui-consistency-gaps` 复跑 0 新增）
- [x] 导出面与注册：5 入口核对 + knip C4 过滤分段抽样裁定（unlisted-deps 8 行 + unused-exports/types 复跑口径各抽 ≥3；**登记时写过滤口径**，勿引用全仓分节总数）；churn 前 5 热点提交可追溯性抽样
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 四个取证维度各产出带证据条目（n/a 写理由）；styling-suspects 6 条与 knip 抽样全部完成 归族 + P 级判定（P0 触发 Failure Path）
- [x] 样式契约有明确结论（6 条裁定表 + marker 抽样 + layout 分工证据）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 热点逐个问"热改是否留下定义/样式债"、knip C4 过滤全量分段（unlisted-deps 8 + exports/types 复跑）、已知失败模式 #4（BEM/marker 漂移）/#5（@source 遗漏——C4 为既有包核对 styles.css 在 playground @source 面）/#9、MA1.3 报告交叉引用点（copyToClipboard 归宿候选在 C4 是否有同类）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：data-slot 变体样式膨胀（notice-bar 5 变体选择器是否该走 Tailwind 变体）、dashboard 编辑器态 definitions 与主 definitions 关系、mobile 无样式包依赖但有 styles.css 的装配方式、pivot vtable 重库边界
- [x] 深化机会与 MA5/MA6 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.4-content-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（范围/深挖/P0/P1/P2P3/误报排除/深化/open 两轮/交叉引用/收口补记门禁节），文件名含时间戳
- [x] arm2-index：MA1.4 行回填报告路径；P1（如有）入索引区（ID `P1-MA1.4-<nnn>`）
- [x] daily log 追加 MA1.4 条目（路径 + 发现计数 + 门禁 + 缓存回放口径注记）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并对照 M0 基线登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.4 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.4 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA1.4 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理（R1）+ 同审查线 R2/R3 终核（live 对账 11 组 + 修复核验 + knip C4 过滤复跑）
- Verdict: R1 `revised`（0B/1M/1m：deep-import 绝对 0 失实、check 绿措辞）→ 修法落实；R2 `revised`（M1/m1 修复 ✅ 但新 M：knip C4 35 误标全仓 Unlisted deps）→ 五处联动勘正；R3 `pass`（0B/0M，五处落实 + C4 unlisted-deps=8 live 复验，旧措辞 0 残留）→ 升级 `active`
- Rounds: 3
- Findings addressed: M1 deep-import 二分口径（未声明 0 + styles.css 已声明 19 处归 MA1.9）；m1 不写「check 绿」改「零新增 + exit 1 既有红」；M2 knip C4 全仓/过滤二分（Unlisted deps 全仓 35 / C4 8 行 + exports/types 复跑口径），五处联动（L21/L28/L44/L81/L96）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA1.4 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（缓存回放口径注明）
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.4 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 0B/0M + 3 非阻断 Minor——M1/M2 报告笔误已同 commit 勘正）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P2-MA1.4-001 与 P3×2 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.4 全部 Phase 交付完成——报告双风格（multi 五维度 + open 两轮）落盘、arm2-index 登记（MA1.4 行，P1=0）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit verdict `approved`（0B/0M + 3 非阻断 Minor，M1/M2 报告笔误已同 commit 勘正）。roadmap MA1.4 已流转 `done`。P0=0、P1=0、P2=1（notice-bar 变体样式形态债）、P3=2（knip C4 过滤 16+26、unlisted-deps 8）、systemic 候选 2 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，8 turns，8 任务组直接观测：styling 6 行号复核 + live 复跑 240/knip C4 过滤 8/16/26 复算 + 误报×4 抽验 + 三扫描器复跑 + arm2-index diff 逐字节 + git status 恰 5 文件）
- Evidence: Verdict `approved`（0 Blocker + 0 Major + 3 非阻断 Minor）；M1 editor-core 消费文件 5→6、M2 失败模式编号 #5→#9 已同 commit 勘正；M3（Phase 4 Status 标签）由 completed 流转自然消解；授权覆盖状态流转与收口提交（不声称 full-green）

Follow-up:

- no remaining plan-owned work
