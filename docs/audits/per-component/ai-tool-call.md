# 审计卡：ai-tool-call（flux-renderers-ai）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-3-c8-2-ai-tool-content-family-audit.md`
> 注册定义: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:193` | 渲染器: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx:262`（View :38）| design.md: `docs/components/flux-renderers-ai/design.md:82,:589` | renderers.md: `docs/components/flux-renderers-ai/renderers.md:426-458,:734-739` | playground: `apps/playground/src/pages/ai-tools-demo.tsx` + `apps/playground/src/pages/ai-hitl-demo.tsx` | e2e: `tests/e2e/ai-tools.spec.ts` + `tests/e2e/ai-hitl.spec.ts` + `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（本 plan Phase 3 新增）

> 卡状态说明：本卡 18 维全 pass——onApproval ctx 已在 C8.1 修复（CX-10 家族），本轮仅 HITL 死点击 + dialog 宿主场景专项复验，P0/P1 零发现 → `closed`。

## 组件身份

ai-tool-call / flux-renderers-ai / AiToolCallSchema（`schemas.ts:259-274`）/ defaultSchema `{type:'ai-tool-call'}` / 表单参与: 否 / Widget 渲染器（自样式状态卡，根 marker `nop-ai-tool-call`）：单条 LLM 工具调用卡片——状态图标 + 参数 JSON 展开/折叠（jsonrepair 修复截断流式 JSON）+ P3 HITL approve/reject + 焦点陷阱。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                    | 发现       |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Schema 契约                 | pass | AiToolCallSchema（schemas.ts:259-274：toolCall/state SchemaValue + defaultOpen boolean + onApproval ActionSchema）↔ 注册 fields（definitions.ts:199-204，defaultSchema :197）↔ 渲染器消费（ai-tool-call.tsx:263-282）；toolCall 缺失降级渲染空根（:265-273）；state 缺省 status 默认 running（:50）                                                                                                     | —          |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events/node.scope（:263-304）；无 store 直访；标准 hooks 无（纯受控展示组件）                                                                                                                                                                                                                                                                                                     | —          |
| 3   | 值所有权三态                | pass | toolCall/state 完全受控（props 驱动，引擎/宿主持有）；open = `state?.open ?? internalOpen` 受控优先本地兜底（:52-53）；approval 状态机引擎持有、宿主写回（renderers.md:453-456）；工具调用状态 `state.status` 受控流转（running/success/failed/cancelled）                                                                                                                                              | —          |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                                                                                                                                                                              | —          |
| 5   | DOM 与选择器契约            | pass | 根 `nop-ai-tool-call` + data-slot="ai-tool-call" + data-tool-status（:132）+ data-open/data-requires-approval/data-approval presence-only（:133-135）+ data-cid/testid（:136-137）；子树 slots ai-tool-call-toggle/:args/:approval/:approve/:reject（:147,:159,:201,:208,:224）+ data-approval-decision（:252）；与 renderers.md:734-739/:455-457 全对齐；`check:audit-missing-renderer-markers` 0 命中 | —          |
| 6   | 嵌套 schema 分类            | pass | 无内嵌 schema/action 字段 → 无 deepFields 残留                                                                                                                                                                                                                                                                                                                                                          | —          |
| 7   | 事件与 action 契约          | pass | onApproval payload `{ type:'ai:tool-call-approval', action, toolCall, toolCallId }`（:289-294）与 renderers.md:432/:624 `{ action, toolCall, toolCallId }` 一致；**第二参 `{ event, evaluationBindings, scope }` ctx 已由 C8.1 修复（:295-299，CX-10）**；onToggle 为 View-only 非 schema 事件（renderers.md:436 明示）                                                                                 | —          |
| 8   | a11y                        | pass | 根 role="group" + aria-label 含工具名 + 状态（:138-139，p2-a11y-i18n.test.tsx:130-158 4 状态断言）；pending 焦点陷阱：进入移焦点到 approve、Tab/Shift+Tab 循环、Esc 还原（:60-80,:101-126，ai-tool-call-hitl.test.tsx:130-204）；AI-11 resolve/卸载还原焦点（:73-93,:212-248）                                                                                                                          | —          |
| 9   | i18n                        | pass | 键 flux.ai.toolCall/toolStatus{×4}/expand/collapse/approve/reject/approved/rejected/approvalActions/approvalNoHandler 双语存在（zh-CN.ts:78-108 / en-US.ts:78-108）                                                                                                                                                                                                                                     | —          |
| 10  | 四态覆盖                    | pass | 四状态 data-tool-status 全覆盖（tool-call-and-content.test.tsx:28-35）；空 toolCall 降级空根（:265-273）；HITL pending/decided 双态（hitl 测试）；无 disabled schema 字段（n/a）                                                                                                                                                                                                                        | —          |
| 11  | 异步生命周期                | pass | 组件无自持异步（状态全部受控流入）；HITL 等待态：无 handler 时按钮 disabled 防死点击（:198-216，FP hitl-no-handler）；highlightJson jsonrepair 失败降级原始文本 escape（:386-393，FP tool-args-truncated）；XSS 门：所有 token 经 escapeHtml（:492-498，:386-404 逐 token 转义，tool-call-and-content.test.tsx:73-134 实证）                                                                            | —          |
| 12  | 组合宿主场景                | pass | Phase 3 补 host-tool-dialog（**bug 73 模式**：ai-tool-call 在 openDialog 内状态流转/展开参数）+ host-hitl-dead（**HITL 死点击专项**：wired 快速双击仅 1 次派发、no-handler 卡按钮禁用）                                                                                                                                                                                                                 | 见 Phase 3 |
| 13  | 样式契约                    | pass | Widget 自样式（状态色 border/icon Tailwind 类 :358-370）；无 BEM；cn() 合并；`check:audit-styling-suspects` 本文件 0 命中                                                                                                                                                                                                                                                                               | —          |
| 14  | React 19 规范               | pass | 无 useMemo/useCallback 冗余；useEffect 仅焦点陷阱同步（approval 变化 + 卸载清理 :60-93，属于外部同步而非 state 镜像）；latest-ref 无必要（受控 props）                                                                                                                                                                                                                                                  | —          |
| 15  | 性能边界                    | pass | 单卡片渲染；JSON 高亮 O(n) 单 token 扫描（:418-482）                                                                                                                                                                                                                                                                                                                                                    | —          |
| 16  | 测试质量                    | pass | 强覆盖：hitl 13 用例（渲染/派发/no-handler/焦点陷阱/焦点还原）、tool-call-and-content 21 用例（4 状态 data-tool-status + highlightJson 截断/转义/特殊字符）、aria-label 4 状态、data-cid 契约；无 not-throw-only 假绿                                                                                                                                                                                   | —          |
| 17  | 文档对照                    | pass | renderers.md:426-458（schema/状态/JSON 修复/HITL）与实现一致；Events 总览 :624 一致；implementation.md:58/:61 a11y 承诺落地                                                                                                                                                                                                                                                                             | —          |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（definitions.ts:193）+ surface 导出（src/index.ts:47 + AiToolCallView :58）+ registerAiRenderers ✓；playground ai-tools-demo/ai-hitl-demo ✓；无浏览器 IO 直调；dangerouslySetInnerHTML 仅 highlightJson 且逐 token escapeHtml（XSS 门）                                                                                                                                                          | —          |

## 发现清单

- 无 P0/P1/P2 发现。P3 观察（仅记录）：`data-approval` 在无 approval 时输出 `data-approval=undefined`（:135 `approval ?? undefined`——React 不渲染 undefined 属性，行为正确）。

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-tool-dialog（**bug 73 模式**：ai-tool-call 在 openDialog 内 running→success 状态流转 + 参数展开/折叠 DOM 契约）、host-hitl-dead（**HITL 死点击专项**：等待态快速双击 approve 仅 1 次派发 `approve|call_id` + 宿主翻转 decided 徽章替换按钮；no-handler 卡按钮禁用）| 断言: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（programmatic DOM 断言，禁截图） | 结果: pass（Phase 3）

## 修复记录

- 本卡无代码修复（C8.1 已修复 onApproval ctx，`docs/plans/2026-08-05-1314-2` Phase 2）；Phase 3 新增 lab 页 + 宿主场景。
- 验证: c8-2-host-surfaces.spec.ts 相关场景绿 + ai 包 typecheck/build/lint/test 绿。

## Closure

- 18 维核对全 pass（dim 7 在 C8.1 修复回填后 pass）；P0×0/P1×0/P2×0；卡状态 `closed`
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——见 plan `2026-08-05-1314-3` Closure Audit Evidence）
