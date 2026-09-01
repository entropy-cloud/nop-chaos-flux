# 168 Barcode Detector pdf_417 Spec Enum Name Construction Crash

## Problem

- 在 Chromium 打开任何挂载 `barcode-input` 的页面（component lab、host surface、domain page），`BarcodeScannerOverlay` 组件崩溃并由 `NodeErrorBoundary` 反复重建，console.error 风暴（单页 360+ 条）。
- e2e 侧表现为 barcode 家族 4 例稳定红（zero-error 门禁全部触发）；错误首帧：`TypeError: Failed to construct 'BarcodeDetector': Failed to read the 'formats' property from 'BarcodeDetectorOptions': The provided value 'pdf_417' is not a valid enum value of type BarcodeFormat.`
- 首次登记于 2026-08-25 基线（`docs/logs/2026/08-25.md` 归因为"本机 Chromium 能力面缺陷"），实际为产品代码命名规范错误，任何严格实现 W3C 枚举的 Chromium 都会复现。

## Diagnostic Method

- 聚焦复跑 `component-lab/smoke.spec.ts -g barcode-input` 拿到完整 TypeError 栈：`createBarcodeDetector`（`barcode-detector-utils.ts`）构造行直接抛出。
- 对照 W3C Shape Detection API 的 `BarcodeFormat` 枚举表：规范拼写为 **`pdf417`（无下划线）**；`pdf_417` 是 ZXing 命名风格（`BARCODE_FORMAT_TO_ZXING` 映射表用的就是 `PDF_417`）——两套命名在同一个默认格式列表里混用了。
- 确认错误同步逃逸 `useEffect`（`use-barcode-detect.ts:46` 无 try/catch）→ React 错误边界重建 → 再次抛出，形成崩溃循环。

## Root Cause

- 原生 `BarcodeDetector` 构造参数里的格式名必须走 W3C 枚举（`pdf417`），代码却直接复用了 ZXing 风格的 canonical 名（`pdf_417`）→ 构造期 TypeError。
- 构造无任何容错：单格式不支持即整组件崩溃，无 ZXing 回退路径可达（回退只在"无原生 BarcodeDetector"分支生效）。

## Fix

`packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-detector-utils.ts`：

- 新增 `BARCODE_FORMAT_TO_NATIVE` 规范名映射（唯一差异项 `pdf_417 → pdf417`）+ 反向映射（native 检出 `pdf417` 归一化回 canonical，保持 native/ZXing 两路 `result.format` 输出一致——format 进入事件 payload 与显示文案）。
- 原生构造包 try/catch：失败先以无参 `new BarcodeDetector()` 重试（能力差异降级），再失败落到既有 ZXing ponyfill——构造路径不再可能同步抛错。

## Regression Tests

`barcode-detector-utils.test.ts` 新增 4 条（随修复先红后绿）：

- `pdf_417` 显式请求 → 构造收到 `['qr_code','pdf417']`；
- 默认格式列表 → 含 `pdf417` 且不含 `pdf_417`；
- 原生构造两连抛（含无参重试）→ ZXing 回退可检出；
- （既有 native 用例保持绿：确认无回归。）

e2e 保护：barcode 家族 4 例（smoke / c9-host-surfaces / domain-page-zero-error / lab-batch-zero-error）随本修复转绿，zero-error 门禁即为回归门禁。
