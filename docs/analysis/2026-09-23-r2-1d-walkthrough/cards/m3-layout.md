# [card] page:m3-layout

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/m3-layout` ｜ **载体**: 域页面（M3a 移动端页面骨架 5 模式：Tabbar/NavBar/ActionBar/SubmitBar/Sticky，page.header/footer region 模板）
- **矩阵裁剪**: simplified+移动专项（裁掉 glass（本波统一）、弹层（无）、拖拽/异步态（无）。375 主分析 + 800 + 1280 一轮；重点：固定栏作用域、safe-area、A3 触控目标、A8）

## 1. 截图清单（状态矩阵）

| 状态                             | light                                                                        | dark                         |
| -------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| 默认 375×812                     | `_tmp/visual-inspection-2026-09-23/r2-1d/m3-layout/m3-default-375-light.png` | `…/m3-default-375-dark.png`  |
| Tabbar 点击 → navigate toast 375 | `…/m3-tabbar-click-375-light.png`                                            | —（行为与主题无关）          |
| ActionBar 区段 1280              | `…/m3-actionbar-1280-light.png`                                              | —                            |
| 默认 800×900                     | `…/m3-default-800-light.png`                                                 | `…/m3-default-800-dark.png`  |
| 默认 1280×800                    | `…/m3-default-1280-light.png`                                                | `…/m3-default-1280-dark.png` |
| hover/disabled/弹层              | n/a                                                                          | —                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（nop-haptic :active 契约） A2 ✔ A3 ✔（tabbar 64×56、navbar 44×44、CTA 48h、submit 全选 hit 52×44；仅 checkbox 视觉盒 16px 为登记误报） A4 n/a A5 **fail(R2-1d-A5-02)**（tabbar icon home/grid 未渲染） A6 n/a A7 n/a A8 ✔（全部动作为按钮点击，无手势依赖） A9 ✔（navigate → toast 反馈实测「navigate → /home」）
- B 颜色：B1 ✔ B2 ✔ B3 n/a B4 ✔（bar 背景 bg-background + border-t 走令牌） B5 ✔ B6 n/a
- C 布局：C1 ✔ C2 ✔（5 个 fixed bar 全部 scoped 在各自 device frame 内（transform containing block），inFrame=true；bar 与正文 contentBottom 无重叠） C3 ✔ C4 ✔ C5 ✔（sticky 容器正常吸顶不遮内容） C6 n/a
- D 间隔：D1–D8 ✔（5 frame 间距 24px 一致；bar 内项距均匀）
- E 排布：E1 ✔ E2 ✔ E3 ✔（NavBar 返回左/标题中/操作右符合惯例） E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔（Tabbar/SubmitBar 按钮规格与 m5-showcase tabbar 同构） F2–F4 n/a F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A5-02] Tabbar 按钮声明的 icon（home/grid）不渲染，按钮退化为纯文字

- **页面/路由**: `#/m3-layout`（§14.1 Tabbar 首页/分类 两按钮；同根因实例见 `#/m5-showcase` 底部 tabbar 首页/分类）
- **主题/视口/状态**: light+dark / 375、1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m3-layout/m3-default-375-light.png`（Tabbar 仅「首页 / 分类」文字，无图标）；m5 实例 `_tmp/visual-inspection-2026-09-23/r2-1d/m5-showcase/m5-frame-cart-bottom-1280-light.png`（购物车/我的有图标、首页/分类无）
- **目视描述**: schema 声明 `icon: 'home'` / `icon: 'grid'` 的按钮只渲染 label，图标位完全消失；同页 `arrow-left`（navbar 返回）与 ActionBar `customer-service`/`star`（经 IconRenderer）图标正常。
- **程序化证据**:
  - 探针: DOM svg 计数（`_tmp/r2-1d-probes/m3-followup-out.json` / m5-followup-out.json tabbarIcons）
  - 输出: `tabHome {svgCount: 0, innerHTMLLen: 2}`、`tabCategory {svgCount: 0}`；对照 `navBack {svgCount: 1, 16×16}`、m5 `tabbar-cart {svg: 1}`。源码链：button 渲染器 `resolveLucideIconStrict()`（unknown 名返回 null 且无 fallback/告警，`packages/ui/src/lib/icon-utils.ts` L294–306）；`home`→alias `house`、`grid` 在当前 lucide 图标集解析失败，而非 strict 的 `resolveLucideIcon` 对同名有 Circle fallback（IconRenderer 路径因此正常）。
- **对照基准**: 检查提示词 A5/E2；Vant Tabbar 图标+文字惯例（本页 demo 即对标该形态）。
- **严重程度**: P2
- **用户影响**: 移动端底部导航失去图标辨识（纯文字 tabbar），且 schema 声明被静默丢弃——使用 home/grid 图标名的所有 button 同构复现（m3、m5 两页实证）。
- **修复方向**: 二选一：① `resolveLucideIconStrict` 对解析失败名回退 `resolveLucideIcon`（Circle fallback）并 DEV 告警；② 补齐 home/grid 的 alias/图标名映射。修复后 m3/m5 tabbar 同步恢复。
- **归族**: systemic → R2-3 批（跨页同根因：strict 图标解析静默丢弃）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                               | 排除理由                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| SubmitBar 全选 checkbox 视觉 16×16 | 可点击 label 命中域 52×44（探针 submitCheckbox），达标                        |
| safe-area padding 全 0             | 非 notch 模拟环境 `env(safe-area-inset-*)` 降级为 0 即设计行为（demo 卡明示） |
| ActionBar 客服/收藏无 onClick      | 骨架 demo 只演示布局模板；图标渲染正常（16×16），可交互性非本页承诺           |
| hairline 0.5px 在截图里似 1px      | dpr=2 下 scaleY(0.5) 物理 0.5px；截图压缩不计（画布类误报排除口径）           |
| pill「0」悬浮件遮挡 §14.2 标题     | 归 R2-1d-C2-01（mobile-infrastructure 卡）                                    |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：A5-02 → R2-3 系统性批（m5 实例并档）；
- 批内复检通过后 → `verified`。
