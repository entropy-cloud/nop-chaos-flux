# 审计卡：ai-token-usage（flux-renderers-ai）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-3-c8-2-ai-tool-content-family-audit.md`
> 注册定义: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:256` | 渲染器: `packages/flux-renderers-ai/src/renderers/ai-token-usage.tsx:186`（View :57）| design.md: `docs/components/flux-renderers-ai/design.md:86,:591,:544` | renderers.md: `docs/components/flux-renderers-ai/renderers.md:531-552,:784` | playground: `apps/playground/src/pages/ai-p4-widgets-demo.tsx` + `apps/playground/src/ai/ai-p4-example.json` | e2e: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（本 plan Phase 3 新增）

> 卡状态说明：本卡 P1×1（onClick 空 payload + 缺 ctx）+ P2×3（aria-hidden 读屏不可达 + §13 Events 总览缺行 + 测试加固）均在本 plan 内修复，修复后 P0/P1 清零 → `closed`。

## 组件身份

ai-token-usage / flux-renderers-ai / AiTokenUsageSchema（`schemas.ts:370-385`）/ defaultSchema `{type:'ai-token-usage'}` / 表单参与: 否 / Widget 渲染器（纯展示，根 marker `nop-ai-token-usage`）：渲染 token 用量（prompt/completion/total + 可选成本）+ 上下文占比 SVG 环，数据读 `message.metadata.usage`（connector 填充）或显式 usage prop。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                            | 发现       |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Schema 契约                 | pass | AiTokenUsageSchema（schemas.ts:370-385：message/usage SchemaValue + contextLimit number + showCost boolean + onClick）↔ 注册 fields（definitions.ts:262-268，defaultSchema :260）↔ 渲染器消费（ai-token-usage.tsx:187-198）；showCost 默认 true（:193）；contextLimit 非正数忽略（:85）                         | —          |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（:187-198）；无 store 直访                                                                                                                                                                                                                                                         | —          |
| 3   | 值所有权三态                | pass | 无 value 字段（纯展示，design.md:544 数据域内部/connector 填充，不投影）→ 三态 n/a；usage 解析优先级 explicit > metadata（:10-21 resolveUsage，测试实证）                                                                                                                                                       | —          |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                                                                                      | —          |
| 5   | DOM 与选择器契约            | pass | 根 `nop-ai-token-usage` + data-slot="ai-token-usage" + data-empty presence（placeholder :72-80）+ data-cid/testid；子树 slots ai-token-usage-ring/:total/:prompt/:completion/:cost/:text（:89-107,:151-182）；与 renderers.md:551-552/:784 对齐（data-mode n/a）；`check:audit-missing-renderer-markers` 0 命中 | —          |
| 6   | 嵌套 schema 分类            | pass | 无内嵌 schema/action 字段 → 无 deepFields 残留                                                                                                                                                                                                                                                                  | —          |
| 7   | 事件与 action 契约          | fail | **onClick 派发空 payload（:197 `() => void props.events.onClick?.()`）——家族约定（全部事件带 type + payload）未落地；且单参缺 ctx（CX-10/bug-83 家族）→ action args 无法读取任何 payload 键**                                                                                                                   | P1-1       |
| 8   | a11y                        | fail | **无 onClick 时根 div `aria-hidden`（:137）→ token 用量数据读屏完全不可达；`flux.ai.tokenUsage` i18n 键存在（en-US.ts:98 / zh-CN.ts:99）但代码从未使用**                                                                                                                                                        | P2-1       |
| 9   | i18n                        | pass | 键 flux.ai.tokenNoUsage 双语存在且值一致（en 'Usage not reported' / zh '用量未上报'，renderers.md:551 一致）；`check:i18n-keys` 0 命中                                                                                                                                                                          | —          |
| 10  | 四态覆盖                    | pass | 空态（token-no-usage → data-empty placeholder :72-80，永不崩溃）；加载/错误/禁用 n/a（纯展示）                                                                                                                                                                                                                  | —          |
| 11  | 异步生命周期                | n-a  | 无异步（usage 为静态 props 快照）                                                                                                                                                                                                                                                                               | —          |
| 12  | 组合宿主场景                | pass | Phase 3 补 host-token-usage（真实浏览器：metadata.usage 渲染 total/prompt/completion/ring + 空态 data-empty + onClick payload 经 ctx 解析）                                                                                                                                                                     | 见 Phase 3 |
| 13  | 样式契约                    | pass | Widget 自样式（inline-flex gap-2 文本 + SVG 环）；无 BEM；cn() 合并                                                                                                                                                                                                                                             | —          |
| 14  | React 19 规范               | pass | 无 useState/useEffect/useMemo 冗余；纯派生渲染                                                                                                                                                                                                                                                                  | —          |
| 15  | 性能边界                    | pass | 常量渲染；SVG 环 O(1)                                                                                                                                                                                                                                                                                           | —          |
| 16  | 测试质量                    | fail | 11 用例强（优先级/ring 几何 clamp/cost 显示/空态/DOM slots）；**`fires onClick event` 仅断言 `toHaveBeenCalled()` 无 payload/ctx 形状（假绿风险——payload 丢失不可检）**                                                                                                                                         | P2-2       |
| 17  | 文档对照                    | fail | **renderers.md §13 Events 总览表（:609-627）缺 ai-token-usage 行**（schema onClick 在 :545 声明但总览漏列）；§11b DOM 列表（:552）缺 `ai-token-usage-text`（§15.2 :784 有）                                                                                                                                     | P2-3       |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（definitions.ts:256）+ surface 导出（src/index.ts:51 + AiTokenUsageView :60）+ registerAiRenderers ✓；playground ai-p4-widgets-demo ✓；无浏览器 IO 直调                                                                                                                                                  | —          |

## 发现清单

- [P1-1] onClick 空 payload 派发 + 缺 evaluationBindings ctx（ai-token-usage.tsx:197）——家族事件契约（type + payload）与 CX-10 ctx 约定双重漏接 → 状态: fixed（Phase 2 test-first：`ai-token-usage.tsx:14-21` dispatchCtx + 渲染器 payload `{ type:'ai:token-usage-click', usage }`（:213-220），测试断言先红后绿）
- [P2-1] aria-hidden 根（:137）致用量数据读屏不可达，`flux.ai.tokenUsage` 键闲置 → 状态: fixed（Phase 2：aria-label=`flux.ai.tokenUsage` + role=group 替换（:147-153），测试断言非 aria-hidden）
- [P2-2] onClick 测试假绿（toHaveBeenCalled() 无形状断言）→ 状态: fixed（Phase 2：`ai-token-usage.test.tsx` 断言 payload 全等 + ctx 三键）
- [P2-3] renderers.md §13 Events 总览缺 ai-token-usage 行 + §11b DOM 列表（:552）缺 ai-token-usage-text（§15.2 :784 有）→ 状态: fixed（Phase 2 文档同步：总览新增 `{ usage }` 行 + DOM 列表补 `-text`）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-token-usage（真实浏览器：metadata.usage → total/prompt/completion/ring 渲染、无 usage → data-empty、onClick payload `${total}` 经 ctx 解析）| 断言: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（programmatic DOM 断言，禁截图） | 结果: pass（Phase 3）

## 修复记录

- Phase 2：P1-1 `ai-token-usage.tsx:14-21` dispatchCtx + onClick payload；P2-1 aria-label + role=group；P2-2 测试断言收紧；P2-3 renderers.md 同步。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test` 绿 + c8-2-host-surfaces.spec.ts 宿主场景绿。

## Closure

- 18 维核对完成（dim 7/8/16/17 发现已修复回填）；P0×0/P1×1 fixed/P2×3 fixed；卡状态 `closed`（Phase 4 全量回归绿后流转，checklist §3：P0/P1 清零）
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——见 plan `2026-08-05-1314-3` Closure Audit Evidence）
