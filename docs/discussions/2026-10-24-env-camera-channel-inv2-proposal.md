# 提案：`env.mediaDevices?` — camera/media 可选能力通道（INV-2 评审提案）

> Status: **proposed — 待人审（Cross-Cutting 8 结构性变更 gate；沿 plan-512 print/clipboard/location 先例的 INV-2 评审流程）**
> Author: audit-remediation-r2 R1.4 / plan 722 段 2（2026-10-24）
> 审阅入口：`docs/architecture/renderer-env.md`（INV-1/INV-2、optional 能力通道表）、先例契约 `docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`、在案治理点 `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-media-io.ts`（plan 722 段 1）
> Related: P1-MA2.3-001（arm2-index，部分收敛注记在案）；roadmap R1.4（done · 部分收敛：env 通道待人审）

## 1. 背景与问题

barcode-input 的四个媒体通道（getUserMedia / BarcodeDetector 特性检测 / navigator.onLine / isSecureContext+enumerateDevices）在 plan 722 段 1 之前散布直调浏览器 API（P1-MA2.3-001：媒体 IO 唯一无治理成员）。段 1 已收敛至单点注入边界 `barcode-media-io.ts`（在案治理点，INV-1 裁决注记在案），但 INV-1 的终态是「所有外部 IO 经 RendererEnv」——单点边界是过渡态，终态需要 env 通道裁定。

## 2. 提案形状（沿 plan-512 optional 通道同款）

```ts
// RendererEnv optional 能力字段（INV-2 评审对象）
export interface RendererEnv {
  // ...existing...
  mediaDevices?: MediaDevicesChannel; // 可选，capability check 同款
}

export interface MediaDevicesChannel {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  isSecureContext(): boolean;
  isOnline(): boolean;
  // BarcodeDetector 不入通道：实现差异大（Chromium-only API），保留宿主侧
  // 特性检测 + ZXing ponyfill（现 barcode-detector-utils 逻辑），仅其 wasmFetcher
  // 已合规经 env.fetcher——该路径不变。
}
```

- **optional + capability check**：宿主不提供时消费方走降级（barcode-input 现行为：不可用态提示「Camera requires HTTPS or localhost」等）。
- **不做**：BarcodeDetector 构造入通道（原生 API 形态差异 + ponyfill 差异，治理收益低、通道面大）；`navigator.onLine` 响应式事件订阅入通道（DOM 事件面，非 IO 取值）。

## 3. 消费迁移路径（通道落地后）

1. `barcode-media-io.ts` default 实现改为「env.mediaDevices 优先 → navigator 直调兜底」（或宿主强制注入后删兜底——人审裁定的开放问题，见 §5）。
2. 四消费文件零改动（已全部经 `barcodeMediaIO()` 单点——plan 722 段 1 的设计目的）。
3. 边界模块 INV-1 注记更新为「env 通道已裁定」；arm2-index P1-MA2.3-001 转 `closed`。

## 4. 影响面

- `packages/flux-core/src` RendererEnv 接口 +1 optional 字段（加法、非破坏）；playground 宿主装配 +1 代理实现；`flux-renderers-scheduling` barcode 消费零改动（边界已单点）。
- 兼容性：老宿主不提供 → 行为与段 1 完全一致。

## 5. 开放问题（人审裁定项）

1. 兜底策略：宿主未提供通道时，default 兜底直调是否允许长期存在（现段 1 形态），还是要求宿主必配（破坏性）？
2. 权限流（NotAllowedError 等）的宿主定制面是否入通道（现 hook 内 i18n 映射）？
3. 通道命名：`mediaDevices` vs 更窄的 `camera`（现提案取宽名——enumerateDevices/onLine 非严格 camera 语义）。

## 6. 裁定记录（人审后回填）

- 裁定：
- 日期：
- 后续 plan：
