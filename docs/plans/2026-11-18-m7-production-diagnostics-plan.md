# M7 生产诊断模式 + AI 深化

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M7 节）· docs/research/2026-11-17-flux-devtools-design.md §9 · roadmap M5 附注（回放分歧报告消费）
> Related: M0（协议）、M2（capture tag 证据）、M4（Why verdict）、M5（DevSession/分歧）、既有 `nop-debugger-ai` schema-patch 流

## Purpose

调试能力反哺生产支持与 AI 辅助：构建宏裁剪（生产仅留错误遥测 + 最小诊断包采集器）、脱敏诊断包（DevSession 摘要 + 关键帧）采集与开发环境重放、AI 修复建议输入（对接既有 `nop-debugger-ai` schema-patch 流）。

## Current Baseline（live repo 核对）

- M5 已交付 DevSession 采集（recorder.ts）与回放分歧（replayer Divergence）。
- `nop-debugger-ai` 已有 schema-patch 流（patch-queue、panel 接线，M1-M5 期间多次引用）。
- 无 `__FLUX_DEVTOOLS__` 构建宏——debugger 目前通过 options.enabled 开关，生产包内全量内核可达（panel/ai-tab 懒加载但模块在 bundle 中）。
- Why verdict（M4）有 screenshotTag 字段；回放分歧（M5）有 Divergence 结构——尚无"AI 修复建议输入"聚合面。
- 生产构建链：vite + turbo；无按条件裁剪 nop-debugger 的机制。

## Goals

- 构建开关：`__FLUX_DEVTOOLS__` 构建宏（vite define + TypeScript declare），生产构建（`NODE_ENV=production` / 显式 flag）裁剪为错误遥测 + 最小诊断包采集器（动态 import），全量内核不可达（静态检查 + 运行时探针双验）。
- 诊断包：脱敏 `DevSession` 摘要（事件流 + 快照摘要 + schema patch 审计 + 关键帧挑选：断言失败/Why verdict/首末帧）采集 API + 打包（JSON + 帧列表），上传走 M0 协议 `capture.upload` 面（gateway 缺位时本地保留）。
- 开发环境重放诊断包：`replayDiagnosticBundle(bundle)` → 复用 M5 replaySession + 分歧报告。
- AI 深化：`buildAiRepairInput({whyReport?, divergences?, visualDiff?})` → 结构化建议载荷（**类型定义在 nop-debugger**，`nop-debugger-ai` 消费——ai-boundary 扫描标记串 + 反向依赖会成环，方向不可反）。
- CDP 截图通道 A：**Deferred**（依赖 M6 gateway 采集代理，见 Deferred 节）。

## Non-Goals

- M6 gateway 本体（跨仓库 BLOCKED，见 roadmap M6 附注）；上传重试队列/服务端归档；真实生产环境遥测管道（仅本地保留 + 协议面预留）。

## Scope

### In Scope

- flux-react/playground 构建链：`__FLUX_DEVTOOLS__` define 宏 + `src/vite-env.d.ts` declare；debugger 安装点（apps/playground App.tsx createNopDebugger）按宏裁剪；`pnpm check` 新增静态门禁（生产构建产物不含全量内核标记）
- nop-debugger：`diagnostic-bundle.ts`（诊断包采集/打包/脱敏终检 + `replayDiagnosticBundle`）、AI 修复输入聚合（`buildAiRepairInput`，patch 建议类型定义在 nop-debugger 侧（nop-debugger-ai 消费，方向不可反——ai-boundary 扫描标记串 + workspace 环约束））
- e2e/单测：宏裁剪双验（静态扫描 + 运行时探针）、诊断包 schema 往返、AI 输入聚合判别、重放诊断包
- 文档：quick-reference 生产诊断节；roadmap M7 附注；daily log

### Out Of Scope

- gateway 上传本体、CDP 通道、真实遥测后端（Deferred/Blocked by M6）

## Failure Paths

| 场景               | 触发                       | 行为                                                               | 可重试       | 用户可见表现 |
| ------------------ | -------------------------- | ------------------------------------------------------------------ | ------------ | ------------ |
| macro-leak         | 生产 bundle 含全量内核标记 | `check:devtools-tree-shake` 门禁失败（fail-fast）                  | 是（修构建） | CI 红        |
| bundle-decode-fail | 诊断包 JSON 损坏           | `replayDiagnosticBundle` 抛 `ProtocolError{code:'bundle-invalid'}` | 否           | 面板报损     |
| ai-boundary-reject | AI 输入含越界字段          | ai-boundary 既有校验拒绝（不新增越界面）                           | 否           | 面板报错     |

## Test Strategy

档位选择：`必须自动化`（生产构建裁剪 = 安全红线；诊断包往返 = 核心回归）

Proof 先行：宏裁剪静态门禁先于消费面接线；诊断包 schema 往返判别用例先行。

## Execution Plan

### Phase 1 - 构建宏 + 裁剪门禁

Status: completed
Targets: `apps/playground/vite.config.ts`、`apps/playground/src/`、`scripts/check-devtools-tree-shake.mjs`、package.json

- Item Types: `Fix | Proof`

- [x] Proof 先行：`scripts/check-devtools-tree-shake.mjs`——扫描生产构建产物（apps/playground/dist/assets）断言不含全量内核标记（如 `NopDebuggerPanel`、`createNopDebugger`、`__NOP_DEBUGGER_API__` 标识串）；**dist 缺失时门禁显式失败（fail-loud，不静默绿、不在 check 内构建）**——构建由 CI/发布流程先行产出（`pnpm --filter @nop-chaos/flux-playground build --mode production`）；本计划执行期先手动构建产出再跑门禁验证红→绿
- [x] `__FLUX_DEVTOOLS__` define 宏（playground vite config `({ mode })` 按 mode：dev/test=true、production-build=false；仓库无 define 先例，采用 `__VUE_OPTIONS_API__` 同款字面量替换模式）+ 全局 declare；**包级单测不经 playground vite config——nop-debugger 源内引用宏处使用 `typeof __FLUX_DEVTOOLS__ !== 'undefined' && __FLUX_DEVTOOLS__` 运行时守卫（未 define 时为 falsy=裁剪语义），宏由宿主 vite define 注入**
- [x] App.tsx 安装点按宏条件化（import at :2、createNopDebugger :76、NopDebuggerPanel :243、window.**NOP_DEBUGGER** :66；**debuggerController 线程入 renderDomain 被多个 route page 消费——宏裁剪需让 controller 在裁剪模式下为轻量 stub 对象（同形状 no-op），避免非 App chunk 残留引用被门禁捕获**）
- [x] 门禁入 `pnpm check`（`check:devtools-tree-shake`）

Exit Criteria:

- [x] 门禁脚本红→绿判别（裁剪前后产物对照）；宏=true 语义明确限于 playground vitest config define（nop-debugger 包级单测走 typeof 守卫 falsy=裁剪语义）
- [x] `pnpm check` 全链绿（新门禁入链）
- [x] dev/test 构建不受影响（playground dev 正常、单测环境宏=true）

### Phase 2 - 诊断包 + AI 修复输入

Status: completed
Targets: `packages/nop-debugger/src/diagnostic-bundle.ts`、ai-boundary

- Item Types: `Fix | Proof`

- [x] Proof 先行：诊断包 schema 往返判别单测（JSON 往返 + 脱敏终检 + 损坏包拒绝）——先红后绿
- [x] `diagnostic-bundle.ts`：`collectDiagnosticBundle()` → 脱敏 DevSession 摘要 + schema patch 审计 + 关键帧挑选（断言失败/Why verdict/首末帧截图 tag 引用）；`replayDiagnosticBundle(bundle)` → M5 replaySession 复用 + 分歧
- [x] `buildAiRepairInput({whyReport?, divergences?, visualDiff?})` → 结构化建议载荷，**类型定义在 nop-debugger 侧**（ai-boundary 既有扫描禁止 nop-debugger 源中出现 `@nop-chaos/nop-debugger-ai` 标记串，且反向 import 会构成 workspace 环——方向为 nop-debugger-ai 消费 nop-debugger 的类型，不得反向）
- [x] automation V2：`collectDiagnosticBundle` / `replayDiagnosticBundle` / `buildAiRepairInput`
- [x] 单测：脱敏终检判别、关键帧挑选、AI 载荷判别（越界字段拒绝）

Exit Criteria:

- [x] 诊断包单测全绿（往返/损坏/脱敏判别）
- [x] AI 输入聚合单测绿（判别性：非法字段被 ai-boundary 拒绝）
- [x] automation V2 挂载且向后兼容

### Phase 3 - 文档 + 收口

Status: completed
Targets: docs

- Item Types: `Proof`

- [x] quick-reference 生产诊断节；roadmap M7 附注（CDP 通道 A Deferred→M6；gateway 上传 Deferred→M6）
- [x] daily log

Exit Criteria:

- [x] docs 落盘且与 live 契约一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
- Verdict: fail→修订→re-review 中（round 1：2 Major——buildAiRepairInput 类型方向与 ai-boundary 冲突（已改为 nop-debugger 定义类型、nop-debugger-ai 消费）、tree-shake 门禁无构建前置语义（已定 fail-loud + CI 先行构建）；3 Minor——define 无先例/test 宏接线（typeof 守卫）、App 安装点 consumer 波及（stub 同形状对象）、其余 surfaces 可行性核实通过）
- Rounds: 2
- Findings addressed: Major×2 + Minor×3 如上

## Closure Gates

- [x] 宏裁剪双验落地（静态门禁 + 运行时探针）且入 `pnpm check`
- [x] 诊断包采集/脱敏终检/重放判别测试绿
- [x] AI 修复输入聚合落地（ai-boundary 内）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### CDP 截图通道 A（采集 §2.1）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 依赖 M6 gateway 采集代理（`capture.cdp` RPC），gateway 跨仓库 BLOCKED；S2 截图通道已覆盖诊断包帧需求（含遮罩）。
- Successor Required: `yes`
- Successor Path: M6（nop-entropy 平台排期后）

### gateway 上传/真实遥测管道

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 上传面（M0 `capture.upload`）已预留，本地保留已覆盖诊断包闭环；服务端归档归 M6。
- Successor Required: `yes`
- Successor Path: M6

## Non-Blocking Follow-ups

- 诊断包压缩（gzip base64）
- 遥测采样率配置面

## Closure

Status Note: M7 三 Phase 落地：`__FLUX_DEVTOOLS__` 宏裁剪（生产 bundle 内核不可达，check:devtools-tree-shake 入 check 链，红→绿判别 live 验证）、诊断包采集/脱敏终检/replayDiagnosticBundle、AI 修复输入聚合（类型 nop-debugger 侧，方向约束落死）。closure audit round 1 approved（3 Minor 非阻塞）。CDP/gateway Deferred→M6（BLOCKED：nop-entropy 不在本机）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18，1 轮）
- Evidence: verdict approved（0 Blocker / 0 Major / 3 Minor 非阻塞）。live 验证：m7 单测 7/7、nop-debugger 285/285、门禁红→绿判别实跑（dist 注入标记→FAIL→还原→green）、dist 缺失 fail-loud 验证、宏 mode 键控核实、ai-boundary 方向核实（零 AI import）。

Follow-up:

- （见 Non-Blocking Follow-ups）
