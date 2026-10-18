# [card] page:stripe-payments

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/stripe-payments` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；交易明细抽屉/导出 dialog 不在本轮矩阵）

## 1. 截图清单

| 状态                 | light                                            | dark           |
| -------------------- | ------------------------------------------------ | -------------- |
| 默认 1280×800        | `stripe-payments-default-1280x800-light.png`     | `...-dark.png` |
| 默认 800×900         | `stripe-payments-default-800x900-light.png`      | `...-dark.png` |
| interaction 1280×800 | `stripe-payments-interaction-1280x800-light.png` | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass（双主题 KPI 卡/筛选 chip 可读）｜ **C 布局：carried——R2-1a-C4-04（800 视口内容整体超宽）维持**：窄视口下画布右缘越界（标题竖排、日期条/chips/KPI 卡被裁），依赖横滚，量级与 R2 相当 ｜ D 间隔：pass ｜ E 排布：E3-02 主按钮位维持族裁决；**R2-1a-C1-06（watch：KPI 大数溢出 16px）改善**：净额 CN¥486,210.75 于容器内收边，未见溢出

## 3. 发现

### [FM5-S3-C1-02] 筛选行右侧 fixture 注释段贴画布右缘裁切（fixture 级）

- **页面/路由**: `#/complex-pages/stripe-payments` 筛选行右侧
- **主题/视口/状态**: light+dark 均现 / 1280 / 默认
- **截图**: `stripe-payments-default-1280x800-light.png`（右侧 x≈980–1200 灰字注释块）
- **目视描述**: 「chip 增删/组合收窄已接线（I1 P7b）…搜索已参数化（I3）」注释段渲染于页面主体，末尾「（I3）」贴边裁切
- **程序化证据**: 文本源于 schema 有意注释 `apps/playground/src/complex-pages/page-schemas/stripe-payments.json:713`——非渲染器泄漏；裁切为注释列宽与画布右缘关系
- **对照基准**: fixture 参数级口径（同 R2-2a fixture 层误报排除惯例）
- **严重程度**: P3
- **用户影响**: demo 页说明文案尾部被裁，阅读不完整
- **修复方向**: 注释块加右 padding 或收窄列宽（schema/fixture 层）
- **归族**: watch-only（fixture 层）｜ **复核状态**: 未复核

## 4. 结论

**verdict: pass（回归面；C4-04 维持，C1-06 改善，新登记 fixture 级 P3 一项）**。
