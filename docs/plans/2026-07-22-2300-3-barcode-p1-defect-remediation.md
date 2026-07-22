# S18 — Barcode-input P1 缺陷修复

> Plan Status: active
> Last Reviewed: 2026-07-22
> Source: `docs/components/roadmap-scheduling.md` S18, `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §4, `docs/components/barcode-input/design.md`
> Related: `docs/plans/2026-07-22-2300-1-kanban-p1-defect-remediation.md`, `docs/plans/2026-07-22-2300-2-calendar-p1-defect-remediation.md`

## Purpose

修复 Barcode-input 组件 6 个已确认的 P1 缺陷（含显示 + 可操作性），使摄像头扫码在 playground 演示态可工作（覆盖层正确门户定位、Firefox/Safari 可解码、Torch 可关闭、错误时显示 UI、手动录入正常）且与 design 文档对齐。

## Current Baseline

- Barcode-input 组件已注册（`scheduling-renderer-definitions.ts:163-172`），main renderer `barcode-input.tsx` 230 行
- S14（P0 视频流挂接）已于 `2026-07-22-1600-1` plan 修复：`<video>` 始终渲染（CSS 切换可见性）+ 响应式 effect 挂接 `stream→srcObject`
- 6 个 P1 缺陷全部来自 `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §4，经 3 轮独立 agent 共识确认
- 剩余 gap：

| ID        | 模块              | 一句话                                                                              | 来源          |
| --------- | ----------------- | ----------------------------------------------------------------------------------- | ------------- |
| B-DISP-01 | overlay 定位      | 覆盖层普通内联 `fixed` 而非 portal 到 body → 被祖先 clip                            | analysis §4.1 |
| B-DISP-06 | 降级检测          | 无 zxing ponyfill，FF/Safari 永不解码                                               | analysis §4.1 |
| B-OP-02   | WASM 缓存毒化     | `prepareWasm` 的 AbortSignal 毒化缓存单例                                           | analysis §4.2 |
| B-OP-04   | Torch 关闭        | `applyConstraints({torch:false})` 无效，需 stop+restart                             | analysis §4.2 |
| B-OP-08   | 相机错误传播      | `start()` catch 抓错误但不 re-throw，`phase='scanning'` 改写，`camera.error` 无人读 | analysis §4.2 |
| B-OP-09   | handleChange 拦截 | minLength/pattern 在 `setValue` 前 return → 逐字键入失败                            | analysis §4.2 |

## Goals

- 修复所有 6 个 Barcode-input P1 缺陷
- 为每个 P1 修复加上 focused 单测或修正断言（尤其替换 `expect(true).toBe(true)` 同义反复用例）
- 达成 `pnpm typecheck && pnpm build && pnpm lint && pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿

## Non-Goals

- 不处理 P2/P3 项（CSS 样式的 hover/active 过渡、状态机文案 i18n、data-slot 重复、倾斜重试 CPU 优化、onMount cleanup 随 render 触发——详见 Deferred But Adjudicated）
- 不实现批量扫描队列增强（`batchMode` 已实现但 UX 细节不进本 plan）
- 不添加 E2E 测试（需 mock 摄像头——超出本 plan scope）
- 不负责 `@zxing/library` 的 bundle 引入决策（ponyfill 实现已含在 scope 中）

## Scope

### In Scope

- `barcode-scanner-overlay.tsx`（portal + error propagation + WASM abort）
- `utils/barcode-detector-utils.ts`（zxing ponyfill）
- `utils/prepare-wasm.ts`（AbortSignal 剥离）
- `hooks/use-barcode-torch.ts`（torch 关闭）
- `hooks/use-barcode-camera.ts`（error 传播）
- `barcode-input.tsx`（handleChange 拦截 fix）
- 对应 focused 单测（修复/重写）

### Out Of Scope

- `camera-utils.ts` `checkCameraAvailability` 轻量化改造（B-OP-03 降级 P2）
- 倾斜重试单角轮询重构（B-OP-05, P2）
- `onMount`/`onUnmount` effect deps 修复（B-OP-06, P2）
- 扫码结果跨会话清除 / 同码连续触发（B-OP-07, P3）
- B-CD 契约漂移 P3 项（包名、事件嵌套格式、BarcodeFormat 映射、`scanNow` 失败码、`batchMode` 设计补齐）
- `barcode-input/index.ts` barrel 文件创建（当前通过直接路径导入，功能不阻塞）

## Failure Paths

不适用——纯内部缺陷修复，不涉及外部 API/鉴权/集成。

## Test Strategy

档位选择：`必须自动化`

原因：analysis §4 每个 P1 有明确 live code path。Barcode 的测试目前有多处同义反复（`expect(true).toBe(true)`），必须替换为有效行为断言。

## Execution Plan

### Phase 1 — Portal 定位 + 错误传播 + WASM 缓存

Status: planned
Targets: `barcode-scanner-overlay.tsx`, `hooks/use-barcode-camera.ts`, `utils/prepare-wasm.ts`

- Item Types: `Fix | Fix | Fix`

- [ ] B-DISP-01: overlay 用 `createPortal(<div/>, document.body)` 渲染替代内联 fixed div
- [ ] B-OP-08: `start()` catch 内 re-throw 或 `barcode-scanner-overlay.tsx` 用 effect 读 `camera.error` 转 `phase='error'` 并调 `onScanError`
- [ ] B-OP-02: `prepare-wasm.ts` 剥离 AbortSignal（WASM 单例）；遇 AbortError 立即中断重试（不烧 setTimeout）+ promise 自愈（`promise.catch(()=>{ wasmPromise=undefined })`）

Exit Criteria:

- [ ] overlay 在 DOM 树中位于 `<body>` 下
- [ ] 相机权限拒绝时 overlay 显示错误 UI 并触发 `onScanError`
- [ ] 开→关→重开扫码器不会卡在"加载中"超过 0.5s

### Phase 2 — Torch 关闭 + zxing ponyfill + handleChange

Status: planned
Targets: `hooks/use-barcode-torch.ts`, `utils/barcode-detector-utils.ts`, `barcode-input.tsx`

- Item Types: `Fix | Fix | Fix`

- [ ] B-OP-04: Torch 关闭采用 stop+restart 流模式（react-zxing `useTorch.ts:40-49` 模式）
- [ ] B-DISP-06: 实现 `@zxing/library` ponyfill 检测器；无原生 `BarcodeDetector` 时 fallback 到 zxing；或显式报"浏览器不支持"（error phase 含 message）
- [ ] B-OP-09: `handleChange` 始终调 `form.setValue`，minLength/pattern 走表单校验层；补输入测试（设 minLength=4 后逐字键入 "ab" 不应回退）

Exit Criteria:

- [ ] Torch 开关状态翻转时灯实际开/关
- [ ] Firefox/Safari 环境下扫码器显示"不支持的浏览器"或实际解码（取决于 ponyfill 实装）
- [ ] 设了 minLength 的条码字段允许逐字输入（不吞键）

## Draft Review Record

> 由独立子 agent 在起草后 review 填写。

- Reviewer / Agent: mission-driver (fresh session, plan-review role)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: No Blocker or Major issues found. Minor: timing criterion "不超过 0.5s" in Phase 1 Exit Criteria is aggressive but concrete; test bundling within Fix items (no separate Proof items) is acceptable per Rule 15 (live defects → Fix).

## Closure Gates

- [ ] 所有 6 个 Barcode-input P1 缺陷已修复（Phase 1-2 exit criteria 全勾）
- [ ] 必要 focused verification 已完成（每个修复项对应单测确认行为；替换所有 `expect(true).toBe(true)` 同义反复）
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] 受影响 owner docs 已同步（`docs/components/barcode-input/design.md` 如有变更）
- [ ] 由独立子 agent 执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling test`

## Deferred But Adjudicated

### Barcode P2/P3 残留（B-DISP-03/04/05, B-OP-03/05/06/07, B-CD-01/02/03/04/05）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 6 个 P1 修复后 Barcode-input 在 playground 演示态可工作：覆盖层正确 portal、相机错误有反馈、手动录入正常、Torch 可关、FF/Safari 有降级路径（报错或 ponyfill）。P2/P3 项（CSS 样式细节、文案 i18n、倾斜重试优化、检查轻量化、effect cleanup）不影响核心扫码体验的正确性。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无——所有 in-scope P1 项均需在本 plan 落地；P2/P3 已移入 Deferred But Adjudicated

## Closure

Status Note: 完成时填写

Closure Audit Evidence: 完成时填写

Follow-up: 完成时填写
