# [card] page:sundial-todo-dialog

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/sundial-todo-dialog` ｜ **载体**: complex-page（外部应用复刻 · 新建待办对话框专项）
- **矩阵裁剪**: full（本页为 H 弹层专项页：主弹层 + 列表选择 + 日期选择 + 旗标选择四层全查；长内容滚动契约以 textarea 内滚 + 结构探针验证，端到端超长文本注入未成功，见 H3 注）

## 1. 截图清单

| 状态                  | light                                                               | dark                                                      |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| 默认 1280×800         | `…/r2-1a/sundial-todo-dialog/sundial-todo-dialog-default-light.png` | `…/sundial-todo-dialog-default-dark.png`                  |
| 默认 ~800×900         | `…/sundial-todo-dialog-default-800-light.png`                       | `…/sundial-todo-dialog-default-800-dark.png`              |
| 主弹层打开            | `…/sundial-todo-dialog-dialog-open-light.png`                       | `…/sundial-todo-dialog-dialog-open-dark.png` / `…-dark-2` |
| 列表选择子弹层        | `…/sundial-todo-dialog-list-picker-light.png`                       | —                                                         |
| 日期选择子弹层        | `…/sundial-todo-dialog-date-picker-light.png`                       | —                                                         |
| 旗标选择子弹层        | `…/sundial-todo-dialog-flag-picker-light.png`                       | —                                                         |
| 长内容                | `…/sundial-todo-dialog-long-content-light.png` / `…-typed`          | —                                                         |
| ~360×700 窄视口（H9） | `…/sundial-todo-dialog-dialog-360-light.png`                        | —                                                         |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass（标题输入 autofocus + 蓝色焦点环清晰可见，截图佐证） A3 pass（关闭钮 28×28 <24，为图标钮惯例已登记豁免类；其余目标 ≥32） A4 n/a A5 pass A6 n/a A7 pass（遮罩/关闭钮/焦点落点=标题输入 ✓） A8 n/a（无拖拽） A9 pass（旗标切换出 toast「旗标已切换」）
- B：B1 pass（正文 6.84-12.63） B2 pass B3 pass B4 pass B5 fail(R2-1a-B5-09 warn 级混搭) B6 pass
- C：C1 pass C2 pass C3 pass C4 pass（360 视口弹层不溢出） C5 pass C6 n/a
- D：D1 pass（字段行 48px 节距成栅格） D2 pass D3 n/a D4 pass D5 pass（字段行 label 左值右统一） D6–D8 pass
- E：E1 pass E2 pass E3 warn(R2-1a-E3-05) E4 pass（字段行左右两缘对齐） E5 pass E6 n/a
- F：F1 pass（添加/取消与 workbench 新建待办同款） F3 pass F4 pass F5 n/a
- G：n/a
- H：H1 pass（主弹层 360=xs、子弹层 360=xs，全部落阶梯，无 ad-hoc 宽度） H2 n/a（无 Sheet/Drawer） H3 pass（长内容下弹层 414px ≤ 视口；textarea 自带 overflow-y auto 内滚） H4 pass（标题/关闭钮无重叠） H5 warn(R2-1a-E3-05) H6 pass（字段行 48px 垂直节距一致、label/值对齐统一） H7 pass（三段 padding 一致 20px，嵌套子弹层无双层 padding 观感） H8 pass（滚动契约：textarea 内滚，header/footer 固定；弹层整体 h 固定 414） H9 pass（360×700 下弹层 360×668 全宽过渡、按钮组不破版、顺序 取消→添加 保持正确）

## 3. 发现条目

### [R2-1a-E3-05 主条目页] 弹层 footer 动作钮左对齐、确认在次位（与 Dialog 动作约定冲突，跨 replica 弹层模式）

- **页面/路由**: `#/complex-pages/sundial-todo-dialog` 主弹层 + 列表选择子弹层（linear-issues 新建问题弹层同模式，见该卡）
- **主题/视口/状态**: light+dark / 1280×800 与 360×700
- **截图**: `…/sundial-todo-dialog-dialog-open-light.png`（取消 x=481、添加 x=547 左下）、`…/sundial-todo-dialog-list-picker-light.png`（确认钮左下）
- **目视描述**: 「取消/添加」对齐在弹层左下角，右侧留白；「确认」同样左位。
- **程序化证据**:
  - 探针: 弹层内按钮 rects + variant
  - 输出: 取消(sd-btn-ghost) x=481、添加(sd-btn-default) x=547、均 y=421（footer 左缘起排）；宽 54；360 窄视口下同样左对齐（取消 x=21、添加 x=87）
- **对照基准**: `docs/architecture/styling-system.md`「Dialog / Form Action Button Convention」：actions 右对齐、`[secondary, primary]`；AntD/shadcn/macOS HIG 同惯例
- **严重程度**: P3（replica 意在对标 Sundial/Things 极简面板；间距走令牌、顺序取消→添加正确，仅对齐方向不符）
- **用户影响**: 与项目其余弹层（含平台级 Dialog 组件默认）动线不一致；右手主位落空。
- **修复方向**: 提交设计裁决：a) replica 豁免登记；b) footer 改 `justify-end`。二者择一后全 replica 统一。
- **归族**: watch-only → 台账（R2-3 汇总裁决）
- **复核状态**: 未复核

### [R2-1a-B5-09] dark host 下弹层面板保持 #FEFEFE（设计声明）但输入框边框取 dark token，观感混搭

- **页面/路由**: 本页主弹层，dark host
- **主题/视口/状态**: dark / 1280×800
- **截图**: `…/sundial-todo-dialog-dialog-open-dark.png`（标题输入灰环、备注 textarea 灰底观感）
- **程序化证据**:
  - 探针: dark 下读弹层/输入框 computed 色 + contrastScan
  - 输出: 弹层 bg=rgb(254,254,254)（schema 明文 360dp #FEFEFE，主题无关）；输入框 border=rgb(31,42,61)（dark `--border` token）压在白面板上；文字 rgb(103,87,76) ratio=6.84 达标；布局无破损
- **对照基准**: B5 dark 平价；theme-compatibility「CSS 变量主题化」——硬编码面板与主题化控件的边界应显式声明
- **严重程度**: P3（可读性与功能无碍，观感混搭）
- **用户影响**: dark 用户看到白色弹层+深色描边输入框，细节不精致。
- **修复方向**: sd-input 在硬编码亮面板内固定用亮色边框 token（或弹层内局部作用域重置 --border）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-H3-25 注] 长内容滚动契约验证方式与限度

- **程序化证据**: 弹层结构探针：弹层 h 固定 414（<800 视口）、body flex-1 min-h-0、textarea overflow-y auto 且自带滚动条样式；字段行 48px 栅格不随内容挤压
- **限度**: 90 字超长文本注入（value+input 事件与真实键入两种方式）均未进入受控状态，端到端长文本滚动未取到渲染证据 → H8 判 pass 基于 DOM 结构契约，标注 [visual-only 部分复核]
- **归族**: watch-only → 台账 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                   | 排除依据                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| dark 下弹层仍为白色（疑“dark 未适配”） | schema 明文「360dp 圆角面板（#FEFEFE）」为复刻设计声明；判观感混搭（B5-09）而非未适配                |
| 子弹层居中覆盖父弹层标题输入           | 列表/日期/旗标选择为声明式 dialog 节点（页面自述），居中模态是有意形态；有关闭钮与确认钮，无交互障碍 |
| 关闭钮 28×28 < 24 判级                 | 图标关闭钮为已登记豁免族（icon-xs 行内按钮），且位于 header 惯例位，不计发现                         |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
