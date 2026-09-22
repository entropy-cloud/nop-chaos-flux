# [card] page:linear-board

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-board` ｜ **载体**: complex-page（外部应用复刻 · kanban）
- **矩阵裁剪**: full（glass 未抽查，理由同 linear-issues 卡）

## 1. 截图清单

| 状态                   | light                                                 | dark                                                     |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280×800          | `…/r2-1a/linear-board/linear-board-default-light.png` | `…/linear-board-default-dark.png`                        |
| 默认 ~800×900          | `…/linear-board-default-800-light.png`                | `…/linear-board-default-800-dark.png`                    |
| 卡内滚动至看板         | —                                                     | `…/linear-board-scrolled-dark.png`                       |
| 拖拽进行中（真实指针） | —                                                     | `…/linear-board-drag-mid-real-dark.png`                  |
| 拖拽落位后             | —                                                     | `…/linear-board-drag-after-real-dark.png`                |
| 合成事件拖拽中         | —                                                     | `…/linear-board-drag-mid-synthetic.png` / `…-after-drop` |
| focus-visible          | `…/linear-board/focus-ring-host-btn.png`              | —                                                        |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 fail(R2-1a-A3-04 页面实例) A4 n/a A5 pass A6 pass（拖拽全链路可用，见 R2-1a-A6-12 注） A7 n/a A8 fail(R2-1a-A8-13) A9 pass（拖后列计数即时更新 7/8→6/9）
- B：B1 fail(R2-1a-B1-03) B2 pass B3 pass B4 pass B5 pass B6 pass
- C：C1 fail(R2-1a-C-01) C2 warn(R2-1a-C-08 同款 tab) C3 fail(R2-1a-C-01) C4 fail(800 宽 clipX 1292-1308，仅靠隐藏滚动条横滚) C5 fail(R2-1a-C-02) C6 n/a
- D：D1–D8 pass（列内卡片间距一致；列头计数 chip 无贴死） D3 pass（卡片高度随内容、列间一致）
- E：E1 fail(R2-1a-C-01) E2 pass E3 pass E4 pass E5 pass E6 pass（+添加卡片空列引导存在）
- F：F4 warn(R2-1a-F4-14) F1/F3/F5 pass F2 n/a
- G：n/a H：n/a（本页无弹层）

## 3. 发现条目

### [R2-1a-C-01 页面实例] 同根因：侧栏块与看板纵向堆叠，看板整体在折叠下方

- **页面/路由**: `#/complex-pages/linear-board`
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-board-default-light.png`（首屏仅侧栏收藏组）、`…/linear-board-scrolled-dark.png`（滚动后看板才见）
- **目视描述**: 打开即见侧栏尾部 + 空黑主区；五列看板（待定/待办/进行中/已完成/已取消）全部在 y≈682 以下。
- **程序化证据**:
  - 探针: 同 R2-1a-C-01 主条目探针在本页复跑
  - 输出: `flex-row` 容器 body 子元素 y=[192, 682]（纵排）；`ln-root` clipY=998/ch=568；nop-card diff=966、sbW=0；belowCount=639（全页最多）；另 clipX=812-844（五列 278px 宽横向溢出，靠隐藏滚动条横滚）
- **对照基准**: 同主条目（styling-system.md className 路由）
- **严重程度**: P1（本页主内容=看板，首屏完全不可见；639 个元素折叠下方，接近 P0）
- **用户影响**: 打开看不到任何卡片，任务“查看/拖拽看板”被无提示滚动阻挡。
- **修复方向**: 同 R2-1a-C-01（bodyClassName/semantic prop + h-full）；另看板横滚容器需要可见滚动条或列缘渐隐。
- **归族**: systemic → R2-3 批（并入 C-01 汇总）
- **复核状态**: 未复核

### [R2-1a-A6-12 注] 拖拽全链路取证（可用，反馈形态记录）

- **页面/路由**: 本页看板
- **截图**: `…/linear-board-drag-mid-real-dark.png`（拖拽中：源卡变暗淡、目标列出现高亮落位槽）、`…-after-real-dark.png`（落位后列头计数 待定7→6、待办8→9）
- **程序化证据**: Playwright 真实指针拖拽（mouse.down → 跨列 hover → up）后列头计数变化；拖拽中 DOM 出现高亮落位卡槽；页内提示文案“拖拽已接线：卡片可拖拽换列，状态与列头聚合会流更新”
- **记录**: 无跟随光标的浮动 ghost（源卡原位变暗代替）——与 Linear 真机手法不同但反馈明确，P3 watch；列头 drag-handle 按钮 cursor=grab ✓；卡片 cursor=pointer
- **归族**: watch-only → 台账
- **复核状态**: 未复核

### [R2-1a-A8-13] 卡片跨列移动无拖拽替代途径（WCAG 2.5.7）

- **页面/路由**: 本页看板
- **主题/视口/状态**: 双主题 / 1280×800
- **截图**: `…/linear-board-scrolled-dark.png`（卡片 hover 仅见移除 ×）
- **程序化证据**:
  - 探针: 遍历卡片操作钮（移除卡片/折叠列/拖拽重新排序列），查找移动/状态变更菜单入口
  - 输出: 卡片 hover 仅有 20×20 移除 ×；无右键菜单/状态下拉/键盘路径可改列；列头 drag-handle 亦为拖拽本体
- **对照基准**: WCAG 2.5.7 拖拽功能必须有单指针替代途径；NN/g 拖放替代路径
- **严重程度**: P3（demo 页低频路径；规则本身为硬性）
- **用户影响**: 运动障碍/触屏笔用户无法移动卡片。
- **修复方向**: 卡片菜单加“移到状态…”项，或支持卡片选中后键盘 M→选列。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-F4-14] showcase 页面描述称“拖拽不接线（静态形态）”，实际拖拽已接线

- **页面/路由**: 本页（描述文案位于 showcase 页头）
- **截图**: `…/linear-board-drag-mid-real-dark.png` 顶部描述 vs 页内提示“拖拽已接线”
- **程序化证据**: 真实拖拽改变列计数（A6-12）；描述文本 `page-schemas/linear-board.json` entry.description
- **对照基准**: F4 术语/文案一致
- **严重程度**: P3
- **用户影响**: 低——描述误导但页面自解释。
- **修复方向**: 更新 complex-pages-model.ts 中 linear-board description。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-A3-04 页面实例] 20×20 列头按钮组 + 4px 列宽手柄

- **截图**: `…/linear-board-scrolled-dark.png`
- **程序化证据**: targetScan(24) 输出：拖拽重新排序列 20×20、折叠列 20×20、移除卡片 20×20（多列）、列宽手柄 4×36
- **对照基准**: WCAG 2.5.8；列头三钮彼此紧邻，间距例外不可辩护
- **严重程度**: P3 ｜ **修复方向**: hit-area 扩至 24px（视觉不变） ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-B1-03 页面实例] 列头按钮橙字 4.22:1@12px（同 token 系）

- **程序化证据**: `button` computed rgb(216,148,70) ratio=4.22（12px/500，阈 4.5）
- **严重程度**: P3 ｜ **修复方向**: 同 B1-03 主条目提亮一档 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                    | 排除依据                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| 合成 DragEvent 无任何反应               | 真实指针拖拽成功移卡（A6-12）→ 合成事件不触发原生 DnD，非功能缺失                       |
| 键盘焦点 computed box-shadow 全透明读数 | 焦点截图显示清晰蓝环（focus-ring-host-btn.png）→ ring 渲染在伪元素/外层，读数取样点不对 |
| 看板横向 clipX 812px                    | 看板语义本身横向滚动；问题只在滚动条不可见（并入 C-02）                                 |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
