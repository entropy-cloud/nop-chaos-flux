# [card] page:linear-issues

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-issues` ｜ **载体**: complex-page（外部应用复刻 · showcase 卡内嵌 SchemaPage）
- **矩阵裁剪**: full（glass 皮肤未抽查，理由：replica 页自带 ln-\* 独立配色，host 皮肤对其内部无影响，仅 host chrome 受皮肤影响；error 态无独立触发入口，以 loading 完成后的空态覆盖）

## 1. 截图清单（状态矩阵）

| 状态                       | light                                                                                   | dark                                                               |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-23/r2-1a/linear-issues/linear-issues-default-light.png` | `…/linear-issues-default-dark.png`（注：含前序交互造成的内部滚动） |
| 默认（未交互干净态）       | —                                                                                       | `…/linear-issues-default-clean-dark.png`                           |
| 默认 ~800×900              | `…/linear-issues-default-800-light.png`                                                 | `…/linear-issues-default-800-dark.png`                             |
| 默认 ~800（动画沉降后）    | `…/linear-issues-default-800-settled-light.png`                                         | —                                                                  |
| 卡内滚动至主内容           | `…/linear-issues-table-scrolled-light.png`                                              | —                                                                  |
| hover（侧栏项）            | 探针取证（bg 变 rgb(31,32,35)），见发现 R2-1a-A1-11 注                                  | —                                                                  |
| focus-visible（host 按钮） | `…/linear-board/focus-ring-host-btn.png`（ui Button 共用，同款证据）                    | —                                                                  |
| 弹层 Display 抽屉          | `…/linear-issues-display-drawer-light.png`                                              | `…/linear-issues-display-drawer-dark.png`                          |
| 弹层 ⌘K 命令面板           | `…/linear-issues-cmdk-light.png`                                                        | —                                                                  |
| 弹层 新建问题 Dialog       | `…/linear-issues-create-dialog-light.png` / `…-zoom` / `…-selects`                      | `…/linear-issues-create-dialog-dark.png`                           |
| 弹层 问题 peek             | `…/linear-issues-peek-light.png`                                                        | —                                                                  |
| 批量选择后（bulk bar）     | `…/linear-issues-bulk-selected-light.png`                                               | —                                                                  |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 fail(R2-1a-A3-04) A4 n/a A5 pass（数据经 mock 端点流动，未见无指示空窗） A6 n/a A7 pass（弹层均有关闭钮/遮罩，标题输入 autofocus ✓） A8 pass（help 弹层明示按钮/命令面板等价入口） A9 pass（bulk 选择即时出栏）
- B 颜色：B1 fail(R2-1a-B1-03 局部) B2 pass B3 pass（状态点语义色一致） B4 pass（replica 内为 ln-\* 自有体系） B5 pass（replica 恒暗是复刻设计；dark 复检无双主题退化） B6 pass
- C 布局：C1 fail(R2-1a-C-01) C2 fail(R2-1a-C-08) C3 fail(R2-1a-C-01 首屏主区空白) C4 warn(R2-1a-C-01 800 宽下横向 clipX 424-456) C5 fail(R2-1a-C-02) C6 n/a
- D 间隔：D1 pass D2 pass D3 pass（10 行全 88px，一致密度档，按红线豁免行高偏大） D4 pass D5 n/a D6 pass（分页条 top−表格 bottom≈10px） D7 pass D8 pass
- E 排布：E1 fail(R2-1a-C-01 首屏三问不可答) E2 pass E3 fail(R2-1a-E3-05) E4 pass（row-key x 全 456 对齐） E5 pass E6 warn（空态未见独立演示）
- F 一致性：F1 pass F2 n/a F3 pass F4 warn（showcase 描述“拖拽不接线”与实际已接线矛盾，登记于 linear-board 卡） F5 pass
- G 设计器：n/a（非画布页）
- H 弹层：H1 pass（抽屉 480=sm 档；cmdk/create/peek 560=base 档，均落 plan-490 阶梯） H2 pass（抽屉 480 承载单列选项足够） H3 pass（create 392.8/peek 592.9 ≤ 视口） H4 pass H5 fail(R2-1a-E3-05) H6 fail(R2-1a-H6-06) H7 pass（body padding-x 24 令牌一致） H8 pass（cmdk body overflow-y-auto，header/footer 固定） H9 pass（抽屉窄视口 480→全宽回退正常）

## 3. 发现条目

### [R2-1a-C-01] 容器 className 误路由致侧栏与主内容纵向堆叠，首屏主区空白（systemic，linear 六页同根因）

- **页面/路由**: `#/complex-pages/linear-issues`（同根因复现于 linear-board / inbox / detail / projects / settings）
- **主题/视口/状态**: light+dark / 1280×800 / 默认打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/linear-issues/linear-issues-default-light.png`（右侧 ~75% 纯黑空白）、`…/linear-issues-table-scrolled-light.png`（滚动后才见表格）
- **目视描述**: 页面打开后仅左侧栏可见，主区整片空黑；工具栏（列表/看板/筛选/显示/新建/命令）与问题表格整体掉到折叠下方 ~700px。
- **程序化证据**:
  - 探针: 遍历 `section.nop-page .nop-container.flex-row`，读根节点 children 与 body 子元素 rects；`clippedBy('[data-testid^="complex-page-"]')`；nop-card `scrollHeight-clientHeight`、`offsetWidth-clientWidth`
  - 输出: 根 `flex flex-row items-stretch min-h-screen`（testid=linear-issues-main）rootKidCount=1，body 子元素 x 全为 296（纵向堆叠）；主列 rect y=894；`SECTION.nop-page ln-root` clipY=1179/ch=568；nop-card overflow-y=auto 但 scrollbarW=0（无滚动条可供性）；belowCount=394
- **对照基准**: `docs/architecture/styling-system.md`「Container 的 className 路由（关键差异）」——`className` 挂外层不控布局，`flex flex-row` 必须写 `bodyClassName` 或用 semantic `direction` prop；replica 描述本身宣称“左侧边栏 + 顶栏 + 问题表”双栏结构
- **严重程度**: P1（主内容首屏不可见；未达 P0 因卡内滚轮仍可滚到，但无任何可视暗示）
- **用户影响**: 真实用户打开页面看到大片空白黑区，无法回答“这页是什么/主操作是什么”；不知道要滚动才能看到列表。
- **修复方向**: 六个 linear 页面 schema 顶层容器把 `flex flex-row items-stretch` 移入 `bodyClassName`（或改用 `direction: "row"` semantic prop）；高度改 `h-full`（showcase 卡内）而非 `min-h-screen`；另给 nop-card 恢复可见滚动条或加渐隐提示。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C-02] showcase 卡纵向可滚但滚动条完全隐藏，长内容无任何可视提示（systemic，全部 11 页）

- **页面/路由**: `#/complex-pages/linear-issues`（其余 10 页同）
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-issues-default-light.png`（无任何滚动指示）
- **目视描述**: 卡内明显有超长内容，但右缘无滚动条、无渐隐遮罩。
- **程序化证据**:
  - 探针: 遍历 `*` 读 `overflowY` 与 `scrollHeight-clientHeight`、`offsetWidth-clientWidth`
  - 输出: `nop-card group/card overflow-hidden …` oy=auto、diff=1147、scrollbarW=0；showcase 侧栏 nav 同款 sbW=0/diff=632
- **对照基准**: WCAG 2.4.7 / NN/g scroll affordance 惯例；C5“不产生双滚动条/不遮内容”反向——完全隐藏导致不可发现
- **严重程度**: P2
- **用户影响**: 用户不知道下方还有内容（与 C-01 叠加放大）；showcase 侧栏 40 页列表同样不可感知可滚。
- **修复方向**: showcase 卡容器改 `scrollbar-gutter` 或细滚动条样式（`::-webkit-scrollbar` 4px 半透明），或内容底部加渐隐遮罩。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C-08] 视图切换激活 tab「列表」内容纵向撑破 28px 芯片，文字下溢 10.8px 被裁

- **页面/路由**: `#/complex-pages/linear-issues`（linear-board 同款 tab 同样复现，见该卡）
- **主题/视口/状态**: light+dark / 1280×800 / 卡内滚动后顶栏可见
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/linear-issues/tab-list-zoom-light.png`（文字半露于芯片下缘）
- **目视描述**: 激活 tab 黑色芯片上仅见图标，“列表”二字一半露在芯片外、一半被裁。
- **程序化证据**:
  - 探针: 读 `[data-testid="linear-issues-tab-list"]` 与其子元素 rects
  - 输出: 芯片 rect y=179.5..207.5（h=28）；内部子 DIV（图标+文字纵排）y=168.8..218.3（h=49.5）；文字 SPAN y=198.8..218.3 → 超出芯片底 10.8px；对比非激活 tab「看板」icon+text 横排全部在芯片内
- **对照基准**: C2 无意外重叠/裁切；shadcn tabs 惯例（激活态只换底色不换排布方向）
- **严重程度**: P2
- **用户影响**: 主导航激活态文字被裁，视觉破相且辨识困难（light 下黑底深字更糟）。
- **修复方向**: `ln-tab-active` 不要切换为纵排 icon-over-label；保持横排仅改底色/文字色；若必须纵排则芯片高度≥52px。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-H6-06] 新建问题 Dialog 内「状态/优先级」combobox 无值无占位（空白框）

- **页面/路由**: `#/complex-pages/linear-issues`（新建问题弹层）
- **主题/视口/状态**: light+dark / 1280×800 / 弹层打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/linear-issues/linear-issues-create-dialog-light.png`
- **目视描述**: 状态、优先级两个下拉呈空白框；指派框有“暂不指派”占位。
- **程序化证据**:
  - 探针: 遍历弹层内 button[role=combobox]，读 innerText/aria-label
  - 输出: `aria="状态"` text=""、`aria="优先级"` text=""、`aria="指派"` text="暂不指派"
- **对照基准**: A5/H6 表单控件默认态应有可见值或占位；同弹层内三同语义控件行为不一致
- **严重程度**: P2
- **用户影响**: 用户不知道两个必看字段当前值/是否必填，易直接跳过。
- **修复方向**: flux combobox 未选项时渲染 placeholder（如“待办”“无优先级”），或与指派行同样给默认值。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-E3-05] 弹层操作按钮左对齐、主按钮不在主位（跨 replica 弹层一致偏离项目约定）

- **页面/路由**: 本页新建问题弹层（创建钮 x=385 左缘、w=56 悬在左下）；同模式见 sundial-todo-dialog 卡
- **主题/视口/状态**: light+dark / 1280×800
- **截图**: `…/linear-issues-create-dialog-light.png`
- **目视描述**: 「创建」主按钮孤零零在表单左下，取消类次操作反而在上。
- **程序化证据**:
  - 探针: 弹层内 button rects + 类名 variant
  - 输出: 创建(bg-primary) x=385,y=404,w=56（左下角）；无右对齐容器；Dialog/AlertDialog 约定 `actions` 右对齐 `[secondary, primary]`
- **对照基准**: `docs/architecture/styling-system.md`「Dialog / Form Action Button Convention」；E3 确认在主位
- **严重程度**: P3（replica 有意向对标 Linear 极简弹层；但与项目成文约定冲突，需裁决）
- **用户影响**: 与全站其余弹层动线不一致，右手落点落空。
- **修复方向**: 二选一并登记裁决：replica 豁免声明，或 footer 改 `justify-end` 且主按钮 `bg-primary` 右位。
- **归族**: watch-only → 台账（跨 replica 弹层模式，建议 R2-3 汇总裁决）
- **复核状态**: 未复核

### [R2-1a-B1-03] 行标识符 ln-row-key 12px 对比度 3.45:1（<4.5:1）（systemic 值，linear 各页共用同色）

- **页面/路由**: 本页问题表标识符列（ENG-101…）；linear-inbox/detail 同色同字号
- **主题/视口/状态**: 双主题恒同 / 1280×800
- **截图**: `…/linear-issues-table-scrolled-light.png`
- **目视描述**: 标识符灰字在暗底上偏弱（replica 恒暗主题内）。
- **程序化证据**:
  - 探针: computed color × 逐层合成背景 → WCAG ratio
  - 输出: rgb(98,102,109) on 卡内合成暗底 = 3.45（12px/400，正文阈值 4.5）；同表 row-title 18.73、row-due 6.13 均过
- **对照基准**: WCAG 1.4.3（<18pt 正文 ≥4.5:1）
- **严重程度**: P3（次要元数据、有标题冗余；非高频阅读主体）
- **用户影响**: 弱光/低分屏下标识符难辨认。
- **修复方向**: `ln-row-key` 色提亮一档（如 rgb(138,143,152)，6.13:1 已验证达标）。
- **归族**: systemic → R2-3 批（linear 五页同 token）
- **复核状态**: 未复核

### [R2-1a-A3-04] 亚 24×24 可点击目标（systemic 清单：checkbox 16px、列宽手柄 4px）

- **页面/路由**: 本页表格全选/行选 checkbox（16×16）、7 个列宽拖拽手柄（4×40）
- **主题/视口/状态**: 双主题 / 1280×800
- **截图**: `…/linear-issues-default-light.png`（左列 checkbox）
- **程序化证据**:
  - 探针: 遍历可交互元素 `min(w,h)<24`
  - 输出: nop-checkbox size-4=16×16 ×10；`w-1 cursor-col-resize` 4×40 ×7；另 native input 1×1（视觉隐藏原生控件，属已登记误报豁免）
- **对照基准**: WCAG 2.5.8（24×24，例外：间距充足——行选框处于 88px 行高独立列，间距例外可辩护；列宽手柄无替代途径不可辩护）
- **严重程度**: P3
- **用户影响**: 列宽手柄极难点中；行选框在触屏/高分屏误触率高。
- **修复方向**: 列宽手柄命中区扩至 ≥24px（透明 hit-area 扩展）；checkbox 维持 16px 视觉+扩大点击热区。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A1-11 注] hover/焦点取证记录（无缺陷，豁免登记）

- 侧栏项 hover bg 透明→rgb(31,32,35)（探针实测），cursor:auto 与 Linear 真机一致（复刻目标豁免）；ui Button 键盘焦点环蓝色清晰（`linear-board/focus-ring-host-btn.png`）；行 hover 类存在但行体在折叠下方，强制态复验不可行，标 [visual-only]（弱风险，不立项）。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                     | 排除依据                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 截图缩放下行标题“发暗不可读”             | 放大 clip 截图标题全亮可读（`title-zoom-normal.png`），computed color rgb(247,248,248)、18.73:1；红色覆盖测试证明渲染管线遵从计算色 → 观看缩放假象 |
| 800 宽首次截图行标题变暗 + 顶部黑带      | 2.5s 沉降后重截干净（`default-800-settled-light.png`，elementFromPoint 命中行内容、color/opacity 正常）→ 视口切换触发的重渲染瞬态                  |
| replica 在 light host 下整页暗色         | 复刻目标本身（Linear 深色产品语义），红线豁免；dark 复检无退化                                                                                     |
| 88px 行高远大于 Linear 真机              | 全表一致的有意密度档，红线豁免（仅 watch：与“高密度行”feature 标签语义有张力）                                                                     |
| create dialog 在 light host 下呈暗底     | 同上，replica 自有弹层配色                                                                                                                         |
| dark 模式弹层亮底（宿主 --popover 覆盖） | 本页弹层被 ln-dialog/sd-dialog 自有配色覆盖，未复现该已知问题；如实测到将另立项                                                                    |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；findings 归族后 → `digested`；批内复检通过 → `verified`。
