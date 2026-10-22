# [card] page:content-landing

- **批次**: FM-5 渲染面复检 · shard1（新增页全量） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/content-landing` ｜ **载体**: 域页面（外部应用复刻 · 内容型页面）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵；本页为静态内容拼装页无异步/弹层/拖拽，裁掉元素态抽样、弹层、拖拽、loading 专项）

## 1. 截图清单

| 状态          | light                                                                          | dark                                                                          |
| ------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/content-landing-default-1280x800-light.png` | `_tmp/visual-inspection-2026-10-18/content-landing-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/content-landing-default-800x900-light.png`  | `_tmp/visual-inspection-2026-10-18/content-landing-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a(静态) A2 n/a A3 pass(CTA 按钮 ≥24px) A4 n/a A5 pass(No service endpoints，无异步) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass(标题/正文/次级文案对比正常) B2 pass B3 pass(健康=绿/降级=黄语义正确) B4 pass B5 warn(FM5-S1-B-2) B6 n/a
- C 布局：C1 pass(卡片内滚动属有意预览容器) C2 pass C3 pass C4 warn(FM5-S1-C-2) C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass(hero 三秒可答) E2 pass(主 CTA 蓝底强于次按钮) E3 pass E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-B-2] dark 模式下 landing 卡片整体保持纯亮色（replica 皮肤语义，待 design 确认）

- **页面/路由**: `#/complex-pages/content-landing`
- **主题/视口/状态**: dark / 1280×800 与 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/content-landing-default-1280x800-dark.png`
- **目视描述**: 外壳（侧栏/描述区）随 data-mode=dark 变暗，但 landing 卡片（导航/hero/数据 mockup）整体保持白底亮色，形成"亮色预览卡叠在暗页上"的效果。
- **程序化证据**: 四张截图对照（light/dark 同构，卡片内部无任何 token 翻转）。[visual-only]（意图判定需 design 依据）
- **对照基准**: 检查提示词误报表——replica 页有意对标第三方产品，样式差异按复刻目标豁免；本页属"外部应用复刻"族。对比：bisheng 复刻在 dark 下外壳变暗、画布区域保留浅色，两 replica 的 dark 适配深度不一致。
- **严重程度**: P3
- **用户影响**: dark 用户看到大块亮面，观感突兀但内容可读、无功能影响；更像"浏览器 mockup 预览"的有意框架。
- **修复方向**: 若有意，在 complex-pages-model 该页 description 或 design.md 补一句"恒亮预览卡"依据并登记误报豁免；若无意，为 landing 卡片接 `--nop-*` surface 令牌双态。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

### [FM5-S1-C-2] ~800px 视口下导航菜单（产品/文档/模板/定价）直接隐藏，无汉堡入口

- **页面/路由**: `#/complex-pages/content-landing`
- **主题/视口/状态**: light + dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/content-landing-default-800x900-light.png`
- **目视描述**: 1280 下导航条含 4 个菜单项 + 登录 + CTA；800 下菜单项消失，仅剩 登录/免费开始，无汉堡/更多入口。
- **程序化证据**: 双视口截图对照 [visual-only]（复刻页导航响应式策略）
- **对照基准**: Design QA 清单"响应式"；复刻对标站（真实营销站窄屏普遍有汉堡）
- **严重程度**: P3
- **用户影响**: 窄视口用户无法到达 4 个锚点导航（同页锚点，影响小）。
- **修复方向**: schema 侧为窄档补汉堡/溢出菜单，或明确锚点导航仅桌面档并登记。
- **归族**: local
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/content-landing.md`）。
