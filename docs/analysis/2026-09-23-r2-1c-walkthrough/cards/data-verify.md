# [card] page:data-verify

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/data-verify` ｜ **载体**: 域页面（data-source + fetcher + loop 机制验证 fixture：scope-debug 面板 + 表达式 + setValue 按钮 + loop 渲染）
- **矩阵裁剪**: simplified（理由：机制验证 fixture，无产品化状态面。裁掉项：**B6 错误态/A5 loading-empty-error 态——页面无错误/空/加载可触发路径**：fetcher 恒返回 `{status:0}`、data-source `silent:true`、无 fail 演示分支，探针 spinner/skeleton/toast DOM=0 证实；glass 皮肤（本波统一裁剪）；A6 拖拽、A7/H 弹层（无）；G n/a。briefing 提示的"错误态呈现 B6/A5、语义色 B3"按实际页面能力裁剪为 n/a，非漏查）

## 1. 截图清单（状态矩阵）

| 状态                                  | light                                                                                    | dark                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 默认 1280×800                         | `_tmp/visual-inspection-2026-09-23/r2-1c/data-verify/data-verify-default-wide-light.png` | `…/data-verify-default-wide-dark.png`              |
| setValue 点击后（反馈生效）           | `…/data-verify-setvalue-clicked-light.png`                                               | `…/data-verify-setvalue-clicked-dark.png`          |
| scope-debug 展开态                    | `…/data-verify-scopedbg-open-light.png`                                                  | （dark 默认截图为展开态残留，同证 dark JSON 可读） |
| 默认 800×900                          | `…/data-verify-default-narrow-light.png`                                                 | `…/data-verify-default-narrow-dark.png`            |
| hover/focus/disabled                  | 未单独截帧（按钮同族 hover/focus 已程序化复验）                                          | —                                                  |
| 弹层打开 / 拖拽 / loading/empty/error | n/a（无弹层/拖拽；错误态无触发路径见裁剪理由）                                           | n/a                                                |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（按钮 hover 同族） A2 ✔（同族 focus ring） A3 ✔（可交互元素 min(w,h) 扫描 0 命中——按钮均 ≥24） A4 n/a A5 n/a（无异步态可触发，见裁剪理由） A6 n/a A7 n/a A8 n/a A9 **✔**（setValue 点击后 `testVar = ` → `testVar = hello from setValue` 即时反馈，DOM 断言）
- B 颜色：B1 **warn(R2-1c-B1-01 族扩面)**（dark primary 按钮 白字/rgb(77,141,245) = 3.26:1 <4.5；light 4.6:1 过） B2 ✔ B3 n/a（页面无状态语义色面） B4 ✔（primary 色走令牌） B5 **warn(R2-1c-B1-01 同源)**（dark 平价唯 primary 按钮对比恶化，其余 17.65:1） B6 n/a
- C 布局：C1 ✔（1280 与 800 均无溢出） C2 ✔ C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（调试面板/表达式/按钮/结果块间距 16/16/8 落栅格） D2 ✔ D3 n/a D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（机制页三要素可答） E2 n/a E3 ✔ E4 n/a E5 ✔ E6 n/a
- F 一致性：F3 ✔（无空态无对比面） 其余 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-B1-01] dark 模式 primary 按钮白字对比 3.26:1（<4.5 阈值，R2-1a-B1-01 族扩面）

- **页面/路由**: `#/data-verify`（"setValue test" default variant 按钮）；全站 dark 页所有 primary/default variant 按钮同构（performance-table 场景切换 active 态同色实测）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/data-verify/data-verify-default-wide-dark.png`（底部 setValue test 按钮）、`…/performance-table/performance-table-default-wide-dark.png`（Table Only active 同构）
- **目视描述**: dark 下 primary 蓝底提亮为 rgb(77,141,245)，白字按钮可读性临界，弱光环境/低分屏明显吃力。
- **程序化证据**:
  - 探针: 按钮 computed color/bg + WCAG 对比度（`_tmp/r2-1c-probes/data-verify-out.json` wide-dark.contrast）
  - 输出: dark `color=rgb(255,255,255) bg=rgb(77,141,245)` = **3.26:1**（14px/500 非大字，<4.5）；light 同按钮 4.6:1（过）；溯源 `theme-tokens/src/styles.css` classic dark `--primary: 217 89% 63%`（light 为 `217 89% 53%`）——dark 提亮 primary 而前景仍纯白，是对比恶化的直接原因
- **对照基准**: WCAG 1.4.3；R2-1a-B1-01（antdpro-result 查看订单 light 白字/#1677ff = 4.1:1，判 warn）同族
- **严重程度**: P3（延续族判级；dark 实例 3.26 比 light 族实例 4.1 更差，若 R2-3 汇总升族则随族升级）
- **用户影响**: dark 用户对所有主按钮（确认/提交/激活态）的标签辨识度下降；高频路径大面积受影响，是族级修复候选。
- **修复方向**: classic dark `--primary` 降至 `217 89% 56%` 左右（白字 ≥4.5:1）或 `--primary-foreground` 换深色（dark 上反白方案需全站回归）；与 R2-1a-B1-01 合并为"primary 按钮文字对比"单点修复。
- **归族**: systemic → R2-3 批（R2-1a-B1-01 族扩面，dark 实例新证据）
- **复核状态**: 未复核

### watch-only（不立项，记录待观察）

- "setValue test" 按钮在 page body 垂直栈内全宽拉伸：flux-react 默认间距/帧宽度基线所致，机制页可接受；若产品面出现同款全宽主按钮再评估。
- scope-debug 展开 JSON 530px 无滚动容器、撑高页面：调试面板语义即"展开看全量"，dark/light 均可读（明文 mono），不立项。
- 通知 toast（`toast.info`）仅 fetcher notify 路径可触发，本页无触发点；toast 面已由 R2-1a 各弹层卡覆盖。

## 4. 误报排除记录

| 疑点                                         | 排除理由                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 首屏对比采样 "classicglass/lightdark 1.66:1" | 采样对象为宿主主题/模式切换 select 容器（继承色伪影）；目视截图文本清晰可读，宿主壳层控件且全站一致，非本页渲染面缺陷 |
| loop census `verify-loop` 子节点 0           | 探针时序问题（表达式求值后渲染）；截图证实 Alice/Bob/Carol 三项正常渲染                                               |
| 错误态缺失                                   | fixture 无失败路径可触发（fetcher 恒成功 + silent），按矩阵裁剪记录而非 A5 fail                                       |
| 页面无 spinner                               | 同步 mock 无异步窗口，性能首帧豁免                                                                                    |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：B1-01 → R2-3 系统性批（R2-1a-B1-01 族扩面）；
- 批内复检通过后 → `verified`。
