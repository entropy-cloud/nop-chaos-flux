# 条码扫描（Barcode Scanner）开源实现调研报告

> 日期：2026-07-20
> 调研项目：react-zxing v3.0.0 (MIT)
> 参考仓库：`~/sources/complex-controls/react-zxing-barcode/`

---

## 1. 调研概要

| 项目        | 版本  | 许可 | 框架         | 核心依赖                                   | 代码结构           |
| ----------- | ----- | ---- | ------------ | ------------------------------------------ | ------------------ |
| react-zxing | 3.0.0 | MIT  | React (hook) | @zxing/library (barcode-detector ponyfill) | 11 源文件，~600 行 |

---

## 2. react-zxing 详细分析

### 2.1 架构定位

react-zxing 是一个**极简的 React hook**，只做一件事：将浏览器摄像头连接到 `BarcodeDetector` API，并持续扫描。它不提供 UI 组件，只返回 `{ ref, torch }`。

```
useZxing(options) → { ref, torch }
```

### 2.2 完整钩子 API

```typescript
// 入参
interface UseZxingOptions {
  paused?: boolean; // 暂停相机（true 时停止）
  formats?: BarcodeFormat[]; // 限制码制（如 ["qr_code", "ean_13"]）
  onResult?: (result: DetectedBarcode) => void; // 解码成功回调
  onError?: (error: unknown) => void; // 统一错误回调
}

// 返回值
{
  ref: RefObject<HTMLVideoElement>; // 绑定到 <video> 元素
  torch: {
    on: () => Promise<void>; // 开启闪光灯
    off: () => Promise<void>; // 关闭闪光灯
    isOn: boolean;
    isAvailable: boolean | null;
  }
}
```

### 2.3 核心技术机制

**会话管理（Session Pattern）**：

```typescript
const sessionRef = useRef(0);
// 每次重新启动解码：sessionRef.current++
// 异步操作中检查：isStaleSession(session, sessionRef)
// 如果会话已过期（有新请求），静默返回
```

每个 `startDecoding()` 调用递增 session 计数器。所有异步步骤（`getUserMedia`、`playVideo`、`scheduleScan`）的第一步都是检查会话是否已过期。这安全处理了暂停/恢复和相机切换。

**相机生命周期**：

```
startDecoding()
  ├─ assertCameraAccess()     → 检查 HTTPS/localhost
  ├─ await prepareWasm(url)   → 加载 ZXing WASM（单例，仅在首次加载）
  ├─ getUserMedia(constraints)→ 获取摄像头流
  ├─ video.srcObject = stream → 绑定流
  ├─ await playVideo(video)   → 等待视频播放
  ├─ initTorch(videoTrack)    → 初始化闪光灯控制
  └─ scheduleScan(video)      → 启动解码循环

scheduleScan():
  └─ setTimeout(300ms)
      ├─ check video.readyState / video.videoWidth
      ├─ detector.detect(video)       → DetectedBarcode[]
      ├─ if no result && trySkew:     → 旋转帧重试
      │    captureFrame → OffscreenCanvas
      │    rotate ImageData → detect on rotated
      ├─ onDecodeResult(barcode)
      └─ scheduleScan() (loop)
```

**WASM 加载（prepareWasm）**：

- 幂等单例：首次调用加载，后续返回相同 Promise
- `barcode-detector/ponyfill` 内部使用 `prepareZXingModule()`
- 默认从公共 CDN 加载 `zxing_reader.wasm`

### 2.4 解码循环的键值设计

| 参数                          | 建议值                      | 说明                      |
| ----------------------------- | --------------------------- | ------------------------- |
| `timeBetweenDecodingAttempts` | 300ms                       | 平衡 CPU 和使用流畅度     |
| `trySkew`                     | [-20,-15,-10,-5,5,10,15,20] | 1D 条码可能在倾斜时才可读 |
| `formats`                     | 根据场景限制                | 限制码制提升性能          |

---

## 3. 对 Flux Barcode-input 的设计建议

### 3.1 定位

Barcode-input 是一个**表单输入字段**（`type: "barcode-input"`），参与表单 value/validation 通道。它提供两种扫码方式：

1. **连续扫描**：开启摄像头，实时扫码，自动填入字段
2. **手动输入**：键盘输入条码（降级方案）

### 3.2 数据层

```typescript
// Flux schema
interface BarcodeInputSchema extends BoundFieldSchemaBase {
  type: 'barcode-input';
  formats?: BarcodeFormat[]; // 码制限制
  continuousScan?: boolean; // 是否连续扫描（默认 true）
  scanInterval?: number; // 解码间隔（默认 300）
  wasmUrl?: string; // 自定义 WASM 地址
  autoSubmit?: boolean; // 扫码后自动提交表单
  events?: {
    onScan?: ActionSchema; // 扫码成功动作
    onScanError?: ActionSchema; // 扫码失败动作
  };
}
```

### 3.3 组件结构

```
├── barcode-input.tsx          // 主组件（扩展 input-text + 扫码按钮）
├── barcode-input.types.ts     // 类型定义
├── barcode-scanner.tsx         // 扫码弹窗/面板
├── hooks/
│   ├── use-barcode-camera.ts  // 相机生命周期（参考 react-zxing 会话模式）
│   ├── use-barcode-detect.ts  // 解码循环
│   └── use-barcode-torch.ts   // 闪光灯控制
└── utils/
    ├── prepare-wasm.ts        // WASM 加载（幂等单例）
    └── camera-utils.ts        // 摄像头检测/权限
```

### 3.4 关键实现要点

| 要点      | 具体做法                                   | 参考                             |
| --------- | ------------------------------------------ | -------------------------------- |
| 会话管理  | 递增 sessionRef + stale check              | react-zxing                      |
| WASM 加载 | 幂等单例 Promise                           | react-zxing prepareWasm.ts       |
| 相机启动  | getUserMedia → srcObject → play()          | react-zxing                      |
| 解码循环  | setTimeout 轮询 + detector.detect(video)   | react-zxing                      |
| 倾斜重试  | OffscreenCanvas 旋转帧                     | react-zxing detectSkewedVideo.ts |
| 闪光灯    | getCapabilities().torch + applyConstraints | react-zxing useTorch.ts          |
| 安全检测  | HTTPS/localhost 检查                       | react-zxing mediaDevices.ts      |
| 输入降级  | 扫码不可用时回退到文本输入                 | 自研                             |

### 3.5 与现有控件的差异

| 维度     | input-text | barcode-input         |
| -------- | ---------- | --------------------- |
| 输入方式 | 键盘       | 摄像头+键盘           |
| 依赖     | 无         | @zxing/library (WASM) |
| 交互     | 即时输入   | 扫码弹窗→自动填入     |
| 移动端   | 通用       | 需要相机权限          |
| 降级     | N/A        | 扫码不可用→纯文本输入 |

---

## 4. 可复用开源参考代码

| 参考来源                | 模块/模式               | 直接复用程度      |
| ----------------------- | ----------------------- | ----------------- |
| `useZxing.ts`           | 会话管理 + 相机生命周期 | ★★★ hook 设计模式 |
| `prepareWasm.ts`        | 幂等 WASM 加载          | ★★★ 直接复用      |
| `detectSkewedVideo.ts`  | 倾斜帧旋转重试          | ★★★ 解码辅助      |
| `useTorch.ts`           | 闪光灯控制              | ★★☆ 移动端增强    |
| `mediaDevices.ts`       | 安全上下文检测          | ★★★ 安全检查      |
| `useBarcodeDetector.ts` | BarcodeDetector 实例化  | ★★★ 直接复用      |
