# 审计卡：mapping（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-04
> 审查 plan: `docs/plans/2026-08-04-1757-1-c6-3-content-value-mapping-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:328` | 渲染器: `packages/flux-renderers-content/src/mapping.tsx:49` | design.md: `docs/components/mapping/design.md` | playground: `apps/playground/src/pages/w3c-value-mapping-demo.tsx:39`（mapping 6 场景）+ `apps/playground/src/component-lab/renderers/mapping-lab-page.tsx`（Phase 3 补）| e2e: `tests/e2e/w3c-value-mapping.spec.ts`（mapping 6 用例）+ `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

mapping / flux-renderers-content / MappingSchema（`schemas.ts:250-266`）/ defaultSchema `{type:'mapping'}` / 表单参与: 否 / widget 值映射展示组件（display-only：value 经 props/scope 求值，无写回路径）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                        | 发现 |
| --- | --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | pass | MappingSchema（schemas.ts:250-266：value/map/defaultLabel/placeholder/source/item）↔ 注册 fields（content-renderer-definitions.ts:360-367：value/map/defaultLabel/placeholder/source prop + item region）↔ 渲染器消费（mapping.tsx:52-58/:64/:70）三方一致；propContracts（:334-359：value/map/defaultLabel/placeholder 契约齐——source 无 propContract 仅编辑器侧说明字段，非契约缺口）；defaultSchema 一致 | —    |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/regions（mapping.tsx:51-71）；item region 经 `props.regions.item`（:70）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                                                            | —    |
| 3   | 值所有权三态                | n-a  | **display-only 有意设计**：value 只经 props 求值渲染（:52/:73-74），无 valueOwnership/valueStatePath 声明、无写回路径（grep 零写面）；design.md §7「mapping 无复杂 owner 状态」——「缺 valueOwnership」不得裁为契约漂移（plan 裁决一致）                                                                                                                                                                     | —    |
| 4   | 表单参与                    | n-a  | 非表单字段（无 name/required/validation）                                                                                                                                                                                                                                                                                                                                                                   | —    |
| 5   | DOM 与选择器契约            | pass | 根 `nop-mapping` marker（mapping.tsx:100）+ data-slot="mapping-root"（:97）+ data-state empty/hit/miss（:98）+ data-source loaded（:99）+ testid/cid 透传（:95-96）；命中内容包 data-slot="mapping-item"（:103）；`check:audit-missing-renderer-markers` 0 命中；定义经 definition 渲染契约测试（content-renderer-definitions.test.tsx:260-272）                                                            | —    |
| 6   | 嵌套 schema 分类            | pass | 08-02 机制核对：value/map/defaultLabel/placeholder/source 全 prop（:361-365）+ item region（:366）——与 08-02 声明一致；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                                               | —    |
| 7   | 事件与 action 契约          | n-a  | 无事件字段（design.md §8「首版不要求专门事件或句柄」）；item region 内嵌组件 action 由各自渲染器负责（Phase 3 宿主实证）                                                                                                                                                                                                                                                                                    | —    |
| 8   | a11y                        | pass | 纯展示 span；内容为文本/region 渲染（作者负责语义）；无交互控件                                                                                                                                                                                                                                                                                                                                             | —    |
| 9   | i18n                        | n-a  | 无内建文案（placeholder/defaultLabel 作者提供）                                                                                                                                                                                                                                                                                                                                                             | —    |
| 10  | 四态覆盖                    | pass | 空态（empty：null/undefined/'' → placeholder ?? defaultLabel，:80-82）；命中（hit：lookupMap 文本或 item region，:83-87）；未命中（miss：defaultLabel ?? placeholder，:88-91）；禁用/加载/错误态 n/a（无交互/异步面）                                                                                                                                                                                       | —    |
| 11  | 异步生命周期                | n-a  | 无异步面（source 为同步表达式求值对象，非加载器契约——设计.md §9.3「不感知 loader 的存在」）                                                                                                                                                                                                                                                                                                                 | —    |
| 12  | 组合宿主场景                | pass | 单测：mapping.test.tsx 12 用例 + mapping-source.test.tsx 5 用例（source 表达式源）；真实浏览器：w3c demo 6 场景（marker/hit/miss/empty/item region/scope 表达式）+ Phase 3 宿主新增（CRUD 行 scope 求值 + item region 内嵌组件——bug 73 模式专项）                                                                                                                                                           | —    |
| 13  | 样式契约                    | pass | widget 自样式（无布局类）；cn() 合并 meta.className（:100）；无 BEM；无主题依赖                                                                                                                                                                                                                                                                                                                             | —    |
| 14  | React 19 规范               | pass | `'use no memo'` 显式关闭 Compiler 自动 memo（:50，与 diff-view 同族模式）+ 手动 React.useMemo（:65-68）；无 effect 镜像                                                                                                                                                                                                                                                                                     | —    |
| 15  | 性能边界                    | pass | effectiveMap 经 useMemo 缓存（:65-68，deps [staticMap, resolvedSource]）；lookupMap O(1) 哈希（:24-33）；大 map 表渲染路径线性；无监听器/订阅                                                                                                                                                                                                                                                               | —    |
| 16  | 测试质量                    | pass | 18 用例（13+5）断言正确行为（hit 文本/数值布尔强转/defaultLabel 优先/placeholder 回退/空值三态/item region/**对象命中 JSON.stringify 分支（P2-3 fixed）**/表达式 scope/MP2 共享 map 逐行解析/no-wildcard/source 合并优先级）；DOM 契约断言（data-slot/data-state/data-source/marker class）；**盲区**：item region 内嵌 action 派发零单测 → Phase 3 宿主补                                                  | —    |
| 17  | 文档对照                    | pass | design.md §4 字段 ↔ MappingSchema 一致；§5 分类（source: value）↔ 注册 fields 一致；§9.2 无 wildcard fallback ↔ lookupMap 字面匹配（:24-33）+ 测试锁定（mapping.test.tsx:267-300）一致；§9.3 loader wins 优先级 ↔ mergeMaps（:14-22）+ 测试锁定一致；§10 nop-mapping marker ↔ :100 一致                                                                                                                     | —    |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（:328）+ src/index.ts:48 导出 ✓；无浏览器 IO 直调；纯文本渲染（toTextNode 强转字符串/JSON.stringify，:35-47——无 HTML 注入面）；**component-lab lab 页缺失** → P2-1（Phase 3 补）                                                                                                                                                                                                                     | P2-1 |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-1] component-lab lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3 新增 `mapping-lab-page.tsx`）
- [P2-2] status/mapping 空态语义不对称（mapping 空值 → data-state="empty"，status 空值 → data-state="miss"）——各自冻结测试锁定，非契约漂移，归卡内记录 → 状态: keep（P3 级观察，记录于 status 卡 P3-1）
- [P2-3] 对象命中值 JSON.stringify 分支零断言（toTextNode :42-46）→ 状态: fixed（mapping.test.tsx「renders an object hit value as JSON string」）
- [P3-1] `'use no memo'` + 手动 useMemo 并存模式 → keep（diff-view 同族模式，有意为之）

## 组合宿主场景（真实浏览器验证）

- 场景: mapping 在 CRUD/重复行 scope 内求值 + item region 内嵌组件（host-mapping-row/host-mapping-region，Phase 3）| 断言: c6-3-host-surfaces.spec.ts——三行独立映射值（Alpha→Active hit、Beta→Idle hit、Gamma→Unknown miss，行污染会重复第一行结果）；Pick 按钮 probe `Beta|idle`/`Gamma|pending` 逐行隔离（bug 73 复验）；item region 模板命中渲染 + 内嵌按钮 `region-fired`、miss 不渲染模板 | 结果: **pass**（4/4 宿主全绿）

## 修复记录

- P0/P1: 无。P2-3 低成本补断言（Phase 2，mapping.test.tsx +1）；P2-1 lab 页 Phase 3 补齐（mapping-lab-page.tsx）。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（259 tests 含新增断言）；w3c-value-mapping 6/6 + c6-3 宿主 4/4 回归。

## Closure

- 18 维表结论与最终代码一致；P0 ×0 / P1 ×0；P2 ×2 卡内登记（lab 页 Phase 3 fixed、JSON.stringify 断言 Phase 2 fixed）；卡状态 `closed`
- 独立 closure audit: 待 mission-driver CLOSURE_VERIFY fresh session（证据位置: plan `2026-08-04-1757-1` Closure 节）
