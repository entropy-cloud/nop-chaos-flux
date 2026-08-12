# 161 Barcode Input Scan Poll Dead On Closed Mount Fix

## Problem

- `barcode-input` 的标准主流程（挂载时关闭 → 用户点击扫码打开 → 摄像头就绪 → 识别）下，**一次 `detector.detect()` 都不会执行**，扫码功能整体失效（P0-01）。
- 根因链：`useBarcodeDetect` 主 effect deps `[]`（仅挂载时跑一次），挂载瞬间 overlay 必然处于 `open=false`、`videoRef.current === null`，第 45-46 行 `const video = getVideoRef.current(); if (!video) return;` 使 effect 早退——`poll()` 从未被调度；`open` 翻转后 camera effect 重跑，但检测轮询永不建立。
- 同族文档漂移（P2-11）：`design.md` 仍声称 `continuousScan` 默认 `true`、`wasmUrl` 默认公共 CDN（代码默认 `false` / fail-closed 抛错）；离线横幅文案承诺不存在的「恢复网络后自动提交」。

## Diagnostic Method

- 审计主 agent live 复核：逐行读 `use-barcode-detect.ts:40-138`，推演 React 生命周期——deps `[]` + 组件内部条件渲染 + 无 key 重挂载 ⇒ 挂载即早退、无任何恢复路径。
- 测试假绿确认：`use-barcode-detect.test.ts` 总是先构造好 video 再渲染（早退永不触发），overlay 测试总是 `open={true}` 挂载——「关闭态挂载 → 打开」转换零覆盖。
- 验证修复的判定证据：新增「video 为 null 挂载 → video 出现」序列测试，修复前 RED（advanceTimers 后无任何调度），修复后 GREEN。

## Root Cause

- `use-barcode-detect.ts:45-46` 的 video 早退把「轮询从挂载即运行、`poll()` 内部自行处理 video 缺失重试（:77-88）」的设计意图直接短路——`poll()` 内部明明已处理 `enabled=false` 空转与 video 缺失，早退是纯冗余且致命。
- overlay 无条件挂载（`!open` 时返回 null 但不卸载 hook），叠加 deps `[]`，使「关闭态挂载」成为唯一且必然的首挂载路径。
- 文档漂移根因：修复闭环只更新了代码或文档其中一面（卡 P3-1 声称 fixed 但 design.md 未同步），未做跨面一致性验证。

## Fix

- `use-barcode-detect.ts` 删除第 45-46 行早退（`const video` 与 `if (!video) return;` 一并删除，避免未使用变量 lint 命中）；主 effect 保持 deps `[]`，轮询从挂载即运行，video 缺失/未就绪由 `poll()` 内建重试路径处理。
- 离线横幅 i18n 文案改为如实描述（`flux.offlineQueueMessage` en/zh 两处副本）：不再承诺不存在的自动提交。
- `design.md` 同步：`continuousScan` 默认 `false`、`wasmUrl` fail-closed（无内置默认 CDN 端点）、§13 决策表 `wasmUrl` 默认值删除。
- 随 P0-01 收口删除 `camera-utils.ts` `clearCameraAvailabilityCache` 死导出（P2-17 barcode 子项，零消费者）。

## Tests

- `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.test.ts` — 新增「关闭态挂载（video null）→ video 出现 → 检测结果产出」用例，先红后绿；既有单测零回归。
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.test.tsx` — 新增「open=false 挂载 → open=true」转换用例，断言同一 detect hook 实例的 `enabled` 从 false 翻转为 true（覆盖真实挂载链）。
- `packages/flux-renderers-scheduling/src/barcode-input/utils/camera-utils.test.ts` — 移除 `clearCameraAvailabilityCache` 依赖，改 `vi.resetModules()` + 动态 import 做模块级缓存隔离。

## Affected Files

- `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`（i18n key 消费不变）
- `packages/flux-renderers-scheduling/src/barcode-input/utils/camera-utils.ts`
- `packages/flux-i18n/src/locales/en-US.ts`、`packages/flux-i18n/src/locales/zh-CN.ts`
- `docs/components/barcode-input/design.md`

## Notes For Future Refactors

- `useBarcodeDetect` 的轮询循环是「挂载即运行 + 内部重试」语义：任何在 effect 体内对 video/enabled 的早退都是致命回归（P0-01 教训）；新增前置条件只应放进 `poll()` 内部的重试分支。
- 测试必须覆盖「组件标准使用路径」的转换序列（关闭态挂载 → 打开），不能只测函数已就绪的单态；接线面假绿是本组件族最系统性风险。
- overlay 保持无条件挂载（内部 `!open` 返回 null）：hook 生命周期与 open 状态解耦，任何改成条件挂载的「优化」都会复活 P0-01。
