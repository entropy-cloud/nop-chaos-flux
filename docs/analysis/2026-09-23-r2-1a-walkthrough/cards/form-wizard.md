# [card] page:form-wizard

- **批次**: R2-1a（波 5） ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/form-wizard` ｜ **载体**: complex-page（schema: `apps/playground/src/complex-pages/page-schemas/form-wizard.json`）
- **矩阵裁剪**: full（本页为同步向导表单，无独立异步首屏数据；异步仅存在于 picker 弹层内，已由 A5-01 覆盖 loading/empty 缺失；拖拽无 → 拖拽中间态裁剪）

## 1. 截图清单（状态矩阵）

| 状态                           | light                                                                                                                                 | dark                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 默认 1280×800（step1）         | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-default-light.png`                                             | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-default-dark.png` |
| 默认 ~800 宽（800×900）        | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-narrow-light.png`                                              | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-narrow-dark.png`  |
| focus-visible（输入框）        | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-focus-light.png`                                               | —（dark 焦点环探针已跑，值见 A2）                                                        |
| hover（下一步 primary）        | 像素级对比已做（见 A1-01，hover 与静止逐字节相同，无独立截图价值）                                                                    | —                                                                                        |
| disabled（上一步/step3 导航）  | step1-default-light 内可见（左下 上一步 0.5 透明度）                                                                                  | 同左                                                                                     |
| 校验错误（空表单点下一步）     | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-error-light.png`                                               | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-error-dark.png`   |
| 步骤切换（step2）              | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step2-default-light.png`                                             | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step2-default-dark.png` |
| 步骤切换（step3 确认页）       | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step3-confirm-light.png`                                             | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step3-confirm-dark.png` |
| 导航直跳中间态（step2→step3）  | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-stepjump-attempt-light.png`                                          | —                                                                                        |
| 弹层打开（role combobox）      | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-role-popover-light.png`                                              | —（combobox 弹层 dark 受宿主 --popover 覆盖影响，见 H 备注）                             |
| 弹层打开（部门 picker Dialog） | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-picker-dialog-light.png`<br>`…-loaded-light.png`（等 8s 后）         | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-picker-dialog-dark.png` |
| 弹层滚动中（H3/H8）            | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-picker-dialog-scrolled-light.png`（body 无内容可滚，见 H8=n/a 说明） | —                                                                                        |
| 提交完成 toast（A9）           | `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-complete-toast-light.png`                                            | —                                                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(A1-01)** A2 pass A3 **warn(A3-01)** A4 pass A5 **fail(A5-01)** A6 n/a A7 pass（弹层有关闭钮、Esc 可关） A8 n/a A9 **warn(A9-01)**
- B 颜色：B1 **fail(B1-01)** B2 **fail(B2-01)** B3 pass（error 红两主题同源） B4 pass B5 pass（dark 专项复检已做，除 B1/B2 外无 dark 专有缺陷；弹层亮底为已登记宿主 --popover 项） B6 pass（错误态走 destructive 令牌非裸蓝）
- C 布局：C1 pass（全页溢出扫描 0 命中，800 宽复扫 docSW=800 无横向溢出） C2 pass C3 pass（页头/向导/动作区分区清晰） C4 pass（窄视口 step-nav 不折行、不溢出） C5 pass（无 sticky 遮挡，焦点环中心可见性探针通过） C6 n/a
- D 间隔：D1 pass（field 间距序列 [16] / [16,16,16] 全 8pt 栅格） D2 pass D3 n/a D4 pass（wizard-actions `mt-4 pt-3 border-t` 节奏一致） D5 pass（label→control 8px、字段间 16px、error→control 8px 成体系，两步一致） D6 n/a D7 pass（actions↔body 间隙 16px+，无 <4px 贴死） D8 pass
- E 排布：E1 pass（标题+三步指示+当前步高亮，3 秒可答） E2 pass（完成/下一步 primary，上一步 outline） E3 pass（确认在右主位；step-jump 为 allowStepJump 设计行为，见观察③） E4 pass（step-nav marker x 序列 309/461/601 等距；字段 label/control 左缘 lx=cx=296；step3 确认行 x=313 全对齐） E5 pass E6 n/a
- F 一致性（横切）：F1 pass（本页内一致；跨页结论归汇总批） F2 n/a F3 n/a F4 pass F5 n/a
- G 设计器：n/a（非画布页）
- H 弹层：H1 pass（picker Dialog 560 = `--overlay-size-base` ✓；role combobox 弹层为 hover floater 不入阶梯） H2 n/a H3 pass（弹层 bottom 461 ≤ 800-8） H4 pass（关闭钮右上独立，与标题无求交） H5 pass（取消左/确认右，双钮均 72px = `--overlay-anatomy-footer-button-min-width` ✓） H6 n/a（弹层 body 无表单控件可测） H7 pass（body padding 16/24 = `--overlay-anatomy-body-padding-x` 24 ✓） H8 n/a（body 内容为空壳无长内容可滚——本页 H3/H8 深度验证被 A5-01 阻断，注明待 A5-01 修复后复验） H9 pass（560 弹层在 1280 视口内；800 窄视口未复现弹层，见 trims）

**trims 说明**：800 窄视口下弹层重开未截图（H9 部分裁剪）——dark 弹层打开依赖 role 先选中的偶现路径，两次窄视口尝试未触发；风险低（560 < 800-2rem）。

## 3. 发现条目

### [R2-1a-A5-01] 部门 picker 弹层打开为空壳：无表格/加载/空态提示

- **页面/路由**: `#/complex-pages/form-wizard`（step2「部门」字段 → picker 弹层「选择部门」）
- **主题/视口/状态**: light + dark 双主题复现 / 1280×800 / 弹层打开后等待 2.5s–8s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-picker-dialog-light.png`、`…-loaded-light.png`、`…-picker-dialog-dark.png`
- **目视描述**: 弹层只有标题「选择部门」+ 右上关闭钮 + 底部取消/确认，正文整块空白，无表格、无 Spinner、无 Skeleton、无空态文案。
- **程序化证据**:
  - 探针: 打开弹层后轮询 `[role="dialog"]` 内 `tbody tr` / `.animate-spin` / `[data-slot="spinner"]` / `[data-slot="skeleton"]` / `[data-slot="empty"]` 计数（3 个独立脚本：`form-wizard-picker-deep.mjs`、`form-wizard-picker-state.mjs`、`form-wizard-flow3.mjs`）。
  - 输出: 弹层 560×122，`tableRows:0, spinner:0, skeleton:0, empty:null`，等待 8s 后仍为 0；body child 仅剩 sr-only 的「移动对话框」键盘说明元素；伴随 console error `Cannot update a component ... while rendering a different component`（React 渲染期 setState）。且首点「未选择」chip 时弹层可完全不出现（dialogs=0 轮询 3s），先选「角色」后再点则稳定打开空壳——行为不稳定。
- **对照基准**: 检查提示词 A5「loading 用 Spinner/Skeleton 非纯文本；empty 有意义提示非空白」——空白既非 loading 也非 empty 提示，直接违反。
- **严重程度**: P1（部门选择功能在本页不可用；部门为可选字段故未升 P0）
- **用户影响**: 用户走到第 2 步点开「选择部门」看到一片空白，无法判断是加载中还是无数据，任务被迫放弃或反复重开。
- **修复方向**: 排查 picker 渲染器 loadAction 触发链路（渲染期 setState 报错为直接线索：`packages/flux-renderers-form-advanced` picker 加载态应在 useEffect/事件回调中 settle）；弹层 body 在 loading 时渲染 Spinner、失败/空数据时渲染 Empty 组件，禁止裸空白。
- **归族**: systemic → R2-3 批（picker+loadAction 是 standard-crud / approval-tasks 等页共用模式，根因修复收多页；需 R2-3 复核归因）
- **复核状态**: 未复核

### [R2-1a-A1-01] primary 按钮 hover 无任何视觉反馈

- **页面/路由**: `#/complex-pages/form-wizard`（「下一步」「完成」主按钮；全部 `<button>` primary 同根因）
- **主题/视口/状态**: light / 1280×800 / 指针 hover 强制态
- **截图**: hover 与静止态截图像素逐字节一致（`next.screenshot()` Buffer.equals=true），无差异可看；类名探针为主要证据。
- **目视描述**: 悬停「下一步」按钮，颜色、滤镜、透明度均无变化，无 hover 可供性。
- **程序化证据**:
  - 探针: Playwright `hover()` 后读 computed `backgroundColor/filter/opacity`，并对比 hover 前后按钮元素截图 Buffer。
  - 输出: `rest=rgb(28,110,242)|filter:none|op:1`，`hover=rgb(28,110,242)|filter:none|op:1`，`pixel-identical: true`。根因在 `packages/ui/src/components/ui/button.tsx`：primary/default variant 的 hover 仅声明 `[a]:hover:bg-primary/80`（只对 `<a>` 生效），`<button>` 元素无 hover 规则。
- **对照基准**: 检查提示词严重度示例明确列「主按钮 hover 无反馈」为 P1；Design QA 十类清单「交互态（hover/focus/error）」。
- **严重程度**: P1
- **用户影响**: 主操作按钮（提交/下一步/保存）悬停无反馈，削弱可供性；键盘外鼠标用户缺乏「可点」确认。属全站高频面。
- **修复方向**: `button.tsx` primary/default variant 增加 `hover:bg-primary/85`（button 与 a 通用的非 `[a]` 前缀规则），或统一抽 `hover:bg-primary/80` 去掉 `[a]:` 限定。
- **归族**: systemic → R2-3 批（≥3 页同根因，所有 primary `<button>` 命中；判级说明：判级表系统性升一级在本条会推到 P0，但 hover 缺失不构成「无法完成任务」，建议 R2-3 裁决维持 P1 上限）
- **复核状态**: 未复核

### [R2-1a-B1-01] 页头 feature 徽章文字对比度不足：light 3.05:1、dark 1.10:1 不可读

- **页面/路由**: `#/complex-pages/form-wizard` 页头（「wizard」「per-step 校验」「onComplete 提交」徽章；全部 complex-pages 共用此 showcase 头部）
- **主题/视口/状态**: light + dark / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-default-light.png`、`…-step1-default-dark.png`（右上紫色徽章）
- **目视描述**: light 下紫底蓝字勉强可辨；dark 下浅紫底+浅蓝字几乎融为一体，无法阅读。
- **程序化证据**:
  - 探针: computed color + 背景合成 WCAG 对比度（`form-wizard-misc.mjs`）。
  - 输出: light `color: rgb(10,71,169) / bg: rgb(166,137,250)` → **3.05:1**（10px 小字需 4.5:1）；dark `color: rgb(178,206,251) / bg: rgb(203,186,252)` → **1.10:1**。根因 `Badge variant="secondary"`（`bg-secondary text-secondary-foreground`，`complex-pages-showcase.tsx:173`），该令牌对在本主题双模式下均未满足对比度，dark 的令牌值未做 dark 适配。
- **对照基准**: WCAG 1.4.3 正文 ≥4.5:1（10px 非大字）；检查提示词 B1。
- **严重程度**: P1（dark 下文字不可读）
- **用户影响**: 页头 feature 标签属辅助信息，dark 下完全不可读，light 下低于阈值；影响所有 40 个 complex-pages 页头。
- **修复方向**: 在 `apps/playground` 主题令牌（或 theme-tokens）中为 `--secondary`/`--secondary-foreground` 提供双模式达标色对（如 light 底 `#A689FA`+前景深靛 `#1E3A8A` 系、dark 底改用 `--secondary/20` 半透明+浅前景），或 showcase 头部改用 `variant="outline"`。
- **归族**: systemic → R2-3 批（40 页同根因；若 R2-3 认定徽章纯装饰可降 P2）
- **复核状态**: 未复核

### [R2-1a-B2-01] 输入框边界对比度不足：light 1.33:1 / dark 1.24:1（<3:1）

- **页面/路由**: `#/complex-pages/form-wizard`（全部 `.nop-field input`；所有表单页同令牌）
- **主题/视口/状态**: light + dark / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-default-light.png`（输入框极浅灰边）、`…-step1-default-dark.png`（深底深边）
- **目视描述**: 两个主题下输入框边框都与底色几乎同色，控件边界主要靠 placeholder 文字暗示。
- **程序化证据**:
  - 探针: `getComputedStyle(input).borderColor` 与输入框合成背景、页面底色求 WCAG 对比度。
  - 输出: light border `rgb(225,231,239)` vs 卡底 `rgb(255,255,255)` → **1.33:1**；dark border `rgb(31,42,61)` vs 输入框底 `rgb(15,23,41)` → **1.24:1**（对页面底 `rgb(2,8,23)` 亦仅 1.12:1）。
- **对照基准**: WCAG 1.4.11 UI 组件边界 ≥3:1；检查提示词 B2。
- **严重程度**: P2
- **用户影响**: 低视力用户难以定位输入区；dark 下尤为明显。不影响操作完成，故不升 P1。
- **修复方向**: `--input` 令牌（theme-tokens 双模式）加深：light 建议 `--border` 再降一档（如 `#CBD5E1`，约 1.9:1 仍不足，需到 `#94A3B8` 级 ≈3:1）或给输入框加 `ring-1 ring-border` 外描边；dark 建议 `rgb(51,65,85)` 以上。属全局令牌决策，走 R2-3 统一改。
- **归族**: systemic → R2-3 批（所有表单控件边界同令牌）
- **复核状态**: 未复核

### [R2-1a-A9-01] 步骤提交校验只标红首个非法字段，其余必填无反馈

- **页面/路由**: `#/complex-pages/form-wizard`（step1 姓名+邮箱均必填均空，点「下一步」）
- **主题/视口/状态**: light + dark / 1280×800 / 校验错误态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step1-error-light.png`、`…-step1-error-dark.png`
- **目视描述**: 姓名框红边+「姓名不能为空」，邮箱框外观与默认态完全相同，无红边无文案，但导航被同样阻断。
- **程序化证据**:
  - 探针: 点击下一步后统计可见 `[data-slot="field-error"]` 数量与文本。
  - 输出: `count: 1`（仅「姓名不能为空」，rgb(181,59,44)，12px）；邮箱字段无 error 节点。error→control 间距 8px、dark 错误色对比 7.27:1（这两项本身合格）。
- **对照基准**: 检查提示词 A9「交互后反馈可见…非静默更新」；Design QA 交互态清单（error 态应覆盖所有非法字段）。
- **严重程度**: P2（用户需多次点「下一步」逐个发现错误，向导高频路径）
- **用户影响**: 多必填字段场景下错误发现成本线性增加；用户可能误以为邮箱已通过。
- **修复方向**: 步骤 commit 校验（`flux-renderers-layout` wizard commit → form validate 链路）改为收集全部非法字段并逐字段渲染 `field-error`，或在 email 字段加 `aria-invalid` 红边（无文案也可感知）。
- **归族**: local → R2-4 批（待 complex-form / combo-editor 卡交叉确认：若两页同样只报首错则升 systemic）
- **复核状态**: 未复核

### [R2-1a-A3-01] input-number 步进按钮 24×16，高度低于 24px 最小可点目标

- **页面/路由**: `#/complex-pages/form-wizard`（step2「预算额度(万)」输入框右侧上下箭头）
- **主题/视口/状态**: light / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/form-wizard/form-wizard-step2-default-light.png`（输入框右缘双 chevron）
- **目视描述**: 步进上下箭头明显扁小。
- **程序化证据**:
  - 探针: 可交互元素 `getBoundingClientRect()` 短边统计（`form-wizard-walk.mjs` probeCore smallTargets）。
  - 输出: `[{"w":24,"h":16,"tag":"BUTTON","slot":"stepper-increase"},{"w":24,"h":16,"slot":"stepper-decrease"}]`（另有 2 个 1×1 视觉隐藏原生 input，属已登记误报模式不报）。
- **对照基准**: WCAG 2.5.8 最小目标 24×24 CSS px；检查提示词 A3。
- **严重程度**: P2（硬性 WCAG 判据；步进为辅助输入途径故不升 P1）
- **用户影响**: 触屏/精确定点操作困难；鼠标用户误点率升高。
- **修复方向**: stepper 按钮（input-number 渲染器内部）高度提升至 ≥24px/每个（或整体 24 高共享热区上下各 12px 不算达标，需独立 24×24），如 `h-6 w-6` 并收窄排列。
- **归族**: systemic → R2-3 批（input-number 全站共用；待各页卡交叉计数）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                         | 排除理由                                                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| step2 点 step3 导航直跳成功、绕过第 2 步必填校验             | `wizard-step-nav.tsx` `computeCanGoTo(allowStepJump, furthestReached)` 设计行为（commit 仅锁 in-flight，G1-R3-视角3）；已截图 `stepjump-attempt-light.png`，确认数据保留、step1 显示 ✓ 完成态，不立项 |
| step1 初始「上一步」「step3 导航」disabled `cursor: pointer` | disabled 按钮 `pointer-events:none`，cursor 永不生效，属已登记误报模式                                                                                                                                |
| 1×1 隐藏 input 计入 smallTargets                             | 视觉隐藏原生 input（opacity-0 模式），已登记误报                                                                                                                                                      |
| dark 弹层亮底                                                | 宿主 `:root` 覆盖 `--popover`，已登记 systemic-local 项（本卡确认：picker Dialog dark 亮底复现，`picker-dialog-dark.png`），不重复取证                                                                |
| hover 截图无差异可能是指针移开                               | 已用 Playwright `hover()` 强制态 + computed style + Buffer 对比复验，坐实为真缺陷（A1-01），不属误报                                                                                                  |
| 确认页「角色：admin」显示原始值非「管理员」                  | schema 文本模板直接引用 `wizardData.step2.role`（值路径），页面 schema 层选择，非渲染器缺陷；watch 记录不立项                                                                                         |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
  findings 归族：A5-01/A1-01/B1-01/B2-01/A3-01 → R2-3；A9-01 → R2-4（待交叉确认）；
  批内复检通过后 → `verified`。
