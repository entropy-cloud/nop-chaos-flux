# 深度审核汇总报告

## 审核范围

- 执行的维度：01 依赖图与包边界，02 模块职责与文件边界，03 API 表面积与契约一致性，04 状态所有权与单一事实来源，05 响应式订阅精度，06 异步模式与取消安全，07 生命周期与副作用归属，08 验证系统一致性，09 渲染器契约合规性，10 样式系统合规性，11 UI 组件使用一致性，12 字段元数据与 Slot 建模，13 类型安全与动态边界，14 测试覆盖与质量，15 安全与性能红线，16 文档与代码一致性，17 命名与语义清晰度，18 跨包集成一致性，19 错误传播保真度，20 可访问性
- 覆盖的包：`packages/flux-*`、`packages/flow-designer-*`、`packages/report-designer-*`、`packages/word-editor-renderers`、`packages/spreadsheet-*`、`packages/ui`、`apps/playground`
- 审核日期：2026-05-18
- 执行方式：每个维度先做多轮深挖，再做独立维度复核；对争议或需精修判级的条目继续做子项复核

## 深挖统计

- 维度总数：20
- 各维度深挖轮次：
  - 维度01 = 3轮
  - 维度02 = 2轮
  - 维度03 = 2轮
  - 维度04 = 5轮
  - 维度05 = 1轮（零发现）
  - 维度06 = 3轮
  - 维度07 = 3轮
  - 维度08 = 3轮
  - 维度09 = 3轮（含口径更正）
  - 维度10 = 1轮（零发现）
  - 维度11 = 1轮（零发现）
  - 维度12 = 1轮
  - 维度13 = 2轮
  - 维度14 = 3轮
  - 维度15 = 5轮
  - 维度16 = 1轮
  - 维度17 = 1轮
  - 维度18 = 1轮
  - 维度19 = 2轮
  - 维度20 = 1轮
- 深挖总轮次：44
- 深挖总发现数：
  - 01: 3
  - 02: 3
  - 03: 1
  - 04: 5
  - 05: 0
  - 06: 3
  - 07: 4
  - 08: 7
  - 09: 3（更正后保留主项 3）
  - 10: 0
  - 11: 0
  - 12: 1
  - 13: 4
  - 14: 7
  - 15: 6
  - 16: 3
  - 17: 2
  - 18: 3
  - 19: 3
  - 20: 3
  - 合计：57

## 复核统计

- 深挖发现总数：57
- 已独立复核维度数：20
- 需要子项复核的维度数：11
- 已完成子项复核：04，08，09，12，13，15，16，17，18，19，20
- 复核后最终保留项数：45
- 复核后降级项数：若干，已写回各维度文件
- 复核后驳回项数：若干，已写回各维度文件

## P1 清单

| 编号  | 维度                   | 文件                                                                                                                                                                                           | 一句话摘要                                                                                      |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 01-01 | 依赖图与包边界         | `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx:4-8`                                                                                                               | `flux-react` 测试跨层导入 renderer 且缺少 manifest 声明                                         |
| 01-03 | 依赖图与包边界         | `packages/flux-bundle/types/public-types.d.ts:2-15`                                                                                                                                            | facade 包发布类型面泄漏 `@nop-chaos/flux-core`                                                  |
| 03-01 | API 表面积与契约一致性 | `tsconfig.base.json:37-45`                                                                                                                                                                     | `tsconfig` 缺少 `@nop-chaos/flux-renderers-form-advanced` 根路径映射                            |
| 04-03 | 状态所有权             | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:67-91,173-180`                                                                                                              | seed 文档替换后 host projection 仍可能长期停留旧快照                                            |
| 07-01 | 生命周期归属           | `packages/flux-renderers-basic/src/use-surface-renderer.ts:114-129,326-347`                                                                                                                    | declarative surface 默认关闭时仍预建 scope 且 cleanup 不对称                                    |
| 07-03 | 生命周期归属           | `packages/flux-react/src/node-renderer-resolved.tsx:318-327`                                                                                                                                   | hidden-field cleanup 会把卸载误报成重新可见                                                     |
| 08-01 | 验证系统               | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:534-553`                                                                                                                          | 顶层非 `page` schema 不会生成 page-root fallback validation plan                                |
| 12-01 | 字段元数据与 Slot 建模 | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:147-154,575`; `packages/flux-react/src/render-nodes.tsx:251-276,311-327,414`                                        | `array-field` 参数化 item region 因显式 `scope` 丢失 `$slot.index/$slot.value`                  |
| 14-3  | 测试覆盖与质量         | `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-740`                                                                                                                            | `schema-renderer.test.tsx` 已越过 hard gate 且混入多个子系统契约                                |
| 15-06 | 安全与性能红线         | `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:137-145`                                                                                                             | `stopWhen` 的 null-member 错误会静默继续 polling                                                |
| 16-01 | 文档与代码一致性       | `docs/architecture/field-binding-and-renderer-contract.md:383-409`; `packages/flux-core/src/constants.ts:1-10`; `packages/flux-compiler/src/schema-compiler/fields.ts:36-85`                   | `Frozen Contract Matrix` 仍把 `META_FIELDS` 权威冻结集写成 6 项，但 live compiler 仍按 8 项运行 |
| 16-02 | 文档与代码一致性       | `docs/architecture/action-scope-and-imports.md:260-297`; `packages/flux-core/src/types/renderer-component.ts:65-84`; `packages/flux-action-core/src/action-dispatcher/action-runners.ts:65-80` | `ComponentHandleRegistry` 架构文档与导出接口、runtime target contract 分叉                      |
| 18-01 | 跨包集成一致性         | `packages/flow-designer-renderers/src/designer-manifest.ts:61-70,125-135`; `packages/flow-designer-renderers/src/designer-context.ts:135-165`                                                  | flow-designer manifest 宣布的 host projection 字段并未由 runtime host scope 发布                |
| 18-02 | 跨包集成一致性         | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:115-271`; `packages/spreadsheet-renderers/src/host-action-provider.ts:4-67`                                                        | spreadsheet manifest 只声明了小子集能力，但 runtime namespace provider 实际暴露了大批额外方法   |
| 20-01 | 可访问性               | `packages/report-designer-renderers/src/report-field-panel.tsx:27-34`                                                                                                                          | Report field panel 把拖拽项标成按钮，但没有任何键盘激活路径                                     |

## P2 清单

| 编号  | 维度               | 文件                                                                                                                                                                                                                                                                                                                              | 一句话摘要                                                                  |
| ----- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 02-03 | 模块职责           | `packages/flux-runtime/src/runtime-factory.ts:54-82,255-326`                                                                                                                                                                                                                                                                      | `runtime-factory.ts` 仍内嵌模块缓存与 prepared import 预加载逻辑            |
| 04-01 | 状态所有权         | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:168-227,264-318`                                                                                                                                                                                                                                      | 旧的异步 `transformOut` 结果仍可覆盖较新的父 truth                          |
| 04-04 | 状态所有权         | `packages/word-editor-renderers/src/dialogs/chart-dialog.tsx:50-59`                                                                                                                                                                                                                                                               | 图表或条码新建弹窗跨打开会话泄漏上一轮 draft                                |
| 04-05 | 状态所有权         | `packages/flow-designer-renderers/src/designer-tree-mode.tsx:27-34,40-51`                                                                                                                                                                                                                                                         | tree mode 同实例内出现 shell 新配置与 core 旧配置 split-brain               |
| 06-01 | 异步模式           | `packages/report-designer-renderers/src/host-action-provider.ts:57-64`                                                                                                                                                                                                                                                            | report-designer host provider 未桥接父级 `AbortSignal`                      |
| 06-02 | 异步模式           | `packages/flux-runtime/src/action-adapter.ts:305-314`                                                                                                                                                                                                                                                                             | `refreshSource` 会把真实 refresh 失败误报为成功                             |
| 06-03 | 异步模式           | `packages/report-designer-renderers/src/report-designer-toolbar.tsx:33-53`                                                                                                                                                                                                                                                        | toolbar 把正常 preview 取消当成 warning 失败                                |
| 08-02 | 验证系统           | `packages/flux-runtime/src/form-runtime-validation.ts:180-233`                                                                                                                                                                                                                                                                    | runtime-registered 异步校验未进入统一 validating/governance 流程            |
| 08-03 | 验证系统           | `packages/flux-runtime/src/form-runtime-field-ops.ts:307-325`                                                                                                                                                                                                                                                                     | hidden cleanup 未尊重 runtime override 的 `validateWhenHidden`              |
| 08-04 | 验证系统           | `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:43-50,63-70`                                                                                                                                                                                                                                       | `code-editor` 直接绕过 compiled `validateOn` 触发规则                       |
| 08-05 | 验证系统           | `packages/flux-runtime/src/form-runtime-field-ops.ts:383-437`                                                                                                                                                                                                                                                                     | `clearValueWhenHidden` 的 runtime override 仍未接线                         |
| 09-03 | 渲染器契约         | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:307-333`                                                                                                                                                                                                                                                  | `detail-field` canonical control root 未承接 `meta.className`               |
| 13-01 | 类型安全与动态边界 | `packages/flux-react/src/helpers.tsx:119-131`                                                                                                                                                                                                                                                                                     | 公共 renderer helper 的 `dispatch` 用 `any` 抹掉动作边界                    |
| 13-02 | 类型安全与动态边界 | `packages/flux-compiler/src/source-compiler.ts:125-129`                                                                                                                                                                                                                                                                           | `resultMapping` 在编译期被伪装成 `Record<string, string>`                   |
| 13-03 | 类型安全与动态边界 | `packages/spreadsheet-renderers/src/page-renderer.tsx:92-105`                                                                                                                                                                                                                                                                     | spreadsheet page 把动态 resolved props 直接断言成 core 强类型               |
| 13-04 | 类型安全与动态边界 | `packages/flow-designer-renderers/src/designer-page.tsx:19-44`; `packages/flow-designer-renderers/src/designer-tree-mode.tsx:10-23`                                                                                                                                                                                               | flow-designer page 用泛型 helper 伪收窄动态 props                           |
| 16-03 | 文档与代码一致性   | `docs/references/renderer-interfaces.md:221-225`; `packages/flux-core/src/types/renderer-core.ts:112-127`                                                                                                                                                                                                                         | `renderer-interfaces` 仍把 `RendererResolvedProps` 记为旧的 typing baseline |
| 19-01 | 错误传播保真度     | `packages/flow-designer-core/src/core-node-commands.ts:42-53`; `packages/flow-designer-core/src/core-edge-commands.ts:69-88`; `packages/flow-designer-core/src/types.ts:330`; `packages/flow-designer-renderers/src/designer-page-inner.tsx:68-73`                                                                                | Flow Designer lifecycle hook 异常在 core 到 renderer 边界被字符串化并重建   |
| 19-02 | 错误传播保真度     | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-clipboard.ts:14-29,53-59`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-find-replace.ts:35-49`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:101-116`; `packages/spreadsheet-core/src/core-dispatch.ts:18-30` | Spreadsheet renderer 多个交互 hook 丢弃结构化失败结果                       |
| 19-03 | 错误传播保真度     | `packages/spreadsheet-renderers/src/host-action-provider.ts:87-92`; `packages/spreadsheet-core/src/commands.ts:213-218`; `packages/flux-action-core/src/action-core.ts:66-76`                                                                                                                                                     | Spreadsheet namespaced host provider 在结果映射时擦除 `cancelled`           |
| 20-02 | 可访问性           | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:540-546,593-599`                                                                                                                                                                                                                                                         | Spreadsheet grid 的 resize handle 是只支持鼠标的交互分隔条                  |
| 20-03 | 可访问性           | `packages/word-editor-renderers/src/toolbar/insert-controls.tsx:139-149`; `packages/word-editor-renderers/src/toolbar/page-controls.tsx:178-191,220-225`                                                                                                                                                                          | 多个 word-editor dialog 输入框只有 placeholder，没有程序化标签              |
| 15-04 | 安全与性能红线     | `packages/flux-react/src/node-source-prop-controller.ts:51-67,222-227`                                                                                                                                                                                                                                                            | live rerun gate 仍使用 `JSON.stringify`                                     |

## P3 清单

| 编号  | 维度           | 文件                                                                                             | 一句话摘要                                                      |
| ----- | -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 04-02 | 状态所有权     | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:146-157,249-273` | 父行真实变更时 quick-edit 会覆盖 dirty draft 并关闭弹层         |
| 09-01 | 渲染器契约     | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:229-245`                  | `detail-view` 在命令式确认或回滚路径里直读 `FormRuntime.store`  |
| 09-02 | 渲染器契约     | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:144-153`                 | `detail-field` 在命令式写回或回滚路径里直读 `FormRuntime.store` |
| 15-01 | 安全与性能红线 | `packages/flux-action-core/src/action-dispatcher/action-execution.ts:82-99`                      | `onActionError` 自失败时缺少回退遥测                            |
| 15-02 | 安全与性能红线 | `packages/flux-runtime/src/import-stack.ts:117-123`                                              | joiner 路径会丢失一次 pending import 失败的结构化记录           |
| 15-03 | 安全与性能红线 | `packages/flux-react/src/node-renderer-effects.ts:85-107`                                        | node lifecycle async dispatch 未贯穿 `AbortController`          |
| 15-05 | 安全与性能红线 | `packages/flux-runtime/src/async-data/source-observer.ts:102-116,127-134`                        | 无 `stateKey` 的匿名 source 失败缺少最小运行时诊断出口          |

## 高频问题文件

| 文件                                                                     | 涉及维度 | 说明                                                                           |
| ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `packages/flux-runtime/src/form-runtime-field-ops.ts`                    | 08       | hidden-field cleanup 与 clear-value override 两条合同都未接线 runtime override |
| `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` | 09       | 同时存在 store 直读与 canonical control root `className` 漏接                  |
| `packages/flux-react/src/node-renderer-resolved.tsx`                     | 07       | hidden participation cleanup 仍把 React cleanup 当 owner truth                 |
| `packages/flux-runtime/src/runtime-factory.ts`                           | 02       | 装配层继续吸纳 import/cache 实现                                               |
| `packages/spreadsheet-renderers/src/host-action-provider.ts`             | 18,19    | 同时存在 manifest/provider 能力面漂移与 `cancelled` 传播字段丢失               |

## 跨维度模式

- owner truth 被 React effect 或 cleanup 持有：见 07-01、07-03、07-04
- runtime override 已暴露但只接通了一半：见 08-03、08-05
- facade/入口/assembly 层继续吸纳不属于自己的实现：见 01-03、02-03
- 观测或取消语义在边界桥接层被截断：见 06-01、06-03、15-01、15-05
- 动态 resolved 值在 page 或 compiler 边界被伪装成更强类型：见 13-02、13-03、13-04
- 结构化失败或取消语义在 host/provider 或 renderer shell 边界被降级：见 19-01、19-02、19-03
- 参数化 slot 合同在 owner 渲染路径被包装 scope 吞掉：见 12-01
- manifest、architecture doc 与 live runtime/provider 维护多份真源后发生契约漂移：见 16-01、16-02、16-03、18-01、18-02
- 交互语义已声明可操作，但缺少键盘入口或程序化命名：见 20-01、20-02、20-03

## 已自动化覆盖、不再人工重复报送的区域

- React 19 legacy API：`pnpm check:react19`
- src 产物污染：`pnpm check:src-artifacts`
- 标准 `eval` / `new Function`：`pnpm lint`
- missing renderer marker：`pnpm check:audit-missing-renderer-markers`
- fieldframe bypass：`pnpm check:audit-fieldframe-bypasses`

## 建议新增自动化检查

- 检查 facade 包发布的 `.d.ts` 是否泄漏内部 workspace 包名
- 检查 renderer canonical control root 是否吞掉 `meta.className`
- 检查 hidden-field cleanup 是否同时考虑 runtime registration override
- 检查 built-in `refreshSource` 是否把底层失败错误映射为 `ok:true`
- 检查 workspace alias 与 `tsconfig.paths` 是否对每个公开 root export 同步对齐
- 检查 host/provider 适配层是否完整透传 `cancelled` / `timedOut` 等 ActionResult 分类字段
- 检查 parameterized region 在传显式 `scope` 时是否仍正确发布 `$slot.*`
- 检查 host manifest 的 projection/capabilities 是否与 live publisher/provider 一致
- 检查 `role="button"` / `role="separator"` 等交互语义节点是否具备键盘路径
- 检查 dialog 输入控件是否都有稳定的程序化标签

## 可暂缓项

- `02-01`、`02-02`：当前更像再膨胀或实现压力，未达到必须立即整改的边界违例强度
- `07-02`：`initAction` owner 收口残差，建议放在 form lifecycle 统一收口时处理
- `14` 中除 `14-3` 外的大多数问题：更偏测试套件拆分与夹具治理，可按维护窗口逐步收口
- `10`：当前样式命中仍落在文档允许的 namespaced package-owned surface，可继续通过 owner doc 与 selector 约束维持
- `11`：当前未见需上报的 shared UI primitive bypass，保留现有 owner 例外判断即可
- `17`：目前更像命名取舍而非客观缺陷，不建议单独推动大规模重命名

## 误报排除清单

- wrapped field 的 `testid/cid` 默认应留在 `FieldFrame` 节点根；不要求机械复制到原始控件根
- `scope-debug` 的全 scope 订阅是调试 renderer 的预期行为，不计入维度 05 缺陷
- renderer 对 `FormRuntime.store` 的命令式快照读取是低优先级 contract drift，不应按 render-phase reactive read 高优先级误报
- word-editor host scope 的 `document -> savedDocument?.data` 绑定属于当前已文档化语义取舍，不按维度 18 的 manifest/runtime 漂移上报
