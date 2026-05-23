# 深度审核汇总报告

## 审核范围

- 执行的维度：01 依赖图与包边界，02 模块职责与文件边界，03 API 表面积与契约一致性，04 状态所有权与单一事实来源，05 响应式订阅精度，06 异步模式与取消安全，07 生命周期与副作用归属，08 验证系统一致性，09 渲染器契约合规性，10 样式系统合规性，11 UI 组件使用合规性，12 表单字段与 Slot 建模，13 类型安全与动态边界，14 测试覆盖与质量，15 安全与性能红线，16 文档-代码一致性，17 命名与术语一致性，18 跨包模式一致性，19 错误传播保真度，20 可访问性。
- 覆盖的代码与文档面：`packages/flux-*`、`packages/flux-renderers-*`、`packages/flow-designer-*`、`packages/report-designer-*`、`packages/spreadsheet-*`、`packages/word-editor-*`、`packages/nop-debugger`、`apps/playground`、`docs/architecture`、`docs/components`、`docs/plans`、`docs/index.md`。
- 审核日期：2026-05-20。
- 执行方式：20 维深挖至收敛 + 全量独立维度复核；summary 仅汇总独立复核后仍保留的结论。

## 复核统计

- 深挖总发现数：170。
- 独立复核覆盖：170 / 170。
- 复核后保留：163。
- 其中降级保留：6。
- 复核后驳回：7。
- 零发现维度：01。

## 维度结果概览

| 维度 | 名称                     | 保留 | 降级保留 | 驳回 |
| ---- | ------------------------ | ---- | -------- | ---- |
| 01   | 依赖图与包边界           | 0    | 0        | 0    |
| 02   | 模块职责与文件边界       | 3    | 1        | 1    |
| 03   | API 表面积与契约一致性   | 16   | 1        | 2    |
| 04   | 状态所有权与单一事实来源 | 12   | 2        | 0    |
| 05   | 响应式订阅精度           | 3    | 1        | 1    |
| 06   | 异步模式与取消安全       | 2    | 0        | 1    |
| 07   | 生命周期与副作用归属     | 11   | 0        | 0    |
| 08   | 验证系统一致性           | 9    | 0        | 0    |
| 09   | 渲染器契约合规性         | 8    | 0        | 0    |
| 10   | 样式系统合规性           | 5    | 0        | 0    |
| 11   | UI 组件使用合规性        | 4    | 0        | 0    |
| 12   | 表单字段与 Slot 建模     | 3    | 0        | 1    |
| 13   | 类型安全与动态边界       | 6    | 1        | 0    |
| 14   | 测试覆盖与质量           | 14   | 0        | 0    |
| 15   | 安全与性能红线           | 8    | 0        | 0    |
| 16   | 文档-代码一致性          | 14   | 0        | 0    |
| 17   | 命名与术语一致性         | 13   | 0        | 1    |
| 18   | 跨包模式一致性           | 8    | 0        | 0    |
| 19   | 错误传播保真度           | 19   | 0        | 0    |
| 20   | 可访问性                 | 5    | 0        | 0    |

## 高优先级保留项

| 编号  | 维度     | 文件                                                                         | 一句话摘要                                                                           |
| ----- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 13-02 | 类型安全 | `packages/word-editor-renderers/src/word-editor-action-provider.ts`          | Word Editor host provider 仍未按 manifest shape 收窄 chart/code payload              |
| 13-03 | 类型安全 | `packages/flux-runtime/src/action-adapter.ts`                                | `component:setValue/setValues` 已发布 args contract，但 runtime 仍直接转发 payload   |
| 13-04 | 类型安全 | `packages/flux-compiler/src/schema-compiler/host-action-validation.ts`       | host action 声明了 args 时，编译器仍允许完全省略 `args`                              |
| 13-05 | 类型安全 | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`                 | Spreadsheet 多个 host command 公开为无参，但 core 实际要求必填字段                   |
| 13-06 | 类型安全 | `packages/report-designer-renderers/src/report-designer-manifest.ts`         | Report Designer `target` payload 仍只校验任意 object，可放行非法 selection target    |
| 14-05 | 测试覆盖 | `packages/flow-designer-renderers/package.json`                              | package test 脚本手工枚举遗漏 3 个已提交测试文件                                     |
| 19-01 | 错误传播 | `packages/flux-runtime/src/import-stack.ts`                                  | pending import 失败后被吞掉并隐式重试，等待链路观察到的失败不一致                    |
| 19-02 | 错误传播 | `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts` | action-backed data source 把无 `error` 的 failed result 扁平化为通用 Error           |
| 19-07 | 错误传播 | `packages/flux-runtime/src/runtime-action-helpers.ts`                        | async validation 把 cancelled action result 记成成功                                 |
| 19-09 | 错误传播 | `packages/flux-action-core/src/action-dispatcher/action-runners.ts`          | namespaced/component action 直接 throw 时会丢失 dispatch metadata                    |
| 19-15 | 错误传播 | `packages/flux-core/src/value-adapter.ts`                                    | value-adapter 共享 substrate 把 failure result 压成字符串错误                        |
| 19-16 | 错误传播 | `packages/flux-runtime/src/async-data/source-observer.ts`                    | anonymous source observer 将 cancelled/timedOut 误分类为普通 error                   |
| 19-17 | 错误传播 | `packages/flux-runtime/src/async-data/source-observer.ts`                    | 多 source observer 会把首个 rejected error 扩散到后续 source                         |
| 19-18 | 错误传播 | `packages/flow-designer-renderers/src/designer-page-helpers.tsx`             | Flow Designer create dialog 会静默吞掉 submitAction 失败                             |
| 19-19 | 错误传播 | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`     | formula source refresh 失败后不会 failed settlement，状态可能卡在 `fetching/running` |
| 20-04 | 可访问性 | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                    | spreadsheet grid 已声明 ARIA `grid`，但活动单元格仍缺完整 gridcell 语义              |

## 主要模式

- 文档侧仍有一批 active routing / owner docs 指向 future draft、archived plan、失效路径或已变更的 live contract，最集中在维度 16。
- author-facing 命名仍有大量兼容词汇继续占据主示例路径，尤其是 action selector、host projection 字段、designer toolbar 和 renderer schema 字段，最集中在维度 17。
- 跨包一致性问题主要集中在 i18n：多个领域 renderer 已有 locale namespace，但 toolbar、canvas、debugger、accessibility name 仍存在大量硬编码文本，最集中在维度 18。
- 最密集、最危险的问题簇在维度 19：大量共享 runtime substrate 仍把 `ActionResult`、abort reason、provider metadata、aggregate failure 和 async owner settlement 压扁或吞掉，直接削弱 debugger、monitor、`onError`、statusPath 与 owner-state 的根因保真度。
- 可访问性问题集中在复杂自定义控件：包装型 field、tree/tree-select、interactive table row、spreadsheet grid、Flow Designer node toolbar 都已具备部分 ARIA 外形，但仍缺真实焦点模型、键盘路径或 owned-element 语义。

## 交叉重复收口

- `Report Designer selection/target alias` 最终按 [维度16-14] 保留；[维度17-06] 在独立复核中按重复根因驳回，不再在 summary 中重复计数。

## 结论

- 本轮 20 维 deep audit 已全部完成到独立复核阶段，`16-20` 的复核结论已补齐。
- 当前最值得优先进入修复队列的是三类问题：维度 19 的错误传播保真度、维度 13 的 host/action 动态边界类型收窄、维度 16 的 active docs routing 与 owner baseline 漂移。
- 其余 retained findings 已按维度写回对应文件，summary 不再重复展开逐条证据；逐项证据与建议以各维度文件中的最终复核结论为准。
