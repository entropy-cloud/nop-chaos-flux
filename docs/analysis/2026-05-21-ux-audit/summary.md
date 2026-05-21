# UI/UX 设计合规性审查汇总报告

## 审查范围

- 扫描的包：`flux-renderers-form`、`flux-renderers-form-advanced`、`flux-renderers-data`、`flux-renderers-basic`
- 审查日期：2026-05-21
- 执行方式：4 轮迭代发现 + 独立复核

## 发现统计

- 总轮次：4（R01-R03 有发现，R04 收敛零发现）
- 深挖总发现数：8
- 复核后保留：6（MEDIUM: 6）
- 降级：2（LOW: 2）
- 驳回：0

## 快速修复项（Quick Wins，<30分钟可修复）

| 编号     | 文件                                                                       | 修复描述                                  |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| 视角4-01 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`              | 为树搜索结果为空时补充 `Empty`/空状态提示 |
| 视角5-02 | `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` | 在 confirming 按钮内加入 `Spinner`        |
| 视角6-01 | `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` | 为 drawer 头部增加可见关闭按钮            |
| 视角4-02 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`              | 为搜索框增加 clear icon/button            |

## 最大影响修复（Top 3）

1. `视角5-05` - 修复 detail-view / detail-field 的异步打开静默期，对高频“编辑详情”入口的感知最直接。
2. `视角5-03` - 修复 CRUD rich empty content 被压平成纯文本，能统一 CRUD 与 Table 的空状态表达能力。
3. `视角5-04` - 为 table quick edit 补充保存中反馈，改善高频表格编辑路径的操作确定性。

## HIGH 清单

本轮复核后无 HIGH 项。

## MEDIUM 清单

| 编号     | 文件                                                                                                                                              | 问题                                             | 行业惯例                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| 视角4-01 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`                                                                                     | InputTree / TreeSelect 搜索无结果时直接留白      | searchable picker 应显示明确空态而非空白面板             |
| 视角5-01 | `packages/flux-renderers-basic/src/dynamic-renderer.tsx`                                                                                          | DynamicRenderer loading 无可见反馈               | 异步加载应提供 `Spinner` / loading UI                    |
| 视角5-03 | `packages/flux-renderers-data/src/crud-renderer.tsx`                                                                                              | CRUD 把 rich empty content 压成纯文本            | CRUD / Table 应保留完整空状态内容能力                    |
| 视角6-01 | `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`                                                                        | drawer 模式没有可见头部关闭按钮                  | 长表单/长面板应始终保留可见关闭入口                      |
| 视角5-04 | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`                                                                       | quick edit 保存中只有禁用，没有可见 pending 反馈 | 异步保存按钮应有 spinner 或 saving 文案                  |
| 视角5-05 | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`; `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` | 异步打开阶段没有任何可见 pending 反馈            | 异步打开前准备应在 trigger 或 surface 内明确显示 pending |

## LOW 清单

| 编号     | 文件                                                                       | 问题                                | 行业惯例                                 |
| -------- | -------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| 视角5-02 | `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` | confirming 仅文案切换，没有 Spinner | pending 按钮通常使用 `Spinner + 文案`    |
| 视角4-02 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`              | 树搜索框没有内建清除入口            | searchable 输入通常提供 clear affordance |

## 按组件分组

| 组件                           | 发现数 | 主要问题类别                     |
| ------------------------------ | ------ | -------------------------------- |
| `tree-controls`                | 2      | 搜索空态、搜索清除入口           |
| `detail-surface`               | 2      | confirming 反馈、drawer 关闭入口 |
| `detail-view` / `detail-field` | 1      | 异步打开 pending 反馈            |
| `dynamic-renderer`             | 1      | loading 反馈                     |
| `crud-renderer`                | 1      | 空状态内容能力降级               |
| `table-quick-edit-cell`        | 1      | 保存中反馈                       |

## 跨组件一致性问题

1. 异步交互反馈不一致：`dynamic-renderer`、`detail-surface`、`detail-view/detail-field`、`table-quick-edit`` 都存在不同阶段的 pending 反馈缺口，说明仓库内还没有统一的“异步按钮 / 异步表面层”交互基线。
2. 空状态表达能力不一致：`tree-controls` 在搜索无结果时直接留白，`crud-renderer` 又会主动压平 richer empty content，导致列表/选择器/CRUD 三类空态体验不统一。

## 建议的统一设计规范

1. 所有异步交互入口都应有可见 pending 反馈：按钮内使用 `Spinner + 文案`，表面层初始化阶段则显示 body-level loading。
2. searchable 控件必须同时覆盖“无结果空态”和“快速清空查询”两个基本微交互。
3. CRUD 与 Table 的空状态能力应统一为可传递 richer content，而不是在中间层压平成纯文本。
4. Drawer/Dialog 类表面层默认应提供稳定可见的关闭入口，除非有明确的产品约束。

## 被驳回 / 降级模式复盘

| 编号     | 判定     | 复盘说明                                                           |
| -------- | -------- | ------------------------------------------------------------------ |
| 视角5-02 | 降级 LOW | 问题存在，但按钮已有文案变化和 disabled 反馈，不属于“完全无反馈”。 |
| 视角4-02 | 降级 LOW | 缺少 clear affordance，但用户仍可直接退格清空，属于便捷性缺口。    |

## 对 deep-audit 的依赖

无。所有保留项均为用户可见的交互和视觉反馈问题，不依赖 deep-audit 的架构类修复才能成立。

## 可暂缓项

1. `视角4-02` 可在统一 searchable 输入规范时顺手修复。
2. `视角5-02` 可与仓库级“异步按钮模式”一起统一收敛，而不必单点独立设计。
