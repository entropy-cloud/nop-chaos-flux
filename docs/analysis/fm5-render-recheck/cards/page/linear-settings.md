# [card] page:linear-settings

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/linear-settings` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；弹层/偏好开关深查不在本轮矩阵）

## 1. 截图清单

| 状态          | light                                                            | dark           |
| ------------- | ---------------------------------------------------------------- | -------------- |
| 默认 1280×800 | `linear-settings-default-1280x800-light.png`                     | `...-dark.png` |
| 默认 800×900  | `linear-settings-default-800x900-light.png`                      | `...-dark.png` |
| 探针复核      | `_tmp/fm5-shard3-ls-labels.mjs`（light/dark 表单标签对比度实测） | 同左           |

## 2. A–H 判定（简）

- A 交互：pass ｜ **B 颜色：fail（FM5-S3-B5-01，新增）** ｜ C 布局：pass（**R2-1a-C-01 页面实例已修复**：子导航+表单区并排）｜ D 间隔：pass ｜ E 排布：pass ｜ F/G/H：n/a

## 3. 发现

### [FM5-S3-B5-01] light 宿主下工作区信息三个表单标签 1.00:1 不可读（画布恒暗 × 主题响应式标签色错配）

- **页面/路由**: `#/complex-pages/linear-settings`（工作区信息卡：工作区名称/工作区标识/工作区描述三个字段标签）
- **主题/视口/状态**: light 宿主 / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/linear-settings-default-1280x800-light.png`（标签不可见）vs `...-dark.png`（同位置标签清晰）
- **目视描述**: light 宿主下表单区直接可见三个输入框，其上标签文字消失；dark 宿主下同一批标签正常显示
- **程序化证据**:
  - 探针: `_tmp/fm5-shard3-ls-labels.mjs`（逐标签读 computed color + 有效背景 + WCAG 对比度）
  - 输出: light——`工作区名称/工作区标识/工作区描述` color=rgb(2,8,23) on rgb(8,9,10) → **1.00:1**；dark——rgb(248,250,252) on 同底 → **19.05:1**。同画布内偏好开关标签（聚合通知）为固定亮色 18.73:1，证明字段标签组走的是主题响应式 token，而复刻画布恒为暗色
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；skill B5（dark 平价/双主题复检）
- **严重程度**: P2（设置页字段身份信息在 light 默认态不可读；值经由 placeholder/输入框仍可见故不及 P0/P1）
- **用户影响**: light 主题用户无法辨认三个输入框分别是什么字段
- **修复方向**: 字段标签改用与偏好开关标签一致的画布本地固定色（复刻画布恒暗，标签不应随宿主 `data-mode` 翻转），或在复刻画布根节点固定 `data-mode="dark"` 作用域
- **归族**: local（linear 复刻页主题错配面）｜ **复核状态**: 未复核

## 4. 结论

**verdict: fail（1 项新增 P2）**。R2-1a-C-01 堆叠修复确认；A3-04 开关小目标维持登记。
