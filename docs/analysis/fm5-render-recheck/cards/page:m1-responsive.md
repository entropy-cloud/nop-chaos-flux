# [card] page:m1-responsive

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/m1-responsive`（domain 路由）｜ **载体**: mobile 响应式 demo 页
- **矩阵裁剪**: simplified（抽样口径；<768px 移动分支需设备模拟，不在矩阵）

## 1. 截图清单

| 状态          | light                                      | dark           |
| ------------- | ------------------------------------------ | -------------- |
| 默认 1280×800 | `m1-responsive-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `m1-responsive-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass——**R2-1d-A5-01（P2 每页行数选择器零选项、无值显示）改善确认**：选择器现显示值「10」；选项列表是否完整需打开态复核（登记轻量缺口）｜ B 颜色：pass ｜ C 布局：pass（表格/分页/tabs 正常）｜ D 间隔：pass ｜ E 排布：pass

## 3. 发现

### [FM5-S3-H6-02] Role combobox 空值无占位（H6-06 已知族新实例）

- **页面/路由**: `#/m1-responsive` 顶部 Role 字段
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `m1-responsive-default-1280x800-light.png`（Role 全宽下拉空白）
- **目视描述**: Role 下拉无值无占位文字，与同页 Department（「选择树选项」有占位）不一致
- **程序化证据**: [visual-only]（同帧 Department 对照清晰）
- **对照基准**: R2-1a-H6-06 族（combobox 无值无占位）
- **严重程度**: P3
- **用户影响**: 字段语义依赖 label 行，影响轻
- **修复方向**: combobox 空值态渲染 placeholder（同族统一修复面）
- **归族**: systemic（并入 R2-1a-H6-06 族）｜ **复核状态**: 未复核

- watch-pool R2-1d-A3-02（列宽手柄 4×39.5）族：本轮默认态未触发列宽拖拽区，维持登记。

## 4. 结论

**verdict: pass（基线维持；A5-01 改善，H6-06 族新实例 P3）**。
