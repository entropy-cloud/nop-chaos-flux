# 审计卡：scope-debug（flux-renderers-basic）

> 状态: closed
> 审查日期: 2026-08-02
> 审查 plan: `docs/plans/2026-08-02-2043-3-c1-2-basic-structure-extension-family-audit.md`
> 注册定义: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:330` | 渲染器: `packages/flux-renderers-basic/src/scope-debug.tsx:87` | design.md: **无**（P2-1 补写） | playground: `apps/playground/src/component-lab/renderers/scope-debug-lab-page.tsx` | e2e: `tests/e2e/exploratory/keyboard-focus-and-teardown.spec.ts:104`

## 组件身份

scope-debug / flux-renderers-basic / ScopeDebugSchema（`schemas.ts:280`）/ `{type:'scope-debug', title:'Scope Debug', defaultExpand:false}` / 表单参与: 无 / 调试 widget（可展开/折叠的 scope JSON 快照）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                       | 发现                     |
| --- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Schema 契约                 | pass | `basic-renderer-definitions.ts:336-341` fields title/defaultExpand/dataPaths ↔ `schemas.ts:280-285` 一致；defaultSchema `{type:'scope-debug', title:'Scope Debug', defaultExpand:false}` 存在（`:335`）                                                                                                                                                    | —                        |
| 2   | RendererComponentProps 合规 | pass | `scope-debug.tsx:87-127` 读 props.props/meta；hooks: useScopeSelector（标准 hooks）；UI 组件来自 `@nop-chaos/ui` Button（`scope-debug.tsx:112`）                                                                                                                                                                                                           | —                        |
| 3   | 值所有权三态                | n-a  | —                                                                                                                                                                                                                                                                                                                                                          | 只读调试工具，不写 scope |
| 4   | 表单参与                    | n-a  | —                                                                                                                                                                                                                                                                                                                                                          | 非表单字段               |
| 5   | DOM 与选择器契约            | pass | marker `nop-scope-debug` + data-testid/data-cid（scope-debug.tsx:104-108）；data-slot 结构 scope-debug-header/kind/title/toggle/body/json；`check:audit-missing-renderer-markers` 0 命中（本族）                                                                                                                                                           | —                        |
| 6   | 嵌套 schema 分类            | pass | 无内嵌 schema/action；字段全部 value；无 deepFields 残留                                                                                                                                                                                                                                                                                                   | —                        |
| 7   | 事件与 action 契约          | n-a  | —                                                                                                                                                                                                                                                                                                                                                          | 无事件                   |
| 8   | a11y                        | pass | 展开/折叠走 `@nop-chaos/ui` Button（键盘可操作）+ `aria-expanded`（scope-debug.tsx:118）；无焦点陷阱需求；JSON 输出为调试文本（非交互）                                                                                                                                                                                                                    | —                        |
| 9   | i18n                        | pass | `flux.scopeDebug.{debug,expand,collapse}` 三 key 在 en-US/zh-CN 双 locale 存在（`packages/flux-i18n/src/locales/en-US.ts:718-721`、`zh-CN.ts:717-720`）；title 走 schema prop 非硬编码（缺省 'Scope Debug' 为英文硬编码 fallback——与 i18n 基线一致的调试工具语义，记录 P3）                                                                                | P3-1                     |
| 10  | 四态覆盖                    | pass | 折叠态 → fallback 文案（scope-debug.test.tsx:37-48）；展开态 → JSON 快照（`:49-60`）；undefined/函数/symbol/bigint/Error/循环引用 sanitize（scope-debug.tsx:18-85 + `scope-debug.test.tsx:63-89`）；无加载/错误/禁用语义（调试工具，设计内）                                                                                                               | —                        |
| 11  | 异步生命周期                | n-a  | —                                                                                                                                                                                                                                                                                                                                                          | 无异步                   |
| 12  | 组合宿主场景                | pass | 真机 scope 变化重渲（`tests/e2e/exploratory/keyboard-focus-and-teardown.spec.ts:104-135` select 选择 → scope-debug JSON 更新）；fragment 嵌套 scope 探针（scope-debug-lab-page 场景 2）；按钮点击 → count 更新 → JSON 刷新（basic-reactions.test.tsx:17-54）                                                                                               | —                        |
| 13  | 样式契约                    | pass | widget 自样式（`nop-scope-debug` 调试壳 + Button/预格式化 JSON）；无 BEM；`cn()` 合并 meta.className（scope-debug.tsx:105）；`check:audit-styling-suspects` 0 命中（本族）                                                                                                                                                                                 | —                        |
| 14  | React 19 规范               | pass | useState 展开态 + useScopeSelector 订阅；无 effect 镜像；无 memo 滥用                                                                                                                                                                                                                                                                                      | —                        |
| 15  | 性能边界                    | pass | 订阅仅在展开时启用（`enabled: shouldSubscribe`，scope-debug.tsx:96-101）；dataPaths 收窄订阅路径（useScopeSelector paths → createScopeSubscribe）；展开时每 scope 变更重序列化（调试工具，可接受）                                                                                                                                                         | —                        |
| 16  | 测试质量                    | pass | `scope-debug.test.tsx` 2 用例（折叠→展开→更新链路 + 特殊值编码断言正确行为）；basic-reactions.test.tsx 中 scope-debug DOM 契约断言（data-slot/文本）；真机 exploratory spec 覆盖                                                                                                                                                                           | —                        |
| 17  | 文档对照                    | fail | **scope-debug 无 design.md**（`docs/components/scope-debug/` 不存在）；`docs/components/index.md` 组件目录未列 `scope-debug/`（声称"每个目录都应包含 design.md 和 example.json"）——唯一文档对照缺口；组件行为完整（title/defaultExpand/dataPaths/sanitize/折叠语义均有实现与测试）→ 裁决：**补写 design.md + example.json + index.md 目录条目**（非归 CR） | P2-1                     |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 basic-renderer-definitions.ts:330；导出 index.tsx:18；playground scope-debug-lab-page.tsx + registry:83；无浏览器 IO；JSON 文本经 sanitize 后进入 `<pre>`（React 文本节点，无 XSS 面）                                                                                                                                                                | —                        |

## 发现清单

- [P2-1] 无 design.md / index.md 未列目录（维度 17 文档缺口，plan 指定裁决项）→ 状态: fixed（裁决：组件行为完整，补写 `docs/components/scope-debug/design.md` + `example.json` + index.md 条目，见修复记录）
- [P3-1] 缺省 title 'Scope Debug' 为英文硬编码 fallback（i18n 基线内调试工具语义）→ 仅记录，不改。

## 组合宿主场景（真实浏览器验证）

- 场景: 真机 scope 变化后 scope-debug JSON 重渲 + 行 scope 内探针 | 断言: programmatic DOM（`[data-slot="scope-debug-json"]` 文本）| 结果: **pass**（`tests/e2e/exploratory/keyboard-focus-and-teardown.spec.ts` + Phase 3 宿主场景回归）

## 修复记录

- 文档裁决: 组件行为完整（title/defaultExpand/dataPaths/sanitize/折叠订阅均有实现与 focused 测试），无未定行为 → 按 plan 裁定补写文档，不归 CR
- 交付: `docs/components/scope-debug/design.md`（§1-13，对齐既有组件文档模板）+ `docs/components/scope-debug/example.json`；`docs/components/index.md` 组件目录补 `scope-debug/` 条目
- 验证: 无代码变更（纯文档），Phase 4 workspace 门禁全绿

## Closure

- 独立 closure audit: 见 plan `2026-08-02-2043-3` Closure Audit Evidence（由独立子 agent fresh session 执行，执行 session 不自审）。
