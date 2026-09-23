# [card] control:tabs

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/tabs` ｜ **载体**: lab 页（7 场景：horizontal / line variant / vertical left / sidebar left / sidebar right / form tabs / dialog+drawer surfaces）
- **矩阵裁剪**: simplified（matrixReason：widget 类控件但无画布/拖拽面；**切换态与键盘态必查已做**（点击切换、disabled 点击、ArrowRight 键盘、hover、kb-focus）；弹层有则必查已做（tab 面板内 dialog+drawer，H1/H3/H5 抽查）；裁掉：glass、移动端 swipe 中间态（`useIsMobile` 在桌面视口为 false，`tabs-panels-swipe` 不渲染）、closable/addable/draggable（lab 未演示，fixture 缺口见疑点））

## 1. 截图清单

| 状态                        | light                                                                   | dark                                                                   |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-23/lab-tabs-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/lab-tabs-default-1280x800-dark.png` |
| 默认 800×900                | `_tmp/visual-inspection-2026-09-23/lab-tabs-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/lab-tabs-default-800x900-dark.png`  |
| 切换态（Team active）       | `r2-2a/tabs/s1-switched-to-team-light.png`                              | `r2-2a/tabs/s1-switched-to-team-dark.png`                              |
| 键盘 ArrowRight 后          | `r2-2a/tabs/s1-keyboard-arrow-light.png`                                | `r2-2a/tabs/s1-keyboard-arrow-dark.png`                                |
| trigger 键盘 focus-visible  | `r2-2a/tabs/s1-trigger-kb-focus-light.png`                              | `r2-2a/tabs/s1-trigger-kb-focus-dark.png`                              |
| trigger hover               | `r2-2a/tabs/s1-trigger-hover-light.png`                                 | —（hover 机制同 variant 类，dark 不改判）                              |
| sidebar-right 场景          | `r2-2a/tabs/s5-sidebar-right-light.png`                                 | `r2-2a/tabs/s5-sidebar-right-dark.png`                                 |
| dialog 打开（H 抽查）       | `r2-2a/tabs/s7-dialog-open-light.png`                                   | `r2-2a/tabs/s7-dialog-open-dark.png`                                   |
| drawer 打开（H 抽查）       | `r2-2a/tabs/s7-drawer-open-light.png`                                   | `r2-2a/tabs/s7-drawer-open-dark.png`                                   |
| Save 提交后（surface 关闭） | `r2-2a/tabs/s7-dialog-after-save-light.png`                             | —                                                                      |

## 2. A–H 维度勾选表

- A 交互：A1 pass（trigger hover：muted `oklab(0.138/0.6)` → 前景 `rgb(2,8,23)`，changed=true）A2 pass（kb focus：outline 1px solid rgb(28,110,242) + ring 3px，不遮挡）A3 pass（trigger 高 25px ≥24；无 <24 目标）A4 pass（Settings disabled：`aria-disabled=true` + `data-disabled` + opacity 0.5，dispatchEvent 点击不切换——truly disabled）A5 n/a A6 n/a（拖拽 draggable 未在 lab 演示）A7 pass（dialog 有 header ✕ 关闭钮、遮罩、焦点落 dialog 容器；Esc/backdrop 走 Base UI 默认）A8 n/a A9 pass-with-note（切换即时生效，反馈可见；**溢出列表 active 滚入视野契约失效见 R2-2a-A9-35**）
- B 颜色：B1 pass-with-note（active 18.12/13.78；inactive light **5.21:1**（oklab(0.138…/0.6) 手工换算 ≈rgb(2,8,23)@60% 合成 rgb(96,102,116) vs 最深底——程序探针 oklab 未解析出数值，换算见发现备注）、dark 8.88；≥4.5 达标）B2 pass B3 pass（badge success/danger 语义正常）B4 pass B5 pass（dark inactive 8.88 无专有缺陷）B6 pass
- C 布局：C1 pass-with-note（trigger 内部 sw 76 vs cw 72 的 4px glyph 溢出为 overflow:visible 下的字形 advance 度量噪声，无裁切无滚动条，判非缺陷）C2 pass C3 pass C4 pass（800 视口 TabsList overflow-x-auto 契约类在位）C5 pass C6 n/a
- D 间隔：D1 pass（TabsList p-[3px] + panel 间距走 ui Tabs 默认体系）D2–D8 pass/n-a
- E 排布：E1 pass E2 pass（active trigger pill 强于 inactive muted，层级正确）E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1–F3 n/a F4 **fail(R2-2a-F4-33)**（sidebar-right 场景文案与渲染不符）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（dialog 560 ∈ --overlay-size 阶梯 360/480/560/720/960；drawer 479≈sm 档 480）H2 pass（drawer 短内容自适应）H3 pass（dialog bottom 228 ≤ 792）H4 pass（✕ 不与标题重叠）**H5 fail(R2-2a-H5-32)**（footer 动作左对齐主条目）H6 pass（label/控件顶对齐）H7 pass H8 n/a（短内容）H9 裁剪（800 视口未重开弹层；dialog maxWidth=calc(100%-32px) 自适应已由 computed maxWidth 证实）

## 3. 行为取证（切换/键盘/disabled/surface 提交）

- 探针 `_tmp/r2-2a-probes/w2r-tabs.mjs` + `w2r-tabs2.mjs`：
  - 点击 Team → `data-active` 迁移、panel（非 hidden）切换为 Team 成员文本 ✓；onChange 链路无 schema 事件，不验
  - disabled Settings dispatchEvent click → active 保持 Team ✓
  - 键盘：focus active trigger → `:focus-visible` 命中（outline+ring）；ArrowRight → 激活未越过 disabled（activeText 保持 Team），roving tabindex 移至 Settings（aria-disabled 触发器 tabindex=0——可聚焦的禁用项，a11y 小疣，见疑点）
  - **surface 提交（bug 73 族正向）**：Surfaces tab → Open Note Dialog → 输入 note → Save → `window.__tabsSurfaceSubmitProbe = {"note":"hello-from-tab"}`（tab 面板内 surface scope 提交值不丢）✓；dialog/drawer 关闭后 DOM 残留均 false ✓
  - line variant 指示条：active trigger `::after` content:""、bg rgb(2,8,23)（dark rgb(248,250,252)）、height 2px、absolute ✓
  - vertical/sidebar 几何：vertical 场景 listX=301 < contentX=389（nav 左）✓；**sidebar-right 场景 listX=301 < contentX=400、`.nop-tabs` 无 `data-tabs-sidebar-right` 属性、root 无 flex-row-reverse**（F4-33 坐实）

## 4. 发现条目

### [R2-2a-H5-32] tab 面板内 dialog footer 动作左对齐：Save 吸左、右侧大片留白、无取消钮（主条目）

- **页面/路由**: `#/lab/tabs` 第 7 场景（Tabs hosting dialog and drawer surfaces）→ Open Note Dialog
- **主题/视口/状态**: light+dark / 1280×800 / 弹层打开态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/tabs/s7-dialog-open-light.png`
- **目视描述**: 「Add Note」dialog 内唯一动作 Save 紧贴 body 左缘，footer 右半全空；确认动作不在桌面惯例主位（右下），视觉重心左偏。
- **程序化证据**:
  - 探针: `w2r-tabs.mjs` 读 dialog content rect + footer 容器 computed justify-content + 按钮 rect 序
  - 输出: dialog 宽 560（x 360–920）；footer `display:flex; justify-content:normal`；btns=`[{text:'Save', x:384}]`（= body 左 padding 24px 处，右侧 536px 空档）。同族第一实例见 loop 卡（Edit dialog Save x=384 / 内建关闭钮 x=884 吸右）。
- **对照基准**: 检查提示词 H5（操作按钮右对齐、确认在主位；间距收敛 `--dialog-footer-gap`）；已知族 1「弹层 actions 左对齐（R2-3b）」。
- **严重程度**: P2（弹层高频痛点区 + 桌面惯例偏差明确；两卡复现）
- **用户影响**: 所有 schema `actions` 驱动的 dialog footer 都左对齐，用户确认按钮位置偏离肌肉记忆；与内建右缘关闭钮（关闭/x）形成左右分裂的两套动作位。
- **修复方向**: dialog footer 容器改 `justify-content: flex-end` + `gap: var(--dialog-footer-gap)`（plan 490 阶梯内已有令牌）；schema 确认/取消次序保持（确认在主位=最右）。
- **归族**: systemic → R2-3b 弹层 actions 左对齐族（引用）+ 本卡实例（本条为族主条目，loop 卡条目指向此处）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。订正（根因锐化）：Save 行实为 form renderer [data-slot="form-actions"]（default-spacing.css L29-32 仅 flex+gap 12px 无对齐），非 surface footer 通道；修复条目与 dialog 卡 H5-09 合并（form-actions 缺省对齐一处修复）

### [R2-2a-F4-33] "Sidebar tabs (right)" 场景渲染为左导航：fixture 未设 tabsMode:'sidebar'/sidePosition:'right'

- **页面/路由**: `#/lab/tabs` 第 5 场景（Sidebar tabs (right)）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/tabs/s5-sidebar-right-light.png`（nav 明显在左）
- **目视描述**: 场景描述宣称"Sidebar-style navigation on the right side"，渲染与第 4 场景（sidebar left）完全一致——nav 列在左、内容在右；所谓 right 场景是 left 的复制品。
- **程序化证据**:
  - 探针: `w2r-tabs2.mjs` 读 `.nop-tabs` data 属性 + tabs-root flex-direction + list/content rect
  - 输出: `sectionAttrs=""`（无 `data-tabs-mode="sidebar"`、无 `data-tabs-sidebar-right`）；rootClass=`group/tabs flex gap-2`（无 flex-row-reverse）；listX=301、listRight=392 < contentX=400。fixture 源 `tabs-lab-page.tsx:127-149` sidebarRightTabs 仅 `orientation:'vertical'`，未设 `tabsMode`/`sidePosition`——渲染侧 `tabs.tsx:134-135` 的 `tabsMode==='sidebar' && sidePosition==='right'` 分支（flex-row-reverse）在全部 lab fixture 中零覆盖。
- **对照基准**: 检查提示词 F4（术语与文案一致）；lab 载体作为 schema 消费者的复制来源。
- **严重程度**: P2（载体误导：照抄该场景 schema 的用户得到与宣称相反的布局；且控件的 sidebar-right 能力全仓库无任何渲染验证）
- **用户影响**: demo 可信度受损；sidebar-right 路径（含 `data-tabs-sidebar-right` 视觉分支）处于无验证状态，回归风险隐性存在。
- **修复方向**: fixture 补 `tabsMode:'sidebar', sidePosition:'right'`（left 场景补 `tabsMode:'sidebar'`）；若 sidebar 布局另有视觉规格，随 R2-3 批补该模式专项截图。
- **归族**: local → R2-4 批（lab fixture 修正）+ 本卡实例；与已知族 #7 邻接（fixture 完整性）引用不并入
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）

### [R2-2a-A9-35] active 触发器"滚入视野"契约失效：scrollIntoView 选择器 `[data-active="true"]` 在 Base UI 下永不匹配

- **页面/路由**: `#/lab/tabs`（任一水平 tabs；溢出场景下才产生可见影响，lab 3 tab 无溢出故无当前视觉表现）
- **主题/视口/状态**: 不限（行为缺陷）/ — / 切换后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/tabs/s1-switched-to-team-light.png`（本页无溢出，缺陷为潜伏态，截图仅定位）
- **目视描述**: [visual-only 不适用——纯程序化发现] 无目视面；影响为宽 TabsList（多 tab、窄视口）切到屏幕外 tab 时列表不自动滚动，active tab 停留在可视区外。
- **程序化证据**:
  - 探针: `w2r-tabs-dump.mjs` 列举触发器属性
  - 输出: active 触发器属性为 `data-active=`（**空值**，Base UI 惯例），inactive 无该属性；`document.querySelector('[data-slot="tabs-trigger"][data-active="true"]')` 恒 null。而 `packages/flux-renderers-basic/src/tabs.tsx:221-227` 的 keep-active-visible effect 恰以 `[data-active="true"]` 查询——effect 每次空转，G1-R6 注释所载「desktop scroll contract: overflow-x-auto TabsList must scroll, not clip」在真实浏览器中从未生效。
- **对照基准**: tabs.tsx 内在契约注释（[G1-R6-视角8-01]）；检查提示词 A9（交互后反馈可见）。
- **严重程度**: P3（潜伏缺陷，当前无页面呈现可见症状；多 tab 产品面出现即表现为"点了没反应/反应在屏外"）
- **用户影响**: 移动端/窄容器多 tab 场景切换后用户看不到 active tab 落在哪；修复成本一行。
- **修复方向**: `tabs.tsx:222` 选择器改 `[data-slot="tabs-trigger"][data-active]`（属性存在性匹配，兼容空值）；补一条带 overflow TabsList 的 e2e 断言。
- **归族**: local → R2-4 批（选择器修正）+ 本卡实例
- **复核状态**: 未复核

## 5. 疑点（不计发现）

- closable/addable/draggable tabs lab 全未演示（`tabs-trigger-close` h-4 w-4=16px、`tabs-trigger-add` h-6 w-6=24px、拖拽反馈均未走查）——fixture 缺口，建议 R2-3 批补场景后按 A3/D 维度复验。
- keyboard roving tabindex 落在 aria-disabled 触发器（可聚焦的禁用项）：Base UI 行为，Tab 链会经过 disabled tab；a11y 细节，建议随 ui tabs 组件评估，不另立项。
- Surfaces 场景两按钮（Open Note Dialog/Drawer）全宽 896px：E2-26 watch 族实例引用（见 scope-debug 卡汇总），不另立项。
- dialog 关闭钮两套形态并存：本 dialog 为 header ✕ 图标钮，loop 卡 dialog 为 footer「关闭」文本钮（i18n 中文归 R2-1d-F4-01 族）——关闭语义跨弹层不一致，样本 2 例暂不足以立项，R2-3b 批弹层家族修时一并核对。
- trigger 内部 sw>cw 4px 为字形 advance 度量噪声（overflow:visible 无裁切），判非缺陷（误报排除）。
- 对比度备注：light inactive 触发器色为 `oklab(0.138372 -0.0072567 -0.0356486 / 0.6)`，探针 canvas 通道无法解析 oklab，按 OKLab→sRGB 手工换算 = rgb(2,8,23)@α0.6，合成 rgb(96,102,116)，vs 最深底 rgb(238,244,255) 得 5.21:1（≥4.5 达标）；复核 agent 可用浏览器 DevTools 或 oklab 换算器复算。

## 6. 台账回写

- 主 session 统一翻转 `lab-tabs` → carded。
