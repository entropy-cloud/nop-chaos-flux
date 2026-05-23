# 深度审核汇总报告

## 审核范围

- 执行维度：`01-20` 全量深度审核
- 审核目录：`packages/*`、`apps/playground/src`、`tests/e2e`、`docs/architecture`、`docs/references`、`AGENTS.md`
- 审核日期：`2026-05-05`
- 执行方式：按 `docs/skills/deep-audit-prompts.md` 先初审、再多轮深挖、最后独立复核

## 复核统计

- 初审发现总数：148
- 已完成独立复核的可读条目数：147
- 未纳入最终统计：1
- 说明：`05-reactive-precision.md` 第 5 轮第 17 条在生成时截断，仅保留标题起始，无法完成逐条复核
- 维度级复核完成数：20
- 保留：82
- 降级：45
- 驳回：20

## 零发现维度

- `01-dependency-graph`
- `03-api-surface`

## 逐维度统计

| 维度 | 初审条目 | 复核保留 | 复核降级 | 复核驳回 | 深挖轮次 |
| ---- | -------- | -------- | -------- | -------- | -------- |
| 01   | 0        | 0        | 0        | 0        | 1        |
| 02   | 2        | 1        | 0        | 1        | 2        |
| 03   | 0        | 0        | 0        | 0        | 1        |
| 04   | 5        | 3        | 1        | 1        | 4        |
| 05   | 17       | 7        | 6        | 3        | 5        |
| 06   | 11       | 8        | 3        | 0        | 5        |
| 07   | 8        | 3        | 3        | 2        | 5        |
| 08   | 6        | 1        | 4        | 1        | 4        |
| 09   | 10       | 5        | 1        | 4        | 5        |
| 10   | 9        | 3        | 4        | 2        | 4        |
| 11   | 2        | 2        | 0        | 0        | 2        |
| 12   | 8        | 4        | 3        | 1        | 3        |
| 13   | 6        | 3        | 3        | 0        | 4        |
| 14   | 13       | 8        | 5        | 0        | 5        |
| 15   | 5        | 4        | 0        | 1        | 5        |
| 16   | 11       | 7        | 3        | 1        | 4        |
| 17   | 3        | 1        | 2        | 0        | 4        |
| 18   | 9        | 7        | 2        | 0        | 4        |
| 19   | 9        | 5        | 1        | 3        | 5        |
| 20   | 14       | 10       | 4        | 0        | 5        |

## P0 清单

- 无

## P1 清单

| 维度 | 条目                                                                             | 文件                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 02   | `schema-compiler-prop-coverage.test.ts` 超过 700 行且聚合 13 组无关 coverage     | `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`                                                                                                  |
| 06   | Report Designer 首次字段源刷新把 provider 异常静默吞掉                           | `packages/report-designer-renderers/src/page-renderer.tsx`                                                                                                          |
| 08   | hidden participation 不按 subtree 传播，隐藏父路径不会让后代字段退出验证         | `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-field-ops.ts`                                                       |
| 12   | `array-field` 落入默认 `FieldFrame<label>` 包裹且内部放置次级按钮                | `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`                                              |
| 12   | `tree-select` / `input-tree` 落入默认 `FieldFrame<label>` 包裹且内部放置交互控件 | `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`                                                            |
| 13   | detail-view 把不存在的 `'custom'` 规则写入 validation 契约                       | `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`                                                                                  |
| 13   | `runtime-factory` 把 `Partial<ActionContext>` 强装成完整 `ActionContext`         | `packages/flux-runtime/src/runtime-factory.ts`                                                                                                                      |
| 14   | `flux-action-core` 缺少 coverage gate                                            | `packages/flux-action-core/vitest.config.ts`                                                                                                                        |
| 14   | 表单关键路径 E2E 仍停留在基础校验                                                | `tests/e2e/component-lab/simple-form.spec.ts`                                                                                                                       |
| 15   | Spreadsheet 同步路径对每次文档变更执行整份 Report 文档深拷贝                     | `packages/report-designer-core/src/core.ts`                                                                                                                         |
| 15   | 元数据编辑每次都把整份文档深拷贝进 undo 栈                                       | `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/core-dispatch.ts`                                                                   |
| 15   | 字段源刷新前双拷贝整份设计器上下文                                               | `packages/report-designer-core/src/runtime/field-sources.ts`, `packages/report-designer-core/src/runtime/adapter-context.ts`                                        |
| 16   | `flux-runtime-module-boundaries.md` 仍描述已不存在的 `resolveGap` 本地副本       | `docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-renderers-basic/src/flex.tsx`              |
| 18   | `flow-designer` page override-surface schema 契约落后于 live region 能力         | `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/index.tsx`                                                          |
| 19   | 验证运行真实异常被误记为 `cancelled`                                             | `packages/flux-runtime/src/form-runtime-validation.ts`                                                                                                              |
| 19   | `form` 的 `initAction` 初始化失败被吞掉且激活键已前移                            | `packages/flux-renderers-form/src/renderers/form.tsx`                                                                                                               |
| 19   | Report Designer 预览中止丢失 `cancelled` 语义                                    | `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-renderers/src/host-action-provider.ts`                                              |
| 20   | `select` 错误文本未关联到真实可聚焦触发器                                        | `packages/flux-renderers-form/src/renderers/input.tsx`                                                                                                              |
| 20   | condition-builder 字段/操作符/value 子控件缺少可访问名称                         | `packages/flux-renderers-form-advanced/src/condition-builder/*`                                                                                                     |
| 20   | condition-builder 拖拽手柄缺少键盘可操作语义与名称                               | `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx` |

## P2 主题

- 状态所有权：declarative surface 的 `localOpen` 与 runtime entry 双轨状态；spreadsheet toolbar / word editor toolbar 的本地状态脱离真实 store
- 响应式订阅：designer toolbar/inspector 的 full snapshot 订阅；空 `name` 分支下的无效全量订阅
- 异步安全：多个保存/提交/校验路径仍存在 fire-and-forget promise 与未处理 rejection
- 渲染器契约：`designer-field` / report designer live metadata 与实际 authored props 仍有漂移
- 样式系统：playground 继续把 BEM 当外部样式接口；若干 live CSS/TS 错误消费 HSL token
- UI 组件：渲染器层与 demo 层仍有直接原生 `<label>` / `<button>` 输出
- 文档一致性：runtime / renderer / terminology 文档仍描述旧 hook、旧签名、旧术语或已删除文件
- 跨包模式：domain workbench 与 advanced widget 的默认文案和最低错误可观测性仍未收敛

## 高频问题区域

| 区域                                          | 维度               | 模式                                                              |
| --------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| `packages/report-designer-core/src/*`         | 06, 15, 18, 19     | 字段源加载、整文档深拷贝、可观测性与取消语义混合缺口              |
| `packages/report-designer-renderers/src/*`    | 06, 09, 18, 19     | host bridge、metadata、静默失败、跨包文案分叉                     |
| `packages/flux-react/src/*`                   | 07, 08, 12, 20     | render 期副作用、validation participation、FieldFrame、ARIA 传递  |
| `packages/flow-designer-renderers/src/*`      | 04, 05, 09, 10, 18 | full snapshot、renderer 契约、样式口径、override-surface 类型漂移 |
| `packages/flux-renderers-form-advanced/src/*` | 06, 12, 13, 20     | fire-and-forget 校验、FieldFrame label 包裹、类型越界、a11y 缺口  |
| `apps/playground/src/*`                       | 10, 11             | BEM 外部接口与原生按钮遗留                                        |

## 跨维度模式

- 共享基础设施已存在，但局部路径仍绕开：`AbortSignal`、`FieldFrame` ARIA、`flux.*` i18n key、`props.meta.*` 统一通道
- shell / host renderer 倾向一次性抓大快照或整 scope，再在组件内部拆用，导致订阅面过宽
- 部分 domain workbench 已有更强 host/region 能力，但 schema 类型与文档还停留在旧表面
- 文档侧存在持续性的“原则对了、实现片段和术语落后”问题，尤其集中在 runtime / renderer / terminology 交界

## 建议新增自动化检查

- 对 `docs/analysis/*` 产出文件增加完整性检查，避免像 `05-reactive-precision.md` 第 17 条这种截断记录进入最终目录
- 检查 `FieldFrame<label>` 下是否嵌入交互控件按钮/trigger
- 检查渲染器 root 是否错误直接使用 `node.cid` 而非 `props.meta.cid`
- 检查高频交互包的 `vitest.config.ts` 是否声明 coverage gate
- 检查 `form-runtime-validation` 是否把真实异常错误误记为 `cancelled`
- 为 report designer 整文档深拷贝热路径增加性能回归基线
