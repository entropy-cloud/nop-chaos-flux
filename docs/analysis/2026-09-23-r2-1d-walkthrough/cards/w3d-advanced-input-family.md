# [card] page:w3d-advanced-input-family

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w3d-advanced-input-family` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/w3d-advanced-input-family-demo.tsx`，period 三件套 + markdown-editor + input-file/image + TipTap editor）
- **矩阵裁剪**: simplified + 编辑器中间态全查（markdown 分屏预览、TipTap 工具栏、上传 hover、dark、800；无弹层无拖拽；上传 pending/result 态机属动作域，页面为静态空态演示）

## 1. 截图清单

| 状态                               | light                                                      | dark                                                     |
| ---------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280（首屏/页尾）             | `default-light-1280.png` / `default-light-1280-bottom.png` | `default-dark-1280.png` / `default-dark-1280-bottom.png` |
| ~800 宽                            | `default-light-800.png`                                    | —                                                        |
| 编辑器区域（markdown+TipTap+上传） | `editor-light.png` / `image-upload-region-light.png`       | `editor-dark.png`                                        |
| Quarter 下拉打开                   | `quarter-menu-light.png`                                   | —                                                        |
| 上传按钮 hover                     | （探针 bg 变化取证）                                       | —                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass（上传钮 hover `rgb(241,245,249)` + pointer，探针取证）A2 pass（编辑器 contenteditable 可聚焦）A3 pass（两套工具栏按钮均 30×28；sr-only input 为上传原生句柄）A4 pass（TipTap 撤销/重做初始禁用置灰）A5 pass（TipTap 空态「Type here...」placeholder）A6 n/a A7 n/a A8 n/a A9 pass（month 清钮 ×、值回显行实时）
- B 颜色：B1 pass B2 pass B3 pass B4 pass（工具栏/预览走令牌）B5 **warn(B5-52 TipTap 内容条深色块) + pass（markdown 预览 dark 全适配）** B6 pass
- C 布局：C1 pass C2 **fail(C2-51 Back 按钮被调试徽标遮挡)** C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2–D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass（工具栏/输入/回显左缘对齐）E5 pass（三卡分区清楚）E6 pass
- F 一致性：F1 pass（两编辑器工具栏图标语言一致）F4 pass（工具栏 aria 全 zh 统一）其余 n-a
- G 设计器：n/a
- H 弹层：n/a（quarter 原生下拉属控件浮层）

## 3. 发现条目

### [R2-1d-C2-51] 「Back to Home」按钮被固定调试徽标遮挡（页面缺顶部留白）

- **页面/路由**: `#/w3d-advanced-input-family`
- **主题/视口/状态**: light+dark / 1280+800 / 默认
- **截图**: `default-light-1280.png`（左上角按钮显示为「o Home」，前半被「虫 0」徽标压住）
- **目视描述**: 页面 section 顶部 padding 为 0，Back to Home 按钮落在 (24,24)，与固定悬浮的调试计数徽标（55×28，同原点）完全重叠，按钮左半不可点区被盖。
- **程序化证据**:
  - 探针: 双 rect 求交（`_tmp/r2-1d-probes/w5-w3d-out.json` overlap）
  - 输出: `btn {x:24,y:24,w:114}`、`badge {x:24,y:24,w:55,h:28}`、`intersects: true`、section `paddingTop: "0px"`——兄弟 demo 页（code-editor/condition-builder 等）按钮 y≈96（p-10），仅本页缺失。
- **对照基准**: C2 无意外重叠；WCAG 2.4.11 焦点不得被遮挡。
- **严重程度**: P2（页面级返回主操作被遮挡）
- **用户影响**: 进入本页后返回按钮视觉残缺、左半点击区无效。
- **修复方向**: `w3d-advanced-input-family-demo.tsx` section 恢复与兄弟页一致的 `p-10`（或 `pt-10`），使按钮落到徽标下方。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-B5-52] dark 下 TipTap 内容条为近黑块，与宿主面板色阶断裂

- **页面/路由**: `#/w3d-advanced-input-family`（两个 TipTap editor）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `editor-dark.png`（「Initial rich text.」/「Type here...」两条近黑内容条压在深灰面板上）
- **目视描述**: 编辑器内容区背景近乎纯黑（≈rgb(2,8,23)），外围面板为深蓝灰（≈rgb(15,23,42)），形成两条突兀的黑色带；文字对比度本身合格。
- **程序化证据**: 探针: content 颜色 `rgb(248,250,252)`（前景白 ✔），bg transparent 继承至近黑层（`w5-w3d-out.json` editorDark + 截图）。
- **对照基准**: B5 dark 平价（同页面内表面色阶应连贯）；markdown 编辑器源区（同页）与面板色连贯，TipTap 独断裂。
- **严重程度**: P3
- **用户影响**: dark 观感割裂，误以为内容区禁用。
- **修复方向**: TipTap contenteditable dark 底改用 `hsl(var(--background))` 或 `--muted` 系令牌，与 markdown 源区对齐。
- **归族**: systemic → R2-3 批（嵌入编辑表面 dark 底色令牌化，与 code-editor B5-51 同族不同根因——此处仅色阶断裂，无可读性损失）
- **复核状态**: 未复核

**本页正例（记录）**: period 三件套正确（month 清钮 ×、quarter 年+季两段、range 双输入逗号分隔，`month:2024-06 / quarter:2024-Q3 / year:2024 / range:2024-01,2024-06` 回显齐全）；markdown-editor 分屏实时预览（`# Hello` → H1、`**markdown**` → 粗体、`` `code` `` → 代码片，dark 下同样正确，helpers.render 组合成立）；TipTap 双实例工具栏 30×28 全 zh aria（粗体/斜体/…/撤销），undo/redo 初始禁用；`rich:<p>…</p>` 序列化回显；上传钮 hover 反馈明确；~800 无溢出。

**存疑项（排除记录）**: recon 底部截图「Image upload (thumbnail preview)」前两字符疑似被裁——DOM 探针证明文本节点完整（x=69, w=203，与容器同缘无裁切），新截 `image-upload-region-light.png` 渲染完整，判定为该次截图的瞬时渲染伪影，不立项。

## 4. 台账回写

- 本卡完成后：ledger.md `w3d-advanced-input-family` 行 status → `carded`；findings 归族后 → `digested`。
