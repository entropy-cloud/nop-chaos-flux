# [card] page:word-editor

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/word-editor`（根级 hash 路由） ｜ **载体**: 设计器域页面（word-editor-page 渲染器：word-editor-core + word-editor-renderers，canvas-editor 2D 纸面）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；G3 裁剪——本页无拖拽放置类对象（画布内为文档选区/光标，原生文本拖选属 canvas-editor 内建，非 ghost/参考线类拖拽手感范畴）；G4 裁剪——文档恒有默认内容、纸面无空态概念（数据集面板空态已取证）；A5 loading 帧未捕获——编辑器同步初始化）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                       | light                                                                                    | dark                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-23/r2-1b/word-editor/word-editor-default-wide-light.png` | `…/word-editor-default-wide-dark.png`   |
| 默认 800×900               | `…/word-editor-default-narrow-light.png`                                                 | `…/word-editor-default-narrow-dark.png` |
| 全选态（G1，蓝色选区覆盖） | `…/word-editor-select-all-light.png`                                                     | —                                       |
| 加粗应用后（G7 面板→画布） | `…/word-editor-bold-applied-light.png`                                                   | —                                       |
| undo 后（G6）              | `…/word-editor-after-undo-light.png`                                                     | —                                       |
| 页眉 zone 激活（G7）       | `…/word-editor-zone-header-light.png`                                                    | —                                       |
| 缩放 2 步后（G5）          | `…/word-editor-zoom-in-2x-light.png`                                                     | —                                       |
| 画布滚动 250px（C5）       | `…/word-editor-canvas-scrolled-light.png`                                                | —                                       |
| 页边距 Dialog              | `…/word-editor-margin-dialog-light.png`                                                  | `…/word-editor-margin-dialog-dark.png`  |
| 插入表达式 Dialog          | `…/word-editor-insert-expr-dialog-light.png`                                             | —                                       |
| 查找替换内嵌条             | `…/word-editor-search-open-light.png`                                                    | —                                       |
| 键盘 focus-visible（A2）   | `…/word-editor-kbd-focus-ribbon-light.png`                                               | —                                       |
| hover（A1）                | 探针读值坐实（ribbon 按钮 bg transparent→rgb(241,245,249)），不另截帧                    | —                                       |

探针：`_tmp/r2-1b-probes/word-phase{1,2,3,4,5}.mjs` → 同名 `-out.json`（加载 6.5s、单脚本 <25s，未触 60s 上限）。canvas 像素取证：`getImageData` 全帧 nonWhite 计数（892→选中 3649→加粗 3773→undo 839）。

## 2. A–H 维度勾选表

- A 交互：A1 ✔（ribbon 按钮 hover bg 变化探针坐实） A2 ✔（Tab → 保存钮 3px oklab ring + border-ring，`matches(':focus-visible')=true`） A3 ✔（targetScan(24) 仅 2 个 1×1 隐藏 input——canvas-editor 隐藏输入层，非可见目标，误报排除） A4 n/a（无 disabled 控件） A5 n/a（同步初始化） A6 n/a（G3 裁剪，见上） A7 ✔（页边距 Dialog：focus 落入、Esc 关闭、关闭钮在位） A8 n/a（无拖拽功能） A9 ✔（undo/加粗后词数、纸面、工具栏态即时更新；视图操作有反馈）
- B 颜色：B1 ✔（页头/ribbon 文字 12.61:1；dark 面板文字实测可读——探针 1.19 为 effectiveBg 仅读 backgroundColor 未计 background-image 渐变的伪值，以截图+像素复核为准） B2 ✔ B3 ✔ B4 ✔（chrome 全走 `--nop-*` 令牌） B5 ✔（chrome dark 平价；纸面恒白 = V8a 已裁决纸面语义豁免，不报；dark 下纸面文字黑/白对比 15+ 可读） B6 ✔
- C 布局：C1 **fail(R2-1b-C1-01)**（右侧大纲面板被裁 222px） C2 ✔（本页内元素无意外重叠；宿主 chip 遮返回钮为 R2-1a-C2-01 已知项，见 §4） C3 ✔（页头/区页签/ribbon/左面板/纸面/右大纲六区清晰） C4 **fail(R2-1b-C1-01 同根因)**（800px 下大纲面板整体不可达） C5 ✔（滚动只发生在 canvas region（scrollTop 203），页头/ribbon 固定，doc 不可滚，滚动容器 1 个） C6 ✔（canvas attr 595×842 == rect 595×842，无拉伸；注：attr 为 CSS px 未乘 DPR，HiDPI 下有轻微模糊，canvas-editor 内建行为，不计）
- D 间隔：D1 ✔（ribbon 组内 gap 8px×10 均一） D2 ✔ D3 n/a（无数据行） D4 ✔ D5 n/a D6 n/a D7 ✔（面板间 border 分隔清晰） D8 ✔
- E 排布：E1 ✔（三问可答） E2 ✔ E3 ✔ E4 ✔ E5 ✔（面板以卡片+边框分组） E6 ✔（数据集空态有「添加数据集」CTA）
- F 一致性：F1 ✔（zone 页签/查找替换内嵌条模式与 spreadsheet 一致） F2 ✔（左 240/右大纲面板与 spreadsheet 宿主面同档） F3 ✔ F4 ✔（「数据集/字段/大纲」文案统一） F5 n/a
- G 设计器：G1 ✔（选区蓝覆盖像素坐实 892→3649） G2 ✔（ribbon hover 可供性；纸面 cursor 为 canvas-editor 文本惯例） G3 n/a（裁剪） G4 n/a（裁剪） G5 ✔（放大×2：canvas 595×842→714×1010；重置精确回 595×842） G6 ✔（Cmd+Z 加粗即时回退 3773→839） G7 ✔（双向：选中→加粗钮 aria-pressed=true；zone 页签 aria-pressed 切换正确；工具栏加粗→纸面像素变化） G8 ✔（纸面恒白豁免 + chrome dark 平价）
- H 弹层：H1 ✔（页边距 Dialog 480px = sm 档；插入表达式 560px = base 档） H2 n/a（无 Sheet/Drawer） H3 ✔（maxH 768 ≤ 800，bottom 533 ≤ 792） H4 ✔ H5 ✔（取消→确认 flex-end 次主位正确） H6 ✔ H7 ✔（body padding 令牌化） H8 n/a（短内容） H9 ✔（max-w calc(100%-2rem) 契约在）

## 3. 发现条目

### [R2-1b-C1-01] 固定三栏 workbench 无弹性：右大纲面板 1280 视口被裁 222px、800 视口整体不可达

- **页面/路由**: `#/word-editor`（word-editor-page 三段 workbench：数据集面板 + 纸面 + 大纲面板）
- **主题/视口/状态**: light+dark / 1280×800 与 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/word-editor/word-editor-default-wide-light.png`（右缘「大纲/添加标题后…」被切断）、`…/word-editor-default-narrow-light.png`（大纲面板完全不可见）
- **目视描述**: 1280px 默认视口下右侧大纲面板只露出 ~110px，标题后被硬裁；800px 视口下面板完全移出视口，页面根 `overflow-hidden` 无横向滚动兜底，大纲功能不可达。
- **程序化证据**:
  - 探针: `__P.overflowScan()`（phase1）
  - 输出: `nop-word-editor-page`（h-screen overflow-hidden）与 `nop-workbench` 各 clipX sx=222（cw=1280）；800px 下 sx=702——大纲面板起点 1152 + 宽度 > 视口；垂直滚动容器仅纸面区，无横向恢复路径
- **对照基准**: 检查提示词 C1（无意外溢出/画布被裁）、C4（1280 与 ~800 双视口不塌不挤）；styling-system.md 布局契约（固定列应给 min-w-0/折叠路径）
- **严重程度**: P2（默认视口即裁切、窄视口功能整体丢失；大纲为次面板故未到 P1——编辑主路径纸面/ribbon 不受阻）
- **用户影响**: 用户在 1280×800（本项目基准视口）即看到残缺面板；窄窗口/分屏用户无法使用大纲导航；观感明显未完成。
- **修复方向**: `packages/word-editor-renderers/src/word-editor-page.tsx` workbench 栅格改 `grid-template-columns: auto minmax(0,1fr) auto` 且两侧面板给 `min-w-0`/折叠（左侧已有 collapse-field-panel 先例），或右侧大纲面板沿用左面板的 collapse 按钮；纸面容器保持 `minmax(0,1fr)` 收缩，优先保大纲可见。
- **归族**: local → R2-4 批（word-editor-page 布局；若 R2-4 核对 dashboard/flow designer 均为「固定三栏+overflow-hidden」模式则升 systemic）
- **复核状态**: 未复核

## 4. 已知项确认（不重复立项）与误报排除

| 项                                                 | 处理                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 宿主悬浮 classic/light 切换器遮压左上返回箭头      | R2-1a-C2-01 已登记同族（host chip 遮压页面左上元素），本页确认复现于返回按钮——已知项影响面扩展，不另立                                  |
| dark 下页边距 Dialog 仍亮底（bg rgb(251,250,249)） | 宿主 `--popover` 已知项（R2-1a 裁定），确认一句话，不重复立项                                                                           |
| 纸面 dark 恒白                                     | V8a 已裁决纸面语义豁免，照用不报                                                                                                        |
| Ctrl+A/Ctrl+Z 在 macOS Chromium 无效               | canvas-editor 快捷键匹配 `evt.metaKey`（macOS Cmd 惯例）；Cmd+A/Cmd+Z 实测全部生效——平台惯例非缺陷，不报                                |
| Ctrl+A 首测无选区、加粗无效果                      | 首测用 Ctrl（见上行）；换 Cmd 后双向同步全通过，非产品缺陷                                                                              |
| targetScan 报 2 个 1×1 INPUT                       | canvas-editor 隐藏输入层（`ce-inputarea` 等），非可点击目标，误报排除                                                                   |
| dark h1/ribbon 探针对比度 1.19                     | 探针 effectiveBg 只合成 backgroundColor、未读 background-image 渐变，落到白色兜底；截图+暗色像素复核实际前景/背景可读——探针伪值，非缺陷 |
| 词数统计输入后未即时跳变                           | canvas-editor 词数口径（中英混合计数）差异，非视觉缺陷域，不报                                                                          |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；C1-01 已归族 local → R2-4 批；批内复检通过后 → `verified`。
