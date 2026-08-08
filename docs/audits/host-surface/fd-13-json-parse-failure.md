# 审计卡：fd-13 JSON.parse 失败路径（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-13 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-page-body.tsx:193-255`（JSON 预览 try/catch + reportHostIssue）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + runtime-snapshot.md）

## 面身份

fd-13 JSON.parse 失败路径面：`designer-page-body.tsx` JSON 预览弹窗（`JSON.parse(core.exportDocument())`）失败 → `reportHostIssue` + 用户可见错误文案（19-3，0819-1 已修复，本面复核全路径终态）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                             | 证据                                     | 发现               |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| 1   | Schema 契约                 | JSON 预览为 toolbar 功能（非 schema 面）                                                                         | designer-page-body.tsx:188-207           | —                  |
| 2   | RendererComponentProps 合规 | 经 useDesignerContext/env/helpers；无 store 直访                                                                 | designer-page-body.tsx:174-187           | —                  |
| 3   | 值所有权三态                | jsonResult 派生（jsonOpen 门控 + useMemo）；错误经 jsonError 状态消费                                            | designer-page-body.tsx:193-207           | —                  |
| 4   | 表单参与                    | 无                                                                                                               | —                                        | —                  |
| 5   | DOM 与选择器契约            | JSON 弹窗（dialog role）e2e 断言在案                                                                             | flow-designer-ui.spec.ts:228-243         | —                  |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                           | —                                        | —                  |
| 7   | 事件与 action 契约          | JSON.parse 失败 → reportHostIssue（reason: designer-json-export-parse-failed + documentId/documentMode details） | designer-page-body.tsx:240-255           | —                  |
| 8   | a11y                        | 错误经通知系统（env.notify/reportHostIssue）                                                                     | —                                        | —                  |
| 9   | i18n                        | 错误文案走 t('flux.flowDesigner.flowJsonParseError')                                                             | designer-page-body.tsx:245               | —                  |
| 10  | 四态覆盖                    | 成功 → dialog 显示 nodes:/edges:；失败 → 错误通知（非静默空内容）                                                | designer-page-json-export.test.tsx:20-35 | —                  |
| 11  | 异步生命周期                | 无异步（同步 parse）                                                                                             | —                                        | —                  |
| 12  | 组合宿主场景                | flow-designer-ui（JSON 弹窗开合 happy path）——失败路径真实浏览器触发需损坏文档，单元级覆盖                       | flow-designer-ui.spec.ts:228-243         | 覆盖决策（见缺口） |
| 13  | 样式契约                    | 不适用                                                                                                           | —                                        | —                  |
| 14  | React 19 规范               | jsonResult useMemo 依赖完整；reportHostIssue useCallback                                                         | designer-page-body.tsx:193-238           | —                  |
| 15  | 性能边界                    | jsonResult 仅在 jsonOpen 时计算                                                                                  | designer-page-body.tsx:195-198           | —                  |
| 16  | 测试质量                    | designer-page-json-export.test.tsx（reportHostIssue + 用户可见错误文案断言）在案                                 | 同上                                     | —                  |
| 17  | 文档对照                    | runtime-snapshot.md/design.md JSON 导出契约 ↔ 实现一致                                                           | —                                        | —                  |
| 18  | 注册/边界/IO                | 无 IO 红线                                                                                                       | —                                        | —                  |
| H1  | host 契约                   | export capability（result: string）↔ core.exportDocument()                                                       | designer-manifest.ts:284-288             | —                  |
| H2  | 事务 undo                   | 不适用                                                                                                           | —                                        | —                  |
| H3  | 拖拽                        | 不适用                                                                                                           | —                                        | —                  |
| H4  | 键盘                        | Escape 关闭弹窗（e2e 在案）                                                                                      | flow-designer-ui.spec.ts:241             | —                  |
| H5  | 剪贴板                      | 不适用                                                                                                           | —                                        | —                  |
| H6  | e2e 可操作性                | happy path e2e 在案；失败路径单元级覆盖（真实浏览器注入损坏文档不可行）                                          | 见 #12/#16                               | 覆盖决策           |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                            | —                                        | —                  |

## 发现清单

- **19-3 终态 Decision（Phase 3 复核）: 收敛**——renderers 包唯一用户可见 JSON.parse 站点（`designer-page-body.tsx:199`）已 try/catch → reportHostIssue + `flux.flowDesigner.flowJsonParseError` 文案（`designer-page-body.tsx:240-255`），回归测试 `designer-page-json-export.test.tsx:20` 断言非静默；core 包 `tree-validation.ts:100`/`tree-session-impl.ts`/`core/history.ts` 等站点为内部往返序列化（canonicalize 自产自销 + JSON.stringify 产物），parse 失败不可达，非静默 null 风险。**无 P0/P1 登记。**

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-ui.spec.ts`（toolbar JSON 按钮 → dialog 显示 nodes:/edges: → Escape 关闭） | 断言: dialog role + 内容 | 结果: pass（基线绿）
- 覆盖决策: 失败路径维持单元级覆盖（`designer-page-json-export.test.tsx:20`），真实浏览器注入损坏文档不可行（exportDocument 自产 JSON 恒合法）；Phase 5 记录本决策，不新增 e2e。

## 修复记录

- 无 P0/P1（19-3 已在 0819-1 收敛）；无新增修复。Phase 5 新增 `flow-designer-undo-clipboard.spec.ts` 复用 JSON 导出对话框计数核对（间接覆盖本面 happy path）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
