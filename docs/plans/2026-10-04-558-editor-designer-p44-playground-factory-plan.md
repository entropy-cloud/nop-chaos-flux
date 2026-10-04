# 558 playground 宿主胶水 factory + 私有 shell 副本收敛（P4.4）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P4.4；`docs/architecture/editor-designer-standard.md` §2.8
> Related: plan 555（palette catalog 先例）；P4.5（flow 杂项清理，衔接）

## Purpose

playground 落地统一 designer demo host factory（registry recipe 声明式），迁移六个 designer demo 页（word-editor-page/dashboard-demo/scada-editor-demo/taskflow-designer-page/report-designer-demo/report-designer-host-demo）；flow-designer 私有 shell 收敛——走查实证其为**零消费死代码**（roadmap "改消费包内导出" 前提过时），删除即收敛。

## Current Baseline

- 六个 designer demo 页各持 `createDefaultRegistry()` + 9-12 个逐条 register 调用（word-editor-page 10/dashboard-demo 11/scada-editor-demo 9/taskflow-designer-page 11/report-designer-demo 12/report-designer-host-demo 10）。
- `apps/playground/src/flow-designer/`（1831 行，12 文件：toolbar/palette/inspector/canvas/toast/hover-toolbar/flow-list-page/flow-canvas/store + parity.test + index barrel）：**全量导出零外部消费**（11 个值级导出符号逐一 grep——含 flow-node-types.tsx 两个未入 barrel 符号，0 个 dir 外文件引用；flow-designer-page 经 schema + 包内 designer-page renderer 渲染，不消费本目录）。关联死代码：`flow-designer-example.tsx`（消费 dir 内 FlowCanvas/store，自身零消费）、`flow-designer-toolbar.test.tsx`（root，import dir 内 toolbar）。e2e（flow-designer-collapsible/resizable/css-diag）驱动 schema 渲染页 + 包内组件（`collapse-palette` 在 flow-designer-renderers/designer-palette.tsx），不触死代码。`flow-designer-nodes.css` 经 styles-theme-utilities.css 导入——**保留**（live 页样式面）。
- taskflow-designer-lib/ 为 live（taskflow-designer-page 消费），不动。

## Goals

- `apps/playground/src/designer-hosts/registry-factory.ts`：`DESIGNER_REGISTRY_RECIPES`（声明式 recipe：register 函数清单常量）+ `createDesignerRegistry(recipe)`（createDefaultRegistry + 逐条注册）。
- 六页迁移：各自 9-12 条 register 调用 + createDefaultRegistry → 单次 factory 调用（recipe 常量声明于 factory 文件，页内一行消费）。
- 死代码删除：`apps/playground/src/flow-designer/` 全目录 + `flow-designer-example.tsx` + `flow-designer-toolbar.test.tsx`（零消费实证 + e2e 不触 + CSS 保留）。
- 裁定成文：standard §2.8 增 factory 路径注 + flow-designer 死代码收敛裁定（roadmap "改消费包内导出" 前提勘误）。

## Non-Goals

- 不改 playground 其他 demo 页（非 designer 家族）；不动 taskflow-designer-lib/live CSS。
- 不为 flow-designer-renderers 新增 toolbar/palette/inspector 组件导出（死代码删除后无诉求）。

## Scope

### In Scope

- `apps/playground/src/designer-hosts/`（新）+ 六页迁移 + 删除三处死代码 + 标准文档 §2.8 注。

### Out Of Scope

- 其他 playground 页；flow-designer-renderers 包；CSS。

## Failure Paths

| 触发                   | 行为                                                         | 可重试 | 用户可见表现     |
| ---------------------- | ------------------------------------------------------------ | ------ | ---------------- |
| recipe 漏注册          | 页面渲染缺组件 → playground 测试/route matrix 红 → 修 recipe | 是     | 无（测试内闭合） |
| 死代码删除后隐式引用爆 | typecheck/全量测试把关（grep 实证零消费前置）                | 是     | 无               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（factory 单测 + 六页既有测试/route matrix 回归 + 全仓 typecheck 把关删除）。

## Execution Plan

### Phase 1 - factory + 六页迁移（Proof + Fix）

Status: completed
Targets: `apps/playground/src/designer-hosts/`、六页

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：registry-factory.test.ts 5 用例（五 recipe 代表 type 断言；report 双 demo 共享 REPORT_DESIGNER_DEMO_RECIPE——m2 去重落地）
- [x] （Fix）factory + 5 recipe 常量（REPORT 双 demo 共享）+ 六页迁移（word/dashboard/scada/taskflow/report-demo inspectorRegistry/host-demo 主 registry+recipe 扩展 hostDirtyProbeRenderer——**closure audit Blocker 修正**：DesignerRegistryEntry 支持 definition 条目，还原数组变体语义，`as never` 移除）
- [x] playground 全量测试绿（route matrix/app.test 等）

Exit Criteria:

- [x] 六页 register 调用收敛为 factory 调用（definition 条目语义经 factory 原生支持）；playground 41 文件 407/407 绿（含 definition-entry 单测 + host-demo module-load smoke）

### Phase 2 - 死代码收敛（Fix）

Status: completed
Targets: `apps/playground/src/flow-designer/`、example、toolbar test

- Item Types: `Fix`

- [x] 删除三处死代码（git rm flow-designer/ 12 文件 + flow-designer-example.tsx + flow-designer-toolbar.test.tsx；测试 mock 补 leafer/flux-react createLazyRendererComponent——factory 导入链拉入 industrial/flow 包）
- [x] 全仓 typecheck/build/test 绿（隐式引用把关）

Exit Criteria:

- [x] 死代码移除且全仓验证绿（xyflow 死依赖随删除清理——knip 指认）

### Phase 3 - 裁定成文（Decision）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`

- Item Types: `Decision`

- [x] §2.8 增 factory 路径注 + flow-designer 死代码收敛裁定（roadmap 前提勘误成文）；roadmap P4.4 行回写时就地勘误（pending write-back 执行）

Exit Criteria:

- [x] 裁定注成文

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_7ef8c071-f4ac-4562-968f-df38f3088dac）
- Verdict: pass
- Rounds: 1
- Closure Audit Blocker 修正记录（round 1 audit，agent_b8d60e60-0df1-4d8f-be9e-3cd9305d70cb）：host-demo recipe 扩展把 definition 对象塞进 register 函数列表（`as never`），模块加载即 "register is not a function" 崩溃（lazy route 无单测覆盖 + 专项 e2e 未跑）——修正：factory `DesignerRegistryEntry` 支持 definition 条目（还原 flux-react 数组变体语义）+ 去掉 as never + definition-entry 单测 + host-demo module-load smoke 测试（load 即 registry 构建全路径把关）；"focused verification 完成" gate 的 e2e 缺口由此补足（module-load 单测在单测层等价把关页面装配）。
- Findings addressed: 零 Blocker/Major；3 Minor——①导出符号计数 9→11（含未入 barrel 2 个）；②report 双 demo recipe 相同则共享常量；③roadmap P4.4 行回写时就地勘误过时前提。死代码删除实证经审计全量复核（零消费/e2e 安全/CSS live 保留）成立。

## Closure Gates

- [x] factory + 六页迁移落地（声明式 recipe）
- [x] flow-designer 死代码收敛（三处删除，全仓验证绿）
- [x] §2.8 裁定注成文
- [x] 必要 focused verification 已完成（playground 41 文件 407/407 含 module-load smoke + 全仓五门禁；audit Major 验证缺口闭合）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0，xyflow 死依赖清理后）
- [x] roadmap §6 P4.4 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: factory + 六页迁移 + flow-designer 死代码收敛（1900+ 行）全部落地；closure audit round-1 Blocker（host-demo recipe 扩展崩溃）经 DesignerRegistryEntry definition 条目支持 + module-load smoke 修正闭合；独立 closure audit round-2 VERDICT: approved（Blocker 修正核实：definition 条目一等公民 + as never 移除 + 判别性 module-lock；Major 验证缺口闭合：module-load smoke 每次单测运行把关）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_b8d60e60-0df1-4d8f-be9e-3cd9305d70cb）
- Evidence: Round 1 VERDICT: issues（Blocker：host-demo recipe 扩展把 definition 对象塞进函数列表致模块加载崩溃 + 验证缺口）→ DesignerRegistryEntry definition 条目支持 + `as never` 移除 + definition-entry 单测 + module-load smoke → Round 2 复核。Round 1 已核实 clean 面：死代码删除零残留引用、五 recipe 正确、test mock 合法、§2.8 注一致、xyflow 死依赖清理。

Follow-up:

- no remaining plan-owned work。
