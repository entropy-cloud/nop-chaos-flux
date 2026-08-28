# R2 第 7 轮发现（round-07 · G6 收敛终判轮 · 零发现）

> 组号: G6（@nop-chaos/ui 62 非 test 模块） · 轮次: Round 07（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-29 · agent = general（fresh session） · HEAD = `0f183874a`（与 R5/R6 同点，live code 未变动）
> 轮次性质: 前 6 轮已系统闭合焦点环、i18n、滚动契约、悬空 CSS 变量双向扫描、aria 关联链、表单族受控/非受控、方向条件类（data-horizontal/data-vertical 失效族）、事件处理器覆写、type 默认、z-index 全局系统、aria-invalid 族、第三方默认样式、drawer 手势冲突、死参数、"选择器→应用侧生产方"第三链环穿透（TableRow 选中态零生产方）。本轮只接受**前 6 轮所有方法面都未触及的全新根因**，且必须通过真实用户影响检验、与累积 274 条逐根因比对为全新。dimension 09–12 与全量 WCAG 不在范围。
> 输入清单: `AGENTS.md`、`dispatch-shared-prefix.md`（全部强制生效）、`dispatch-recursive-extension.md`、`dedup-baseline.md` §1–§4（强制）、round-01 Grep 按 `[G6-` 精读（16 条）、round-02-compact / round-03-compact 全文、round-04 Grep 按 `[G6-` 精读、round-05-g6 全文精读（含"核对过不立案"清单）、round-06-g6 全文精读（含 R5 放行记录修正、4 项零影响死类清理项登记、"已核对干净的面"十项）。去重基线 = 全审累积 **274 条**（G6 组 **26 条**：R1×16 + R2×6 + R3×1 + R4×1 + R5×1 + R6×1）。

---

## 结论（零发现）

**未发现新的高价值问题。审查结束。**

本轮对前 6 轮方法面之外的全新根因面做了 11 项定向探测（逐项证据见"检查方法"与"弃报留档"），全部闭合为零发现：G6 组在"12 视角 + 6 轮已闭合盲区 + R6 第三链环穿透 + 本轮 11 项新增面"的组合方法面下，不再存在通过"全新根因 × 真实用户影响 × 与 274 条零重叠"三重检验的候选。**确认 G6 组审查终判收敛，终止递归。**

## 检查范围

- **目标目录**: `packages/ui/src/components/ui/` —— `ls | grep -v test` 实测 **62/62 非 test 模块**，与 round-06-g6 检查范围节枚举的 62 模块清单逐一核对一致（accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input-group, input-otp, input, item, json-viewer, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar-context, sidebar-layout, sidebar-menu, sidebar, skeleton, slider, sonner, spinner, switch, table-row-class-name, table, tabs, textarea, toggle-group, toggle, tooltip, use-dialog-drag, wrap-surface-tab-focus）。
- **对照的发现类别**: 全审累积 274 条（G6 组 26 条 + 跨组 248 条），逐根因比对口径；dedup-baseline §1（ma5-ux 6 条已修复不得报）、§2（16 项已登记缺口不得报）、§3（误报对照 8 条一律不报）、§4（dimension 09–12 与全量 WCAG 边界排除）。
- **消费链交叉核实范围**: `packages/ui/src/styles/mobile.css`（nop-haptic）、`packages/theme-tokens/src/styles.css`、`apps/playground/src/styles.css` cursor 规则、workspace 全仓 `data-variant`/`variant="destructive"` 生产方反查、Base UI 1.3.0 内建钳制/默认值口径（沿 R5/R6 已实证的 dist 事实）。

## 检查方法（本轮新增的 11 个根因面，全部为前 6 轮未触及或未作为独立方法面探测的类别）

1. **disabled 视觉家族一致性**（前 6 轮只核过 aria-invalid 族与受控性，未核 disabled 视觉族）：全家族 grep `disabled:` 23 文件逐条比对——input/textarea（opacity-50 + bg-input/50 + cursor-not-allowed）、select trigger（opacity-50 + cursor）、button/toggle（pointer-events-none + opacity-50）、checkbox/radio（cursor + opacity-50）、switch/slider（data-disabled:opacity-50 + cursor）、input-group（has-disabled:bg-input/50 + opacity-50）、input-otp（has-disabled:opacity-50）、combobox item/chip（data-disabled / has-disabled）、label（group-data-disabled + peer-disabled）→ **全部一致**。重点疑点 native-select 的 `<select>` 串上确无 `disabled:opacity-50`，但包装层 `native-select.tsx:14` 以 `has-[select:disabled]:opacity-50` 在 wrapper 承接调光（与 R1 视角4-02 的高差分档不同，本处净视觉与家族一致）→ 闭合。
2. **cursor 供龄面**：Tailwind v4 preflight 不再给 button 默认 pointer；核实 `mobile.css:110-113` `.nop-haptic { cursor: pointer }` 全局规则 + `button.tsx` 基类挂载 `nop-haptic` → Button 指针光标在位；menu item/trigger 的 `cursor-default` 与 shadcn 上游逐字同款（沿"上游一致不报"先例）→ 闭合。（注：mobile.css:109 注释"Button already sets cursor via shadcn defaults"表述不精确——实际由 nop-haptic 自身规则提供，净效果正确，登记弃报留档。）
3. **菜单族 destructive 变体一致性**：dropdown-menu.tsx:121 / context-menu.tsx:100 / menubar.tsx:92 三族 `data-[variant=destructive]` 样式串逐字一致（text-destructive + focus:bg-destructive/10 + svg 联动）→ 闭合。
4. **菜单族 shortcut/kbd 渲染一致性**：三族 MenuShortcut（dropdown:264 / context-menu:224 / menubar:200）`ml-auto text-xs tracking-widest text-muted-foreground group-focus/*:text-accent-foreground` 逐字一致 → 闭合。
5. **select/combobox item 的 destructive 守卫死类面**（R6 死类登记法的延伸）：select.tsx:117 / combobox.tsx:133 仅有 `not-data-[variant=destructive]:` 负向守卫而无正向 destructive 样式——核实两组件签名均未暴露 variant prop、全仓 `data-variant` 生产方反查（命中全部为 notice-bar/card/progress/layout 等无关组件）→ **零生产方零影响死守卫**，低于发现门槛，登记弃报留档（与 R6 四项死类同档）。
6. **placeholder 家族一致性**：input.tsx:16 / textarea.tsx:11 / native-select.tsx:23 均有 `placeholder:text-muted-foreground`，焦点环/aria-invalid 旁路同款 → 闭合。
7. **硬编码 DOM id 碰撞面**：全目录 `id="` / `id={` 反查——仅 dialog descriptionId（R2 [G6-R2-视角9-02] 已报）与 chart `chartId`（useId 生成）→ 零新发现。
8. **弹层几何参数跨族一致性**：sideOffset/alignOffset 逐族枚举（context-menu 0/4 光标锚定、dropdown 4/0、select 4/0、combobox 6/0、tooltip 4/0、menubar 8/-4、dropdown 子菜单 0/-3）——差异为各 surface 锚定方式（光标 vs 触发器）的刻意调参，档差 2~4px 非用户可感知，非跨组件不一致 → 闭合。
9. **timer/delay 默认值面**：tooltip/hover-card/sonner 无本地 delay 默认、共享 Base UI 内建默认（沿 R5/R6 已实证的 dist 口径）→ 无分裂面。
10. **progress 值溢出面**：Base UI Progress.Root 内建 0–100 钳制（progress.tsx 纯透传）→ 闭合。
11. **sidebar 状态持久化面**：`sidebar-context.tsx:62` cookie 写入在位（shadcn 同款），`window`/`document` 直接调用全目录反查仅命中已覆盖路径（use-dialog-drag 钳制、drawer resize 监听、sidebar 快捷键）→ 闭合。

另对 combobox.tsx 全文通读（前轮仅覆盖可访问名/受控性两镜头）：ComboboxClear/trigger 的 `group-has-data-[slot=combobox-clear]/input-group:hidden` 联动、ChipRemove `opacity-50 hover:opacity-100`、ComboboxEmpty `group-data-empty` 显示链均闭合，零新根因。

## 弃报留档（不构成发现的候选 + 事实性备注，防复核重复提问）

- **select.tsx:117 / combobox.tsx:133 `not-data-[variant=destructive]` 负向守卫为死守卫**：无公开 variant prop、全仓零 `data-variant` 生产方（见方法 5）。零用户影响；若未来给 SelectItem/ComboboxItem 引入 destructive 变体，需同步补正向样式（现仅 dropdown/context-menu/menubar 三族有完整 destructive 样式）。登记供 API 演进批次参考。
- **mobile.css:109 注释表述不精确**："Button already sets cursor via shadcn defaults"——Button 类串实际无 `cursor-pointer`（Tailwind v4 preflight 亦不再提供），指针光标由 `.nop-haptic` 自身 `cursor: pointer` 规则提供。净效果正确，纯注释问题，不立案。
- **ComboboxInput `showClear` 空值态**：Base UI Combobox.Clear 语义内建值存在性联动，无可感知缺陷面。
- 前 6 轮全部"核对过不立案/弃报留档"清单（round-02:1615-1625、round-03:976-985、round-04 G6 段 6 项、round-05-g6 盲区①②与 data-\* 全量交叉核对、round-06-g6 十项干净面 + 4 项死类登记）本轮逐项确认维持，无一翻案。

## 去重自检声明

本轮**零立案**，无新增条目；方法 1–11 的全部候选（native-select disabled、cursor 注释、select/combobox 死守卫、menubar sideOffset 8 等）均未通过"全新根因 × 真实用户影响 × 与 274 条零重叠"三重检验，已按上述弃报留档归档。与 G6 组既有 26 条（16+6+1+1+1+1）零重复；与跨组 248 条零重叠；dedup-baseline §1–§4 边界全程生效，未发生 §3 误报模式入报、§2 缺口表象误立为发现的情形。

## 检查口径声明

本轮为源码静态审查（无浏览器运行时验证）；native-select 包装层调光、nop-haptic 光标、死守卫零生产方三类结论均基于类串/选择器直读 + 全仓生产方 grep，无运行时断言依赖；沿 R5/R6 已实证的 Base UI 1.3.0 dist 口径（内建钳制、Clear 语义、delay 默认）未重复实测。
