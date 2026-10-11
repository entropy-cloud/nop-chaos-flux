# 569 workaround-audit WA-9 工业画布渲染器审计批（flux-renderers-industrial）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-9 工作项，Phase Status 第 10 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/568/567`（WA-8/7 批，含跨包测试隔离条款与执行期披露先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-8/report.md`（前批沉淀：误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对工业画布渲染器（flux-renderers-industrial，SCADA 编辑器 + 运行态画布 + 符号库 + 点位绑定 + 序列化）单包执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，单模块）：**165 文件/22,307 行**（历批第二大体量，仅次于 WA-6 data 22,319；roadmap 行"约 21.4k"系拟制时估算，以 inventory 为准）；子域：binding/editor/engine/renderer/symbols/serialization/shared/test-support。
- **在途漂移口径（拟制时实测 2026-10-12）**：本包 `git status` **零在途**。拟制时 HEAD = `6fee267cb`（WA-7 收口提交）；WA-8 收口提交合入后 HEAD 前移，执行时以当时 HEAD 快照注记双口径行数。
- **字面标记**：literalEn **0**；literalZh **10**（实分三组：bypass 说明 ×4[point-store.ts:273/284 快照回填绕过 convert 防二次 scale + use-scada-engine.ts:301 保留路径 + scada-engine.ts:476 viewport clamp 绕过描述]、否定式注记 ×3[runtime-factories.ts:115/toolbox-runtime.ts:288/undo-stack.ts:41 "不绕过"/"防外部绕过"]、"临时态"设计注释 ×3[connection-overlay.ts:6/37 + connection-overlay-renderer.ts:10]——draft review R1 实测逐条打开核对全部为说明性注释无一是待办；批内仍须逐字核对其出口与注释鲜度）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass **75**（历批最高——`as any`/`as unknown as` 密集区，重点子域 editor/engine/renderer 待探针分区落字）+ setTimeoutCandidates **2** + domRaid **5**；silentCatch/keyRemount/pixelNudge/testEnvBranch 0。合计 **82 处模式候选 + 10 字面 = 92 处候选**逐个人工定性，禁止按 grep 定案。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **24 行命中**（renderer/scada-canvas ×6、renderer/hooks ×6[config-sync ×2/points-bridge ×2/engine/handles]、editor/scada-editor-canvas ×2+station-dialog ×2+template-dialog ×1+inspector/binding-panel ×3、binding/point-store ×2、engine/event-bridge ×1、symbols/base-shapes/text ×1——逐个去重定性）；`check:audit-runtime-raw-schema-reads` **1 行命中**（`editor/scada-editor-canvas.tsx:102`——WA-basic-001 同门禁家族，若坐实运行时正则回读，按 CX-12 家族升级定性或立案）；`check:audit-performance-suspects`/`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：非测试源 ≥500 行 **5 件**全 WARN 档（editor/scada-editor-canvas.tsx 691、engine/scada-engine.ts 574、editor/inspector/binding-panel.tsx 569、editor/toolbox/toolbox-panel.tsx 559、binding/refresh-pipeline.ts 505[gate 口径 506，±1 无尾换行约定差]）；≥500 行源文件一律结构走读。（跨包同族参照：plan 559 曾抽 3d 包 scene-manager 的 scene-json-assembly 守 700 行门——非本包历史。）
- **包特性与审计重心**：①engine（Leafer 引擎封装/scada-engine 574 行）与 renderer/hooks 族（engine/config-sync/points-bridge/handles 生命周期挂载清理对称性）——async 24 行命中密集于此，逐行核对错误路径可观测性；②editor 三件套（canvas 691/inspector 569/toolbox 559）——plan 538 shell collapsed 接线（b2141c8d6）与 plan 559 palette/i18n 波次后的复制沉积面；③binding/point-store——快照回填"绕过 convert"族注释（literalZh 10 处主体）的出口鲜度；④symbols 37 符号声明表——表状注册惯用形（builtins ARRAY\* 判例预判，仍逐个定性）；⑤serialization——undo/命令族与 kanban/gantt 双轨的家族交界（WA-scheduling-005 前批裁定注释可引用）。
- **交界防重复**：①plan 559（afde79407 SCADA/3D 薄桥接+演示丰富度，五门禁全绿+e2e sweep 105 passed；2026-10-10 completed：closure audit（agent_4b2ba8f9）修正后 approved——桥接/交互面结论直接引用不重案）；②plan 538（b2141c8d6 shell collapsed 接线，判别单测先红后绿在盘）；③c21e2dea9 懒加载收敛（scada-canvas-lazy.ts `createLazyRendererComponent` live 可证档：live 复核零复发 + `lazy-loading-guard.test.ts` 在盘直接引用）；④interaction-state 轨道 IS-1b 等设计器族工作项（shell collapsed 交互面已收口）；⑤WA-1..8 已立案发现与 CX-1..15 覆盖面不重复立案。
- **保护区与授权条款**：①本包 `src/index.ts` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认；扩展名 .ts）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（widget 件 self-styled 合法）。
- **跨包测试隔离条款（WA-7 教训固化）**：批内任何提取/重写**不得把带副作用的调用（`t()`、store 订阅、DOM 探测）提升进模块顶层求值路径**——WA-content-009 实证 filter 级门禁对此盲区；凡修复触及模块求值面，除本包 filter 四门禁外必须加跑 **flux-renderers-ai 全量套件**（注册栈导入链最长的哨兵包，850 用例口径以当次实测为准）。
- **五门禁基线**：拟制时点 = WA-7 收口（6fee267cb）隔离全绿（wa7-verify R3）；WA-8 收口后以收口提交的隔离五门禁全绿为生效基线。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/dropdown 六处 + WA-8 批收口中）与本包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-9/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（含 165 文件清单与行数双口径落字、typeBypass 75 处的子域分区计数）。
- findings 全量登记 ledger（`WA-industrial-001` 起三位零填充顺延，与既有 17 前缀零撞号），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；本包 `index.ts` 零公共导出变更。
- 台账 modules 行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；本包 `index.ts` 公共导出面的任何增删。
- plan 559 closure audit 的代跑；IS 轨道设计器族交互面的重复立案。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..8 已立案发现重复立案。
- playground 消费侧（scada-gallery/three-gallery/scada-pressure 等 demo 面）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-9/report.md` + ledger 登记/翻转 + roadmap WA-9 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..568 先例）；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-renderers-ai 全量套件（跨包测试隔离条款）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-industrial/src/`（读）、`docs/audits/workaround-code-smell/wa-9/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——92 处候选逐个定性（字面 10[三组：bypass ×4/否定式 ×3/临时态 ×3 全为说明性注释]+typeBypass 75[子域分区：symbols 43/editor 13/engine 13/renderer 2/test-support 4，几何回读族 46 处=61% 单 seam]+setTimeout 2+domRaid 5）+ 门禁交叉（async 24 行全有结构化失败路径零升级；raw-schema 1 行判定 D-1 ignored-kind 契约通道非 CX-12 同族——排除+watch 固化 owner doc；其余 4 门禁 0）+ 重复块探针（双版探针：逐字版 6,073 窗→18 区域/归一版 13,286 窗→105 区域→坐实 8 组/排除 17 组）+ 范围结构走读（165/165 全文覆盖零抽样；≥500 行 5 件全读 690/573/568/558/505）+ 误报排除 18 项+3 微注记。
- [x] Proof：每个立案候选 git 考古（19 commit；症状性 message 抽检 25=0；cq-4/plan 530/559/c21e2dea9/538 锚点全核验；行数三口径 22,307 零差）。
- [x] Decision：严重度 + ROI + 共性裁定——**8 条立案（P2×2+P3×6，零 P0/P1）**；去向=批内修 5[001/002/003/004/006]+008 部分（③①⑦修+余六组挂账同行登记）+watch-only 3[005/007/raw-schema 固化]；范围整体判断=零星个案级非系统性（收敛波边界止步+双域平行生长+D 类 cast 家族化）。
- [x] Proof：`wa-9/report.md` 落盘（239 行），findings 全量登记 ledger（8 行）；reconcile=113 findings（found 79+verified 34）/未处置 5[待 Phase 2 翻转]/violations 0。

Exit Criteria:

- [x] `wa-9/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（165 文件分档落字，行数三口径与 inventory 零差）。
- [ ] ledger 与报告一一对应零遗漏（零撞号）。
- [ ] 每个立案有 git 考古读数；误报排除逐项有对照理由。
- [x] 共性裁定落字（显式记"本批无新增独立 CX"——001/002 为 wa-8 dashboard-001 同型收敛面止步层判例引用，无需新立项）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复 6 项——001 symbol-tree-ops 回移（collectAllIds 补源+四处委托，委托式单源达成（editor-session 保留委托导出与内部调用各 1 处））+ 002 双画布孪生收敛（shared/canvas-shell 四件：parse/observeFirstCanvasTagging/attachResizeRefit/syncContainerDrivenSize；**运行态继承 W7 marker 竞态修复**——判别测试 scada-canvas-marker-race replaceWith 模拟 leafer 重建：修复前树 stash 恰 1 failed→修复后绿）+ 003 GeometryLeaf 收窄（几何 cast 非测试 src grep=0，确值读取 25 处 `!` 断言为旧 cast 精确语义孪生）+ 004 createPointsGeometryShape 工厂（props 键序/defaults 覆盖序逐字保持，line/arrow/pipe 薄壳化）+ 006 --ind-connection-drag 令牌化（light 保 #22c55e/dark #34d399 + readIndTokenVar + engine container getter）+ 008 ③①⑦（asReactNode 统一 ?? null/computeBounds 委托共享件/内联 instanceof ×3 改 errorMessage——editor-canvas 位点随 002 收敛）；watch-only 3[005/007/raw-schema owner-doc 已载 D-1 裁定]+008 余六组挂账同行登记零静默。
- [x] Proof：包 filter 四门禁——typecheck/build OK、lint **0 error**、test **1721/1721**（153 文件，+1 判别测试）；ai 哨兵 **850/850**；`index.ts` 零公共导出变更（engine 新增 container getter 为包内消费面非导出面变更）；执行期尾修（未用导入 ×5+误删 useScadaErrorText 当场恢复 86 failed→1721/1721）。

Exit Criteria:

- [ ] 红→绿证据在案（判别性测试点名）；本体删除验证逐项落字。
- [ ] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1；`index.ts` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过（113 findings = found 73 + fixed 6 + verified 34 / 未处置 0 / violations 0）。
- [x] Proof：draft review 通过时 roadmap WA-9 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（6 行）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [ ] reconcile exit 0 且 wa-9 报告存在。
- [ ] roadmap WA-9 行 `todo → planned` 已落并填 plan 路径。
- [ ] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_17e9db19-7976-486a-90e3-1d517116b188，review-only）
- Verdict: `revised`（零 Blocker、2 Major、3 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** oversized 非测试 ≥500 行计数失实（声称 4 件，live 实为 5 件——漏 binding/refresh-pipeline.ts 505/506，inventory 生成于拟制前非漂移系起草漏计）→ 4→5 件并补入走读清单；**M2** "scada-engine 曾按 plan 559 抽 scene-json-assembly"归属张冠李戴（该文件仅在 flux-renderers-3d，afde79407 对 industrial 的 src/engine 零改动，原话指 3d 包 scene-manager）→ 删除错误归属、改写为跨包同族参照括注；**m1** literalZh 10 处抽检枚举内部不一致（5 槽实指 4 处+分组不精确）→ 改如实三组分组（bypass ×4/否定式 ×3/临时态 ×3，审查员逐条打开核对全部为说明性注释）；**m2** Phase 3 Item Types 漏 `Decision`（fixed→verified 归属项）→ 补齐；**m3** roadmap "约 21.4k"与 inventory 22,307 差额未注记 → 补沿革注记。审查员 25 项清单全部 live 实测（inventory 逐项吻合、async 24 行逐 file:line 吻合、raw-schema-reads 恰 1 行、其余 4 门禁 0、plans 559/538 在盘、三 commit 在盘、lazy 载体在盘、17 前缀零撞号、行数 22,307 精确吻合、八子域在盘、symbols 恰 37 项、ai 850 hedge 在位）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修红→绿/行为保持收口；结构性/共性以 CX-n 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（判别测试红→绿 + filter 四门禁 + ai 哨兵）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-9 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: WA-9 单包审计批按自动修复契约完整收口——8 findings 全量落账零静默（fixed→verified 6 + watch-only 2[005/007]+008 余六组同行挂账 + raw-schema watch owner-doc 已载 D-1 裁定）；隔离五门禁（HEAD a439c55a3 + 本批 47 文件）R3 全链 exit 0；draft review R1 共识（0B/2M/3m 全修）+ closure audit R1 approved（0B/0M/6m 随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_4002476a-cf55-469e-874a-91107be33784，review-only）
- Evidence: R1 approved（0 Blocker/0 Major/6 Minor 随收口修正）——①落地实证 11 项全过（symbol-tree-ops 委托/canvas-shell 四件 8 调用点/GeometryLeaf cast=0[唯一命中为定义注释]/points-geometry 工厂与三薄壳逐字段对照 HEAD 键序值序一致/--ind-connection-drag 双 css 四处/container getter/008 三件/index.ts 零变更/豁免条目随迁）；②动态判别实证 2/2（marker effect 回退单发版→判别测试恰 1 failed；findNodeById 删 children 递归→editor 三套件 5 failed/24——恢复后 md5 一致零残留）；③五件一致性+批次边界 47 文件两树逐字节一致；④R3 五标记独立复核 + industrial 1721/1721 独立实跑 + reconcile 复跑；⑤链路史（R1 conformance 逮字面色豁免迁移/R2 knip 三符号收私/R3 终态全绿）。m1 modules 行翻转随收口提交完成；m2 报告 `!` 计数 25→30/31；m3 台账 001/003 行实际结果注记；m4 plan Phase 2 委托口径措辞；m5 调用点计数六→八/docs 计数对齐；m6 dev log watch-only 表述精确化——均随收口落盘。

Follow-up:

- watch-only：WA-industrial-005（族装配器参数化+deviceStates 单源，与下次 symbols 触碰合车）/007（documented-mirror 提取随下次触碰）/008 余六组（②④⑤⑥⑧⑨同行挂账登记）。
- raw-schema watch：owner doc（industrial-hmi-editor/design-renderer.md :133/:189）已载 D-1 整体字段裁定，防后续批误判为 CX-12 同族。
