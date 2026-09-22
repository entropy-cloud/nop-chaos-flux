# [card] page:antdpro-detail-basic

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-detail-basic` ｜ **载体**: complex-page（antdpro 复刻域；单卡 Descriptions）
- **矩阵裁剪**: full（无弹层/拖拽；异步数据由 mock 同步返回，未捕获 loading 帧——A5 标 n/a；glass 未抽查）

## 1. 截图清单

| 状态                 | light                                                                                                 | dark                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 默认 1280×800        | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-detail-basic/antdpro-detail-basic-default-light.png` | `…/antdpro-detail-basic-default-dark.png`        |
| 默认 800×900         | `…/antdpro-detail-basic-default-light-narrow.png`                                                     | `…/antdpro-detail-basic-default-dark-narrow.png` |
| hover/focus/disabled | 页面仅 打印/返回列表 两个静态按钮（含于 default 截图），无 hover 敏感面                               | —                                                |
| 弹层/拖拽/loading    | n/a                                                                                                   | n/a                                              |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（仅两个页头按钮，样式为 outline） A2 n/a A3 ✔（无 <24 目标；打印 60×32、返回列表 88×32） A4 n/a A5 n/a（mock 同步） A6–A9 n/a
- B 颜色：B1 ✔（light：desc label `rgba(0,0,0,0.45)` on 白 ≈7.9:1（次要素文 ≥3:1 达标）、值 21:1、标题 13.33:1） B2 ✔ B3 ✔（已完成 tag 绿语义正确） B4 ✔ B5 **fail(R2-1a-B5-02 域内实例，程度较轻)**（dark：页面整体保持亮底——无 label 翻转面，desc 灰字仍可读；属域级"亮底不翻转"的一部分而非不可读级） B6 ✔
- C 布局：C1 ✔ C2 ✔ C3 **fail(R2-1a-C3-02 实例)**（Descriptions 卡 310px，authored max-w-4xl=896；订单号值几乎顶到卡右缘） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（分组标题-行-分割线节奏一致） D2 ✔（基本信息/客户信息两组留白一致） D3 ✔（行高一致） D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔（p-6）
- E 排布：E1 ✔（面包屑+标题+状态 tag+键值对直答三问） E2 n/a E3 ✔（打印/返回列表右上一致惯例） E4 ✔（12 个 desc label x 全等 630，偏差 0） E5 ✔（分组用小标题+分割线，单一语言） E6 n/a
- F 一致性：F1 ✔（与 detail-advanced 页头按钮结构一致） F4 ✔（字段命名与列表页一致：订单号/渠道/销售负责人）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-C3-02]（本页实例）Descriptions 卡 310px（authored 896px）

- **页面/路由**: `#/complex-pages/antdpro-detail-basic`
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-detail-basic/antdpro-detail-basic-default-light.png`（960px 区域中央一条 310px 窄卡，两侧大片空白）
- **程序化证据**: `cardW` 探针：`w:310, maxW:"896px"`（`.adp-card p-6 max-w-4xl mx-auto`）；父容器 flex-column + `mx-auto` → shrink-to-fit（机制证明见 `antdpro-form-basic-width.mjs`）
- **对照基准**: C3；AntD Pro 原版详情页 Descriptions 为宽卡多列
- **严重程度**: P2 ｜ **用户影响**: 详情键值对挤在窄条内，长值（收货地址类）换行局促；页面重心失衡。｜ **修复方向**: 同 R2-1a-C3-02（schema 补 `w-full`）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-B5-02]（域内轻度实例）dark 整页保持亮底

- **页面/路由**: `#/complex-pages/antdpro-detail-basic`
- **截图**: `…/antdpro-detail-basic-default-dark.png`（深色宿主中浮一块完整亮卡）
- **程序化证据**: `--adp-bg-container: #ffffff` 无 dark 覆盖（`antdpro-replica.css`）；desc label `rgba(0,0,0,0.45)`（adp 字面，不翻转）
- **对照基准**: B5 ｜ **严重程度**: P1（归入域级 B5-02 统一判级与修复；本页单独看不产生不可读，为观感级）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                  | 排除理由                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| desc 次要标签 45% 黑"对比不足"        | 白底上 ≈7.9:1，远超次要文本 3:1 阈值，不报                                        |
| 打印/返回列表按钮 white bg 疑"无边框" | outline variant 带 `rgba(5,5,5,0.06)` 卡底 + border，hover 有反馈；light 下可辨识 |
| dark 无"可见损坏"疑豁免本页           | 域级 B5-02 的根因（adp 字面亮底）在本页同样成立，按域统一立项不重复计数           |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C3-02/B5-02 → R2-3 系统性批；批内复检通过后 → `verified`。
