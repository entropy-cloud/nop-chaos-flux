# [card] page:antdpro-detail-advanced

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-detail-advanced` ｜ **载体**: complex-page（antdpro 复刻域；多卡 + steps + tabs + 审批操作组）
- **矩阵裁剪**: full（无弹层/拖拽；审批操作（通过/驳回）仅验证样式与排布，未提交真实流转——A9 在本页标 n/a；glass 未抽查）

## 1. 截图清单

| 状态                     | light                                                                                                       | dark                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 默认 1280×800            | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-detail-advanced/antdpro-detail-advanced-default-light.png` | `…/antdpro-detail-advanced-default-dark.png`        |
| 默认 800×900             | `…/antdpro-detail-advanced-default-light-narrow.png`                                                        | `…/antdpro-detail-advanced-default-dark-narrow.png` |
| tab 切换（客户信息激活） | `…/antdpro-detail-advanced-tab2-active-light.png`                                                           | —                                                   |
| hover/focus              | tabs hover 含于 tab2 截图过程；focus 同构复验口径                                                           | —                                                   |
| 弹层/拖拽/loading        | n/a                                                                                                         | n/a                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 n/a（tabs 点击可达性依赖 role=tab 键盘约定，本页未单独断言键盘环） A3 ✔（无 <24 独立目标：审批钮 60×32、tab 70×25 略矮但有 tablist 整体热区） A4 n/a A5 n/a（mock 同步） A6–A8 n/a A9 n/a（审批流转未断言）
- B 颜色：B1 ✔（light：tab 激活 `rgb(2,8,23)` 21:1、未激活 60% 黑 ≈7:1、desc 灰 ≥7:1） B2 ✔ B3 ✔（步骤 1-3 蓝勾=完成、第 4 蓝点=进行中、驳回 outline/通过 primary） B4 ✔ B5 **fail(R2-1a-B5-02 域内轻度实例)**（dark 页面整体保持亮底，无不可读级损坏） B6 ✔
- C 布局：C1 ✔ C2 ✔ C3 **fail(R2-1a-C3-02 实例)**（执行进度卡 414px（authored max-w-5xl=1024）、tabs 卡更窄 ~272px，"审批记录"tab 内容区被压） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（两卡之间 24px、卡内节奏一致） D2 ✔ D3 ✔（desc 行高一致） D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（页头状态 + 执行进度 + 分组 tabs 直答三问） E2 ✔（通过 primary / 驳回 outline，主次分明） E3 ✔（驳回左、通过右，符合「Dialog / Form Action Button Convention」destructive-左 primary-右） E4 ✔（desc label x=646.9 全等；三 tab 等宽排列） E5 ✔（进度卡/tabs 卡分割清晰） E6 n/a
- F 一致性：F1 ✔（审批组与 detail-basic 页头结构一致） F4 ✔
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-C3-02]（本页实例）进度卡 414px / tabs 卡 ~272px（authored max-w-5xl=1024）

- **页面/路由**: `#/complex-pages/antdpro-detail-advanced`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-detail-advanced/antdpro-detail-advanced-default-light.png`
- **程序化证据**: `cardW` 探针：`w:414, maxW:"1024px"`（`.adp-card p-6 mb-4 max-w-5xl mx-auto`，两卡同 className）；tablist `w:216`（三 tab 各 70px，几乎无余量）；机制同 R2-1a-C3-02 主发现（flex-column + `mx-auto` shrink-to-fit）
- **对照基准**: C3；AntD Pro 高级详情原版为多列宽卡
- **严重程度**: P2 ｜ **用户影响**: 步骤条与 tab 内容被压在最窄一档，四步进度横排拥挤、"审批记录"分组几乎无内容余量。｜ **修复方向**: 同 R2-1a-C3-02（schema 补 `w-full`）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-B5-02]（域内轻度实例）dark 整页保持亮底

- **截图**: `…/antdpro-detail-advanced-default-dark.png` ｜ **严重程度**: P1（域级统一判级） ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核
- **程序化证据**: adp 字面亮底无 dark 覆盖；steps/tabs 色值均未翻转（`antdpro-detail-probe.mjs` → `darkSteps` 空、tab 色值与 light 相同机制）

### [R2-1a-A3-01]（本页实例）tab 高 25px

- **程序化证据**: tab 元素 `70×25`（短边 25 ≥ 24，压线通过；tablist 有整体热区）——记录为压线观察，不单独立项
- **对照基准**: WCAG 2.5.8 ｜ **严重程度**: P3（压线） ｜ **归族**: watch-only（若后续 tab 高度下调再立项） ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                              | 排除理由                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| tab 切换后"审批记录"tab computed 色与激活 tab 相同（rgb(2,8,23)） | 点击后指针停留在 tablist 区域引发 hover 态着色；aria-selected 才是激活判据（客户信息 selected=true、面板内容已切换 ✔），非状态混淆 |
| steps 第 1 步块高 86 vs 其他 70                                   | 第 1 步含两行描述文案（"订单创建并风控校验"换行），非异常离群行（D3 口径）                                                         |
| tabs 用药丸样式而非 AntD 下划线样式                               | 复刻域有意选择 shadcn Tabs 视觉；replica 风格差异豁免，交互语义（role=tab/切换/面板联动）已验证正确                                |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C3-02/B5-02 → R2-3 系统性批；A3-01 压线项 → watch-only；批内复检通过后 → `verified`。
