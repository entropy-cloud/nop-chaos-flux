# 审计卡：recurse（flux-renderers-basic）

> 状态: closed
> 审查日期: 2026-08-02
> 审查 plan: `docs/plans/2026-08-02-2043-3-c1-2-basic-structure-extension-family-audit.md`
> 注册定义: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:113` | 渲染器: `packages/flux-renderers-basic/src/recurse.tsx:65`（结构引擎 `structural-loop.tsx:126`） | design.md: `docs/components/recurse/design.md` | playground: `apps/playground/src/component-lab/renderers/recurse-lab-page.tsx` | e2e: `tests/e2e/component-lab/layout-content.spec.ts:300`

## 组件身份

recurse / flux-renderers-basic / RecurseSchema（`schemas.ts:199`）/ 无 defaultSchema（见 P3-2）/ 表单参与: 无 / 词法递归节点（无 UI 壳层，命中最近 enclosing loop.body）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                             | 发现               |
| --- | --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | Schema 契约                 | pass | `basic-renderer-definitions.ts:119-127` fields（items/itemName/indexName/keyName/itemData(lazyEval)/keyBy/maxDepth）↔ `schemas.ts:199-208` 一致；itemData 走 structuralFields（`schema-compiler-prop-coverage-data-structures.test.ts:41-50`）；**无 defaultSchema**（注册项 `:113-128`，字段全 optional，不影响编译/渲染；仅缺设计器插入默认形态）                              | P3-2               |
| 2   | RendererComponentProps 合规 | pass | `recurse.tsx:65-130` 读 props.props/templateNode.structuralFields/helpers.id；hooks: useStructuralLoopContext（标准 hooks）；无 store 直接访问                                                                                                                                                                                                                                   | —                  |
| 3   | 值所有权三态（行 scope）    | pass | 词法递归: 命中最近 enclosing loop 的 `loopContext.renderBody` 复用同一 body 模板（recurse.tsx:125）；bindings 继承 loop（itemName/indexName/keyName 缺省继承，recurse.tsx:67-76）；itemData 覆盖走编译结构字段（recurse.tsx:82-96）；每层追加 repeated frame（structural-loop.tsx:151-154）；继承绑定断言 `basic-structural.test.tsx:323-375`（node/nodeIndex/nodeKey 逐层正确） | —                  |
| 4   | 表单参与                    | n-a  | —                                                                                                                                                                                                                                                                                                                                                                                | 非表单字段         |
| 5   | DOM 与选择器契约            | pass | 无自有 DOM 壳层（design.md §1 无 UI 壳层）；子项（loop body 模板内节点）各自携带 marker                                                                                                                                                                                                                                                                                          | —                  |
| 6   | 嵌套 schema 分类            | pass | items/value；itemData prop lazyEval；无 body region（词法递归经 loopContext.renderBody，design.md §6）；无 deepFields 残留；行 scope 不污染嵌套 action（与 loop 同机制）                                                                                                                                                                                                         | —                  |
| 7   | 事件与 action 契约          | n-a  | —                                                                                                                                                                                                                                                                                                                                                                                | recurse 自身无事件 |
| 8   | a11y                        | n-a  | —                                                                                                                                                                                                                                                                                                                                                                                | 无交互             |
| 9   | i18n                        | n-a  | —                                                                                                                                                                                                                                                                                                                                                                                | 无文案             |
| 10  | 四态覆盖                    | pass | 空 items → 不渲染（structural-loop.tsx:134-136）；maxDepth 终止（structural-loop.tsx:130-132）；无 loop 上下文 → null（recurse.tsx:78-80，design.md §2/§6 契约：recurse 只能出现在 loop.body 词法子树内）；循环结构安全网（maxDepth + 空 items 终止，宿主场景 Phase 3 验证）                                                                                                     | P3-1               |
| 11  | 异步生命周期                | n-a  | —                                                                                                                                                                                                                                                                                                                                                                                | 无异步             |
| 12  | 组合宿主场景                | pass | loop body 内 fragment+when 递归（`basic-structural.test.tsx:280-321`）；maxDepth 深层截断（`basic-structural.test.tsx:377-416`）；e2e `layout-content.spec.ts:300-323`（嵌套树真机断言）；Phase 3 宿主场景含深层/循环结构渲染（c1-2-host-surfaces.spec.ts）                                                                                                                      | —                  |
| 13  | 样式契约                    | pass | 无 class/style 输出                                                                                                                                                                                                                                                                                                                                                              | —                  |
| 14  | React 19 规范               | pass | RecurseProvider useMemo 仅 context value 稳定性（recurse.tsx:38-63）；无 effect 镜像；无冗余 callback                                                                                                                                                                                                                                                                            | —                  |
| 15  | 性能边界                    | pass | 模板复用（不重编译）；每层按 instanceKey 稳定 key；maxDepth 防无限递归；无监听器泄漏                                                                                                                                                                                                                                                                                             | —                  |
| 16  | 测试质量                    | pass | 继承绑定/覆盖/maxDepth/空终止均有断言正确行为的单测；`recurse-lab-page.test.tsx`（playground 页级测试）；e2e recurse 场景真机断言                                                                                                                                                                                                                                                | —                  |
| 17  | 文档对照                    | pass | design.md §1-13 与实现一致（词法递归/绑定继承/maxDepth 定位/与 tree 分层）；**flux-guide/07-structural-nodes.md §Recurse 示例带 `body` 字段 → 与实现不符（recurse 无 body region，body 由最近 loop 提供）** → P2-1 修复                                                                                                                                                          | P2-1               |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 basic-renderer-definitions.ts:113；导出 index.tsx:17；playground recurse-lab-page.tsx + registry:78；无浏览器 IO；不反向依赖                                                                                                                                                                                                                                                | —                  |

## 发现清单

- [P2-1] flux-guide/07-structural-nodes.md §Recurse 示例错误声明 recurse 自带 `body`（实现无 body region，body 模板来自最近 enclosing loop）→ 状态: fixed（示例改写为 loop+recurse 正确形态，见修复记录）
- [P3-1] 无 loop 上下文时静默渲染 null（recurse.tsx:78-80）——design.md §2/§6 明确契约（recurse 只能出现在 loop.body 内），为作者误用场景；仅记录，不加运行时警告（与全族静默语义一致）
- [P3-2] 注册项无 `defaultSchema`（`basic-renderer-definitions.ts:113`，与 reaction/dynamic-renderer 同类，见共性缺陷裁决）→ 由 Phase 2 共性修复补齐（fixed，见 reaction 卡修复记录与共性裁决）

## 组合宿主场景（真实浏览器验证）

- 场景: recurse 深层/循环结构渲染（含 maxDepth 终止、深层树真机渲染无死循环/栈溢出）| 断言: programmatic DOM 文本/深度计数断言 | 结果: **pass**（`tests/e2e/component-lab/c1-2-host-surfaces.spec.ts` recurse 用例 + `layout-content.spec.ts` 回归）

## 修复记录

- P2-1: `flux-guide/07-structural-nodes.md` §Recurse 示例改为 loop 包裹 + recurse（去掉错误的 body 声明，改为 loop body 模板 + fragment when 条件 + recurse items），与 design.md §6 词法递归语义一致。
- 共性（defaultSchema 三组件补齐）: `basic-renderer-definitions.ts` recurse/reaction/dynamic-renderer 注册项补 defaultSchema（test-first：renderer-contract-smoke.test.ts 先红后绿；见 reaction 卡修复记录与 plan 共性裁决）。

## Closure

- 独立 closure audit: 见 plan `2026-08-02-2043-3` Closure Audit Evidence（由独立子 agent fresh session 执行，执行 session 不自审）。
