# 移动端基础设施 + 页面骨架提案

> 提案日期: 2026-06-21
> 提案状态: **已裁定（2026-06-21）** — 原 proposed 的 4 项待人审决策点已全部裁定并落地到 roadmap/design 文档。本文件保留为决策记录。
> 来源:
>
> - `docs/analysis/2026-06-21-flux-vs-vant-full-comparison.md`（Vant 全面对比，§3 基础设施 / §4 设计哲学）
> - `docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md`（商城缺口核查）
>   关联落地:
> - `docs/components/mobile-roadmap.md` M0.1（`todo`）/ M3a（页面骨架模式修订）
> - `docs/architecture/mobile-responsive-baseline.md` §10（基础设施契约）
> - `docs/components/page/design.md` §14（移动端骨架模式）

---

## 0. 提案摘要

本提案不涉及任何代码改动，只做两件事：

1. **识别移动端基础设施 4 项缺口**（safe-area / hairline / haptics / z-index 栈），在 `mobile-roadmap.md` 立 **M0.1（`todo`）** 工作项，在 `mobile-responsive-baseline.md` §10 立契约定义。
2. **校准页面骨架 5 类模式**（Tabbar / NavBar / ActionBar / SubmitBar / Sticky）的处理方式：不新增独立组件，走 `page.region` + 标准 schema 模板，模板落在 `page/design.md` §14。

**裁定后的执行约束**：M0.1 全部子项落在 Protected Area（`packages/ui/src/index.ts` ask-first + styling contract plan-first + surface-runtime plan-first），因此**必须先拟 execution plan 经 draft review 通过后才能动代码**，不能直接 implement。建议**1 个 plan 覆盖 4 个 Phase**（4 项共享同一批 ui 样式契约文件 + 同一次 ui 导出变更）。

---

## 1. 移动端基础设施 4 项缺口（现状证据 + 对策）

核查方法见 `docs/analysis/2026-06-21-flux-vs-vant-full-comparison.md` §3。结论：**4 项在当前代码库均未实现**（仅 baseline 文档有 safe-area 约定）。

### 1.1 现状证据（grep 核查结果）

| 缺口                         | 现状                                    | 证据                                                                                                  |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **safe-area 辅助类**         | 仅 baseline §2 文档约定，**代码未实现** | 仓库内无 `nop-safe-*` class 定义；连 `env(safe-area-inset-*)` 也未在 `packages/` 源码使用             |
| **hairline 0.5px 细线**      | **未实现**（文档无、代码无）            | 仓库内无 `nop-hairline` / hairline mixin                                                              |
| **haptics 触感反馈**         | **未实现**                              | 仓库内无 `nop-haptic` / `:active` 按压反馈 class；Vant 全组件通用的 `HAPTICS_FEEDBACK` 在 Flux 无对应 |
| **global z-index 栈**        | **未实现**；所有 overlay 用扁平 `z-50`  | `packages/ui/src` 内 dialog/drawer/sheet/popover/tooltip 全部 `z-50`，无 `useGlobalZIndex` 类管理器   |
| **playground viewport meta** | 缺 `user-scalable=no`                   | `apps/playground/index.html` 仅 `width=device-width, initial-scale=1.0`                               |

### 1.2 对策：立 M0.1（proposed）

| 子项  | 内容                                                                            | 契约位置           | Protected Area                                                      |
| ----- | ------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| M0.1a | safe-area 辅助类 `nop-safe-*` 落地                                              | baseline §2、§10.1 | `packages/ui/src/index.ts`（ask-first）                             |
| M0.1b | hairline `nop-hairline--*` 工具                                                 | baseline §10.2     | ui index.ts（ask-first）+ styling contract（plan-first）            |
| M0.1c | haptics `nop-haptic` class + 高频控件默认启用                                   | baseline §10.3     | ui index.ts（ask-first）+ styling contract（plan-first）            |
| M0.1d | surface-runtime global z-index 栈（dialog/drawer/sheet/toast/popover 共享自增） | baseline §10.4     | surface-runtime（plan-first，`surface-owner.md` 需补 z-index 章节） |

**与 M1–M5 的关系**：M0.1 是**软前置**（虚线依赖），不硬阻塞 todo 推进。但 M5（移动端原生组件）与 M1c（dialog/drawer）、M1a（bottom-sheet）落地前最好先有 M0.1c（haptics）+ M0.1d（z-index 栈）。详见 baseline §10.5 依赖矩阵。

### 1.3 不在本提案范围

- `playground` viewport meta 修改（`apps/playground/index.html`）—— 属 M2a 软键盘处理范围，随 M2a plan 落地，不单独立项。
- 6 个常用专用组件（lazyload / image-preview / password-input / area / number-keyboard / back-top）—— 见 §3 命名冲突说明，需逐项走 O1 流程，不在本次批量处理。

---

## 2. 页面骨架 5 类模式（决策 + 模板）

### 2.1 背景

Vant 有 5 个独立组件：`van-tabbar` / `van-nav-bar` / `van-action-bar` / `van-submit-bar` / `van-sticky`。早期 `docs/analysis/2026-06-21-mobile-mall-component-analysis-for-flux.md` §3.4 把 Tabbar 等同为 "`Tabs` + 固定定位 + `page.footer`"，**该措辞不准确**：

- **Tabbar ≠ `tabs`**。`tabs`（`flux-renderers-basic`）是**内容切换控件**（切同页面内面板）；Tabbar 是**路由级导航**（切页面，配 `navigate` action）。二者语义不同。
- NavBar/ActionBar/SubmitBar 也不只是 "Button 组合"，是有固定结构（返回栏 / 图标组+CTA / 复选+价格+CTA）的复合模式。

### 2.2 决策：走 page.region + schema 模板，不新增独立组件

理由：

1. Flux 已有 `page.header` / `page.footer` region（`page.tsx` 已实现），是这些底部/顶部固定栏的天然载体。
2. Flux 策略是"同组件同属性 + 响应式实现"，不建 `*-mobile` 组件（mobile-roadmap Rule）。Tabbar 等用 `flex` + `button` + `navigate` 即可表达，无需独立 renderer。
3. 独立组件会重复 `page.footer` 的定位/安全区逻辑，违反 DRY。

代价：每个商城页面要按模板拼。**对策**：在 `page/design.md` §14 提供标准 schema 片段，复制即用。

### 2.3 模板位置

5 个模板（Tabbar / NavBar / ActionBar / SubmitBar / Sticky）已落在 `docs/components/page/design.md` §14.1–§14.5，含完整 jsonc schema 片段 + 与 baseline/M0.1 的依赖说明。本文不重复。

### 2.4 与 mobile-roadmap M3a 的对齐

`mobile-roadmap.md` M3a 工作项已修订（2026-06-21）：明确这 5 类用 `page.region + schema 模板`，Tabbar 注明 ≠ `tabs`，模板指向 `page/design.md` §14。

---

## 3. 组件命名冲突核查（重要）

本提案**刻意没有**把 lazyload / image-preview / password-input 立为新工作项，原因如下（核查 `amis-baseline-matrix.md` + 现有 design.md 发现）：

| 候选名           | 冲突点                                                                                                                 | 现有决策                          | 建议                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lazyload`       | `docs/components/image/design.md:54` 明确"lazy-load 是 `image` 内部行为，不需要独立 LazyLoad 容器组件"                 | lazy 行为归 `image` renderer 内建 | 不立独立组件；若需通用懒加载，在 `image` renderer 加 `lazy: true` prop                                |
| `image-preview`  | 大图预览语义应折进现有 `image` family（`amis-baseline-matrix.md` retained）                                            | `image` 已 retained               | 不立独立组件；作为 `image` 的 preview 行为（点击放大 + 手势缩放）                                     |
| `password-input` | `input-password`（`amis-baseline-matrix.md:129`）已覆盖密码字段；AMIS `password` 已 not-retained 折进 `input-password` | `input-password` 已 retained      | 不立独立组件；Vant `van-password-input`（6 格数字密码）作为 `input-password` 的移动端变体（M2a 范围） |

**结论**：这 3 个名字都**不该**作为新组件名出现。真实缺口中的另外 3 个（`area` 省市区 / `number-keyboard` / `back-top`）是合法新组件，但优先级较低，建议走 O1 流程逐项启动（先更新 `amis-baseline-matrix.md` retained 决策），不在本次批量立项。

### 3.1 O1 候选池建议（已裁定，见 §4 裁定 4）

`roadmap.md` O1 原有 13 项（AMIS-derived）。基于 Vant 全面对比，已裁定加入 3 个 **Flux-native 移动端组件**（无 AMIS 源，类比 M5 处理，不走 amis-baseline-matrix）：

- `area`（省市区，收货地址依赖）—— 中优先级
- `number-keyboard`（支付/验证码）—— 中优先级
- `back-top`（长列表回到顶部）—— 低成本可补

**不进 O1 的项**（折进现有 family，见 §3 命名冲突）：

- `image-preview` 行为（折进 `image`，非独立组件）
- `lazyload` 行为（折进 `image`）
- `password-input`（折进 `input-password` 移动端变体）

---

## 4. 裁定记录（2026-06-21，原待人审清单已全部裁定）

原 4 项待人审决策点已按以下方式裁定并落地：

### 裁定 1 — M0.1 转 `todo`，作为单个工作项（不拆 4 个 plan）

**理由**：4 项基础设施（safe-area/hairline/haptics/z-index）都落在 `@nop-chaos/ui` + surface-runtime，共享同一批样式契约文件和同一次 ui 导出变更。拆 4 个 plan 会重复走 Protected Area 审批。按 plan 指南"一个 plan 覆盖共享 owner/验证路径的工作项"，**1 个 plan 4 个 Phase** 更合适。

**执行约束**：M0.1 涉及 ask-first/plan-first Protected Area，转 `todo` 后**AI 执行前必须先拟 plan 经 draft review**（不能直接 implement）。

**落地**：`mobile-roadmap.md` M0.1 工作项表格已补"执行约束"说明；`roadmap.md` Phase Status M0.1 改 `todo` + 注明"建议 1 plan 4 phase"。

### 裁定 2 — page/design.md §14 模板做 3 处微调

**理由**：模板整体可用，但有 3 处需修正：

1. **JSON 块内 `//` 注释移除**：原用 `jsonc` fence + 行内注释，落到 `example.json` 会报错（JSON 不允许注释）。改为 `json` fence + 注释上移为散文。
2. **Tabbar active 态描述修正**：原写"由 navigate 后的新页面 schema 决定"，不准确——Tabbar 是同一段 schema 多页复用，active 应由**当前页路径**驱动（表达式 className 或 page statusPath）。
3. **Sticky `top-11` 改 `top-[2.75rem]`**：`top-11`（2.75rem）语义不直观，改为显式 rem 值并说明依据（navbar `h-11` = 2.75rem；含 safe-area 时需 M0.1a 落地后用 CSS 变量统一）。

**落地**：`page/design.md` §14.1–§14.5 已更新。

### 裁定 3 — baseline §10.4 z-index 分层表保留 + 加"过渡兼容"说明

**理由**：当前代码全用扁平 `z-50`，硬切到分层会破坏现有 dialog/popover 叠加行为。分层表作为**目标约定**保留，但必须含迁移路径。

**落地**：`mobile-responsive-baseline.md` §10.4 末尾新增"过渡兼容（重要）"小节，规定 M0.1d plan 必须含"现有 z-50 平滑迁移"Phase（先实现计数器 → 保持初始值落 z-50 附近 → 逐步验证多浮层 → 禁止迁移期混用）。§10 各子项实现状态从 proposed 统一改 `todo`。

### 裁定 4 — O1 候选池加 area/number-keyboard/back-top（Flux-native 移动端组件）

**理由**：这 3 个无 AMIS 源 type，类比 mobile-roadmap M5（pull-refresh 等 5 个移动端原生组件也无 AMIS 源），不走 `amis-baseline-matrix.md` retained 决策流程，直接在 roadmap O1 立 Flux-native 候选。

**落地**：`roadmap.md` O1 行拆为两组——AMIS-derived（13 项，启动需改 amis-baseline-matrix）+ Flux-native 移动端（area/number-keyboard/back-top，启动只需建 design.md + 工作项）。并注明 Flux-native 类比 M5 处理方式。

**不加入 O1 的项**（按 §3 命名冲突结论）：image-preview / lazyload 折进 `image`，password-input 折进 `input-password` 移动端变体——都不立独立组件。

---

## 5. 本次改动的文件清单

| 文件                                                                  | 改动                                                                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `docs/components/mobile-roadmap.md`                                   | +M0.1（proposed）/ +proposed 状态值 / M3a 修订（5 类骨架模式 + Tabbar≠tabs）/ Dependency Graph 虚线 / Rule 补 proposed 语义 |
| `docs/components/roadmap.md`                                          | +M0.1 Phase Status 镜像 / +proposed 状态值 / Rule 补 proposed 语义 + 移动端轨道说明                                         |
| `docs/architecture/mobile-responsive-baseline.md`                     | safe-area 辅助类语气改契约 / +§10 移动端基础设施层（hairline/haptics/z-index 契约 + 分层约定 + 依赖矩阵）                   |
| `docs/components/page/design.md`                                      | +§14 移动端骨架模式（5 类 schema 模板）/ 原 §14 顺延为 §15                                                                  |
| `docs/analysis/2026-06-21-mobile-mall-component-analysis-for-flux.md` | §3.4 修正 Tabbar≠tabs 措辞，指向 page/design.md §14                                                                         |
| `docs/analysis/2026-06-21-flux-mobile-gap-analysis-vs-vant.md`        | 修正"唯一真实文档缺口"过强表述                                                                                              |
| `docs/logs/2026/06-21.md`                                             | +daily dev log                                                                                                              |
| 本文件                                                                | 新建                                                                                                                        |

## 6. 不做的事（Non-Goals）

- 不实现任何代码（ui/surface-runtime/viewport meta 全留待 M0.1 plan 后续）。
- 不擅自把 proposed 工作项标 todo（遵守 roadmap 人确认规则）。
- 不改 amis-baseline-matrix.md 的 retained 决策（lazyload 等命名冲突需逐项走 O1）。
- 不新增 Tabbar/NavBar 等独立 renderer（走 page.region 复用）。
- 不 commit。
