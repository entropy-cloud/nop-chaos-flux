> Audit Status: planned（原 open，2026-08-07-1747 mission-driver 起草轮处理：P1 22-13 已路由——与 open-audit 同批 gantt 发现并入 `docs/plans/2026-08-07-1747-1-scheduling-p1-remediation.md` Phase 1；19 条 P2 已移入 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」节）
> Audit Type: multi-dimensional
> Mission: component-audit

# 2026-08-07-1747 多维审计报告（component-audit）

## 0. 审核范围与执行方式

- **任务**: 对 mission `component-audit` 执行多维深审；聚焦 `./`（code、config、tests、public contracts/exports/API surface），对照架构文档核查已文档化契约漂移。
- **审核日期**: 2026-08-07
- **执行方法**: 按 `docs/skills/deep-audit-prompts.md` 共享前缀 + 维度正文装配 prompt，`subagent_type="explore"` 派发。**初审 8 个维度**（01/02/03/09/14/16/22/23），共 8 个初审子 agent（维度 23 首轮返回空输出，重新派发后产出 4 条）+ 4 个独立复核子 agent（P1 逐条复核 1 个 + 文档/命名类批量复核 + 配置/API/工具类批量复核 + 测试有效性/覆盖类批量复核）。
- **本轮焦点**: 2026-08-07 当日发生大规模变更（plan 1053-1 十文件拆分、1023-2 flux-bundle 包边界、1023-3 kanban 类型收紧、1023-1 INV-1 门禁、0819-1/2/3 flow-designer/styling/variant-field 家族、0711-1 scheduling P1、2306-1/2/3 事件 ctx/scope 配对/接线）——本轮审计以**当日变更面的契约验收 + 残留深挖**为核心，不重复报告已登记/已修复问题。
- **工具基线**（主 agent 预跑，供各维度消费）:
  - `pnpm check:oversized-code-files`: **exit 0**（156 warnings >500 行；2 errors 均为已注册豁免 en-US.ts/zh-CN.ts）
  - `pnpm check:workspace-manifest-deps`: **exit 0**（含 1023-2 新增的跨包相对导入规则）
  - `pnpm check:audit-runtime-raw-schema-reads`: **1 条命中**（crud-renderer-schema-builders.ts:128，经独立复核判定为 JSDoc 块注释误报——工具 filterMatch 只滤 `//` 行注释；:115 真实代码 `(n as TemplateNode).schema` 为合法 region handle schema 组合，不构成 compile-once 违规）
  - `pnpm check:audit-missing-renderer-markers`: 零命中；`pnpm check:audit-fieldframe-bypasses`: 零命中（12-02 修复后）
  - `pnpm check:audit-async-failure-paths`: 201 命中 / 3 桶（08-06 基线 200，+1 为新增 catch 点，未复核出新的用户可见失败）
  - `pnpm check:audit-test-global-leaks`: 49 命中 / 2 桶（含今日新增 1 条：table-selection-checkable-scope-dispose.test.tsx:12，见 14-4）
  - `pnpm check:audit-event-dispatch-ctx`: 零命中（allowlist 7 条原生 DOM 转发，与 2306-1 登记基线一致）
  - 测试计数基线（拆分后零变化）：compiler 550 / runtime 1399 / form 736 / form-advanced 1049 / data 753 / word-editor-core 247 / playground 143 / scheduling 878 / flow-designer-renderers 235 / graph 48

### 严重程度映射说明（mission 三档 ↔ 深审手册四档）

| mission 档位 | 判定                                                               | 本文档使用                |
| ------------ | ------------------------------------------------------------------ | ------------------------- |
| `[P0]`       | blocking：契约破坏/错误行为/数据丢失/安全/变更行为的失败或缺失测试 | 本批**无 P0**             |
| `[P1]`       | material：真实缺陷或契约漂移，不阻塞但 MUST fix                    | 深审手册 P1（1 条）       |
| `[P2]`       | trivial / 非阻塞 polish：真实但可排期，入 follow-up backlog        | 深审手册 P2 + P3（19 条） |

---

## 1. 深挖统计

- 维度总数：8（初审）
- 深挖轮次：8 个维度各 1 轮（R1 后进入复核；维度 09 零发现直接复核确认）
- 深挖总发现数：**21**（R1 21 条；含 14-5 与 23-3 跨维度重复，去重后 20 条）

## 2. 复核统计

- 深挖发现总数：21（去重后 20）
- 独立复核覆盖：**20/20 全覆盖**
  - P1 逐条复核：1/1（22-13 成立，保持 P1）
  - 文档/命名类批量复核：7/7（02-05/02-06/16-1..16-5）
  - 配置/API/工具类批量复核：7/7（01-01/01-02/03-01/03-02/03-03/14-1/14-2）
  - 测试有效性/覆盖类批量复核：8/8（14-3/14-4/14-5+23-3/22-13 交叉印证/23-1/23-2/23-4/22-14）
- 保留：18；降级：3（02-06 降级不保留、14-4 降为 P3 仍保留、14-5+23-3 合并降为 P3 仍保留）；驳回：1（16-5）
- 复核修正（不影响结论）：01-01 归因修正（test-dom-polyfills.tsx 泄漏根因是"无任何排除模式匹配它"而非仅缺 test-support\* 一条）；14-4 由 P2 降为 P3（隔离风险理论性，真实问题是新增一条 audit 命中违反 zero-new-hits 治理）；14-5 与 23-3 确认为跨维度重复报告，合并为一条降 P3。

---

## 3. `[P1]` 发现清单（material，MUST fix，1 条）

### [P1] 22-13 gantt `scrollToTask` reaction ready() 后永不派发；component:\* 句柄 invoke 全部不派发 schema reaction（22-05 家族残留）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:341-345, 358-374, 463-465`；对照 `calendar.tsx:226-241`（22-05 已修复先例）
- **严重程度**: P1（独立复核确认：事实 100% 与初审一致，维持 P1）
- **证据片段**:
  ```tsx
  // gantt.tsx:341-345 —— 四个 reaction 全部仅 ready() 激活
  useEffect(() => {
    for (const key of ['zoomIn', 'zoomOut', 'scrollToToday', 'scrollToTask']) {
      props.reactions[key]?.ready();
    }
  }, [props.reactions]);
  // gantt.tsx:358-374 —— handle invoke 四分支只做视觉行为，零 dispatch
  case 'zoomIn': doZoomIn(); return { ok: true };
  ...
  case 'scrollToTask': { const taskId = ...?.taskId; scrollToTask(taskId); return { ok: true }; }
  // gantt.tsx:463-465 —— 仅内置工具栏按钮路径派发 reaction
  onZoomIn={() => { doZoomIn(); void props.reactions.zoomIn?.dispatch(); }}
  ```
- **现状**: `scheduling-renderer-definitions.ts:52-55` 将 4 字段全部注册为 `kind: 'reaction'`；`scrollToTask` 全仓生产代码零 dispatch 调用点（无工具栏入口、句柄不派发、`component:*` runner 无 reaction 联动）；同组件工具栏路径派发 3/4 而句柄路径 0/4，同家族 calendar 22-05 修复注释明确"句柄 invoke 即派发"（calendar.tsx:232,240 且自称对齐 gantt 先例）——gantt 自己的 handle 反而没接。
- **风险**: schema 声明 `scrollToTask: { action }` 后 action 程序全路径不可达（静默死契约）；`component:zoomIn/zoomOut/scrollToToday/scrollToTask` 句柄调用不执行 schema action，与点击内置工具栏按钮行为不一致；无错误、无测试覆盖（gantt.test.tsx:298-323 只锁 ready + 工具栏路径）——正是 P1 最危险形态。
- **建议**: handle invoke 四分支补 `void props.reactions[key]?.dispatch()`（scrollToTask 滚动后派发，对齐 calendar.tsx:232,240 模式）；补 test-first 用例锁定"句柄 invoke 即派发"；同步 design.md §8.2 过时表述（"非独立可调用 action"与实现矛盾）。
- **误报排除**: 非已修复项——2306-3 只修了 calendar print/exportPNG 与 gantt 工具栏路径；非文档契约（design.md §8.3 声明"行为以实现为准"，而实现自身已在工具栏路径建立"操作→派发"行为，组件内双路径不对称是真实缺陷）。
- **复核状态**: 子项复核通过（保持 P1）

---

## 4. `[P2]` 发现清单（trivial / 非阻塞 polish，19 条，入 follow-up backlog）

### 维度 01：依赖图与包边界

#### [P2] 01-01 flux-renderers-form 构建排除缺 `src/**/test-support*` 模式，dist 泄漏含 devDep-only 依赖的测试模块

- **文件**: `packages/flux-renderers-form/tsconfig.build.json:12-20`；`packages/flux-renderers-form/dist/test-support.js:7`（构建产物，live 存在）
- **严重程度**: P2（复核确认：14 个含 test-support 的包中唯一排除模式不一致且实际泄漏的包）
- **证据片段**:
  ```json
  "exclude": [
    "src/**/*.test.ts",
    ...
    "src/**/*-test-support*"   // 只匹配 X-test-support，不匹配 test-support.tsx
  ]
  ```
  ```js
  // dist/test-support.js:7 —— 模块顶层导入仅 devDep 声明的包
  import { createFormulaCompiler } from '@nop-chaos/flux-formula'; // ← devDependencies，非 dependencies
  ```
- **现状**: `src/test-support.tsx`（自 2026-05-11 起）与 `src/test-dom-polyfills.tsx` 被 tsc 编译进 dist；dist 产物携带对 flux-formula（仅 devDeps）与 vitest/testing-library 的运行时导入。根因：`test-support*` 前缀模式缺失（不匹配 basename 前缀）且 `test-dom-polyfills` 无任何排除模式匹配（复核修正，非仅缺 test-support\* 一条）。
- **风险**: 发布物中潜伏"未声明运行期依赖"；若未来恢复子路径导出、打包工具 glob dist 或对 dist 做依赖审计，将直接暴露未声明依赖/意外打包测试代码；dist 体积污染。当前 exports map 无 ./test-support 子路径，无即时运行期破坏。
- **建议**: tsconfig.build.json exclude 补 `"src/**/test-support*"` 与 `"src/test-dom-polyfills*"`（对齐其余 13 包）；重跑 build 确认 dist 两文件消失、包内测试仍绿。
- **误报排除**: 非 calibration pattern 6（unwired dead code）——这是具体 manifest 问题（pattern 2 保留条件命中：causes concrete manifest/ownership problems）；dist 产物与发布面契约不一致。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 01-02 check-workspace-manifest-deps 新跨包相对导入规则只扫 `git ls-files` 已跟踪文件，未跟踪源文件逃逸扫描

- **文件**: `scripts/check-workspace-manifest-deps.mjs:22-30`（getTrackedFiles）、`:152-192`（扫描循环）
- **严重程度**: P2（复核确认：盲区成立，影响受 CI/Husky 部分缓解）
- **证据片段**:
  ```js
  async function getTrackedFiles() {
    const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: rootDir, ... });
    return stdout.split(/\r?\n/)...   // git ls-files 不含未跟踪文件
  }
  ```
- **现状**: 今日新增的跨包相对导入红线规则依赖 git 跟踪状态；工作区新建未 `git add` 的 src 文件（如拆分/迁移中途态）中的 `../../ui/src/...` 相对导入在本地 `pnpm check` 不报红。
- **风险**: 规则口径与工作区当前状态存在窗口期盲区；依赖拆分/移动的高频操作期恰是跨包相对导入最易混入的时机。缓解因素：CI 运行时文件均已提交（必被扫到）、Husky pre-commit 在 staging 后运行——属"延迟发现"而非"永不发现"。
- **建议**: `getTrackedFiles` 合并 `git ls-files --others --exclude-standard` 未跟踪源文件（或 `git status --porcelain` 双源合并），排除项保持 dist/node_modules 过滤；补未跟踪文件脚本单测。
- **误报排除**: 非工具噪声——audit-tooling.md 明示"硬门禁通过时只在有覆盖洞证据时报告"，本发现即今日新增规则的覆盖洞证据。
- **复核状态**: 批量复核通过（保持 P2）

### 维度 02：模块职责与文件边界

#### [P2] 02-05 flux-runtime-module-boundaries.md 缺失今日新增的 5 个 shape-validation 子模块条目（02-03「MISSING:NONE」声明被今天拆分打破）

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md:93-94`（缺失：shape-validation-rules-{structural,api-schema,action,source,reaction}.ts 共 5 个新文件）
- **严重程度**: P2（复核确认：doc 全文中 grep shape-validation-rules 仅命中 :93 一处，5 子模块条目确实缺失）
- **证据片段**:
  ```
  # 现状：shape-validation-rules.ts 条目描述已 stale（现为 10 行 re-export hub）
  - `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`
    - schema shape validation rule implementations
  # 同目录其余 8 个模块（08-06 02-03 补齐）均有独立 bullet；今日新增 5 个无条目
  ```
- **现状**: 02-03 宣称"全量生产模块条目 MISSING:NONE"是 08-06 验收口径；今天（08-07）1053-1 拆分在同目录新增 5 个模块未补 doc 条目，该声明在 schema-compiler 目录内已不成立。
- **风险**: 所有权映射文档是"新行为放哪里"的决策依据；新校验逻辑可能被放到子模块之外（或放回 hub），或 review 依据旧条目误判 shape-validation-rules.ts 仍承载实现。
- **建议**: schema-compiler 节补 5 个子模块 bullet（structural=路径/dependsOn、api-schema=api 形状、action=内置 action args、source=source 形状、reaction=reaction 形状），shape-validation-rules.ts 条目改"规则实现 re-export hub"。工作量 <5 分钟。
- **误报排除**: 非"为行数而拆"误报——文档与代码的客观偏离；renderer 包新增模块（form-init-action.ts 等）不在该 doc 枚举范围内（doc 本就不列 flux-renderers-form 文件）。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 02-06 playground 路由条目模块命名双轨制（route-entries 4 vs renderer-routes 5，今天拆分选择少数派后缀）

- **文件**: `apps/playground/src/{basic,data,domain}-route-entries.ts`（今日新增 3 个）对照既有 5 个 `*-renderer-routes.ts`
- **严重程度**: P2 → **降级**（复核：纯命名一致性，calibration 10；不进入最终保留清单）
- **证据片段**: 同目录 `layout-renderer-routes.ts`/`content-renderer-routes.ts`/`mobile-renderer-routes.ts`/`ai-renderer-routes.ts`/`scheduling-renderer-routes.ts` 5 个多数派 vs `form-route-entries.ts`（旧异类）+ 今日新增 3 个 route-entries。
- **现状**: 拆分时选择了少数派 `*-route-entries.ts` 后缀；文件全部被 route-model.ts:6-9 实际导入（live code），无功能影响。
- **建议**: 统一为 `*-renderer-routes.ts` 或反向统一（二选一）；趁 domain-route-entries.ts 刚诞生（git history 干净）执行成本最低。
- **误报排除**: 非"为行数而拆"——拆分本身必要（route-model.ts 708 行超硬门禁）；本发现仅命名分歧。
- **复核状态**: 批量复核降级（不保留）

### 维度 03：API 表面积与契约一致性

#### [P2] 03-01 flux-react root 公共导出 fork `useSyncExternalStoreWithSelector` 无 JSDoc 且无直接单测（1023-2 验收质量项）

- **文件**: `packages/flux-react/src/use-sync-external-store-with-selector.ts:20-26`；`packages/flux-react/src/index.tsx:110`
- **严重程度**: P2（复核确认：fork 全 101 行无 JSDoc；src/**tests** grep 零命中无直接单测；module-boundaries.md:532 已登记）
- **证据片段**:
  ```ts
  // index.tsx:110 —— 唯一一行公共导出，无注释
  export { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';
  // fork 签名与 npm shim 的差异：getServerSnapshot 由必传放宽为可选（React 19 原生第三参语义）
  ```
- **现状**: fork 于今日提升为 root 公共导出并跨包复用（flux-bundle shim bare specifier）；签名与语义兼容性验收通过，但该 hand-copied 选择器记忆化实现（逻辑微妙）缺直接单测锁定 selector 缓存/isEqual/getServerSnapshot 回退语义；无 JSDoc 说明来源与上游同步维护警示。
- **风险**: 未来重构 hooks.ts 内部使用点时可能无意改动 fork 行为而仅靠间接覆盖兜底；公共 API 面文档缺口（仓库"默认不写注释"惯例弱化 JSDoc 部分，测试缺口是实质部分）。
- **建议**: 补 fork 行为单测（selector 相等性缓存、getServerSnapshot 回退、isEqual 自定义）；补 JSDoc（来源、与 npm 签名差异、维护提示）。
- **误报排除**: 该导出是今天唯一的有意公共 API 变更，其文档/测试完备度属可验收交付物；签名一致性与文档登记均已到位，故仅 P2。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 03-02 flux-renderers-graph 声明未使用的 `use-sync-external-store` 死依赖（18-01 清理目标不一致残留）

- **文件**: `packages/flux-renderers-graph/package.json:27`
- **严重程度**: P2（复核确认：src/ 下 grep 零命中；其余 5 包确有真实引用）
- **证据片段**:
  ```json
  "dependencies": {
    "@xyflow/react": "^12.10.2",
    "dagre": "^0.8.5",
    "use-sync-external-store": "^1.6.0",   // src/ 下零引用（graph 仅用 zustand useStore）
    "zustand": "^5.0.12"
  }
  ```
- **现状**: 18-01 提交声明"drop unused use-sync-external-store deps"只从 flux-react 移除；flux-renderers-graph 的声明自包创建（08-04 模板带入）起就未使用，清理范围未覆盖。`check:workspace-manifest-deps` 只校验"源码导入未声明"方向，不校验"声明未使用"。
- **风险**: 死依赖占用 lockfile/安装体积；造成"use-sync-external-store 已迁往 flux-react fork"的错觉（graph 根本不消费该 API），与 18-01 建立的新边界叙事不一致。
- **建议**: 从 graph/package.json 删除该依赖并同步 pnpm-lock.yaml；如需硬门，可在 check-workspace-manifest-deps 加"声明但未引用"反向检查。
- **误报排除**: 非低代码动态边界（无 schema 驱动动态依赖）；声明级残留与 18-01 清理目标直接相关。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 03-03 raw-schema-reads 扫描器块注释盲区导致误报，且 `as T).schema` 形态真实读取漏检

- **文件**: `scripts/audit/rules.mjs:496-510`（filterMatch）；`packages/flux-renderers-data/src/crud-renderer-schema-builders.ts:110-128`
- **严重程度**: P2（复核实证运行确认：当前唯一命中即注释误报；:115 真实形态漏检）
- **证据片段**:
  ```ts
  // rules.mjs filterMatch —— 仅识别 `//` 行注释，不识别 `*` 块注释
  if (lineText.includes('//') && !lineText.split('//')[0].includes('templateNode.schema') ...) return false;
  // crud-renderer-schema-builders.ts:115 真实读取（模式不匹配而漏检）
  const schemas = nodes.map((n) => (n as TemplateNode).schema);
  ```
- **现状**: 工具命中 `crud-renderer-schema-builders.ts:128`（JSDoc 块注释行 `* item/card ... raw props.schema (compile-once).`）为误报；:115 真实代码形态 `(n as TemplateNode).schema` 不被 `\btemplateNode\.schema\b`/`\bprops\.schema\b` 匹配而漏检。该命中经独立复核判定不构成 compile-once 违规（region handle 的 schema 组合/搬运，非业务数据运行时读取）。
- **风险**: 工具盲区持续产生误报（任何含 props.schema 的 JSDoc 块注释都会命中），消耗审计排除成本；真实 `as T).schema` 形态读取永远漏检——未来真违规将静默放过。
- **建议**: filterMatch 增加 `*` 块注释行排除；补充 `as TemplateNode).schema`/`as BaseSchema).schema` 形态匹配模式。
- **误报排除**: 该命中经逐行核对为注释误报 + 合法 schema 组合，与 compile-once 原则不冲突；本发现是工具质量修复而非代码违规。
- **复核状态**: 批量复核通过（保持 P2）

### 维度 14：测试覆盖与质量

#### [P2] 14-1 find-renderer-browser-io.test.ts 将违规夹具写入真实包目录，中断运行会污染真实门禁

- **文件**: `scripts/__tests__/find-renderer-browser-io.test.ts:14-33`（stageFixture/afterEach）；`scripts/audit/shared.mjs:11-16`（ignoreDirectoryNames）
- **严重程度**: P2（复核确认：夹具目录不在门禁 ignore 列表；当前无残留，风险在中断窗口）
- **证据片段**:
  ```ts
  async function stageFixture(packageDir, fileName) {
    const tempDir = join(rootDir, 'packages', packageDir, '__inv1_scan_fixture__');
    await mkdir(tempDir, { recursive: true });
    stagedDirs.push(tempDir);
    ...
  }
  afterEach(async () => { for (const dir of stagedDirs) { await rm(dir, ...); } stagedDirs.length = 0; });
  ```
- **现状**: 测试将含直接 fetch()/远程 import() 的夹具写入真实包目录 `packages/*/__inv1_scan_fixture__`，afterEach 正常清理；但 shared.mjs 的 ignoreDirectoryNames 不含该目录——若测试进程被中断（CI 超时/kill -9），残留夹具让真实门禁 `find-renderer-browser-io` 永久变红直到手工清理。stagedDirs 为模块顶层可变数组。
- **风险**: 异常终止时真实门禁被污染；并发门禁运行期也可能互相干扰。
- **建议**: 夹具目录改写入临时目录（/tmp 或 node_modules/.cache）；或门禁 ignore 列表加 `__inv1_scan_fixture__` 兜底；stagedDirs 改局部变量。
- **误报排除**: 非工具噪声——设计缺陷真实（夹具应写临时目录），影响受 afterEach 缓解但中断窗口客观存在。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 14-2 document-io-test-utils.ts 提取后成为"import 即注册全局 hook"的共享模块（隐性隔离陷阱）

- **文件**: `packages/word-editor-core/src/__tests__/document-io-test-utils.ts:28-40`
- **严重程度**: P2（复核确认：模块级副作用 + 可变模块态；现有 2 个 importer 均恰好需要，无实际缺陷但悬空陷阱）
- **证据片段**:
  ```ts
  export const localStorageState = { current: createLocalStorageMock() };
  beforeEach(() => {
    localStorageState.current = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageState.current);
  });
  afterEach(() => {
    setRecoveryLoadErrorHandler(undefined);
    vi.unstubAllGlobals();
  });
  ```
- **现状**: 拆分把父文件的 beforeEach/afterEach 提为共享模块的模块级副作用；任何未来仅想引用 STORAGE_KEY 常量的测试文件一 import 就被静默注入 localStorage 全局 stub 与清理钩子；localStorageState 是可变模块态（test-module-top-let 规则的 const 变体）。
- **风险**: 仓库已有显式 opt-in 先例（canvas-bridge-test-support.tsx 的 installCanvasBridgeTestHooks()），本模块的隐式注入与之相悖；未来常量-only 导入即被注入 stub，测试隔离难排查。
- **建议**: hook 注册改显式函数（installDocumentIoTestHooks()，仿 canvas-bridge 先例），常量导出与 hook 副作用解耦；或文件头注释明确"import 即注册全局 hook"约束。
- **误报排除**: 非误报——blast radius 限于 **tests** 内（tsconfig.build 排除，不进产物），但模式与仓库既有先例相悖且是悬空陷阱。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 14-3 input-choice-utils.ts 今日拆出 9 个纯函数，零直接单测（搬运不补测）

- **文件**: `packages/flux-renderers-form/src/renderers/input-choice-utils.ts:20-224`
- **严重程度**: P2（复核确认：全仓 _.test._ 无 import；拆分提交明示"Test counts unchanged"即搬运不补测）
- **证据片段**:
  ```ts
  export function matchChoiceLabel(label: string, query: string, ignoreCase: boolean): boolean { ... }
  export function sanitizeChoiceGroups(value: unknown): SelectOptionGroup[] { ... }
  export function resolveChoiceMobileTriggerText(input: {...}) { ... }
  ```
- **现状**: 今日 1053-1 拆出的 7 个新模块中唯一零直接测试的纯逻辑模块；间接覆盖不完整（choice-dict-error/choice-error-i18n 只覆盖 getSourceErrorMessage 的 error 槽路径，sanitize/resolve 分支逻辑仅经渲染层部分触及）；同仓有直测先例（validation-rule-semantics.test.ts 直接 import 生产模块做纯函数级断言）。
- **风险**: matchChoiceLabel 的 ignoreCase 分支、sanitizeChoiceGroups 非法组、resolveChoiceMobileTriggerText 选中态等分支无锁定断言；未来重构回归无防护。
- **建议**: 为拆出纯函数补直接单测（至少覆盖 sanitize/matchChoice boolean 矩阵与 mobile trigger 文本选择逻辑）。
- **误报排除**: 非校准 pattern 6（模块有真实生产消费方 input-choice-renderers.tsx:45-62）；纯"搬运不补测"覆盖缺口。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 14-4 table-selection-checkable-scope-dispose.test.tsx 模块顶层 `let scopeCounter`（今日新增 audit 命中）

- **文件**: `packages/flux-renderers-data/src/__tests__/table-selection-checkable-scope-dispose.test.tsx:12`
- **严重程度**: P2 → **降级 P3**（复核：隔离风险理论性——断言全为配对相对断言不依赖绝对 id；真实问题是新增 1 条 audit 命中违反 zero-new-hits 治理）
- **证据片段**:
  ```ts
  let scopeCounter = 0;
  function createSpyHelpers() {
    const created: string[] = [];
    const disposed: string[] = [];
    const helpers = { createScope: vi.fn((patch) => { const id = `checkable-scope-${scopeCounter++}`; ... }) };
  ```
- **现状**: 今日 2306-2 新建的 scope-dispose 测试族中唯一带模块顶层可变状态的文件；`pnpm check:audit-test-global-leaks` 实跑确认 :12 在 49 个命中列表中；复制了同包 use-table-controls.test-support.tsx:28 既有模式。
- **建议**: 计数器移入 createSpyHelpers 局部作用域（或用 created.length 派生 id）；顺带收敛同包既有模式。
- **误报排除**: 非功能性隔离缺陷（当前断言不受影响）；按 mission 三档映射为 P2（P3 归 P2 档）。
- **复核状态**: 批量复核降级（P3，仍保留，入 backlog）

### 维度 16：文档-代码一致性

#### [P2] 16-1 pc-index.md 守卫台账 `check:oversized-code-files` 行仍标 "16 文件 >700 pre-existing red"，与 live exit 0 及 project-context.md 更新矛盾

- **文档路径**: `docs/audits/per-component/pc-index.md:370`
- **代码路径**: `scripts/check-oversized-code-files.mjs`（live 实测 exit 0，仅 2 条 [exempt]）
- **严重程度**: P2（复核实测确认）
- **证据片段**（文档原文）:
  ```
  | `check:oversized-code-files`    | 16 文件 >700 行 | **pre-existing red**（治理归独立 successor，CG 不修） |
  ```
- **现状**: 该门禁 2026-08-07 已由 plan 1053-1 收口 exit 0（10 拆 + 2 豁免），project-context.md:15 已同步，同表其他行也补了 08-07 注记——唯独此行未更新。
- **建议**: :370 行更新为 live 终态（exit 0，2 豁免，plan 2026-08-07-1053-1）。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 16-2 crud-comparative-analysis.md `form.tsx:556` 行号越界（form.tsx 今日拆后仅 518 行）

- **文档路径**: `docs/components/crud/crud-comparative-analysis.md:296`
- **代码路径**: `packages/flux-renderers-form/src/renderers/form.tsx`（518 行；columnCount 实际在 :316/:361）
- **严重程度**: P2（复核 wc -l 实测 518 < 556，行号越界属实）
- **建议**: 行号更新为 form.tsx:316（或去行号只留文件路径）。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 16-3 crud/design.md:485 仍称 `resolveToolbarBlocks` 在 crud-renderer.tsx，今日已迁至 crud-renderer-toolbar.tsx

- **文档路径**: `docs/components/crud/design.md:485`
- **代码路径**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:195`（export function resolveToolbarBlocks）；crud-renderer.tsx:32 仅 import
- **严重程度**: P2（复核确认定义位置）
- **建议**: :485 改为 "`crud-renderer-toolbar.tsx` `resolveToolbarBlocks` 复用既有 headerBlocks 过滤机制；`CrudToolbarBlocks` 消费 `useIsMobile()`"。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 16-4 nested-schema-field-classification.md:260 引用 `shape-validation-rules.ts:278-326` 行段，文件今日拆为 10 行 re-export hub

- **文档路径**: `docs/architecture/nested-schema-field-classification.md:260`
- **代码路径**: `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`（10 行 hub）；实际递归在 shape-validation-rules-action.ts（:22/:68/:87 analyzeSchemaInput）
- **严重程度**: P2（复核确认 :278-326 行段不存在）
- **建议**: 更新为 `shape-validation-rules-action.ts`（analyzeSchemaInput 递归路径）或去掉行段。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 16-5 commit 30accb26/59eb7901 声称 "full-green verification"，同 HEAD daily log 记录 e2e 6 failed

- **文档路径**: `docs/logs/2026/08-07.md:139`（verify-run 复核条目）；git commit 30accb26（0421-2）/59eb7901（0421-1）
- **严重程度**: P2 → **驳回**（复核：daily log 已在同一 HEAD 主动纠正——6 项失败全部归入 08-06 CV watch-only 归因清单；commit 消息按纪律不回写，不构成可处理文档缺陷）
- **现状**: commit message 声明 full-green，但同 HEAD 复跑 e2e 1054/43/6（非 full-green）；daily log 自行纠正"不作 full-green 声明"。
- **建议**: 后续提交严格遵守 AGENTS.md full-green 声明条件；08-06 watch-only 挂账未清零前验证段应注明挂账项（流程教训，可留作备注）。
- **复核状态**: 批量复核驳回（历史瑕疵，daily log 已纠正）

### 维度 22：集成接线与可操作性

#### [P2] 22-14 gantt design.md §4/§5 仍把已 @deprecated 的 6 个 schema 字段列为 live props（文档-代码契约漂移）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.types.ts:160-178` vs `docs/components/gantt/design.md:64-69, 222-224`
- **严重程度**: P2（复核确认：6 字段全部 @deprecated 且未注册进 scheduling-renderer-definitions.ts gantt fields，design.md 仍列 live props；比初审更严重——§5 还把 childrenField: 'children' 与 scales 双行刻度列为「推荐默认值」）
- **证据片段**:
  ```ts
  // gantt.types.ts:160-178 —— 实现侧已全部标注 @deprecated
  /** @deprecated Use `zoomLevels` instead. */
  scales?: GanttScale[];
  /** @deprecated Dates are per-task on `GanttTaskData.start`/`.end`; ... */
  startDate?: string;
  endDate?: string;
  /** @deprecated Tasks use `children: GanttTaskData[]` directly on each task. */
  childrenField?: string;
  /** @deprecated ... */
  initiallyExpanded?: boolean;
  /** @deprecated Use `taskBarHeight` instead. */
  progressBarHeight?: number;
  ```
- **现状**: 6 个字段（scales/startDate/endDate/childrenField/initiallyExpanded/progressBarHeight）在实现侧已裁决弃用（types @deprecated + definitions 未注册，运行时永不 resolve 进 props），但 design.md §4 schema 块原样列出无弃用注记，§5 字段分类表仍归类为 props，且把 childrenField/scales 列为推荐默认值。2306-3 Phase 5 文档同步只覆盖了 §5 onTaskEdit 行。附带：types 中 "use zoomLevels for range control" 替代指引本身不准确（zoomLevels 只定义缩放档位，时间线范围实际由任务 start/end 推导）。
- **风险**: schema 作者按 design.md 编写 startDate/endDate/scales 等字段后静默无效（时间线范围仍由任务推算、刻度仍走 zoomLevels）——文档指引用户配置无效字段。
- **建议**: design.md §4/§5 同步 @deprecated 标注（对齐 calendar 字段 @reserved 先例 kanban columnsOrder\* 的标注做法）。
- **误报排除**: 非"漏传"新字段——实现侧是有意弃用；但文档仍将其表现为活契约，属 2306-3 文档同步残留空白。
- **复核状态**: 批量复核通过（保持 P2）

### 维度 23：测试有效性与假绿

#### [P2] 23-1 kanban-renderer 受控模式测试的 if/else 条件性跳过：addCard 按钮永远找不到，断言退化为恒真（假绿）

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-renderer.test.tsx:418-448`
- **严重程度**: P2（复核确认：i18n mock 映射 `'+ 添加卡片'` 与三个查找条件全部不匹配，else 分支恒执行；若受控模式错误派发 onCardAdd 该测试必然仍绿）
- **证据片段**:
  ```tsx
  // :437-447 —— addCardButton 恒为 undefined（'新增卡片'/'Add card'/includes('card') 对 '+ 添加卡片' 全部不命中）
  const addCardButton = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === '新增卡片' || b.textContent === 'Add card',
  ) ?? Array.from(...).find((b) => b.textContent?.includes('card'));
  if (addCardButton) {
    fireEvent.click(addCardButton);
    expect(onCardAdd).not.toHaveBeenCalled();
  } else {
    expect(onCardAdd).not.toHaveBeenCalled();   // ← 从未点击，恒真
  }
  ```
- **现状**: 测试标题声称"受控模式不派发 mutation 事件"，但 UI 路径从未被点击；i18n mock（:29）把 scheduling.kanban.addCard 映射为 `'+ 添加卡片'`，生产按钮文本 `t('scheduling.kanban.addCard')`（kanban-column.tsx:323），三个查找条件全部不命中。该测试来自 plan 2026-08-06-0329（git blame 确认，非今日计划，08-06 三轮审计未登记此问题）。缓解：受控模式 onCardAdd gating 在 kanban-handle.test.tsx:215-234 经句柄 invoke 路径正确锁定，行为级覆盖未完全丢失。
- **风险**: 结构性不可失败用例（bug-71 定义的"断言从不执行/平凡通过"假绿模式）；修复受控模式错误派发回归时该测试无法报红。
- **建议**: 用 `getAllByText('+ 添加卡片')` 定位真实按钮后点击并断言不触发（同文件 :138 已有正确先例）；或删除该测试（行为覆盖已由 kanban-handle.test.tsx 承担）。
- **误报排除**: 非合理 mock——被测 KanbanBoard 是真实组件，i18n mock 是本文件自带映射，按钮文本可精确预知；测试作者选择"找不到就恒真通过"而非"找不到就失败"。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 23-2 22-07 onTaskEdit：编辑器保存与行内提交两条生产派发路径的最终事件从未被断言（覆盖无效）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx:458-479`、`gantt-editor.test.tsx:151-202`、`gantt-components.test.tsx:66-86`（对照 `gantt.tsx:481-483` 与 `:532-534`）
- **严重程度**: P2（复核确认：onTaskEdit 事件层仅键盘删除一条路径被断言；两条编辑路径的 dispatchTaskEdit 接线 lambda 在全部测试中零执行）
- **证据片段**:
  ```tsx
  // gantt.tsx 生产接线（22-07 修复本体）：
  481:  onCellCommit={(taskId, column, value) => { dispatchTaskEdit({ _taskId: taskId, changes: { [column]: value } }); }}
  532:  onCommit={(taskId, partial) => { dispatchTaskEdit({ _taskId: taskId, changes: partial }); }}
  // 新增 4 用例的断言边界——都停在子组件回调层，未到事件层：
  gantt-editor.test.tsx:172   expect(onCommit).toHaveBeenCalledTimes(1);
  gantt-components.test.tsx:83 expect(onCellCommit).toHaveBeenCalledWith('t1', 'text', 'Renamed');
  gantt.test.tsx:470          expect(onTaskEdit).toHaveBeenCalledWith({ _taskId: 't1', deleted: true }, ...);  // 唯一事件层断言（键盘路径）
  ```
- **现状**: plan 2306-3 声称"onTaskEdit 三路径派发 + 16 条测试先红后绿"，但事件层只有键盘删除被断言；编辑器保存与行内提交两处的 dispatchTaskEdit 接线（正是 22-07 修复本体）零执行——若这两行被删除或 eventCtx 构造被破坏（事件照发但缺 evaluationBindings），16 条新测试全部保持绿色。跨层链路（GanttEditor/GanttGrid 回调 → Gantt 事件）只有分段测试、无贯通证明。
- **风险**: 22-07 修复的两条主路径（对应 design.md §8.1 事件表）无回归锁定；宿主集成依赖 onTaskEdit 的编辑事件可能静默丢失。
- **建议**: gantt.test.tsx 补端到端用例：渲染 Gantt + events.onTaskEdit，经真实 UI 路径触发编辑保存与行内提交，断言 onTaskEdit 收到 `{ _taskId, changes }` 且 ctx 携带 evaluationBindings。
- **误报排除**: 非"跨层由其它测试覆盖"——gantt-editor/gantt-components 断言的是 onCommit/onCellCommit prop，二者之间恰好隔着本次修复新加的接线代码；正是 bug-71 定位的集成接线边界缺陷高发区。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 14-5+23-3（合并去重）designer 空槽 Space 用例的 Number.isFinite 断言对 stub 恒有限输入为永真

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-node.keyboard.test.tsx:107-118`
- **严重程度**: P2 → **降级 P3**（复核：Enter 与 Space 共享同一 openSlotMenuFromElement 代码路径，Enter 用例 :100-103 已把中心值 200/90 精确锁死，Space 的 finite 断言相对 Enter 无额外判别力，属冗余弱断言非可掩盖独立回归的假绿；两维度重复报告已合并）
- **证据片段**:
  ```tsx
  it('opens the slot add menu on Space with finite element-center coordinates', () => {
    ...
    expect(Number.isFinite(clientX)).toBe(true);   // stub 矩形恒有限 → 永真
    expect(Number.isFinite(clientY)).toBe(true);
  });
  ```
- **现状**: stubSlotRect 恒返回有限矩形（left:100/top:50/right:300/bottom:130）；Space 用例的数值断言都是永真断言；真正行为锁定靠 Enter 用例的精确值断言（同一 handler 路径）。真实 fail-closed 行为（元素未布局、零尺寸矩形）无任何用例。
- **建议**: Space 断言改为与 Enter 相同的精确中心值（200/90）；或删除仅保留 Enter；如需锁定 NaN 防护，加零矩形/异常值用例。
- **误报排除**: 非"纯工具函数隔离测试"——Number.isFinite 断言直接位于被测行为之上，但 Enter 已覆盖同路径，降 P3 恰当。
- **复核状态**: 批量复核合并降级（P3，仍保留，入 backlog）

#### [P2] 23-4 kanban-handle.test.tsx 中 scrollToCard/scrollToColumn 两个句柄零行为覆盖（含 not-found 错误路径）

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-handle.test.tsx:120-140`（对照 `kanban-handle.ts:47-64`）
- **严重程度**: P3（复核确认：两句柄只有 listMethods/hasMethod 存在性断言，无 invoke 行为断言；not-found ok:false 路径零执行）
- **证据片段**:
  ```tsx
  // :128-139 —— 仅存在性断言
  expect(handle.capabilities.listMethods!()).toEqual(['scrollToCard', 'scrollToColumn', 'addCard', ...]);
  for (const method of [...]) { expect(handle.capabilities.hasMethod!(method)).toBe(true); }
  // kanban-handle.ts:47-64 的 scroll 句柄 not-found 分支（:52-54/:61-63）零测试
  ```
- **现状**: 新文件声称 7 方法全部注册可解析，但 2 个方法只有"存在性"断言；`scrollToCard('missing') → {ok:false, error}` 的负面契约从未验证；其余 5 句柄有 invoke 覆盖（:142-234）。
- **建议**: 补两条 invoke 用例：scrollToCard('card1')/scrollToColumn('col1') 返回 {ok:true}（jsdom 中 scrollIntoView 为 no-op，直接断言返回值）+ 不存在 id 返回 {ok:false}。
- **误报排除**: 非合理 mock 问题——新增测试文件内部覆盖不完整；该契约已进入 capability 契约登记，补测成本极低。
- **复核状态**: 批量复核通过（P3，仍保留，入 backlog）

---

## 5. 零发现结论

### 维度 09（渲染器契约合规性）—— 零新发现

初审 agent 对 2026-08-07 全部变更面（plan 1053-1 拆分、0819-1/2/3、1023-3、2306-2 验收、0711-1）逐一核查渲染器契约合规后零发现，关键验收结论：

- **1053-1 拆分全部为 verbatim 代码搬迁**：form-init-action/form-load-action/form-lifecycle-helpers 与拆分前逐字一致（含 loadLifecycleScopeRef 快照、lastInitKeyRef/inFlightInitKeyRef 守卫、'use no memo'）；hooks 无条件调用无条件调用违规。
- **09-01/09-02 残留验收——全部配对，零残留**：全仓 createScope/createChildScope 调用点逐一核对（含今日迁移文件 tree-control-sources/crud-renderer-load），所有一次性求值点均 finally 配对或走 evaluationBindings 一次性通道。
- **0819-1**：designer-xyflow-node 键盘路径无 KeyboardEvent cast，role/tabIndex/aria-label 完整；designer-page-body JSON 导出失败经 effect 内 reportHostIssue（无渲染期副作用）。
- **0819-2/0819-3/1023-3/0711-1**：variant-field labelContent 通道、spreadsheet-toolbar 纯 data-slot、diff-file-list token 化、kanban helpers 类型收紧、gantt 缩放单驱动与键盘守卫、kanban re-seed——全部合规。
- 抽查项：gantt/kanban/graph 根节点 data-testid/data-cid/data-slot + nop-\* marker 齐全；regions.render 均传 scope/instancePath/pathSuffix；事件全部 void handler(payload, { event, evaluationBindings, scope })；变更文件零 createContext。

### 其他零发现面

- **维度 06/04/05/10/11/12/13/15/17/18/19/20/21**（本轮未重派，消费 08-05/08-06 复核结论 + 工具基线）：audit-event-dispatch-ctx 零命中、audit-async-failure-paths 201 命中未复核出新的用户可见失败、audit-styling-suspects 命中全部落在两个自绘面（spreadsheet canvas + ai）、audit-runtime-raw-schema-reads 唯一命中已裁决为工具误报。
- **1023-1 验收**：find-renderer-browser-io 门禁作用域 14 包 + import() 规则零命中（14-1 的夹具污染风险是测试设计问题而非门禁规则问题）。

---

## 6. 跨维度模式

1. **「修复后文档未同步」家族（维度 02/16/22，5 条：02-05/16-1/16-2/16-3/16-4/22-14）**：1053-1 十文件拆分 + 治理债收口后，module-boundaries.md（5 子模块缺条目 + hub 描述 stale）、pc-index.md（守卫台账 red 集未更新）、crud-comparative-analysis.md（form.tsx 行号越界）、crud/design.md（resolveToolbarBlocks 位置）、nested-schema-field-classification.md（行段失效）、gantt/design.md（6 个 @deprecated 字段仍列 live props）全部遗留旧状态。模式：**大规模拆分的文档同步只覆盖了计划声明文件，未做全仓引用扫描**。
2. **「句柄/reaction 双路径不对称」家族（维度 22，22-13）**：gantt 工具栏路径派发 3/4 reaction 而 handle invoke 路径 0/4；calendar 22-05 已建立"句柄 invoke 即派发"家族标准而 gantt 未对齐。与 22-05/22-12 同族（ready 但永不 dispatch / 声明即死的动作契约）。
3. **「新增测试的断言边界停在子组件回调层」家族（维度 23，23-2/23-4）**：修复接线（dispatchTaskEdit、句柄 invoke）的测试只断言到 prop 回调层或存在性层，事件层/行为层无断言——修复本体零执行。
4. **「测试基建模式」家族（维度 14，14-1/14-2/14-4）**：今日新增/拆出的测试支撑代码（夹具目录写入真实包目录、import 即注册全局 hook、模块顶层计数器）全部与仓库既有显式 opt-in 先例（canvas-bridge-test-support）相悖。

## 7. 高频问题文件

| 文件                                                                          | 出现维度   | 发现数                |
| ----------------------------------------------------------------------------- | ---------- | --------------------- |
| `packages/flux-renderers-scheduling/src/gantt/*`（gantt.tsx/design.md/types） | 22、23     | 3（22-13/22-14/23-2） |
| `docs/`（module-boundaries/pc-index/crud 文档/nested-schema）                 | 02、16     | 5（02-05/16-1..16-4） |
| `scripts/`（check-workspace-manifest-deps/rules.mjs/测试夹具）                | 01、03、14 | 3（01-02/03-03/14-1） |

## 8. 已自动化的检查项（不需人工跟进）

- compile-once 硬门禁（`check:audit-runtime-raw-schema-reads` 唯一命中为工具误报，已裁决）
- renderer marker 门禁（`check:audit-missing-renderer-markers` 零命中）
- manifest 依赖门禁（`check:workspace-manifest-deps` exit 0，含新跨包相对导入规则）
- oversized 门禁（`check:oversized-code-files` exit 0，2 豁免已登记）
- 事件 ctx 门禁（`check:audit-event-dispatch-ctx` 零命中）
- browser-io 门禁（`check:audit-renderer-browser-io` 零命中，14 包作用域）
- eslint ban-ts-comment / no-eval / no-new-func / jsx-a11y（通过）
- 1053-1 拆分"零公共 API/导出/包边界变化"声明：**独立复核验证通过**（10 文件导出面与拆分前全部等价、index 零 diff、测试计数等价）

## 9. 建议新增的自动化检查

1. **声明未使用依赖反向检查**（03-02 暴露盲区）：`check-workspace-manifest-deps` 增加"package.json 声明但 src 零引用"反向规则，使死依赖（如 graph 的 use-sync-external-store）可见。
2. **测试 fixture 目录保护**（14-1 暴露）：门禁 ignore 列表统一加 `__inv1_scan_fixture__` 或强制夹具写临时目录；test-global-leaks 规则扩展识别"const 变体模块态"（localStorageState 模式）。
3. **事件层接线贯通断言提示**（23-2 暴露）：启发式扫描"新增事件契约（onTaskEdit 等）的测试仅断言到 prop 回调层"——可作为 code review checklist 而非门禁。

## 10. 误报排除清单（复核中判定不报告）

- crud-renderer-schema-builders.ts:128 raw-schema-read 命中（JSDoc 块注释误报 + :115 合法 region schema 组合，非 compile-once 违规）
- 16-5 commit full-green 声明（daily log 已纠正，历史瑕疵不回写）
- 02-06 route-entries 命名双轨（calibration 10 纯命名一致性，降级不保留）
- 14-4/14-5+23-3/23-4（降级 P3 仍保留入 backlog，非驳回）
- 08-06/08-05 全部已路由发现（按去重清单不重复报告）

---

## 11. 汇总

| 优先级 | 数量 | 驱动              | 说明                                                                            |
| ------ | ---- | ----------------- | ------------------------------------------------------------------------------- |
| `[P0]` | 0    | —                 | 无 blocking 级发现                                                              |
| `[P1]` | 1    | 修复计划          | 22-13 gantt 句柄 invoke 不派发 schema reaction（scrollToTask 零 dispatch 通道） |
| `[P2]` | 19   | follow-up backlog | 含 3 条复核降级 P3 项；无 P2-only 审计                                          |

**总评**: 今日大规模变更（10 文件拆分、flux-bundle 边界、scheduling P1 修复、事件 ctx/scope 配对全量扫描）经独立复核**质量验收全部通过**——拆分零公共 API 漂移、P1 修复真实落地、新增测试绝大多数为真实"先红后绿"行为锁定。核心新风险集中在 gantt 组件句柄路径的 schema reaction 静默死契约（22-13，P1）——与 22-05/22-12 同族，建议优先修复并补"句柄 invoke 即派发"回归测试。其余 19 条 P2 中，文档同步滞后家族（6 条）成本极低、可随下次文档维护批量闭合；测试覆盖缺口家族（23-2/23-1）建议随修复计划补端到端用例。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
