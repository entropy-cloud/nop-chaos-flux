# 555 palette 目录声明化（P4.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P4.1；`docs/architecture/editor-designer-standard.md` §2.7
> Related: plan 554（scope 投影接线模式）；P4.4（playground factory 消费本契约）

## Purpose

落地 §2.7 palette 声明化：定 palette catalog 共享契约（声明式 entries × registry 在场过滤 → items），消灭 dashboard 硬编码目录（roadmap §3 登记的重复实现）；page-designer 走查裁定（其 palette 已是 registry 驱动 + 声明式 scaffold 清单，见 Baseline）。

## Current Baseline

- dashboard：`editor-palette.tsx:13-27` `DASHBOARD_PALETTE_TYPES` 组件内硬编码六条（type/labelKey/defaultTitle/defaultW/defaultH），editor-inspector.tsx 复用同一常量过滤 registry。
- 先例：spreadsheet 无 palette；scada = `listScadaSymbols()` 符号注册表驱动 ✓；flow = `DesignerConfig.palette.groups` config 驱动 ✓。
- page-designer（走查）：`page-designer-core/palette-filter.ts` `buildPaletteItems(registry, stage, {allowlist})` 全量 registry 驱动 + stage 类别白名单（声明常量）+ host allowlist 扩展；`designer-registry.ts:51` `MVP_PALETTE_TYPES` 为导出的声明式清单（= 布局类型 + `DESIGNER_SCAFFOLDS` 键集）。**已是声明式**（单一声明源 + 导出），roadmap §3 "代码内白名单" 表述过时；本计划以裁定记录其合规，不做搬移式迁移。
- 消费面（4 站点 / 3 文件）：EditorPalette 过滤（editor-palette.tsx:36）、inspector 类型下拉（editor-inspector.tsx:68）、`buildPalettePanel` 新增面板默认尺寸（editor-palette.tsx:79，canvas drop/addPanel 经 editor-canvas.tsx:170 调用）、`resolvePanelDisplayName` labelKey 查名（editor-palette.tsx:111，editor-canvas.tsx:216/239 调用）。后两处为纯函数无 runtime/schema 访问——宿主覆盖目录时必须把生效目录线程化传入（否则覆盖目录与新增面板尺寸/名称漂移）。

## Goals

- **共享契约**（`packages/flux-react/src/workbench/palette-catalog.ts`）：`DesignerPaletteEntry` 类型（type/label/labelKey?/defaultTitle?/defaultW?/defaultH?/group?）+ `buildDesignerPaletteCatalog(entries, registry)`（声明 entries × registry `has()` 在场过滤 → items；未注册类型自动隐藏——dashboard 现行为收敛为契约语义）。
- **dashboard 迁移（Deferred 裁定修订：宿主 schema 覆盖不落地，见 Deferred）**：`DEFAULT_DASHBOARD_PALETTE_CATALOG` 六条声明常量（editor-palette，单一声明源）+ renderer `effectivePalette = builder(DEFAULT, runtime.registry)` 线程化传入全部 4 消费站点（EditorPalette/EditorInspector props + buildPalettePanel/resolvePanelDisplayName 参数——纯函数消费点以参数接收目录，消灭组件内/模块内硬编码引用）。
- **label 解析规则**：entry.labelKey 存在 → `t(labelKey)`；否则用 `entry.label`（宿主直供字面文案）——缺 labelKey 无 label 时回退 entry.type。
- **page-designer 合规裁定成文**：editor-designer-standard.md §2.7 增注（page-designer palette 已 registry 驱动 + MVP_PALETTE_TYPES 声明清单，roadmap §3 表述更新理由；dashboard=config 声明 + registry 过滤两源合并）。
- 测试：共享 builder 单测（过滤/保留顺序/未注册隐藏）+ dashboard palette schema 覆盖用例。

## Non-Goals

- 不改 scada/flow（既存先例）；不重排 page-designer（已合规，裁定记录）。
- 不为 dashboard palette 条目增加 i18n 机制变化（labelKey 机制保持）。

## Scope

### In Scope

- `packages/flux-react/src/workbench/palette-catalog.ts`（新）+ 测试。
- `packages/flux-renderers-dashboard/src/`（schema/definitions/palette/inspector/canvas 迁移 + 测试）。
- `docs/architecture/editor-designer-standard.md` §2.7（裁定注）。

### Out Of Scope

- page-designer 搬移式改动；playground demo（P4.4）。

## Failure Paths

| 触发                           | 行为                                        | 可重试 | 用户可见表现 |
| ------------------------------ | ------------------------------------------- | ------ | ------------ |
| 宿主 palette 声明含未注册 type | 已随宿主覆盖路径取消而失效（Deferred 裁定） | —      | 无           |
| 宿主未声明 palette             | 使用 DEFAULT 声明常量                       | —      | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（共享契约 + 公共 schema 面；failing-first）。

## Execution Plan

### Phase 1 - 共享契约（Proof + Fix）

Status: completed
Targets: `packages/flux-react/src/workbench/palette-catalog.ts`

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：palette-catalog.test.ts（builder 3 用例 + resolvePaletteLabel 3 分支；先红后绿）
- [x] （Fix）类型 + builder 实现 + workbench/index + 包 index 导出；flux-react 546/546

Exit Criteria:

- [x] flux-react 测试全绿（含新 builder 用例）；局部 typecheck 绿

### Phase 2 - dashboard 迁移（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-dashboard/src/`

- Item Types: `Proof`、`Fix`

- [x] （Proof→裁定改向）宿主 schema 覆盖路径发现编译器约束（顶层数组按元素编译，`type` 键内联 schema 化）→ 声明源 = DEFAULT 常量 + 共享 builder（Deferred 成文）
- [x] （Fix）DEFAULT 声明常量 + 4 消费站点生效目录线程化（palette/inspector props + buildPalettePanel/resolvePanelDisplayName 参数）+ 测试绿（drop 测试断言 panel 计数/panel-id——defaultTitle/尺寸断言为 audit Minor 指出的过表述，行为与 HEAD 一致无功能缺口）

Exit Criteria:

- [x] `DASHBOARD_PALETTE_TYPES` 更名 `DEFAULT_DASHBOARD_PALETTE_CATALOG`（声明常量层）；组件内硬编码清单消灭；dashboard 全量测试零回归（87/87）

### Phase 3 - 裁定成文（Decision）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`

- Item Types: `Decision`

- [x] §2.7 增 catalog 契约注（共享 builder + 五家族裁定 + page-designer 合规裁定）；roadmap §3 行尾就地勘误标注

Exit Criteria:

- [x] 裁定注成文

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_14ddd7c3-48df-402e-8731-bf364e1af791）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: Major 消费面勘误（4 站点/3 文件；buildPalettePanel/resolvePanelDisplayName 纯函数消费点生效目录线程化，防覆盖目录与新增面板尺寸/名称漂移）+ label 解析规则成文；Minor definitions 显式入 Scope；Minor roadmap §3 就地勘误标注；Minor label/labelKey 回退规则入 Failure Paths 语义。

## Closure Gates

- [x] 共享 palette catalog 契约落地（builder + 类型 + 测试）
- [x] dashboard 硬编码目录消灭（P4.x 至少消灭一处规则由本迁移满足）
- [x] page-designer 合规裁定成文（roadmap §3 表述修正就地标注）
- [x] 必要 focused verification 已完成（flux-react 546/546 + dashboard 87/87）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P4.1 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

### dashboard palette 宿主 schema 覆盖（palette prop）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 实现期发现 flux 编译器对**顶层数组 schema 值**按元素编译（`type` 键被 registry 查找劫持为内联 schema——flux-compiler schema-compiler.ts:119 + node-compiler-helpers 分类器，audit 实证），palette 条目经 prop 传入会失真（probe 实测 `props.props.palette` 到达为 `[]`）。roadmap P4.1 的要求是"消灭硬编码、目录声明式"——单一声明常量 + 共享 builder 已达成；宿主覆盖留待未来以配置包装对象或专用注册 API 形态评估（需先解决编译器数组语义）。
- Successor Required: `no`（优化项；声明式合规不受影响）
- 说明：Goals/Failure Paths 的宿主覆盖表述以本裁定为准（Goals 修订：`palette?: DesignerPaletteEntry[]` 不落地；Failure Paths "宿主声明含未注册 type" 行随覆盖路径取消而失效）。

## Non-Blocking Follow-ups

- page-designer `MVP_PALETTE_TYPES` 可在治理轮评估并入共享 DesignerPaletteEntry 形状（现合规，纯收敛优化）。

## Closure

Status Note: palette catalog 共享契约（builder/类型/label 解析）+ dashboard 硬编码清单消灭（DEFAULT 声明常量 × builder，4 消费站点线程化）+ page-designer 合规裁定 + roadmap §3 勘误标注全部落地；宿主 schema 覆盖按 Deferred 裁定不落地（编译器数组语义约束成文）。独立 closure audit 两轮 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_4376b648-df18-4e5e-b230-a134abe16461）
- Evidence: Round 1 VERDICT: issues（Major：Deferred 节未填/Goals-Failure Paths 与交付面不一致 + 4 Minor）→ Deferred 条目补全 + Goals/Failure Paths 修订 + 过时注释修正 + resolvePanelDisplayName 守卫语义还原 → Round 2 VERDICT: approved。审计实证：builder 过滤/label 语义正确、4 站点线程化（renderer:442/449 + editor-canvas:174/220/243）、page-designer 未触碰且合规声明属实、编译器约束实证（schema-compiler.ts:119 + node-compiler-helpers 分类器 + probe `[]`）、dashboard 87/87 独立复跑。

Follow-up:

- page-designer MVP_PALETTE_TYPES 并入共享 DesignerPaletteEntry 形状（治理轮优化）；宿主 palette 覆盖待编译器数组语义解决后评估；no remaining plan-owned work。
