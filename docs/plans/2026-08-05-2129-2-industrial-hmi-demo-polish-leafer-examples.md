# 17 Demo 视觉优化、参考资源登记与 LeaferJS 对照页（I17）

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` I17（Phase Status / Work Items I17.1–I17.3 / Phase Details / Dependency Graph；2026-08-05 立项，Rule 3 结构性调整经人工确认）
> Mission: industrial-hmi
> Work Item: I17（Demo 视觉优化、参考资源登记与 LeaferJS 对照页）
> Related: `2026-08-05-2129-1-industrial-hmi-expression-unification.md`（I18）独立可并行；两者均落 `scada-demo.tsx` 但无语义冲突，建议 I18 先行（demo 文件只被表达式迁移触碰一次后，I17 再做坐标重排）。

## Purpose

收口用户评审反馈「画面画乱」与 LeaferJS 官方能力对照缺失：对 scada-demo 硬编码坐标做一次 8px 基线对齐重排（保留全部 testid/bindings/events 不变），登记 LeaferJS 官方示例 + 第三方图元库参考资源附录，并新增 playground `#/leafer-examples` 独立路由跑 LeaferJS 官方示例代码（团队学习 + 编辑器后继 mission「直接复用 leafer-editor vs 自研」决策对照 + 未来 v3 升级回归基线）。**编辑器实现不在此 work item**——按 `editor-initiation.md` 独立后继 mission 编排。

## Current Baseline

> 经 live repo 核对（2026-08-05）。

- **scada-demo 坐标硬编码、无对齐辅助**：`apps/playground/src/pages/scada-demo.tsx`（368 行）`symbols` 数组全部 x/y/width/height 为字面量（`pipe-in-1 x:0,y:180,w:60`、`level-1 x:60,y:110,w:60,h:140`、`pump-1 x:210,y:210`、`valve-1 x:374,y:210`、`junction-1 x:528,y:206`、`gauge-1 x:678,y:120,w:120,h:120`、`motor-1 x:370,y:40` …）；设备-管道连接点错位（如 `pipe-pump-valve x:274,y:226` 与 `valve-1 x:374,y:210` 几何不连续）、文本标签漂移，整体观感「画乱」。canvas 尺寸 `width:900,height:480`，`viewport:{fit:'contain'}`。
- **bindings/events 完好**：全部图元用 `binding.point`（非 `@{}`/`$xxx` 表达式——表达式迁移归 I18），点表 `tankLevel/flow/temp/flowOn`（flux）+ `motorState/pumpState/valveOpen/fanState/alarm`（static），事件 `openDialog` 详情弹窗，testid（`scada-btn-*` + 设备点击）齐全——重排**不得**改动这些。
- **scoped e2e spec 含硬编码 world 坐标**（关键约束）：`tests/e2e/scada-demo.spec.ts` 经 `clickSymbolAtWorld(page, cid, worldX, worldY)`（`:32`）在硬编码世界坐标点击图元——`pump-1` 中心 `(242,234)`（`:136/:274/:311`，pump-1 现位于 `x:210,y:210`）、`motor-1` 中心 `(402,64)`（`:252`，motor-1 现位于 `x:370,y:40` 64×48）。**图元坐标重排后这些 world 坐标必须同步更新**，否则点击/双跳/hover-overlay 断言落在空画布。
- **参考资源附录未登记**：`docs/components/industrial-hmi/design-engine.md` 无「官方示例对照」附录；`design-symbols.md` 无「第三方图元库参考」附录。
- **playground 无 LeaferJS 原生对照页**：`apps/playground/src/pages/` 仅有 scada-demo/edge/perf-scale/pressure-demo；`route-model.ts` 无 `leafer-examples` 条目（`scada-perf-scale` 在 perf-scale 列表 `:535`，`eyebrow:'Performance'`，为非 home-card 路由先例）；`App.tsx:53` import + `:284` case 为路由注册模式。`leafer-ui` 依赖已在 `flux-renderers-industrial` 包内（playground 无需重复引入）。
- **LeaferJS 官方示例定性已知**（roadmap I17.2）：官方示例是通用 Canvas 能力展示、无 HMI 行业示例；meta2d 亦无 HMI 设备图元；FUXA 是 MIT SCADA/HMI 平台含真实工艺画面；OSHMI GPL-3.0 仅设计层参考。
- **依赖就绪**：I15（文档收尾 + 测试基线）已 `done`。

## Goals

- scada-demo 坐标重排后设备-管道-文本标签几何连续、8px 对齐基线统一，视觉「画乱」消除；**全部 testid/bindings/events/点表语义不变**，scoped e2e 回归全绿。
- `design-engine.md` 增补「官方示例对照」附录（6–8 个 LeaferJS 官方示例链接）；`design-symbols.md` 增补「第三方图元库参考」附录（meta2d/FUXA/OSHMI 及定性）。
- playground 新增 `#/leafer-examples` 独立路由（**不进 home 卡片**，对齐 `#/scada-perf-scale` 先例），跑 LeaferJS 官方基础示例（App/Rect/动画/视口/Editor/Flow 等）。

## Non-Goals

- 不实现编辑器交互（拖拽放置/属性面板/连线/undo-redo/工具箱）——独立后继 mission。
- 不改 scada-demo 的表达式语法（`$xxx`→`${}` 归 I18）。
- 不改性能基准（I14 已 `done`）；不新增工业图元。
- 不把 `leafer-examples` 进 home 卡片（仅学习/e2e 驱动）。
- 不下载新第三方源码（I0 已下载；本计划仅登记参考链接 + 定性）。

## Scope

### In Scope

- `apps/playground/src/pages/scada-demo.tsx`：`symbols` 坐标重排（8px 对齐、管道路径轨迹统一、设备间距规范、文本标签锚定设备 bounds）；保留所有 id/type/testid/bindings/events/custom/点表。
- `tests/e2e/scada-demo.spec.ts`：同步更新硬编码 world 坐标（`pump-1` 中心 `:136/:274/:311`、`motor-1` 中心 `:252`）匹配重排后图元几何（图元重排→中心点重算→spec world 坐标同步）。
- `docs/components/industrial-hmi/design-engine.md`：新增「官方示例对照」附录（LeaferJS 官方示例链接 6–8 个）。
- `docs/components/industrial-hmi/design-symbols.md`：新增「第三方图元库参考」附录（meta2d diagrams / FUXA SVG 图元库 / OSHMI + 定性）。
- `apps/playground/src/pages/leafer-examples-demo.tsx`（新增）：跑 LeaferJS 官方基础示例代码。
- `apps/playground/src/route-model.ts`：新增 `leafer-examples` 条目（perf-scale 式非 card 路由列表，适当 eyebrow）。
- `apps/playground/src/App.tsx`：import + `case 'leafer-examples'`。
- scoped e2e 回归（demo 点击/联动/视口 fit-center 命令 + 新路由渲染 smoke）。

### Out Of Scope

- 编辑器实现（后继 mission）。
- scada-demo 表达式迁移（I18）。
- 性能优化 / benchmark 复测。
- home-page 卡片登记（路由不进卡片）。

## Failure Paths

> 纯 demo/docs/playground-route 计划，无 API 契约/鉴权/外部集成。Failure Paths 不适用（纯视觉重排 + 文档附录 + 静态示例页，无错误处理路径）。

## Test Strategy

档位选择：**建议有测**（非核心回归路径；坐标重排有 scoped e2e 守护，文档附录无行为变更，新路由需渲染 smoke）。

匹配：scoped scada e2e 回归（demo testid 点击 + 视口 fit/center 命令仍绿）+ 新 `leafer-examples` 路由渲染 smoke（canvas 存在性断言，复用 `assertScadaCanvasRendered` 同款 DOM 存在性思路或最小 canvas 探测）。

## Execution Plan

### Phase 1 - scada-demo 坐标重排（I17.1）

Status: completed
Targets: `apps/playground/src/pages/scada-demo.tsx`、`tests/e2e/scada-demo.spec.ts`

- Item Types: `Fix | Proof`

- [x] **Fix**：对 `symbols` 数组做一次坐标重排——参考 LeaferJS Playground 图元样式 + meta2d.js `packages/core/src/diagrams/` 图元形态，8px 对齐基线统一、管道路径轨迹连续（设备-管道连接点几何对齐，如 pump-1 出口 → valve-1 入口 → junction-1 → gauge-1 管链连续）、设备间距规范、文本标签锚定到设备 bounds（消除漂移）；canvas 900×480 + `viewport:{fit:'contain'}` 保持。
- [x] **Fix（e2e 坐标同步）**：`tests/e2e/scada-demo.spec.ts` 硬编码 world 坐标按重排后图元中心重算同步（`pump-1` 中心 `:136/:274/:311`、`motor-1` 中心 `:252`，及其余 `clickSymbolAtWorld` 调用）。
- [x] **PROOF（不变性守护）**：重排前后 `scada-demo.tsx` 内 diff 仅含 x/y/width/height（及必要的 custom.openRatio/points 几何对齐量），`tests/e2e/scada-demo.spec.ts` 内 diff 仅含对应 world 坐标数字——**所有 id/type/testid/bindings/events/点表声明字段零改动**（人工核对 + scoped e2e 回归：`scada-demo` 家族 testid 点击 `scada-btn-*`、设备点击 openDialog、视口 fit/center 命令仍绿）。

Exit Criteria:

- [x] scada-demo 设备-管道-文本标签几何连续、8px 对齐，视觉「画乱」消除。
- [x] `tests/e2e/scada-demo.spec.ts` world 坐标同步重排后几何，scoped scada e2e（demo 家族）全绿，testid/bindings/events 语义不变（`scada-demo.tsx` diff 仅几何字段 + spec diff 仅坐标数字）。

### Phase 2 - 参考资源附录登记（I17.2）

Status: completed
Targets: `docs/components/industrial-hmi/design-engine.md`、`docs/components/industrial-hmi/design-symbols.md`

- Item Types: `Fix`

- [x] **Fix**：`design-engine.md` 新增「官方示例对照」附录——列出最相关 6–8 个 LeaferJS 官方示例链接（创建 App / 缩放平移视图 / 转换坐标 / 获取包围盒 / 局部渲染 / Group / Editor / Flow 自动布局 / viewport 插件），供维护者快速锚定 LeaferJS 原生能力用法。
- [x] **Fix**：`design-symbols.md` 新增「第三方图元库参考」附录——meta2d.js diagrams / FUXA SVG 图元库 / OSHMI 三项 + 定性（**关键定性**：LeaferJS 官方示例无 HMI 行业示例；meta2d 亦无 HMI 设备图元；FUXA 是 MIT SCADA/HMI 平台含真实工艺画面；OSHMI GPL-3.0 仅设计层参考）。

Exit Criteria:

- [x] 两份 design 文档附录落地，链接经核对有效，定性表述与 roadmap I17.2 一致。

### Phase 3 - playground LeaferJS 对照页（I17.3）

Status: completed
Targets: `apps/playground/src/pages/leafer-examples-demo.tsx`（新）、`apps/playground/src/route-model.ts`、`apps/playground/src/App.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：新增 `leafer-examples-demo.tsx`，直接跑 LeaferJS 官方基础示例代码（创建 App / Rect / 动画 / 视口 / Editor / Flow 等）；复核 `leafer-ui` 依赖在 `flux-renderers-industrial` 包内（playground 经包传递可用，无需 playground 重复引入）。
- [x] **Fix**：`route-model.ts` 新增 `leafer-examples` 条目（perf-scale 式非 card 路由列表，适当 eyebrow 如 'Reference'），**不进 home 卡片**；`App.tsx` import + `case 'leafer-examples'` 注册路由。
- [x] **PROOF**：新路由渲染 smoke（`#/leafer-examples` 可达，canvas 存在性断言 + 至少一个官方示例渲染出非空 canvas）；不破坏既有 playground 路由。

Exit Criteria:

- [x] `#/leafer-examples` 路由可达、跑 LeaferJS 官方基础示例、canvas 存在性 smoke 通过。
- [x] 新路由不进 home 卡片（route-model 列表归属核对），既有 playground 路由不回归。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh session `ses_02dac3e98ffeLCJ902CQIgq1m1`（R1）+ `ses_02da5aacaffepdiS4QY5qBjazf`（R2）
- Verdict: `pass`（R2，零 Blocker / 零 Major）
- Rounds: 2（未超上限）
- Findings addressed:
  - R1 M-1（Major）：Phase 1 漏 `tests/e2e/scada-demo.spec.ts` lockstep 依赖（硬编码 world 坐标 `pump-1 :136/:274/:311`、`motor-1 :252`）→ Phase 1 Targets + In Scope + `Fix（e2e 坐标同步）` 子项 + Proof 按 per-file diff 范围重述，Current Baseline 前置登记该约束。
  - R1 4 项 Minor（§2 附录边界 / eyebrow 词表 / pages/index.ts re-export / home-page.tsx 省略引用）按规则非阻塞，保留不触发返工。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全 `[x]` 后方可 `Plan Status: completed`。全量验证归此处（plan guide Minimum Rule 18）。

- [x] scada-demo 坐标重排完成，视觉「画乱」消除，testid/bindings/events 语义不变。
- [x] `design-engine.md`/`design-symbols.md` 参考资源附录落地，链接有效、定性准确。
- [x] `#/leafer-examples` 路由可达、跑官方示例、不进 home 卡片。
- [x] owner docs 与 live baseline 一致（无残留「画乱」表述）。
- [x] 不存在被静默降级到 deferred 的 in-scope 项。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 编辑器交互实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑器实现按 `editor-initiation.md` 独立后继 mission 编排（roadmap 明示不在此 work item）；`leafer-examples` 页仅作为编辑器「直接复用 leafer-editor vs 自研」决策对照输入。
- Successor Required: yes（编辑器 mission `missions/industrial-hmi-editor.json`）

## Non-Blocking Follow-ups

- `leafer-examples` 页后续可按 LeaferJS 版本升级（如未来 v3）扩充对照示例，作为升级回归基线（非本计划 gate）。

## Closure

Status Note: 完成（2026-08-06）。三 Phase 全绿：scada-demo 坐标重排（管道统一 y=232、设备-管道几何连续、8px 对齐、文本标签锚定设备 bounds，testid/bindings/events 零改动）+ e2e 坐标同步（pump-1/motor-1 中心重算）；design-engine.md §13 官方示例对照附录（9 链接）+ design-symbols.md §13 第三方图元库参考附录（meta2d/FUXA/OSHMI + 定性）；playground #/leafer-examples 独立路由（不进 home 卡片）跑 LeaferJS 官方基础示例。leafer-ui + @leafer-in/view + @leafer-in/animate 作为 playground 直接依赖引入（v2.2.9，lazy-loaded 隔离保持 App 单测 leafer-free）。

Closure Audit Evidence:

- Auditor / Agent: fresh session `ses_02c871be4ffeTr1Sx3cbR9Cdlm`（independent closure-audit，非执行 session）
- Evidence: verdict `pass`（0 Blocker / 0 Major / 2 Minor 记录性）。逐项核验：① Phase 1 不变性——`git diff scada-demo.tsx` 仅 x/y/width/height + text x/y，id/type/testid/bindings/events/custom/text/textSize/textColor 零改动，管道全 y=232 且链 x:0→800 几何连续，e2e pump-1 中心 (236,232)×3 / motor-1 中心 (408,80)×1 同步；② Phase 2 两份附录链接有效、定性与 roadmap I17.2 一致；③ Phase 3 route-model 有 leafer-examples 条目、home-page NAV_CARDS 无此路由（不进卡片）、App.tsx lazy import + case 齐全、4 示例渲染；④ 无静默降级 in-scope 项。独立 typecheck pass。M1（roadmap I17 待翻 done）+ M2（leafer-ui 直接依赖记录，非违规）均为记录性，已在本 Status Note 回写。

Follow-up:

- 无剩余 plan-owned 工作。编辑器交互按 `editor-initiation.md` 独立后继 mission（`missions/industrial-hmi-editor.json`）编排，不在本 work item。
