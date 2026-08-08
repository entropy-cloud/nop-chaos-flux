# 审计卡：fd-7 命令系统（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-7 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-command-adapter.ts`（tree 双适配）+ `designer-command-adapter-graph.ts`（graph 专用）+ `designer-action-provider.ts`（createDesignerActionProvider）+ `designer-command-types.ts` + `designer-manifest.ts`（41 方法契约）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + api.md + canvas-adapters.md）

## 面身份

fd-7 命令系统面：`DesignerCommand` 类型族、graph/tree 双命令适配器、action provider（41 方法）+ manifest 方法契约双向核对。宿主契约 = `designerHostContract`/`createDesignerActionProvider`。表单参与：无。布局 or widget：机制面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                     | 证据                                                                                                | 发现                     |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Schema 契约                 | DesignerCommand 类型族（graph + tree 命令全集）与 adapter 消费一致                                                                                                                       | designer-command-types.ts                                                                           | —                        |
| 2   | RendererComponentProps 合规 | adapter/action-provider 为纯机制模块（无 React 依赖面）                                                                                                                                  | designer-action-provider.ts                                                                         | —                        |
| 3   | 值所有权三态                | setPanelWidths NaN 守卫双处（action-provider + adapter）；setSelection/moveNodes 目标存在性校验                                                                                          | designer-action-provider.ts:157-167,512-531                                                         | —                        |
| 4   | 表单参与                    | 无                                                                                                                                                                                       | —                                                                                                   | —                        |
| 5   | DOM 与选择器契约            | 不适用（机制面）                                                                                                                                                                         | —                                                                                                   | —                        |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                                                                   | —                                                                                                   | —                        |
| 7   | 事件与 action 契约          | invoke(method, payload, ctx) 经 validateHostMethodPayload（FLOW_DESIGNER_HOST_METHOD_CONTRACTS）+ 失败走 notifyCommandFailure(ctx.runtime.env.notify)；tree mode GRAPH_ONLY_METHODS 降级 | designer-action-provider.ts:15-24,153-155,169-173                                                   | —                        |
| 8   | a11y                        | 不适用                                                                                                                                                                                   | —                                                                                                   | —                        |
| 9   | i18n                        | 错误消息硬编码英文 9 处（用户可见：notify 通知）                                                                                                                                         | designer-command-adapter.ts:85,128,193,214,222,232,278；designer-command-adapter-graph.ts:61,146    | **P2-1**                 |
| 10  | 四态覆盖                    | 命令失败原因族（missing-node/edge/selection-target/transaction/width/unavailable）全映射                                                                                                 | designer-action-provider.ts:46-72                                                                   | —                        |
| 11  | 异步生命周期                | 无异步（同步命令面）                                                                                                                                                                     | —                                                                                                   | —                        |
| 12  | 组合宿主场景                | summary-renderers（selectNode/selectEdge 派发）/ taskflow-ui（export/save toolbar）/ edge-creation（addEdge 链路）                                                                       | tests/e2e/\*.spec.ts                                                                                | pass（基线绿）           |
| 13  | 样式契约                    | 不适用                                                                                                                                                                                   | —                                                                                                   | —                        |
| 14  | React 19 规范               | 不适用（非组件）                                                                                                                                                                         | —                                                                                                   | —                        |
| 15  | 性能边界                    | 命令同步执行；无循环风险                                                                                                                                                                 | —                                                                                                   | —                        |
| 16  | 测试质量                    | designer-command-adapter.test.ts + designer-command-adapter.tree.test.ts + designer-action-provider.test.ts + designer-page.tree.test.tsx 在案                                           | 包级测试                                                                                            | —                        |
| 17  | 文档对照                    | manifest 41 方法 ↔ action-provider listMethods 41 条 ↔ adapter 命令全集三向一致                                                                                                          | designer-manifest.ts:78-463；designer-action-provider.ts:107-150；designer-command-adapter.ts:18-41 | —                        |
| 18  | 注册/边界/IO                | 无 IO；manifest 为编译期声明面                                                                                                                                                           | —                                                                                                   | —                        |
| H1  | host 契约                   | FLOW_DESIGNER_MANIFEST_V1/resolveDesignerManifest/designerHostContract/DESIGNER_CAPABILITY_PUBLICATION 全在案；capableRegions toolbar/inspector/dialogs；`kind:'host'` action provider   | designer-manifest.ts:465-502；designer-action-provider.ts:105                                       | H7 缺口（测试）          |
| H2  | 事务 undo                   | begin/commit/rollbackTransaction 映射 core 事务链；commit 结果 mapTransactionResult                                                                                                      | designer-action-provider.ts:481-499                                                                 | —                        |
| H3  | 拖拽                        | 不适用                                                                                                                                                                                   | —                                                                                                   | —                        |
| H4  | 键盘                        | 不适用（快捷键在 fd-10）                                                                                                                                                                 | —                                                                                                   | —                        |
| H5  | 剪贴板                      | copySelection/pasteClipboard 命令在案（fd-11 详审）                                                                                                                                      | designer-command-adapter.ts:216-218                                                                 | —                        |
| H6  | e2e 可操作性                | 3 spec 覆盖命令派发链路                                                                                                                                                                  | 见 #12                                                                                              | pass                     |
| H7  | MA4.3 缺口回归              | resolveDesignerManifest/designerHostContract/DESIGNER_CAPABILITY_PUBLICATION **零直接测试**（MA4.3 P2 级登记缺口）                                                                       | designer-provider-and-manifest.test.tsx 无命中                                                      | **P2-2（Phase 4 补测）** |

## 发现清单

- [P2-1] 错误消息硬编码英文 9 处（用户可见 via env.notify）：`designer-command-adapter.ts:85` 'Tree command failed.'、`:128` 'Edge deletion is unavailable in tree mode.'、`:193` '${type} is unavailable in tree mode.'、`:214` 'deleteSelection is unavailable in tree mode.'、`:222` 'Unknown node: …'、`:232` 'Redo is not available.'、`:278` 'Undo is not available.'；`designer-command-adapter-graph.ts:61` 'Unable to add edge.'、`:146` 'Unable to reconnect edge.' → 状态: **已路由 DR**（round2-dr-adjudication.md DR-1，i18n 化 + 复用既有 t() key 族）
- [P2-2] H7 缺口：`resolveDesignerManifest`/`designerHostContract`/`DESIGNER_CAPABILITY_PUBLICATION` 零直接测试（MA4.3 登记）→ 状态: **fixed**（Phase 4 test-first 补测：`designer-manifest-contract.test.ts` 三条新用例：resolveDesignerManifest 三版本别名 + 未知版本 undefined；designerHostContract family/defaultVersion/resolveManifest/capabilityPublication 全等；DESIGNER_CAPABILITY_PUBLICATION 常量全等——包级 241 tests 全绿）
- 声明即契约双向核对（08 检测法）结论: FLOW_DESIGNER_MANIFEST_V1 41 方法 ↔ resolveDesignerManifest 三版本别名 ↔ designerHostContract ↔ action-provider invoke 全分支（41 case + default）四向一致；无 phantom 声明、无悬空消费。

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `designer-summary-renderers.spec.ts`（node-card 点击 → selectNode 命令 → 选中态） | 断言: marker data-selected | 结果: pass（基线绿）
- 场景: `taskflow-designer-ui.spec.ts`（Toolbar export/save 按钮 → 命令执行无错误） | 断言: console 零错误 + 按钮可达 | 结果: pass（基线绿）
- 场景: `flow-designer-edge-creation.spec.ts`（addEdge 命令链路真机） | 断言: `.react-flow__edge` 计数 +1 | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- Phase 4（plan `2026-08-08-0900-1`）：P2-2 补测 3 条（`designer-manifest-contract.test.ts`），包级 36 files / 241 tests 全绿 + typecheck 绿；P2-1 路由 DR-1（round2-dr-adjudication.md）；P0/P1 零发现（本面无需 test-first 修复）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
