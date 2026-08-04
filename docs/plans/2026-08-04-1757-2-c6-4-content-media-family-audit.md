# C6.4 content 媒体类逐组件审计（audio/video/carousel/qrcode）

> Plan Status: active
> Mission: component-audit
> Work Item: C6.4
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C6.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`、`docs/logs/2026/08-04.md`（C6.1/C6.2 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C6.1（`2026-08-04-0841-2`，completed）/ C6.2（`2026-08-04-0841-3`，completed）同包同族先例；与 C6.3（`2026-08-04-1757-1`）/ C6.5（`2026-08-04-1757-3`）并行独立（均只依赖 C0）。前置基础：08-02 nested-schema 机制（completed）已分类本族字段（audio/video title value-or-region、carousel items 数组、qrcode label value-or-region）；CX-9 反应式结果捕获通道（completed，C4.2）——本族无 kind:'reaction' 字段，仅核对不消费

## Purpose

对 `flux-renderers-content` 媒体类 4 个组件（audio/video/carousel/qrcode）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（**carousel 活动项 local 状态经 embla api 桥接、qrcode value 渲染 echo（canvas 重绘）**）、5 DOM 契约（根 marker 类 nop-audio/nop-video/nop-carousel/nop-qrcode + 媒体原生元素属性透传）、7 事件与 action 契约（**onLoadError 事件 shape、carousel onChange payload**）、11 异步生命周期（**媒体元素加载失败/错误处理、竞态、carousel autoplay 清理**）、12 组合宿主场景（**媒体在 dialog/CRUD 行内加载、bug 73 模式专项**）、18 注册/IO/安全红线（媒体 src URL 校验、qrcode canvas 渲染无 IO）。

## Current Baseline

- **组件与文件**：`audio.tsx`（79 行）、`video.tsx`（89 行）、`carousel.tsx`（319 行）、`qrcode.tsx`（119 行）。
- **注册定义**：`content-renderer-definitions.ts`（audio `:417`、video `:434`、carousel `:454`、qrcode `:479`）；字段分类（08-02 机制）：audio fields `:423-431`（src/poster/autoPlay/loop/controls prop + title value-or-region + onLoadError event）、video fields `:440-451`（src/poster/autoPlay/loop/controls/muted/width/height prop + title value-or-region + onLoadError event）、carousel fields `:468-476`（items prop + autoPlay/interval/loop/controls/indicators prop + onChange event，propContracts items array `:460-467`）、qrcode fields `:485-493`（value/size/level/foreground/background prop + label value-or-region + onLoadError event）。四组件 defaultSchema 均为 `{ type: '<type>' }`。
- **实现依赖**：`carousel.tsx` 复用 `@nop-chaos/ui` Carousel（embla 底座，`:7` 导入、`useEffect` `:59/:90/:171` 桥接 embla api 到 local 状态）；`qrcode.tsx` 使用 `qrcode` npm 包 canvas 渲染（`:2` 导入、`useEffect` `:49` 生成、DEV 日志 `:64`、空/错误回退 UI `:73-96`）。
- **设计文档**：`docs/components/{audio,video,carousel,qrcode}/design.md` + `example.json` 均存在。
- **playground**：4 组件**无 component-lab lab 页**（维度 18 缺口待核对）；demo 宿主在 `apps/playground/src/pages/w4a-multimedia-demo.tsx`（audio demo-audio `:63`/demo-audio-empty `:70`/demo-audio-error `:74`、video demo-video `:79`/demo-video-empty `:87`、carousel demo-carousel `:91` + 外部 next/prev/setValue 按钮 `:129-143`、qrcode demo-qrcode `:103`/demo-qrcode-empty `:111`/demo-qrcode-alt `:115`）。
- **既有单测**：`audio.test.tsx`（7 用例）、`video.test.tsx`（7 用例）、`carousel.test.tsx`（10 用例）+ `carousel-autoplay.test.tsx`（8 用例，autoplay/interval 专项）、`qrcode.test.tsx`（9 用例）。
- **e2e**：`tests/e2e/w4a-multimedia-family.spec.ts`（9 测试：audio 原生元素+空态+失败回退 3、video muted 属性+空态 2、carousel 幻灯片+指示器+next/prev/setValue 2、qrcode canvas+空态+值差异 2）；本族无 `tests/e2e/component-lab/c6-4-host-surfaces.spec.ts`（需新增）。
- **基线**：C0 基线 unit 全绿（typecheck/build/lint 31/31、test 58/58）；**e2e 已于 C5.1 verify 轮达成 full-green（882 passed / 43 skipped / 0 failed），C6.2 VERIFY 轮维持（929 passed / 43 skipped / 0 failed，`docs/logs/2026/08-04.md`）**——本 plan 不继承 e2e pre-existing 债务；`gantt-bars-and-links.spec.ts:132` 拖拽时序 flake 为机器负载 watch-only residual（successor C9，本 plan 不涉及）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{audio,video,carousel,qrcode}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——媒体元素在 dialog 内加载 + 错误回退、carousel 外部 ComponentHandle next/prev/setValue + 自动播放切换、qrcode 值更新 canvas 重绘。
- roadmap C6.4 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C6.3 content 值映射类（alert/mapping/status，`2026-08-04-1757-1` 覆盖）、C6.5 diff-view（`2026-08-04-1757-3` 覆盖）。
- C6.1/C6.2 已收口组件不重审。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 4 组件 × 18 维审计卡（维度重点：1 Schema 契约（AudioSchema/VideoSchema/CarouselSchema/QrCodeSchema 与注册 fields/propContracts 一致）、2 RendererComponentProps 合规、3 值所有权三态（**carousel 活动项 local state 经 embla api 桥接（无 valueOwnership 声明即有意设计，不得裁为契约漂移）、qrcode value 变化 canvas 重绘 echo、audio/video 无 value**）、4 表单参与（本族非表单字段——核对无表单参与泄漏）、5 DOM 与选择器契约（**根 marker 类 nop-audio/nop-video/nop-carousel/nop-qrcode、媒体原生元素属性透传（muted/controls/autoplay/loop）、carousel slide 结构**）、6 嵌套 schema 分类（**08-02 机制核对：audio/video title value-or-region、qrcode label value-or-region、carousel items 数组、无 deepFields 残留**）、7 事件与 action 契约（**onLoadError 事件 shape 与 eventContracts、carousel onChange payload**）、8 a11y（媒体元素 aria-label/title、carousel 键盘操作）、9 i18n（空态/错误态文案 key）、10 四态覆盖（空/加载/错误/禁用——audio/video 空态与失败态、carousel 空 items、qrcode 空值）、11 异步生命周期（**媒体元素加载失败/错误事件处理、竞态、carousel autoplay effect 清理、abort 路径**）、12 组合宿主场景（**媒体在 dialog/CRUD 行内加载（bug 73 模式）、carousel ComponentHandle 外部控制**）、13 样式契约（widget renderer 自样式 + marker 类）、14 React 19、15 性能边界（carousel 大量 slides、qrcode 重绘频率）、16 测试质量（既有测试断言正确行为而非 not-throw、错误路径、autoplay 清理断言）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——覆盖缺口核查**、媒体 src URL 校验、qrcode canvas 无 IO））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（媒体 dialog 内加载 + 错误回退、carousel 外部控制 + autoplay、qrcode 值更新重绘）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C6.1/C6.2/C6.3/C6.5 content 其余族（并行/后续 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号       | 触发                         | 行为（含错误码）                                                 | 可重试 | 用户可见表现      |
| ------------------ | ---------------------------- | ---------------------------------------------------------------- | ------ | ----------------- |
| host-media-dialog  | audio/video 在 dialog 内加载 | 正常加载或 src 失败 → 错误回退 UI + onLoadError 派发、空态不崩溃 | 是     | 媒体播放/回退正确 |
| host-media-error   | src 加载失败                 | onLoadError 派发、错误态渲染、可恢复（src 更新后重试）           | 是     | 错误回退可见      |
| host-carousel-ctrl | 外部 ComponentHandle 控制    | next/prev/setValue 驱动活动项切换、onChange payload 正确         | 是     | 幻灯片切换正确    |
| host-carousel-auto | autoplay 切换                | interval 驱动切换、卸载清理无泄漏                                | 是     | 自动轮播正确      |
| host-qrcode-update | qrcode value 更新            | canvas 重绘为新值、空值空态                                      | 是     | 二维码更新正确    |

## Test Strategy

本档选择：**必须自动化** —— 媒体元素错误生命周期（onLoadError + 错误回退）与 carousel autoplay 清理是异步生命周期核心回归路径；carousel ComponentHandle 外部控制是复合交互契约重点；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` + 相关 e2e 回归（`w4a-multimedia-family.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-content/src/{audio,video,carousel,qrcode}.tsx`、`content-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：4 组件注册项（type/fields/propContracts/eventContracts）与各自 schema 一致（维度 1/18）。
- [ ] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态（维度 3：**carousel 活动项 local state 经 embla api 桥接核对——「缺 valueOwnership」不得裁为 P1（local 有意设计）；qrcode value 变化 canvas 重绘 echo**）；08-02 字段分类（维度 6：audio/video title、qrcode label value-or-region、carousel items 数组、无 deepFields 残留）。
- [ ] 事件与 action 契约（维度 7：**onLoadError 事件 shape 与 eventContracts 一致、carousel onChange payload**）与 a11y（维度 8：媒体 aria-label、carousel 键盘）。
- [ ] 异步生命周期（维度 11：**媒体元素错误事件、竞态、carousel autoplay effect 清理、abort 路径**）与性能边界（维度 15：carousel 大量 slides、qrcode 重绘）。
- [ ] 测试质量（维度 16）：既有测试断言正确行为而非 not-throw、错误路径、autoplay 清理断言——假绿核查。
- [ ] 文档对照（维度 17）：4 组件 design.md ↔ 实现 props/行为逐项核对。
- [ ] playground 覆盖核查（维度 18）：4 组件无 component-lab lab 页——记录缺口并裁决（P2 低成本当场补页，Phase 3 落地）。

Exit Criteria:

> 本 Phase 交付 4 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{audio,video,carousel,qrcode}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因，按 roadmap §7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-content typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c6-4-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 **4 个 lab 页**（`audio-lab-page.tsx`/`video-lab-page.tsx`/`carousel-lab-page.tsx`/`qrcode-lab-page.tsx`，补上维度 18 缺口——P2 低成本当场补页裁决）+ **`RENDERER_LAB_REGISTRY` 注册 4 条**（`apps/playground/src/component-lab/renderer-lab-registry.ts`，缺注册则 component-lab-page 不渲染 lab 页且 smoke 覆盖失败——C6.1/C6.2 先例均含 registry 条目）+ `data-c6c4-host.ts` 宿主 schema 模块 + CONTENT_RENDERER_ROUTES 追加 4 条（与 C6.1/C6.2/C6.3 共用常量模块——协调先例：C6.1 建模块 5 条、C6.2 追加 6 条至 11 条、C6.3 追加 3 条至 14 条，本 plan 追加至 18 条）+ `COMPONENT_LAB_COVERAGE_MANIFEST` 4 条（smoke.spec.ts 自动覆盖）+ route-matrix 计数测试同步（lab 路由不经 `DOMAIN_RENDERER_ROUTES`，由 smoke.spec 门禁；route-matrix liveTotal 动态求和自动一致）。
- [ ] bug 73 模式专项检查：**媒体元素在 dialog 内加载 + 错误回退**（真实浏览器宿主，非仅单测）；carousel 外部 ComponentHandle 控制 + autoplay 切换组合。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`w4a-multimedia-family.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C6.4 行）

- Item Types: `Proof`

- [ ] 全卡复查：4 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-content test` + 相关 e2e spec 全绿（e2e 基线 full-green 929 passed/43 skipped/0 failed，本 plan 不得引入新增失败）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` + `pnpm test:e2e` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（若有）与决策、与 C6.1/C6.2/C6.3 的 CONTENT_RENDERER_ROUTES 协调结论。（`docs/logs/2026/08-04.md` C6.4 节）
- [ ] roadmap C6.4 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_033c6a876ffefK26eOuzCF5Jov`）
- Verdict: `pass`（Round 2 零 Blocker/Major 零 Minor；Round 1 `revised` 的 Major-1/Minor-2/3/4 已修正复核通过）
- Rounds: 2
- Findings addressed: **Major-1（5 个单测用例数系统性虚高）已修正**——live 实证 `audio.test.tsx` 7、`video.test.tsx` 7、`carousel.test.tsx` 10、`carousel-autoplay.test.tsx` 8、`qrcode.test.tsx` 9（`rg -c "\bit\("` 复核）；**Minor-2/3/4 已修正**（carousel ui Carousel 导入 `:7`（import 块 :5-14）、useEffect `:59/:90/:171`、qrcode DEV 日志 `:64` + 空/错误回退 UI `:73-96`）；并补 `RENDERER_LAB_REGISTRY` 注册 4 条至 Phase 3（与 C6.3/C6.5 同型修复，缺注册则 lab 页 null + smoke 覆盖失败）。其余引用核对通过（注册行 :417/:434/:454/:479、fields :423-431/:440-451/:468-476/:485-493、propContracts :460-467、markers :42/:59/:52/:69/:227/:243/:80/:103、playground w4a 全部 demo 行号、e2e 9 测试分布、CONTENT_RENDERER_ROUTES 11→14→18 协调、e2e 基线 929/43/0 于 `docs/logs/2026/08-04.md:127`）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 4 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查——媒体 dialog 内加载 + 错误回退）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准；无变更则不写）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本组件 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。
- 观察（供 CLOSURE_VERIFY 核对）：`pnpm check:oversized-code-files` 为 pre-existing 红（C5.1 已记录 HEAD 基线 14 文件超 700 行），超限文件治理归 CG/CR，非本 plan scope。

## Closure

Status Note: 未执行（active——draft review pass 后进入执行队列，roadmap C6.4 行已标 `planned`）。

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待定
