# [card] page:antdpro-form-grouped

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-form-grouped` ｜ **载体**: complex-page（antdpro 复刻域）
- **矩阵裁剪**: full（静态形态页：无弹层/拖拽/异步，H 列 n/a；glass 未抽查——本波统一裁剪）

## 1. 截图清单

| 状态              | light                                                                                                 | dark                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 默认 1280×800     | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-grouped/antdpro-form-grouped-default-light.png` | `…/antdpro-form-grouped-default-dark.png`        |
| 默认 800×900      | `…/antdpro-form-grouped-default-light-narrow.png`                                                     | `…/antdpro-form-grouped-default-dark-narrow.png` |
| hover（按钮）     | `…/antdpro-form-grouped-hover-btn-light.png`                                                          | —                                                |
| focus-visible     | 探针读值（同 form-basic 口径，A2 ✔）                                                                  | —                                                |
| dark 字段区放大   | —                                                                                                     | `…/antdpro-form-grouped-fields-dark-zoom.png`    |
| 弹层/拖拽/loading | n/a（静态形态）                                                                                       | n/a                                              |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（同 form-basic 复验口径） A3 fail(R2-1a-A3-01 实例：开关 32×18，label 点击缓解) A4 n/a A5–A9 n/a
- B 颜色：B1 ✔（light 21:1） B2 ✔ B3 ✔ B4 ✔ B5 **fail(R2-1a-B5-02 实例)**（dark：标签 `rgb(248,250,252)` 不可见；文本输入框变灰药丸内容不可辨；同屏 select 却保持白底可读——组件间拼贴） B6 n/a
- C 布局：C1 ✔（窄视口仅纵向滚动，无横向裁切） C2 ✔ C3 ✔（本页卡片无 `mx-auto`，正常铺满 928px——反证 C3-02 根因） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（组间 28px、组内字段 16px） D2 ✔（组间 > 组内，格式塔成立） D3 n/a D4 ✔ D5 ✔ D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔（提交 primary/重置 outline） E3 ✔ E4 ✔（desc label x=321/338 分组各自对齐） E5 ✔（fieldset 小标题分组与卡片分组两种语言各自内部一致——schema 有意双形态展示） E6 n/a
- F 一致性：F1 ✔ F4 ✔（"入库基础/人员信息"分组命名一致）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-B5-02]（本页实例）dark 下同屏"输入框灰药丸不可辨 vs select 白底可读"组件级拼贴

- **页面/路由**: `#/complex-pages/antdpro-form-grouped`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-grouped/antdpro-form-grouped-default-dark.png`、`…/antdpro-form-grouped-fields-dark-zoom.png`
- **目视描述**: dark 下"入库编号/经手人/入库日期"三个文本输入框变深灰药丸、占位与值不可辨；紧邻的"入库仓库"下拉却保持白底黑字完全可读；字段标签全部隐形只剩星号。
- **程序化证据**:
  - 探针: label span computed + 输入框/select bg 采样（`antdpro-darkfix-probe.mjs` → `antdpro-form-grouped_dark`、`darkSurfaces`）
  - 输出: label color `rgb(248,250,252)` on `#ffffff` 卡底；input bg `oklab(0.285…)/0.3`（语义令牌翻转）× adp 黑字；select 触发器 bg 透明→白卡外显（未翻转）——同类表单控件两种主题机制并存
- **对照基准**: B5 dark 平价、B4 令牌一致性；主发现 R2-1a-B5-02（antdpro-list 卡）
- **严重程度**: P1 ｜ **用户影响**: dark 下文本输入不可用而下拉可用，页面残缺感强烈。｜ **修复方向**: 同 R2-1a-B5-02 主修复（adp css 补 dark 块；或 adp 域内禁用语义输入面令牌翻转）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-A3-01]（本页实例）开关 32×18

- **页面/路由**: `#/complex-pages/antdpro-form-grouped`（"入库后需质检复核"开关）
- **程序化证据**: `targetScan(24)`：`nop-switch` 32×18（短边 18 < 24；同行 label 可点击扩大热区缓解）
- **对照基准**: WCAG 2.5.8 ｜ **严重程度**: P3
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                    | 排除理由                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| 窄视口 clipY 命中 `.nop-form`/fieldset  | 800×900 下内容超一屏的**纵向滚动**，滚动容器语义正确、非裁切（C1 口径排除有意滚动） |
| fieldset 与卡片两种分组语言并存疑"混用" | schema 明示"双形态并存"（分组表单页的展示目的），且两组各自内部一致，E5 不报        |
| 本页 dark 缺独立主截图疑漏拍            | recon 已拍（`…-default-dark.png` 在清单中）；早期 grep 输出截断造成的误判           |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：B5-02/A3-01 → R2-3 系统性批；批内复检通过后 → `verified`。
