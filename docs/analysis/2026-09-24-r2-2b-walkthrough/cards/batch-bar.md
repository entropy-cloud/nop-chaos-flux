# [card] control:batch-bar

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/batch-bar` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Crud host（$crud scope 契约）/ Table host（page-scope selection 契约）/ Default count text without a template）
- **矩阵裁剪**: simplified（matrixReason：单 surface 功能条，无弹层、无异步、无拖拽；裁掉的状态：glass 皮肤、多行批量选中上限态、`selectionPath` 指向不存在路径的错误态——fixture 未提供该变体；已覆盖 light+dark（真 data-mode）、1280+800 双视口、默认（空选）/选中/清除后三值态、disabled 按钮态抽查）
- **探针**: `_tmp/r2-2b-probes/w3-batch-bar.mjs`（首轮，checkbox sr-only 定位失败）、`w3-batch-bar2.mjs`（修正后主探针，输出 `out-w3-batch-bar2.json`）、`w3-batch-bar3.mjs`（dark PNG 像素采样对比度，输出 `out-w3-batch-bar3-pixels.json`）

## 1. 截图清单

| 状态                                         | light                                                                          | dark（真 data-mode）                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 默认 1280×800（三 bar 均未渲染=空选门控）    | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/default-1280x800-dark.png` |
| 默认 800×900                                 | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/default-800x900-light.png`  | —（800 窄视口仅 light 走查，dark 几何与 1280 无差异）                         |
| 三场景全部选中（bar 出现：计数+action+清除） | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-1280-light.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-1280-dark.png`    |
| 800 窄视口选中态                             | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-800-light.png`     | —                                                                             |
| 点内置清除后（crud bar 卸载）                | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/after-clear-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/after-clear-1280-dark.png` |
| 清除后 800 视口                              | `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/after-clear-800-light.png`  | —                                                                             |

## 2. A–H 维度勾选表

- A 交互：A1 pass（bar 内按钮 hover 归 button 卡 A1 族）A2 pass A3 **warn**（16×16 checkbox 视觉 <24，但 `after:-inset-x-3/-inset-y-2` 扩展命中区至 ~40×32，误报排除表处置；`table-column-resize-handle` 4×39.5 = R2-1d-A3 族已登记实例，命中引用）A4 pass（Bulk activate 在无选中时由 `${!$crud.hasSelection}` 驱动 disabled，本 fixture 选中后为 enabled，disabled 渲染属性正确）A5 n/a（无异步）A6/A8 n/a A7 n/a（无弹层）A9 **warn(R2-2b-A9-81)**（clearLabel 无 clearTarget 时静默失效）
- B 颜色：B1 pass（dark 像素采样：计数文字 8.89:1、清除钮 14.26:1，≥4.5）B2 **warn(R2-2b-B2-82)**（dark bar 边框/表面 1.18:1/1.09:1 低于 3:1，light 对称 1.07:1，疑有意 muted 设计）B3 pass B4 pass（bg-muted/40、border-input 走令牌）B5 pass（dark 像素采样双主题平价，无白底块/不可读字）B6 n/a
- C 布局：C1 pass（docOverX 0；checkbox span overX 12 / td select-cell overX 3 为 overflow-visible scrollWidth 假阳性，无裁切，误报排除）C2 pass C3 pass C4 pass（800 视口 bar flex-wrap 不破版）C5 pass C6 n/a
- D 间隔：D1 pass（bar 内 gap 8px 落栅格）D2 pass D3 n/a D4 **warn(R2-2b-D4-83)**（bar 内 action 按钮 32px 与内置清除钮 28px 同行混高）D5 n/a D6 n/a（本 bar 非分页条）D7 pass（bar 与宿主表格间隙正常）D8 pass（bar px-3 py-2 走令牌）
- E 排布：E1 pass（bar 出现即答"选了几项、能做什么、如何撤销"）E2 pass（清除钮 ghost 弱于 action outline，层级正确）E3 pass（清除 ml-auto 靠右，符合"撤销操作在远端"惯例）E4 pass（count 与 action 左对齐、清除右对齐，x 序列无偏差）E5 n/a E6 pass（空选=bar 不渲染，即"空态引导"由表格空态承担）
- F 一致性：F1 pass（crud host 与 table host 两种宿主的 bar 同构同 token）F2–F3 n/a F4 **warn**（i18n zh-CN 回退族命中：英文 lab 页内置清除钮文案"取消选择"、aria"全选/选择行/调整列宽"为中文——R2-2a-F4-11 族新实例，引用不另立项）F5 n/a（非分页条）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A9-81] clearLabel 在无 clearTarget 时被静默丢弃：内置清除钮不渲染、无 dev 警告——schema 契约缺口族实例

- **页面/路由**: `#/lab/batch-bar`（场景 3 "Default count text without a template"，schema 定义 `clearLabel: 'Deselect all'` 而未定义 `clearTarget`）
- **主题/视口/状态**: light+dark / 1280 / 选中 1 行后
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-1280-light.png`（底部场景 3 bar 仅"已选择 1 项"，无任何按钮）
- **目视描述**: 场景 3 的 bar 选中行后只显示计数文本；场景描述承诺"clearLabel renames the built-in clear button"，但 bar 内没有清除按钮，用户无法从 bar 上撤销选择。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-batch-bar2.mjs`（`barsAfter` 段）
  - 输出: `lab-bar-default: { present: true, text: "已选择 1 项", btns: [] }`——对照场景 1/2（有 `clearTarget`）`btns: [action, "取消选择"]`。源码 `packages/flux-renderers-data/src/batch-bar.tsx` L198 `{clearTarget ? (<Button …>{clearLabel ?? t('flux.batchBar.clearSelection')}</Button>) : null}`：clearLabel 仅在 clearTarget 分支内消费；clearTarget 缺失时 clearLabel 静默丢弃，且不触发 handleClear 中已有的 `batch-bar-target-invalid` dev 警告（该警告只在 clearTarget 提供但 resolve 失败时触发）。
- **对照基准**: 检查提示词 A9（交互反馈可见，非静默）；已知族"schema 动态响应性缺口 / 表单 AMIS 契约缺口（R2-3 候选）"
- **严重程度**: P3（fixture 演示参数组合缺 clearTarget；渲染器侧无静默数据损坏，仅功能缺失无提示）
- **用户影响**: schema 作者按场景描述写了 clearLabel 却得不到清除钮，且无任何警告指出缺 clearTarget，排障成本高。
- **修复方向**: `batch-bar.tsx` 在 `clearLabel` 提供而 `clearTarget` 缺失时复用 `isDevRuntime()` 警告通道提示"clearLabel 需与 clearTarget 配对"；或 definition 层（`batch-bar-definition.ts`）加一条组合校验。
- **归族**: watch-only → 台账（schema 契约缺口族 R2-3 候选外围；fixture 层面的直接诱因）
- **复核状态**: 未复核

### [R2-2b-D4-83] batch-bar 行内 action 按钮（32px）与内置清除钮（28px sm）同行混高

- **页面/路由**: `#/lab/batch-bar`（场景 1 Crud host / 场景 2 Table host，凡 actions + 内置清除同现的 bar 同险）
- **主题/视口/状态**: 双主题 / 1280 / 选中态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-1280-dark.png`（"Bulk close" 与 "取消选择" 同 bar 两端，高度肉眼可辨）
- **目视描述**: 同一操作条内自定义 action 按钮（默认 size，h32）与内置"取消选择"（ghost sm，h28）高度差 4px，垂直居中对齐下基线错位。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-batch-bar2.mjs`（`barsAfter[].btns`）
  - 输出: `lab-bar-crud.btns: [{text:"Bulk activate", h:32}, {text:"取消选择", h:28}]`；bar 本体 h50、`items-center` 对齐（`batch-bar.tsx` L178）。清除钮 `size="sm"` 写死（L201）。
- **对照基准**: 检查提示词 D4（操作条内控件规格统一）/ F1（同语义操作同规格）
- **严重程度**: P3（4px 混高，两端分布下不易察觉；影响精致度不影任务）
- **用户影响**: 对高度敏感的设计走查可察觉基线错位；普通用户基本无感。
- **修复方向**: 内置清除钮改默认 size（h32 对齐 action），或 actions 区域整体降为 sm 档；二选一后跨场景统一。
- **归族**: watch-only → 台账（单点规格分歧）
- **复核状态**: 未复核

### [R2-2b-B2-82] dark 下 batch-bar 表面/边框对比度低于 3:1（1.09/1.18），light 对称——疑有意 muted 设计待裁决

- **页面/路由**: `#/lab/batch-bar`（全部场景）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 选中态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/batch-bar/selected-1280-dark.png`
- **目视描述**: dark 下 bar 表面与页面背景几乎同色，仅靠文字与 1px 边框区分；light 下同样极弱。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-batch-bar3.mjs`（PNG 像素采样，DOM 合成对比度在 alpha 0.4 渐变面上失真故走像素）
  - 输出: `barBgVsPageBg 1.09`、`borderVsBarBg 1.18`、`borderVsPageBg 1.28`（bar bg rgb(21,29,40)、page rgb(15,20,27)、border rgb(31,42,61)）；文字对比度达标（计数 8.89:1、清除钮 14.26:1）。
- **对照基准**: WCAG 1.4.11（非文本对比度 3:1——严格说 bar 是 status 容器非交互控件，判据适用性存疑）
- **严重程度**: P3（bar 的出现/消失本身是反馈，文字承载信息且达标；表面弱化疑为 muted/40 有意设计且 light 对称）
- **用户影响**: 高分屏/低亮度环境下选中反馈条的"块面感"弱，用户主要靠文字感知。
- **修复方向**: 若裁决为缺陷：dark 下 border 改用 `--nop-border-strong` 类令牌（≥3:1 档）；否则在 styling-system.md 登记"批量操作条 = 有意 muted 弱表面"作为误报排除依据。
- **归族**: watch-only → 台账（设计裁决项）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退族**（R2-2a-F4-11）：英文 lab 页中内置清除钮文案"取消选择"、表格 aria"全选/选择行/调整列宽"为中文——新实例引用。
- **A3 小目标族**（R2-1a-A3 族 / R2-1d-A3 族）：`table-column-resize-handle` 4×39.5 直接命中已登记实例；16×16 checkbox 视觉 <24 但命中区经 `after:-inset` 扩展，按误报排除处置。
- **lab 载体与环境基建族**：scope-debug 面板（"调试/折叠"中文 chrome + pre 长令牌不换行）随 lab 载体出现，引用 R2-2a scope-debug 卡；debug chip 左上角悬浮属 chip 族。
- **计划内锚点复检通过**：空选门控（三 bar `present:false` → 选中后出现 → 清除后卸载）全链路正确；`$crud.selectedRowKeys` 与 page-scope `selectionStatePath` 两种宿主契约均工作；role="status" aria-live="polite" 在 bar 根节点（a11y 加分项）。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/batch-bar/design.md（owner-doc-missing，review-b D-2，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-batch-bar` → carded（卡列填本路径）；findings 归族后 → digested。
