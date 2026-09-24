# [card] control:word-editor-page

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/word-editor` ｜ **载体**: 域 demo 页（word-editor-page 渲染器：word-editor-core + word-editor-renderers，canvas-editor 2D 纸面；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）。注意：`#/word-editor` **页面级**走查已在 R2-1b 完成（carded）；本卡为**控件契约面**首查，独立台账单元
- **契约面**: `word-editor-page` type 渲染区 = 整页文档编辑器（`nop-word-editor-page`：页头 + zone 页签 + ribbon 格式工具栏 + 数据集面板 + 纸面 canvas + 大纲面板）
- **矩阵裁剪**: simplified（matrixReason：任务矩阵口径指定的 文本选区/格式工具栏/内容编辑中间态 全查；裁掉：glass 皮肤（波次统一）、zone 页签切换深度态（R2-1b G7 zone 项已证）、表达式/条件块插入 Dialog（R2-1b H 维已过，本波仅页边距 Dialog dark 复检）、拖拽（R2-1b 裁剪口径维持：canvas-editor 内建文本拖选非 ghost 类））
- **探针**: `_tmp/r2-2c-probes/w5-word.mjs`、`w5-word2.mjs`、`w5-word3.mjs` → `out-w5-word*.json`

## 1. 截图清单

| 状态                           | light                                                                             | dark（真 data-mode）                         |
| ------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                  | `_tmp/visual-inspection-2026-09-25/r2-2c/word-editor-page/default-1280-light.png` | `…/word-editor-page/default-1280-dark.png`   |
| 默认 ~800 宽                   | `…/word-editor-page/default-800-light.png`                                        | —（布局与 light 同构，溢出面同探针）         |
| 文本选区（G1，双击选词蓝覆盖） | `…/word-editor-page/text-selected-light.png`                                      | —                                            |
| 内容编辑中间态（键入后）       | `…/word-editor-page/typed-light.png`                                              | —                                            |
| undo 逐次回退路径              | `…/word-editor-page/undo-path-light.png`                                          | —                                            |
| 页边距 Dialog                  | `…/word-editor-page/margin-dialog2-light.png`                                     | `…/word-editor-page/margin-dialog2-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（ribbon 按钮 hover bg `rgb(241,245,249)` + cursor pointer 探针坐实） A2 pass（ribbon focus-visible ring 维持 R2-1b 结论） A3 pass（`smallTargets` 仅 2 个 1×1 隐藏 input = canvas-editor 隐藏输入层，误报排除维持） A4 pass（无选区时格式钮态正确投影，`加粗 aria-pressed:false`） A5 n/a A6 n/a（拖选为 canvas-editor 内建，R2-1b 裁剪维持） A7 pass（页边距 Dialog 打开/Esc 关闭复检） A8 n/a A9 **pass/warn（编辑即时上屏（像素 180→296）；undo 可逆但逐字符粒度过细 = R2-2c-G6-157）**
- B 颜色：B1 pass（页头/ribbon 12.61:1 维持） B2 pass B3 pass B4 pass（chrome `--nop-*` 令牌） B5 pass（chrome dark 平价：ribbon dark bg oklab 深色；纸面恒白 = V8a 纸面语义豁免维持；dark 纸面黑字 15+ 可读） B6 pass
- C 布局：C1 **warn（家族引用：R2-1b-C1-01 维持——固定三栏 1280 即裁大纲面板 222px，见 §4）** C2 pass（页内无新重叠；chip 遮返回 = 已知族见 §4） C3 pass（六区清晰维持） C4 **warn（同 C1-01 同根因：800 视口 pageEl scrollWidth 1502 vs 800，大纲不可达）** C5 pass（滚动仅纸面区维持） C6 pass（canvas attr 595×842 == rect，DPR1 探针环境，HiDPI 轻微模糊为 canvas-editor 内建行为不计）
- D 间隔：D1 pass（ribbon 组内 gap 8px 均一维持） D2–D8 pass/n-a
- E 排布：E1–E6 pass（维持 R2-1b 全过结论；数据集空态 CTA 在）
- F 一致性：F1–F4 pass（「数据集/字段/大纲」文案统一维持）
- G 设计器：G1 pass（双击选词蓝色覆盖像素/截图坐实，Cmd+A 全选维持 R2-1b） G2 pass（ribbon hover 可供性探针坐实；纸面文本 cursor 为 canvas-editor 惯例） G3 n/a（裁剪维持） G4 n/a（文档恒有内容维持） G5 pass（缩放/重置维持 R2-1b） **G6 warn(R2-2c-G6-157)** G7 pass（选区→加粗钮态、工具栏→纸面格式变化双向，R2-1b 结论维持；本波 boldState 投影 `aria-pressed:false` 契约在） G8 pass（纸面豁免 + chrome 平价维持）
- H 弹层：H1 pass（页边距 Dialog **480px = sm 档**复检） H3 pass（bottom 553 ≤ 792） H4 pass H5–H7 pass/n-a（维持） **B5 注：Dialog dark 亮底 = 已知族见 §4** H9 pass

## 3. 发现条目

### [R2-2c-G6-157] undo 粒度逐字符：一次连续键入需按撤销 7 次才能整体回退（无输入组合并）

- **页面/路由**: `#/word-editor`（纸面正文编辑；任意连续键入场景同险）
- **主题/视口/状态**: light / 1280×800 / 键入后连续撤销
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/word-editor-page/undo-path-light.png`（回退完成态；路径证据为探针像素序列）
- **目视描述**: 单击纸面定位光标后连续键入 7 个字符，随后每按一次 Cmd+Z 只消失 1 个字符，需 7 次才能回到键入前状态；主流编辑器（Word/Docs）将连续键入合并为一个 undo 单元（或按停顿分块）。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-word2.mjs`（键入 `WORDCHK` 前后 canvas nonWhite 像素采样 + 逐次 Cmd+Z 像素路径）
  - 输出: `undoPath: [296, 281, 260, 249, 236, 220, 202, 180]`——7 次撤销单调回落至基线 180，`undoRestored: true`；即每个字符一个 undo 单元，操作可逆但粒度为基础单位
- **对照基准**: 检查提示词 G6（undo 反馈：操作可逆且状态即时回退——可逆性满足）；NN/g「增量且可逆」（粒度影响回退成本）；Word/Google Docs 连续键入合并 undo 惯例
- **严重程度**: P3（功能可逆、无数据损失；高频编辑路径的回退成本问题）
- **用户影响**: 误粘/误键入一段文字后需反复撤销，用户易「多按几次」过头或转而手选删除， undo 信任感下降。
- **修复方向**: `word-editor-core` canvas-editor 历史栈在入栈时合并连续文本输入（按时间窗 ~500ms 或标点/选区变化分块），undo 单元从字符级升为输入组级；配合 R2-1b 已验证的格式化 undo（单步回退）保持一致粒度。
- **归族**: watch-only → 台账（编辑器 undo 语义；与 scada-editor undo-redo 栈是两套实现，互不同族）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：canvas 像素路径逐值相同，7 字 7 撤

## 4. 已知族命中（引用，不另立项）

- **R2-1b-C1-01（固定三栏无弹性：大纲面板 1280 被裁 222px、800 整体不可达，local → R2-4/R2-3c 候选族）— 复检：维持**。新实例证据：`w5-word.mjs overflow`: `.nop-word-editor-page`/`.nop-workbench` overX 均为 222（与 R2-1b 逐值一致）；narrow `pageEl scrollWidth 1502 vs clientWidth 800`；text-selected-light.png 右缘大纲被裁可见。
- **宿主级 `--popover` dark 亮底族 — 维持**。新实例证据：`w5-word3.mjs dialogDark.bg = rgb(251,250,249)`（页边距 Dialog dark 亮底，与 R2-1b margin-dialog-dark 同象）；归 R2-4 dark 族收口。
- **chip 遮挡族（R2-1a-C2-01/R2-1b-C2-01）— 维持**。text-selected-light.png 左上「选 0」chip 压返回箭头现场留档。
- 误报排除：① 纸面 dark 恒白 = V8a 纸面语义豁免；② 1×1 hidden input = ce-inputarea 隐藏输入层；③ Ctrl vs Cmd 快捷键 = macOS 平台惯例（R2-1b 已排除）；④ dark 探针对比度伪值风险 = oklab 背景解析限制（方法学口径 #3），以 dark 截图复核为准。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `word-editor-page` → carded（card 列填本路径）；G6-157 归族 watch → 台账；C1-01/dark 族/chip 族维持记录回写原条目链路。
