# [card] page:antdpro-form-basic

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-form-basic` ｜ **载体**: complex-page（antdpro 复刻域）
- **矩阵裁剪**: full（静态形态页：无弹层/拖拽/异步，H 列按页面级容器裁剪为 n/a；glass 皮肤未抽查——本波统一裁剪）

## 1. 截图清单

| 状态                 | light                                                                                             | dark                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 默认 1280×800        | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-basic/antdpro-form-basic-default-light.png` | `…/antdpro-form-basic-default-dark.png`        |
| 默认 800×900         | `…/antdpro-form-basic-default-light-narrow.png`                                                   | `…/antdpro-form-basic-default-dark-narrow.png` |
| hover（提交/重置钮） | `…/antdpro-form-basic-hover-btn-light.png`                                                        | —                                              |
| focus-visible        | 探针读值（见 A2 行）                                                                              | —                                              |
| dark 字段区放大      | —                                                                                                 | `…/antdpro-form-basic-fields-dark-zoom.png`    |
| 弹层/拖拽/loading    | n/a（静态形态，无弹层与异步）                                                                     | n/a                                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（按钮 hover bg 变化） A2 ✔（输入框 focus 边框变蓝 `rgb(28,110,242)`，form-dialog 卡 `antdpro-focus-verify.mjs` 已复核同构输入框） A3 fail(R2-1a-A3-01 实例：数字步进器"增加/减少"24×16) A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 n/a（静态形态，提交流转归 P2b，未在本页断言）
- B 颜色：B1 ✔（light：标签/输入 21:1、标题 13.33:1） B2 ✔ B3 ✔ B4 ✔ B5 **fail(R2-1a-B5-02)**（dark：字段标签 `rgb(248,250,252)` 叠 `#fff` 卡底 1.05:1 完全不可见；输入框变深灰药丸、内容不可辨） B6 n/a
- C 布局：C1 ✔（窄视口仅纵向滚动） C2 ✔ C3 **fail(R2-1a-C3-02)**（表单卡 234px，占宿主卡 24%） C4 ✔（窄视口不塌） C5 ✔ C6 n/a
- D 间隔：D1 ✔（容器块间隙 24/20、表单字段 16，均在 4pt 栅格） D2 ✔ D3 n/a D4 ✔ D5 ✔（label-控件 8px、字段间 16px） D6 n/a D7 ✔ D8 ✔（卡内 p-6）
- E 排布：E1 ✔（面包屑+标题+描述+表单一目了然） E2 ✔（提交 primary、重置 outline） E3 ✔（操作条底部：重置左、提交右） E4 ✔（label 列 x 全等 668） E5 ✔ E6 n/a
- F 一致性：F1 ✔（与 grouped/step 页操作条同构） F3 ✔ F4 ✔
- G 设计器：n/a
- H 弹层：n/a（本页无弹层）

## 3. 发现条目

### [R2-1a-C3-02] `max-w-* mx-auto` 卡片在 flex-column 容器内收缩为内容宽，表单卡 234px（authored 672px）

- **页面/路由**: `#/complex-pages/antdpro-form-basic`（同根因复现：antdpro-form-step ~430px/768、antdpro-detail-basic 310px/896、antdpro-detail-advanced 414px/1024；antdpro-result 因内容宽未显异常）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-basic/antdpro-form-basic-default-light.png`（960px 区域内表单卡仅 234px，两侧大片空白）
- **目视描述**: 单列表单被压成一条窄竖带，输入框仅 184px 宽，与 AntD Pro 原版居中 ~672px 卡差距巨大。
- **程序化证据**:
  - 探针: 卡片/父容器 rect + computed（`_tmp/r2-1a-probes/antdpro-form-basic-width.mjs`）
  - 输出: 卡 `max-width: 672px` 已生效但 `width: 234px`；父容器 `display:flex; flex-direction:column; gap:24px`（container-body 默认流）。flex 子项设 `margin-inline:auto`（schema className `mx-auto`）时放弃 stretch、按 shrink-to-fit 取内容宽 234px——`max-w` 只封顶不设宽
- **对照基准**: 检查提示词 C3（主内容占比合理）/E1；AntD Pro 基础表单原版为居中宽卡
- **严重程度**: P2（5 页同根因，systemic 升一级 → P2 维持：内容仍可读可操作，但版面明显破损、输入框过窄）
- **用户影响**: 表单/详情页主内容只占约四分之一宽，长值（时间段、地址）显示局促，页面观感"没铺开"。
- **修复方向**: 五个 schema 的 `adp-card` className 补 `w-full`（`w-full max-w-2xl mx-auto`），一处搜索替换全修；同时在 complex-page 模板文档登记"flex 容器内 mx-auto 必须配 w-full"防复发。归 R2-3（≥3 页同根因）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-B5-02]（本页实例）dark 下字段标签完全不可见

- **页面/路由**: `#/complex-pages/antdpro-form-basic`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-basic/antdpro-form-basic-default-dark.png`（字段只剩红色必填星号与灰药丸）、`…/antdpro-form-basic-fields-dark-zoom.png`
- **程序化证据**: `.nop-field` 首子 span（"任务名称*"）computed color `rgb(248,250,252)`（--foreground 翻转为近白）叠 `--adp-bg-container: #ffffff`（不翻转）→ 1.05:1；输入框 bg 翻转为 dark muted `oklab(0.285…)/0.3` 叠白卡呈灰药丸、内部 `--adp-text` 黑字不可辨（`antdpro-darkfix-probe.mjs` → `*\_labelInv`/`darkSurfaces`）
- **对照基准**: B5 dark 平价；同 R2-1a-B5-02 主发现（antdpro-list 卡），本页为最重实例（表单页全字段无标签）
- **严重程度**: P1 ｜ **用户影响**: dark 下整页表单等于无标签裸奔，只能靠占位符猜字段。｜ **修复方向**: 同 R2-1a-B5-02（`antdpro-replica.css` 补 dark 块或 label 令牌锁定）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-A3-01]（本页实例）数字步进器按钮 24×16

- **页面/路由**: `#/complex-pages/antdpro-form-basic`（目标权重字段）
- **程序化证据**: `targetScan(24)` 输出 增加/减少 按钮 `24×16`（短边 16 < 24）
- **对照基准**: WCAG 2.5.8 ｜ **严重程度**: P3（有键盘可达性缓解：input 本身可聚焦）
- **归族**: systemic → R2-3 批（与 standard-crud 卡同 ID 族） ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                         | 排除理由                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| el.focus() 后输入框"无边框变化"疑 focus 缺失 | 程序化 focus 不触发 :focus-visible 且 150ms transition 未等；form-dialog 页用真实 Tab 复验同构输入框，边框变蓝 + ring 出现，A2 通过 |
| 块间隙 20px 非 8 栅格                        | 20 = 4pt 栅格值（D1 口径允许 4pt 系列），且同级一致，不报                                                                           |
| dark 截图中标签"看不见"曾疑为渲染失败        | 即发现本体（B5-02），非截图伪影：computed color + CSS 源双重坐实                                                                    |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C3-02/B5-02/A3-01 → R2-3 系统性批；批内复检通过后 → `verified`。
