# 490 设计系统统一：弹层尺寸体系与表面节奏（Overlay Size System And Surface Rhythm）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/skills/visual-page-quality-inspection-prompt.md`（H/D 维度已知高危面）、live repo 调研（本 plan Current Baseline 全部为 2026-09-22 实测）
> Related: `docs/backlog/visual-quality-r2-roadmap.md`（本 plan 为其 R2-3a work item 的 owner plan）、`docs/backlog/visual-quality-roadmap.md`（一期，已全 done，本 plan 处理其门禁盲区——渲染后体感）、`docs/architecture/styling-system.md`（owner doc）

## Purpose

把"弹层宽窄/大小/内部对齐"与"功能块间隔（分页器贴表格等）"从**逐控件特殊处理**收敛为**一套设计系统契约**：一个档位阶梯、一组解剖学令牌、一个块间距刻度，全部落在 `theme-tokens` 的 `:root` 结构令牌区，由 `packages/ui` 组件默认消费，由一致性门禁守纪律。落地后，任何弹层/侧拉/确认框的宽度与内节奏都是"选一个档位"，任何宿主面的工具栏↔内容↔分页条间隔都走同一个令牌——不再有第三套约定。

## Current Baseline（2026-09-22 live 实测）

**健康的骨架（本 plan 复用，不重建）：**

- `packages/theme-tokens/src/styles.css` 结构令牌集中 `:root`（1–120 行），四主题块只管颜色——本 plan 新令牌全部落 `:root`。
- `--space-*` 间距刻度已存在（`--space-section-gap: 24px`、`--space-form-item-gap: 16px`、`--space-field-label-gap: 8px` 等 10 键），由 `flux-react/default-spacing.css` 在 `@layer base` 消费（styling-system.md 契约）。
- `--dialog-*` 命名空间已存在：尺寸阶梯 + 解剖学（`--dialog-body-padding-x: 24px`、`--dialog-footer-gap: 8px`、`--dialog-footer-button-min-width: 72px`、`--dialog-title-font-size`、`--dialog-content-border-radius`、`--dialog-top-offset`、`--dialog-stack-step`）。
- Dialog 组件已有 `size` prop（`xs|sm|base|md|lg|xl|default`）→ `width: var(--dialog-size-*)`（`packages/ui/src/components/ui/dialog.tsx:118-155,207`），`data-size` 已透出。
- 一致性门禁 `scripts/audit/find-ui-consistency-gaps.mjs` 为可扩展的静态检测器 + 豁免治理（exemption 基数 216/62，单调下降纪律）。

**断裂点（本 plan 要收敛的三套约定与失序）：**

1. **弹层尺寸三套互不相通**：Dialog 走 `size` prop + 令牌；AlertDialog 走 `data-size` + 硬编码 Tailwind 类（`alert-dialog.tsx:54` `data-[size=default]:max-w-xs … sm:max-w-sm`，不接令牌）；Sheet 固定 `w-3/4 sm:max-w-sm`（`sheet.tsx:62`，384px 封顶、无 size prop）；Drawer 走 resize-controller sizeVar + 同款 `sm:max-w-sm` 封顶（`drawer.tsx:177-178`）。同一个"弹层宽度"概念三种实现。
2. **Dialog 阶梯非单调**：`--dialog-size-xs: 375px` > `--dialog-size-sm: 350px`（`theme-tokens/src/styles.css:106-111`）——"更小档位反而更宽"，阶梯语义失序；375/350 不在 4pt 栅格（500 恰为 4 的倍数但不在 8pt 系），阶梯整体未按 8pt 对齐。
3. **消费纪律缺失**：正规消费（`detail-surface.tsx:174` `size={dialogSize}`）、ad-hoc 覆写（`gantt-editor.tsx:64,90` `className="sm:max-w-md"` 绕过阶梯）、不吃体系（`table-quick-edit-cell.tsx:144` 无 size 无宽度类，单格快编吃 500px 默认档）三种形态并存；门禁对弹层宽度覆写零检测。
4. **块间距无系统**：`TablePaginationBar` 根节点无上间距、挂载为表格滚动容器直接相邻兄弟（`flux-renderers-data/src/table-renderer.tsx:674-686`、`table-pagination-bar.tsx:51`）→ 分页器贴表格；`CrudListPagination` 用裸 `mt-3`（`crud-list-pagination.tsx:18`）→ 同语义两种口径；`--crud-toolbar-gap: 10px` 不在 4pt 栅格（5 的倍数）。
5. **解剖学未共享**：Dialog 有 body/footer 令牌，AlertDialog/Sheet/Drawer 的 header/body/footer padding 为硬编码类（如 `alert-dialog.tsx:83` `-mx-4 -mb-4 … p-4`），跨弹层三段节奏无法统一调音。

## Design（系统方案——一段话版）

**一个阶梯、三个默认、一组解剖学、一个块距、一道门禁。** 档位阶梯（xs/sm/base/md/lg/xl）重整为单调、8pt 对齐的 `--overlay-size-*` 令牌，Dialog/Sheet/Drawer/AlertDialog 四个弹层组件全部以 `size` prop 消费同一阶梯（各自默认档不同：Dialog=base、Sheet/Drawer=sm、AlertDialog=xs）；header/body/footer 的 padding/gap/按钮宽统一走 `--overlay-anatomy-*` 令牌；宿主面功能块间距进 `--space-*` 刻度（新增 `--space-block-gap`）；门禁新增检测器禁止消费方对弹层组件写 ad-hoc 宽度类。改档位=改令牌值，一处生效全局。

## Goals

- 弹层尺寸词汇表唯一：四个弹层组件共用一个单调阶梯，`size` prop 是唯一合法入口，ad-hoc 宽度类被门禁拦截（newHits=0）。
- 弹层解剖学（三段 padding/footer gap/按钮宽）令牌化并被四个组件共享，跨弹层节奏可全局调音。
- 宿主面功能块（工具栏/内容/分页条/汇总条）垂直间隔走 `--space-block-gap`，三个分页条口径一致，"分页器贴表格"类缺陷从模式上消灭。
- owner doc（styling-system.md）回写最终契约；检查提示词 H/D 维度的已知锚点随落地更新。

## Non-Goals

- 不改 Popover/DropdownMenu/Tooltip（内容自尺寸是 hover 浮层的正确模型，不进阶梯）。
- 不做密度系统（行高/紧凑档）、不做配色改动、不做弹层内容级重设计（那是页面级走查的 findings 流程）。
- 不动 `packages/ui/src/index.ts` 公共导出名单（只扩展既有组件 props，不新增导出；若执行中发现必须新增导出，停下走 ask-first）。
- 不引入运行时 CSS-in-JS 或新依赖。

## Scope

### In Scope

- `packages/theme-tokens/src/styles.css`：阶梯重整 + `--overlay-*` 命名 + `--space-block-gap` + 旧名过渡别名。
- `packages/ui/src/components/ui/{dialog,sheet,drawer,alert-dialog}.tsx` 及其测试。
- 消费面迁移：全仓 `size=` 审计 + ad-hoc 宽度类清除（dialog/sheet/drawer/alert-dialog 四类组件）。
- `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx`、`crud-list-pagination.tsx`、`pagination-renderer.tsx`、`crud-renderer-toolbar.tsx` 间隔令牌化。
- `docs/components/dialog/design.md`（owner doc：阶梯值与映射契约，`:28,118` 钉死现值）、`docs/components/drawer/design.md`（resize 语义，按需一行）回写。
- `scripts/audit/find-ui-consistency-gaps.mjs` 新检测器。
- `docs/architecture/styling-system.md`、`docs/skills/visual-page-quality-inspection-prompt.md` 回写。

### Out Of Scope

- 各 demo/replica 页面的内容级布局优化（另行走查 findings）。
- mobile 族触控目标、3D/画布类尺寸（各自 owner doc 域）。

## Design Details（执行依据）

### 1. 档位阶梯（新值，单调 + 8pt 对齐）

| 档位 | 令牌                  | 新值                             | 语义                                        |
| ---- | --------------------- | -------------------------------- | ------------------------------------------- |
| xs   | `--overlay-size-xs`   | `360px`                          | 确认框、微编辑（AlertDialog 默认）          |
| sm   | `--overlay-size-sm`   | `480px`                          | 单字段/小表单（Sheet、Drawer 默认）         |
| base | `--overlay-size-base` | `560px`                          | 标准表单（Dialog 默认，`default` 别名归此） |
| md   | `--overlay-size-md`   | `720px`                          | 复杂表单/详情                               |
| lg   | `--overlay-size-lg`   | `960px`                          | 多列详情/大工作面                           |
| xl   | `--overlay-size-xl`   | `min(1280px, calc(100% - 4rem))` | 近全屏工作面                                |

- `--dialog-size-*` 保留为 `var(--overlay-size-*)` 过渡别名，在 Phase 3 消费面迁移完成后于本 plan 内删除（别名零残留检查见 Phase 3 收口 Proof 项）——不引入版本化发布语义（本仓库全部包 private 0.1.0，无版本周期可判定）。
- 单调性用单测钉住：解析 theme-tokens `:root` 的阶梯值断言严格递增（xs<sm<base<md<lg，xl 为百分比形式单独断言 calc 形态）。
- 断点行为（依 live 机制修订）：Dialog 现状为 inline `width: sizeVar` 全视口生效、由 `max-w-[calc(100%-2rem)]` 兜底封顶（`dialog.tsx:183,207`）——本方案**保持该机制不变**（不新增 sm: 门控，避免隐性行为变更），窄视口由既有 max-w 兜底。Sheet/Drawer 侧拉现状为窄视口 `w-3/4`（75% 比例）、`sm:` 视口起 `max-w` 封顶（`sheet.tsx:62`、`drawer.tsx:177-178`）——档位以 **`sm:` 起生效的 max-width 形式**替换现 `sm:max-w-sm`，`sm:` 以下维持 `w-3/4` 比例现状（有意保留的窄视口回退，非"全宽"；属现有行为保留）。

### 2. 组件消费契约

- Dialog：`size` prop 不变，宽度改绑 `--overlay-size-*`（机制不变，值变）。
- Sheet：新增 `size` prop（默认 `sm`），`data-[side=left/right]` 的 `sm:max-w-sm` 封顶替换为 `sm:` 起生效的档位 max-width（保留基础 `w-3/4` 比例作为 `sm:` 以下回退）；顶/底方向 Sheet 高度机制不动。
- Drawer：新增 `size` prop（默认 `sm`）**仅作为 resize-controller 的初始宽度**（初始 sizeVar 取档位值）；clamp 维持现状（160px–90% 视口），不新增 reset 能力；`sm:max-w-sm` 封顶按断点行为条款替换为档位 max-width（`sm:` 起）。用户手动 resize 维持既有自由调整语义，机制不动。
- AlertDialog：`data-size=default|sm` 重映射为 **default→sm、sm→xs**（保留"sm 档更窄"直觉：映射后 default=480px、sm=360px）。迁移影响披露：default 现宽 320px（`sm:` 视口 384px）→480px 变宽；sm 现宽 320px→360px 微增。live 消费方共 3 处且**均未传 size**（即全部落 default 档、统一 320/384→480）：`flux-renderers-ai/src/renderers/ai-conversations.tsx:173,179`、`packages/ui/src/components/ui/dirty-close-guard.tsx:57,63`（经 `useDirtyCloseGuard` 被 `detail-surface.tsx:121` 消费，form-advanced 详情面未保存确认框）、`apps/playground/src/complex-pages/shared/confirm-bridge.tsx:47`（complex-pages 域 `env.confirm` 桥）——三处宽度变化纳入 Phase 2 映射断言，不做静默上线。硬编码 `max-w-*` 类替换为令牌宽；其 footer 的 `p-4` 硬编码同步迁移到解剖学令牌。
- 解剖学：`--dialog-body-padding-x/footer-gap/footer-button-min-width/title-font-size/content-border-radius` 更名 `--overlay-anatomy-*`（旧名过渡别名），Sheet/Drawer/AlertDialog 的 header/body/footer 改为消费同组令牌（每组件允许一个 `anatomy` 覆写入口，不做多档 padding——"一组解剖学"）。

### 3. 表面节奏

- `:root` 新增 `--space-block-gap: 12px`（进既有 `--space-*` 刻度区，紧邻 form-actions-gap 等语义键）。
- 三个分页条根节点统一 `margin-block-start: var(--space-block-gap)`（`TablePaginationBar`/`CrudListPagination` 裸 `mt-3`/`pagination-renderer` 各自迁移）；`--crud-toolbar-gap: 10px → 8px`（归栅格）。
- 表格 footer 槽（`table-renderer.tsx:688-690` `data-slot="table-footer"`）同步消费该令牌，消除"内容贴 footer"同类问题。

### 4. 门禁与文档

- `find-ui-consistency-gaps.mjs` 新检测器 `overlay-adhoc-width`：消费包内 `DialogContent|SheetContent|DrawerContent|AlertDialogContent` 的 JSX props 出现 `max-w-[`、`w-[`、`sm:max-w-`、`sm:w-` 字面类即命中（`packages/ui` 自身豁免；`packages/ui/src/components/ui/dialog.tsx` 的 `max-w-[calc(100%-2rem)]` 移动端兜底属组件实现，不在消费方扫描范围）。收口口径：newHits=0、新增豁免 0。
- `styling-system.md` 新增 "Overlay 尺寸与解剖学" 章节（阶梯表、组件默认档、size 契约、禁 ad-hoc 宽度），Spacing Conventions 表补"宿主面功能块（分页条/汇总条）= `--space-block-gap`"行。

## Test Strategy

档位选择：**必须自动化**（改 ui 公共组件契约 + 全局视觉契约，回归面大）。

Proof 先行项（先红后绿）：

1. 阶梯单调性单测（Phase 1 红：当前 xs>sm 失序被断言捕获；落新值后绿）。
2. 四组件 `size`→令牌映射测试（Sheet/Drawer/AlertDialog 新增 prop 先红：prop 不存在；落地后绿；Dialog 现有测试扩展新值）。
3. 分页条间隔计算样式断言（红：`TablePaginationBar` 上间距为 0；绿：= `--space-block-gap`）。
4. e2e 计算样式断言（V0 helper，双主题）：dialog 各档实测宽、sheet/drawer 档宽、弹层 footer 按钮 justify-end 与 gap 令牌值。

## Execution Plan

### Phase 1 - 令牌层：阶梯重整与块距刻度

Status: completed
Targets: `packages/theme-tokens/src/styles.css`、`packages/theme-tokens/src/styles.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof：新建阶梯单调性单测（读 `:root` 阶梯值断言递增），确认对当前 `--dialog-size-xs: 375 > sm: 350` 呈红
- [x] Fix：落 `--overlay-size-*` 六档新值 + `--dialog-size-*` 过渡别名 + `--space-block-gap: 12px`；`--crud-toolbar-gap` 10→8px
- [x] Fix：同步更新 `styles.test.ts:61-66` 既有 `--dialog-size-*` 逐值断言（375/350/500/800/1100/90%）为新阶梯值
- [x] Proof：单调性单测转绿；dist styles 重建无 diff 残留

Exit Criteria:

- [x] `theme-tokens` 单测含阶梯单调性断言且绿；`:root` 中不再存在非单调阶梯
- [x] 旧令牌名在过渡别名下行为不变（focused 消费方测试抽查 ui/dialog + flux-react dialog-host 族绿）

### Phase 2 - ui 组件：四弹层统一消费

Status: completed
Targets: `packages/ui/src/components/ui/{dialog,sheet,drawer,alert-dialog}.tsx` 及同目录测试、`tests/e2e/component-lab/c1a-visual-amis-parity.spec.ts`、`apps/playground/src/component-lab/renderers/dialog-lab-page.tsx`、`packages/flux-react/src/__tests__/dialog-host.test.tsx`

- Item Types: `Fix | Proof`

- [x] Proof：Sheet/Drawer `size` prop、AlertDialog 阶梯重映射的组件测试先红（prop/令牌宽不存在）——`overlay-size-ladder.test.tsx` 7/7 红
- [x] Fix：Dialog 绑 `--overlay-size-*`；Sheet/Drawer 增 `size`（默认 sm，`sm:` 以下 `w-3/4` 回退保留）；AlertDialog 迁 xs/sm 令牌 + 解剖学令牌；Sheet/Drawer header/body/footer 消费 `--overlay-anatomy-*`
- [x] Fix：更新 `c1a-visual-amis-parity.spec.ts:152-181` 档宽断言矩阵（现钉死 375/350/500/800/1100/1248）为新阶梯实测值；同步 `dialog-lab-page.tsx:404` 档位说明文案与 `dialog-host.test.tsx:220` 既有映射断言
- [x] Fix：AlertDialog 重映射消费面断言——default 档宽度变化（320/384→480）落组件级映射行为断言（`overlay-size-ladder.test.tsx` remap 用例）；`dirty-close-guard.tsx` 与 `confirm-bridge.tsx` 均未传 size（grep 核实），随 default 档统一变宽，裁决记录于此，不另落消费方专属测试
- [x] Proof：四组件 focused 测试全绿（含 `data-size` 透出、窄视口回退、Drawer resize 初始宽=档位）——ui 209/209、c1a e2e 档宽矩阵实测绿

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/ui test` 绿；四组件宽度全部来源于阶梯令牌（组件文件内不再有弹层宽度硬编码类；`max-w-[calc(100%-2rem)]` 窄视口兜底与 Sheet/Drawer `sm:` 以下 `w-3/4` 比例回退为 Design 断点行为条款的有意保留，除外）
- [x] ui 包 typecheck 绿；`packages/ui/src/index.ts` 导出名单零变更

### Phase 3 - 消费面迁移与表面节奏

Status: completed
Targets: 全仓四类弹层消费方、`packages/flux-renderers-data` 分页条/工具栏族

- Item Types: `Fix | Proof`

- [x] Proof：先红断言——TablePaginationBar 根节点上间距为 0（计算样式断言 `surface-rhythm-pagination.spec.ts`，light+dark 双跑 2 failed），作为本 Phase 间隔迁移的红色锚点
- [x] Fix：全仓审计 `size=` 用法与 ad-hoc 宽度类（grep 清单见本 plan 附录），逐项迁移到档位（`gantt-editor.tsx` `sm:max-w-md`→`size="sm"` ×2、`table-quick-edit-cell` 增 `size="sm"`、`image.tsx` `max-w-3xl`→`size="md"`、`detail-surface` 透传 size 契约重校无误）
- [x] Fix：三个分页条 + 表格 footer 槽迁移 `--space-block-gap`；crud toolbar 归栅格复核（`--crud-toolbar-gap` 8px 于 Phase 1 落地，消费方走 var 引用零改动）
- [x] Proof：flux-renderers-data focused 测试绿（1162/1162 含新增 `surface-rhythm-block-gap.test.tsx` 类契约），红色锚点转绿（2/2 双主题，margin-top=12px）；`--dialog-size-*` 过渡别名零残留检查通过（grep 全仓无 `--dialog-size` 消费），别名已自 styles.css 删除

Exit Criteria:

- [x] 全仓四类弹层组件 JSX props 无 `max-w-[`/`w-[`/`sm:max-w-`/`sm:w-` 字面类（消费面全量审计：24 文件 32 处使用点，仅 3 处宽度类且已全部迁移；ui 包组件实现自身消费阶梯令牌除外）
- [x] flux-renderers-data focused 全绿；分页条间隔三处同令牌

### Phase 4 - 门禁、文档与视觉验收

Status: completed
Targets: `scripts/audit/find-ui-consistency-gaps.mjs`、`docs/architecture/styling-system.md`、`docs/skills/visual-page-quality-inspection-prompt.md`、`tests/e2e/`

- Item Types: `Fix | Proof | Decision`

- [x] Fix：`overlay-adhoc-width` 检测器上线（含 4 条 fixture 测试），首跑即抓到审计漏网的 `designer-page-body.tsx` JSON 面板 ad-hoc 宽度并迁移 `size="base"`；全链 `pnpm check` newHits=0、新增豁免 0（基数 216/62 不变）
- [x] Fix：styling-system.md 新章节「Overlay Size Ladder And Anatomy」+ Spacing 表补行；owner doc 回写 `docs/components/dialog/design.md`（阶梯值与映射契约两处）及 `docs/components/drawer/design.md`（resize/初始宽度语义）；检查提示词 H1/H2/D6 已知锚点更新为收敛后状态并保留复检口径
- [x] Proof：e2e 双主题计算样式断言绿——`surface-rhythm-pagination.spec.ts`（三抓取分页条块距 12px，light+dark）+ `overlay-ladder-anatomy.spec.ts`（dialog default 档 560/footer flex-end/gap 8/按钮 72 + drawer sm 档 480，light+dark）
- [x] Decision：H/D 维度复检轮完成，评分卡落 `docs/analysis/2026-09-23-plan490-hd-recheck/summary.md`——H1 阶梯逐档命中（360/480/560/720/960 双主题）、D6 间距 12px、C1 无溢出；新发现 1×P1（playground 宿主裸 :root 覆盖 `--popover` 致 dark 弹层亮底，存量缺陷）+ 1×P3（watch-only），均按 Cross-Cutting 4 归族登记、不在本 plan 修复

Exit Criteria:

- [x] `pnpm check` 全链 exit 0，一致性豁免基数不增
- [x] e2e 断言绿 + 复检轮评分卡落盘（H/D 维度 design 域与 data 域 pass；B5 宿主存量缺陷已登记 findings 流程）

## Closure Gates

- [x] 三套弹层尺寸约定收敛为一套阶梯四组件消费（live 代码核对，非仅类型存在）
- [x] 分页器贴合类缺陷系统性收口（三处同令牌 + e2e 断言）
- [x] 阶梯单调性、组件映射、分页间隔 Proof 全部先红后绿并绿
- [x] 门禁 newHits=0、新增豁免 0、豁免基数不增（216 instances/62 files/69 entries 实测不变）
- [x] styling-system.md 与检查提示词锚点已回写 live baseline（另含 closure audit 发现的 flux-guide/14-theming.md 旧阶梯值更正）
- [x] 不存在被静默降级的 in-scope live defect（解剖学令牌化覆盖四个弹层组件；复检 P1 为宿主主题层存量缺陷，已裁决 successor 归 R2-4，见 Deferred）
- [x] 独立子 agent（fresh session）closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（exit 0，40 包）
- [x] `pnpm build`（exit 0，40/40）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（exit 0，约 15,948 passed / 0 failed）
- [x] `pnpm check`（exit 0，newHits=0）

## 附录：Phase 3 消费面全量审计清单（2026-09-23 实测）

四类弹层内容组件（Dialog/Sheet/Drawer/AlertDialogContent）消费点全量 grep（apps+packages，24 文件 32 处，排除 ui 组件实现自身与测试）：

| 文件                                                                                                                                    | 处置                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `flux-renderers-scheduling/src/gantt/gantt-editor.tsx` ×2                                                                               | `sm:max-w-md` ad-hoc → `size="sm"`（本 plan 迁移）                                                           |
| `flow-designer-renderers/src/designer-page-body.tsx`                                                                                    | `w-[min(560px,…)]`+`sm:max-w-2xl` ad-hoc → `size="base"`（门禁首跑抓出后迁移，560px 恰为 base 档，行为等价） |
| `flux-renderers-content/src/image.tsx`                                                                                                  | `max-w-3xl` ad-hoc → `size="md"`（本 plan 迁移）                                                             |
| `flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`                                                                      | 无 size（吃 500px 默认档）→ `size="sm"`（单格快编）                                                          |
| `flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` ×2 / `picker-dropdown.tsx` ×2                                         | 既有 `size` prop 透传（`DIALOG_SIZES = sm/default/lg/xl`），阶梯换值后契约不变，重校无误                     |
| `flux-react/src/dialog-host.tsx` ×2                                                                                                     | surface 词汇映射（xs→xs/sm→sm/md→base/lg→md/xl→lg/full→100vw），与新阶梯兼容，零改动                         |
| word-editor-renderers 6 处 / spreadsheet-renderers 2 处                                                                                 | 既有 `size="sm"/"default"/"lg"` 显式档位，合规                                                               |
| 其余（kanban-activity-log Sheet、toolbox-panel、select-mobile、tree-controls、page.tsx、confirm-bridge、mobile-infrastructure-demo 等） | 无宽度类，吃组件默认档（Sheet/Drawer=sm、Dialog=base、AlertDialog=default→sm）                               |

`--dialog-size-*` 过渡别名在迁移完成后已自 `theme-tokens/src/styles.css` 删除（grep 全仓零消费），anatomy 旧名别名同理零消费、一并删除。

## Deferred But Adjudicated

### playground 宿主裸 :root 调色板覆盖 --popover（H/D 复检轮新发现 B5-1）

- Classification: `out-of-scope improvement`（相对本 plan；相对 roadmap 属 live defect，已登记 findings 流程）
- Why Not Blocking Closure: 先于本 plan 存在的宿主主题层存量缺陷（`apps/playground/src/styles.css:63-94` 裸 `:root` 无条件覆盖 `--popover` 等暖白系，dark 下弹层表面亮底）；本 plan 未触碰任何颜色路径，且本 plan Decision 项明文"复检发现的新问题不在本 plan 修复，走 findings 流程"。已落评分卡 `docs/analysis/2026-09-23-plan490-hd-recheck/summary.md` P1 条目，归族 local → R2-4 批消化。
- Successor Required: `yes`
- Successor Path: R2-0 台账建立后登记为 finding，R2-4（或字母后缀批）按"宿主主题 family"消化

### Dialog header padding-x(16) 与 body(24) 不对称（H/D 复检轮 P3）

- Classification: `watch-only residual`
- Why Not Blocking Closure: P3、无任务阻碍，且现形态可能为 AMIS parity 有意惯例（header p-4），需先核对对标再裁决是否统一。
- Successor Required: `no`
- Successor Path: R2 台账 watch 池，走查批复核时顺带核对

## Non-Blocking Follow-ups

- Popover/DropdownMenu 若未来出现宽度档需求，复用 `--overlay-size-*` 阶梯而非新造词汇（登记为约定，非本 plan 工作）。

## Draft Review Record

- Reviewer / Agent: Round 1 plan 深度审查员（fresh session）→ Round 2 联合复审员（fresh session）→ Round 3 终审员（fresh session）
- Verdict: `pass`（Round 3，0 Blocker / 0 Major，共识达成）
- Rounds: 3
- Findings addressed: Round 1（`revised`，4 Major / 4 Minor）——①断点行为表述失实修订（Dialog 保持 inline width + max-w 兜底机制不变；Sheet/Drawer 档位以 `sm:` 起 max-width 替换封顶、`sm:` 以下 `w-3/4` 比例回退保留为例外）；②Drawer 改"size 仅作初始宽度、clamp 维持 160px–90% 现状、不新增 reset"；③改值打击面补齐（Phase 1 增 `styles.test.ts` 逐值断言更新、Phase 2 增 `c1a-visual-amis-parity.spec.ts` 档宽矩阵 / `dialog-lab-page.tsx` 文案 / `dialog-host.test.tsx` 断言）；④owner doc 回写补 `docs/components/dialog/design.md`（:28,118 钉死现值）与 `docs/components/drawer/design.md`；Minor：AlertDialog 映射改 default→sm、sm→xs 并披露宽度变化，"375/350/500 不在 4pt 栅格"勘误（500 恰为 4 的倍数但不在 8pt 系），别名删除时机改 repo-observable 触发，Phase 3 先红断言前置。Round 2（`revised`，新 1 Major / 3 Minor）——AlertDialog live 消费方实为 3 处（ai-conversations.tsx / dirty-close-guard.tsx / confirm-bridge.tsx，均未传 size、统一 320/384→480），已披露并落 Phase 2 映射断言 Fix 项；别名零残留指针标签改指 Phase 3 收口 Proof。Round 3 定点验证 4/4 通过、全文无残留矛盾。执行未启动（Phase 1 起待人工指令）。
