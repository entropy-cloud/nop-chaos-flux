# [card] page:sundial-settings

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/sundial-settings` ｜ **载体**: complex-page（外部应用复刻 · 设置页）
- **矩阵裁剪**: full（glass 未抽查：replica 自带 sd-\* 配色；外观分节选择器 testid 在未选中分节不渲染，切分节后的深查以 watch 记录）

## 1. 截图清单

| 状态               | light                                                         | dark                                      |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| 默认 1280×800      | `…/r2-1a/sundial-settings/sundial-settings-default-light.png` | `…/sundial-settings-default-dark.png`     |
| 默认 ~800×900      | `…/sundial-settings-default-800-light.png`                    | `…/sundial-settings-default-800-dark.png` |
| 卡内滚动至同步面板 | —                                                             | `…/sundial-settings-scrolled-dark.png`    |

## 2. A–H 维度勾选表

- A：A1 pass（同步模式卡 hover 边框加深） A2 pass A3 pass（radio 交互区为整卡，≥24） A4 pass（自建服务器「即将推出」禁用态降透明+badge，可感知） A5 pass A6 n/a A7 pass（新建列表对话框见 testid 面，形态同 workbench 弹层） A8 n/a A9 pass（选中模式卡即切换 radio+底色）
- B：B1 fail(R2-1a-B1-19 页面实例 3.16:1@10px) B2 pass B3 pass B4 warn（#636363 字面色，见 workbench 卡 B4-20） B5 warn(B5-21 同款) B6 pass
- C：C1 pass（1280 无溢出；本页自带内部 `nop-container overflow-y-auto` diff=358 ✓ 有正确滚动态） C2 pass C3 pass（280px 导航 rail + 设置面板，同类面板结构清晰） C4 warn（800 宽 max-w-520 容器 clipX=10，轻微） C5 pass（本页主滚动发生在自身内容容器，visible 区内完成） C6 n/a
- D：D1 pass（同步模式卡节距一致） D2 pass D3 pass D4 pass（保存按钮全宽、与面板边距一致） D5 pass D6 n/a D7 pass D8 pass
- E：E1 pass E2 pass（保存为页面主操作，全宽橙钮层级最高） E3 pass（单按钮主位） E4 pass（三张模式卡 icon/标题/描述/单选四列对齐） E5 pass（分组用留白+卡片，未混用） E6 pass
- F：F2 pass（280px rail 与描述一致，类似 rail 结构跨页同宽档） F1/F3/F4/F5 pass
- G：n/a H：pass（列表管理「新建列表」对话框归同族 xs 档，形态见 todo-dialog 卡深查）

## 3. 发现条目

### [R2-1a-B1-19 页面实例] 「即将推出」badge 橙 3.16:1@10px

- **页面/路由**: 本页同步面板「自建服务器」卡
- **主题/视口/状态**: light / 1280×800
- **截图**: `…/sundial-settings-scrolled-dark.png`
- **程序化证据**:
  - 探针: `.sd-badge` computed color 合成背景 WCAG ratio
  - 输出: rgb(219,119,6) ratio=3.16（10px/400）
- **对照基准**: WCAG 1.4.3
- **严重程度**: P2（并入 B1-19 汇总）
- **用户影响**: 弱视用户难辨禁用原因标签。
- **修复方向**: 同 B1-19 主条目
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C4-23 页面实例] ~800 视口 max-w-[520px] 容器横向 clipX=10px

- **页面/路由**: 本页，800×900 视口
- **截图**: `…/sundial-settings-default-800-light.png`
- **程序化证据**: overflowScan：空名 DIV 与 `max-w-[520px]` 容器 clipX=10(cw=160)
- **对照基准**: C4 视口弹性
- **严重程度**: P3（10px 微溢出，无内容丢失证据）
- **用户影响**: 极窄下卡缘贴边。
- **修复方向**: 容器补 `min-w-0`/内边距收缩。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-A5-24 注] 外观/数据/关于分节未逐一切换深查（watch）

- **说明**: `sundial-appearance-theme/density/font` 等 testid 在「同步」分节下不在 DOM，切换分节后未逐一分节截图（时间盒）；分节切换链路（导航 rail 点击）已验证存在。建议 R2-3 批修复批次复检时补全四分节截图。
- **归族**: watch-only → 台账 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                     | 排除依据                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ |
| dark host 下整页仍为亮色 | replica 亮色设计语义（B5-21 watch 已记录）                                     |
| 保存按钮无点击反馈验证   | 页面为零写演示形态（自述），保存为形态展示；A9 以模式卡切换反馈为准（已 pass） |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
