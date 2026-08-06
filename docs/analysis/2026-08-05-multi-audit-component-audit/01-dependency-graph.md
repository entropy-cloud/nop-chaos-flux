# 维度 01: 依赖图与包边界（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c815954ffersDTjv3XL3W1e3`）

## 第 1 轮（初审）

### [维度01-01] 硬门禁 FAIL：5 处 workspace 导入未声明（check:workspace-manifest-deps）

- **文件**: `packages/flux-renderers-form/package.json`（devDeps 缺 2 项）；`packages/flux-renderers-scheduling/package.json`（devDeps 缺 1 项，3 个测试文件）；引入文件 `packages/flux-renderers-form/src/__tests__/dialog-form-submit-refresh-crud.test.tsx:7`、`packages/flux-renderers-form/src/__tests__/form-submit-on-submit-success-refresh-nearest.test.tsx:4`、`packages/flux-renderers-scheduling/src/{calendar,gantt,kanban}/*.create-schema-renderer.test.tsx:5`
- **严重程度**: P0（硬门禁违约 / CI 红线）
- **证据片段**:
  ```ts
  import { crudRendererDefinition } from '@nop-chaos/flux-renderers-data'; // form manifest 未声明
  import { createNopDebugger } from '@nop-chaos/nop-debugger'; // form manifest 未声明
  import { createFormulaCompiler } from '@nop-chaos/flux-formula'; // scheduling 3 个测试未声明
  ```
- **现状**: 5 个测试文件的跨包 import 均未在宿主包 manifest 声明，`pnpm check:workspace-manifest-deps` ERROR。归因核查：3 个 scheduling 测试创建于 fb4456e4（audit-remediation，2026-07-28），2 个 form 测试创建于 e4b4c247/038ba042（2026-07-29/30）；mission 提交 dd59dcd9/4bfffd4d 仅触碰未引入。
- **风险**: `pnpm check` / CI 持续 FAIL，阻塞 CV full-green 收口；错误归因会误导修复者溯源到已关闭的 C9/C2 卡。
- **建议**: form manifest devDeps 补 `@nop-chaos/flux-renderers-data` + `@nop-chaos/nop-debugger`；scheduling manifest devDeps 补 `@nop-chaos/flux-formula`；归因记录更正。
- **误报排除**: 门禁脚本复现 5 条 ERROR；test-only 跨包依赖同样必须声明。

### [维度01-02] 文档-代码漂移：flux-runtime-module-boundaries.md 把 RenderNodes/raw contexts 标为 unstable-only，实为 root 稳定导出

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md:446-473` vs `packages/flux-react/src/index.tsx:6-18,27`
- **严重程度**: P1（契约文档失真，误导包边界重构）
- **证据片段**:
  ```
  // boundaries.md:467-471
  "Current unstable-only examples:
   - RenderNodes
   - raw context exports such as FormContext / ScopeContext / RuntimeContext ..."
  // 实际 index.tsx:27
  export { RenderNodes, resolveRendererSlotContent, ... } from './render-nodes.js';
  ```
- **现状**: 2026-05-03 写入的文档声称 RenderNodes 与 raw contexts 为 unstable-only；2026-05-26（0fadc9a3）有意将其稳定化进 root barrel（docs/logs/2026/05-25.md 留痕），文档未同步。
- **风险**: 后续审计/重构者按文档"移回 unstable"会破坏已稳定化且被生产渲染器依赖的契约。
- **建议**: 更新 boundaries.md:467-471 的 unstable-only 示例清单（移除 RenderNodes 与 3 个 context）。
- **误报排除**: 非 draft 文档——该节是当前活文档，与 05-25 决策记录矛盾。

### [维度01-03] API 表面积：3 个包 root barrel 导出零外部消费者符号

- **文件**: `packages/flux-renderers-data/src/index.tsx:14`（createCrudNormalizedSourceContext）；`packages/flux-react/src/index.tsx:105`（GAP_TOKENS）；`packages/flux-renderers-content/src/index.ts:38`（normalizeProgressValue + NormalizedProgress）
- **严重程度**: P2（低优先级维护成本）
- **证据片段**:
  ```ts
  export { createCrudNormalizedSourceContext } from './crud-renderer-state.js';
  export { resolveGap, GAP_TOKENS } from './resolve-gap.js';
  export { ProgressRenderer, normalizeProgressValue, type NormalizedProgress } from './progress.js';
  ```
- **现状**: 3 个符号经 root barrel 公开但全仓库（含 playground、宿主、e2e）零消费者。
- **风险**: 公开即承诺，冻结进 dist/index.d.ts 成为稳定面；为下游提供未文档化 API。
- **建议**: GAP_TOKENS 移内部；createCrudNormalizedSourceContext / normalizeProgressValue 从 root barrel 摘除或补 JSDoc+文档。
- **误报排除**: 与 calibration 6 反向——已接线公开但无消费者。

## 依赖图与合规清单（R1 结论）

- 31 包严格分层、无环、无内部路径导入、无 _-core → _-renderers 反向边；exports map 全部 types+default 双条件；新包 flux-renderers-graph manifest/注册/别名/接线全部合规（root tsconfig:21、vite.workspace-alias.ts:103-107、App.tsx:107）。
- flux-runtime 依赖 {action-core, compiler, formula, core} 为 boundaries.md:208-212 文档化的装配 owner，合规。

## 维度复核结论

已路由（2026-08-06，0529-1 Phase 3 登记区 + `docs/backlog/component-audit-roadmap.md`「扫描发现路由登记」）：01-01 → 0529-1 Phase 1（fixed，gate exit 0）；01-02 → 0529-2（与 16-1 同根因）；01-03（P2 候选）R2 复核完成（plan `2026-08-06-0556-1` Phase 1），属实 → fix-in-this-plan（JSDoc + docs 条目），裁决见 `docs/audits/multi-audit-r2-verdicts.md`。
