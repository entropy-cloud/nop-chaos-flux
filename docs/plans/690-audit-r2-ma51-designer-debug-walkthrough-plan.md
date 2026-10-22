# 690 审计修复 R2·MA5.1：功能交互审计—designer 族 + 调试面实操走查

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA5.1；`missions/audit-remediation-r2.json`；方法论 `docs/skills/complex-component-display-operability-audit-prompt.md`（权威，§1 显示 / §2 接线可操作 / §3 测试有效 / §4 交互品质）+ `docs/skills/interaction-state-audit-prompt.md`（A–G 七类过程态缺陷 + V1–V7 七条不变量 + 每页五步法 + §6 必测序列）；owner doc `docs/architecture/flow-designer/design.md`
> Related: matrix MA5 节（报告名模式 `*arm2-MA5.1-designer-debug-walkthrough.md`）、`docs/audits/arm2-index.md`、MA4.5 报告（**待消费线索，非预载结论**：P1-MA4.5-005 flow-designer 加号按钮拦截/裁剪、P1-MA4.5-002 strict 诊断 console 噪声、P2-MA4.5-003 designer taskflow drag 拦截）、MA1.7/MA2.4/MA3.12–3.13/MA4.4 designer 面（已验面不预载）、`docs/audits/interaction-state/{is1-flow-designer,is4-designers}/`（仅作机制与检测启发，全部重新取证）
> 方法先例沿用（MA4.1–4.5）：`_tmp/arm2-ma51/` 中间件（收口清理）；零**入库**代码变更（探针 spec/配置全部落 `_tmp/`，用后删除；P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交，并发线文件不入 stage。

## Purpose

对 designer 族（flow-designer / taskflow-designer / page-designer〔含 editor-core 经 UI 面〕）与双调试面（nop-debugger 的 debugger-lab + scope-debug、xlang-debug）做 **browser-use 实操驱动**的功能交互走查：真实操作（点击/输入/拖拽/滚动/键盘）+ 程序化 pass/fail（`page.evaluate` 读数 / locator 断言 / `getComputedStyle`），按 A–G 七类过程态缺陷与 V1–V7 不变量定罪，叠加状态完备性口径（loading / empty / error / disabled / readonly / selected 六态逐页核对）与 F 类共享壳宿主接线对账（静态）。产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-22 live 实测，HEAD `caaebed4e`）

- **走查面与路由**（`apps/playground/src/domain-route-entries.ts` / `basic-route-entries.ts`）：`flow-designer`（:12）、`taskflow-designer`（:87）、`page-designer`（:74）、`debugger-lab`（:113）、`xlang-debug`（:134）、`scope-debug`（basic :105；其可导航面为 `#/lab/scope-debug`，`component-lab/renderer-lab-registry.ts:154` → `scope-debug-lab-page.tsx`）——6 路由 / 4 面；页面源 `apps/playground/src/pages/{flow-designer-page,taskflow-designer-page,page-designer-demo,debugger-lab-page,xlang-debug-page}.tsx`。editor-core 无独立页面，本项经 page-designer 面走查（命令/undo/序列化经 UI 触发）；其余 live 宿主（dashboard/scada/print/report/spreadsheet 等）归 MA5.3/5.5。
- **既有 e2e 覆盖（仅作对照，不预载结论；`ls tests/e2e | grep -cE`）**：`flow-designer` 子串 19 spec（flow-designer-\* ×16 + interaction-state-flow-designer ×2 + taskflow-designer-ui ×1）、`taskflow` ×3、designer-\* 共享 spec ×4、`page-designer` ×3、`debugger` ×2、`xlang-debug` spec ×1（另有 `xlang-debug-mock-server.mjs` 非 spec）。MA4.5 干净跑中 designer 面失败（报告口径）：flow-designer 加号拦截 ×3 + 叶子裁剪 ×2（P1-MA4.5-005）、designer taskflow drag 拦截 ×1（P2-MA4.5-003 集体项）、page-designer 路由 gate 红（P1-MA4.5-002 族）——本项以 live 走查**重新取证**，不引用其定级。
- **工具基线**：`check:designer-conformance`、`check:page-designer-boundary`、`check:audit-canvas-wrapper-a11y` 三扫描器（M0 全 exit 0；2026-10-22 复核 exit 0）；本项复跑 = 基线并消费其输出做 F 类对账起点。共享壳 `WorkbenchShell`：JSX 宿主 **7**（flow `designer-page-body`、`dashboard-editor-renderer`、`scada-editor-canvas`、report/spreadsheet `page-renderer`、`word-editor-page`、playground `report-designer-demo.tsx:453`）+ 定义/再导出 3 + 注释级引用若干（`grep -rl WorkbenchShell --include='*.tsx' packages/*/src apps/playground/src` 程序化枚举为准）——本项对账 designer+debug 面宿主（designer-page-body），簇外 6 宿主差异记跨簇线索给 MA5.3/5.5。
- **历史台账（检测启发，禁止引用其编号结案）**：`docs/audits/interaction-state/is1-flow-designer/`、`is4-designers/`（IS-taskflow-designer-004 toast 噪声为在案项〔`is4-designers/findings.md:78`〕——命中时引用既有行不重复开案，但须本轮 live 复现）。
- **执行状态**：roadmap MA5.1 `todo`；arm2-index MA5.1 行 `—`；MA4.1–4.5 全部 `done`（HEAD caaebed4e）。
- **浏览器基建**：playwright + chromium（`playwright.config.ts` webServer 自启 playground 4175 + xlang mock 4180，命令为相对路径）；探针配置形态（本 plan 内联描述为准，MA4.5 原文件已随 `_tmp` 清理）：`_tmp/arm2-ma51/probes/playwright.probes.config.ts` = spread 根配置 + `testDir` 指向本目录 + `webServer` 每项 `cwd` 钉仓库根 + retries 0 / workers 1；探针 spec 用 `@playwright/test` 原生 `test`（不走 fixtures 零错误门），手动采集 console/pageerror/toast。

## Goals

- 产出 `docs/audits/2026-10-22-HHmm-arm2-MA5.1-designer-debug-walkthrough.md`：双风格（multi 四轮 + open ≥2 轮），每条 finding 按 A–G 分类 + V1–V7 读数定罪 + P0–P3 分级（P1 ID `P1-MA5.1-<nnn>`）+ 归属四方（demo/schema 接线 | renderer 行为 | 设计系统令牌 | 能力缺口）+ 归族。
- 覆盖面（逐页台账，IS 格式 `[IS-<page>-<seq>]`）：
  - ① **flow-designer + taskflow-designer**（画布/设计器类必测序列：初始视口读数 → 插入/删除/拖动节点/撤销 → V2；"+"按钮 V4 几何；缩放/fit 后选择集；右键菜单确认/取消/Esc 三路径；tree 模式切换；toast 全量枚举 V7；六态核对）
  - ② **page-designer（含 editor-core 经 UI）**：画布放置/选中/属性编辑/undo-redo/序列化导出导入往返（V3 真实反馈）、拖拽中间态 V4、Esc 取消 V5、六态核对
  - ③ **nop-debugger 调试面（debugger-lab + `#/lab/scope-debug`）**：attach/inspect/面板展开/过滤/清空/断开链路、六态逐一核对（loading / empty / error / disabled / readonly / selected）、键盘可达、toast 卫生
  - ④ **xlang-debug 调试面**：编译→调试会话→断点/步进/变量面板→服务端断连重连（真实 mock server 4180）→错误态；六态核对；键盘可达
  - ⑤ **F 类共享壳宿主接线对账**（静态 + 运行时确认）：WorkbenchShell designer 面宿主 props 矩阵（collapsed 一族 / resize 一族 / view-mode）vs owner doc family mapping；三扫描器复跑消费
  - ⑥ **G 类反馈通道**：每页 initScript 单调 toast 记录器全量采集 + 逐条动作映射；render 路径 `env.notify`/`console.(log|debug)` 静态扫描
- 登记 arm2-index（MA5.1 行 + P1 行如有）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明，Cross-Cutting 9）。

## Non-Goals

- 不修改任何入库代码/测试/配置（P0 即时通道除外）；不预载 MA4.5/MA1–MA4 designer 面 finding；不做视觉风格评审（MA6.4）；不做性能阈值裁决（MA7.1）；不审 report/spreadsheet/word/scada/dashboard 宿主（MA5.3/5.5；簇外 F 类差异仅记线索）。
- 不新建 `docs/audits/interaction-state/<批次>/` 目录——台账并入 arm2 报告（产物单一）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA5.1 报告 + arm2-index 登记回填。
- 只读取证 + `_tmp/arm2-ma51/` 探针 spec 实跑（四轮子代理 + 执行者复核探针）。
- `docs/logs/2026/10-22.md` 追加 MA5.1 条目；roadmap MA5.1 行状态流转；本 plan 状态流转；收口提交 `fix(audit-r2):` 格式。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA5.2+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号    | 触发                                           | 行为                                                                                 | 是否可重试 | 用户可见表现   |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- | -------------- |
| e2e-env-failure | playground/xlang mock 启动失败或端口占用       | 归因记录，修复环境后重跑                                                             | 是         | 无             |
| probe-flaky     | 探针读数单次漂移（冷编译/动画未稳）            | 同序列重跑 ≥2 次取稳态；仍不稳则记 watch-only 不进 P0/P1（prompt §4 步 4）           | 是         | 无             |
| face-overflow   | 某一面走查量超单会话收口上限                   | 按 roadmap Cross-Cutting 5 预授权在 closure 时拆字母批（MA5.1-a 调试面等）附触发证据 | 否         | 无             |
| audit-p0-found  | 发现 P0——Rule 2 六类之一（核心操作不可完成等） | P0 即时通道：plan 内追加 Fix Phase 或异步注入独立修复 plan                           | 否         | 无（修复先行） |
| subagent-quota  | 子代理轮次因限流/模型失败中断                  | 同轮 fresh 重启一次；二次失败由执行者亲跑该面精简序列并在报告披露                    | 是         | 无             |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan（browser 探针为临时 `_tmp` 文件，零入库变更）；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：四面实操走查（四轮 fresh-session 子代理 + 执行者对账）

Status: completed
Targets: `_tmp/arm2-ma51/round-{A,B,C,D}.md`、`_tmp/arm2-ma51/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · flow-designer + taskflow-designer**（子代理 A，12 探针；首轮成功）：IS-flow-designer-009..014 + IS-taskflow-designer-009/010 + 在案 004 复现 ×3——P0×3 条/2 根因、P1×2、P2×2、P3×1；执行者 RECHECK1/2/3 复证（graph 3 列 `240px 616px 352px` vs tree computed `1232px`；7 加号按钮 3 可点）
- [x] **Round B · page-designer（含 editor-core 经 UI）**（子代理 B，13 探针；首轮模型请求失败重启一次〔Failure Path subagent-quota〕）：IS-page-designer-015（P0，执行者 b03/b08 复证）/016（P1，3/3）/017（P3 watch）/018（P3）；undo/序列化往返/预览只读通过面
- [x] **Round C · nop-debugger 调试面（debugger-lab + `#/lab/scope-debug`）**（子代理 C，17 探针 ×2 全绿；首轮模型请求失败重启一次）：IS-debugger-lab-01（P1，执行者重跑 before 800/after 0 复证 + timeline-tab.tsx:111 源码级）/−02（P3）、IS-scope-debug-01（P3）；V3/V5/V6/V7 健康面
- [x] **Round D · xlang-debug 调试面**（子代理 D，5 轮全复现；首轮模型请求失败重启一次）：IS-xlang-debug-01（P0，执行者 D5 + 源码定罪 offset/line 错位）/02（P1 零 CSS）/03（P1 断连不可见）/04-07（P2×2 P3×2）
- [x] **F 类对账 + 工具消费**（执行者，`executor-static.md`）：三扫描器 = 基线；WorkbenchShell 7 JSX 宿主矩阵（flow 宿主 collapsed+resize 全接线无缺口；簇外 6 宿主移交 MA5.3/5.5）；G 类静态 4 面 render 路径无 debug dump；`resolveWorkbenchGridCols` 八分支 + 扫描面字面量盘点（P0-001 机制定罪）
- [x] **交叉去重 + 分类分级归属归族**；P0/P1 注册前执行者逐条 live 复核（RECHECK1/2/3、b03/b08、C02-4 重跑、D5、g-undo 重跑——全部复现）

Exit Criteria:

- [x] 四轮台账落字（每页 IS 条目含读数 diff；六态核对表 A/B/D 各 6 行 + C 12 行；toast 映射 4 份）
- [x] F 类矩阵 + 三扫描器输出消费行落字
- [x] 全部 finding 分类（A–G）+ 分级 + 归属 + 归族；P0×4/P1×6 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（tree 塌缩是否 workbench 通用 → systemic 升级；工作流 vs taskflow 宿主 undo 三分叉；调试面 vs 设计器面健康度差的结构性解释 → 组合态矩阵零覆盖），三轮各有证据与「新增了什么」，第三轮显式停止
- [x] 深化机会与 MR3 / MG / MA6.4 交叉线索分栏记录（共享壳组合态门禁、check:audit-runtime-composed-classes、簇外宿主对账）

Exit Criteria:

- [x] open 段 ≥2 轮且最后一轮显式停止（3 轮）
- [x] 全部发现归族 + P 级判定；P2/P3 入 deferred 附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-22-1150-arm2-MA5.1-designer-debug-walkthrough.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-22.md`

- Item Types: `Proof | Decision`

- [x] 报告按 MA4.x 同构格式落盘（审核范围 / 深挖统计四轮 + F/G / P0 清单〔4 根因 → 4 修复 plan〕/ P1 ×6 七要素 / P2-P3 deferred / 既有线索复核 / 归族 / 误报排除与方法自纠 / open 三轮 / Coverage / Next Tests / 已自动化 / 建议新增 / 证据索引 / 收口补记）
- [x] arm2-index：MA5.1 行回填 + **P0 追踪区首现 4 行** + P1 ×6 行 + Last Updated 滚动（累计 52 open）
- [x] daily log 10-22 追加 MA5.1 条目（计数 = 报告实数；**并发线 FM-5 仓库卫生条目同文件在途——提交时仅 stage 本项 hunk**）
- [x] BUILD_VERIFY 全量 `pnpm test` + 三扫描器复跑登记（exit 0，82/82 cached；扫描器 = 基线）
- [x] 清理 `_tmp/arm2-ma51/`（closure audit 通过后、提交前执行：探针/台账/服务器日志删除 + 自启 dev server/mock 进程终止；`git status` 零 packages/ 泄漏复核）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核：P0-MA5.1-001..004 + P1-MA5.1-001..006 两侧命中；MA5.1 报告行实存）
- [x] BUILD_VERIFY 实跑结果已记录入报告收口补记 + log（门禁本体在 Closure Gates，此处仅证据产出）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA5.1 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理 `agent_e07cd919`）R1 `issues`（0B/2M/4m）→ 回修 → R2 **`approved`**（0B/0M）通过后：roadmap MA5.1 `planned`→`done`，本 plan→`completed`；**P0 ×4 修复 plan 保持 `draft` 待即通道执行（MA5.2 开工前收口）**
- [x] 提交前 `grep -nE "^- \[ \]|^Status: (planned|in progress)"` 本 plan 零残留 + roadmap 行字面值 `done` + prettier 五文件 + `_tmp` 已清 + `git status` 无 packages/ 泄漏
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log〔仅本项 hunk——并发线 FM-5 条目不入 stage〕+ roadmap + 4 份 P0 fix plan draft），`fix(audit-r2):` 格式；标题不声称 `full-green verification`；显式路径提交（临时 GIT_INDEX_FILE 从 HEAD 树构建，并发线已 staged 的 39 renames/package.json 不受影响）

Exit Criteria:

- [x] roadmap MA5.1 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_fbe2e0fc`（五项检查 + 全量复算：6 路由行号、页面源实存、HEAD/roadmap/arm2-index 状态、MA4.5 报告三条线索实存、is1/is4 台账与 IS-taskflow-designer-004 实存〔findings.md:78〕、三扫描器亲跑 exit 0、playwright webServer 相对命令核实、报告名模式对照 arm2 矩阵 :109）
- Verdict: R1 `revised`（0B/2M/6m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 e2e 计数口径（30→显式模式实数 19/3/4/3/2/1 + mock-server 非 spec）；M2 WorkbenchShell 消费方口径（12→JSX 宿主 7 + 定义 3 + 注释级，含 playground report-designer-demo:453，grep 程序化枚举为准）；m3 MA4.5 线索改报告支持粒度；m4 scope-debug 可导航面 `#/lab/scope-debug` 指针；m5 editor-core 其余宿主归 MA5.3/5.5；m6 Round C 六态措辞；m7 Phase 3 BUILD_VERIFY 条目改证据产出；m8 探针配置形态以本 plan 内联为准——均已落字

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致（P0 ×4 + P1 ×6 + MA5.1 行）
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（exit 0，82/82 cached）
- [x] 三扫描器（designer-conformance / page-designer-boundary / canvas-wrapper-a11y）= 基线
- [x] 不存在被静默降级的 in-scope 项（watch-only 项按 prompt §4 步 4 降级并附理由，落 Deferred；P0 ×4 走即时通道不滞留 MR）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma51/` 清理 + `git status` 无 packages/ 泄漏）
- [x] roadmap Work Item Status MA5.1 行已流转 `done`（closure audit R2 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据：`agent_e07cd919` R1 `issues`（0B/2M/4m）→ 回修 → R2 `approved`（0B/0M/0 new Minor），见 `## Closure`
- [x] `pnpm typecheck`（44/44 cached，零新增）
- [x] `pnpm build`（44/44 cached）
- [x] `pnpm lint`（44/44 cached）
- [x] `pnpm test`（82/82 cached，exit 0）

## Deferred But Adjudicated

### 无法程序化取证的 watch-only 项（page-designer 017 Esc 落点指示残留、docked panel 遮挡等）

- Classification: `watch-only residual`
- Why Not Blocking Closure: interaction-state prompt §4 步 4 预授权——"无法程序化取证的发现降级 watch-only，不进 P0/P1"；真实取消管线（dragend/pointercancel）本 Chromium CDP 拒绝合成，取证通道不存在而非未尝试。
- Successor Required: `yes`
- Successor Path: MR3（017 修 dragend 处理后以真实鼠标序列取证）；MA6.4（遮挡/一致性观察项）

### P0 ×4 修复（即时通道，不属本审计 plan 的代码变更）

- Classification: `out-of-scope improvement`（对审计项而言；对仓库为 P0 即时通道义务）
- Why Not Blocking Closure: 审计项零入库变更（roadmap Cross-Cutting 9）；P0 处置 = 注入 4 份独立修复 plan（Cross-Cutting 3 预授权形态），已在 arm2-index P0 追踪区登记路径与状态，**在 MA5.2 开工前依次执行**（先红后绿 + closure audit）。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-10-22-0500-arm2-fix-P0-MA5.1-00{1,2,3,4}-*.md`（draft；逐份 review→执行→closure→提交）

## Non-Blocking Follow-ups

- MG 沉淀候选：共享壳组合态门禁（WorkbenchShell 8 组合 × 宿主矩阵 computed 轨道检查）；`check:audit-runtime-composed-classes`（模板字面量拼接的 Tailwind arbitrary 类扫描，docs/bugs/14 族通用化）；IS-taskflow-designer-004 toast 清零回归钉。
- 跨簇线索：WorkbenchShell 簇外 6 宿主 collapsed/resize props 完整对账（MA5.3/5.5）；xlang-debug 面接 `@nop-chaos/ui` 控件族（AGENTS UI Component Usage 约定）。

## Closure

Status Note: 六路由四界面全走查收官（P0 ×4 即时通道注入 4 份修复 plan draft、P1 ×6、P2×3、P3 若干，全部探针定罪 + 执行者复证）；**字母批裁定：不拆分**——Cross-Cutting 5 为触发条件式预授权（单 plan 收口上限溢出时才拆），本项每面恰为一轮、face-overflow 未触发（closure audit R1 项 E 评估为 legitimate）；零入库代码变更核验通过；两项 Deferred（watch-only 取证不可得 / P0 移交即时通道）均有预授权与 successor。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_e07cd919`（三件套输入；worksheet `_tmp/arm2-ma51/closure-audit-R1.md`，随 \_tmp 清理，结论录此）
- Evidence: R1 `issues`（0B/2M/4m：M1 plan 簿记预勾选、M2 canvas 读数 369×45 系 ×0.3 zoom 缩放视口内容非 pane 尺寸）→ 回修（Phase 4 回退 in progress + 三处 1232×153 勘正 + m1 Escape 措辞/m2 探针计数 37 spec/m4 日期注记）→ R2 **`approved`**（0B/0M/0 new Minor；M1/M2 复核 landed、回归清扫 packages/apps 干净、并发线字节级未动、扫描器/探针结论不受影响）。审计员独立复跑 RECHECK3（graph `240px 616px 352px` vs tree `1232px`）、三扫描器 exit 0、源码级复核 P0 四根因（workbench-shell.tsx:87-116 / designer-command-adapter.ts:162→core.ts:545 / schema.ts:34-40 + edit-assembly.ts:30-32 / breakpoint-gutter.ts:46-52 + fields.ts:9）。Writeback 条件（m3 Status Note、同 commit 回写、并发线不入 stage）已全部满足。

Follow-up:

- no remaining plan-owned work；P0-MA5.1-001..004 修复 plan（draft）于 MA5.2 开工前依次执行；MR3 消费 P1 ×6 + P2 ×3；MG 候选（共享壳组合态门禁、runtime-composed-classes 扫描、toast 清零钉）
