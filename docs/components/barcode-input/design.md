# Barcode Input 组件设计

## 1. 组件定位

- `barcode-input` 是一个表单输入字段（form input field），在标准文本输入框（`input-text`）基础上扩展了摄像头扫码能力。
- 用于库存 PDA 操作、物料条码录入、资产标签扫描等场景，是面向移动端/手持终端的增强型输入控件。
- 提供两种输入模式：手动键盘录入（始终可用）+ 摄像头扫码扫描（渐进增强，降级后仍为纯文本输入）。
- 表单参与：通过 `name` 绑定表单值，参与标准 form value/validation/submit 通道。

## 2. 与 AMIS 或既有产品的能力对照

- **AMIS** 没有原生 barcode scanner 组件。AMIS `input-text` 的 `addOn` 机制虽可挂载自定义按钮，但不提供摄像头扫码的声明式支持，也没有码制限制、连续扫码等语义字段。
- **react-zxing**（v3.0.0, MIT）是一个极简的 React hook（`useZxing`），只做一件事：将浏览器摄像头连接到 `BarcodeDetector` API 并持续扫描。它不提供 UI 组件，只返回 `{ ref, torch }`。Flux 的 `barcode-input` 参考其 `sessionRef` + stale-check 的会话管理模式，但将其封装为一个完整的表单字段 renderer，带有 field chrome、扫码按钮和全屏扫码覆盖层。
- **Flux 差异化能力**：与 react-zxing 的纯 hook 交付不同，`barcode-input` 同时提供：
  - 声明式 schema（`formats`、`continuousScan`、`scanButton` 等字段）
  - 全屏扫码覆盖层（非内联 video）
  - 扫码结果直接写入表单值
  - 码制限制与解码间隔配置
  - 事件系统（`onScan`、`onScanError`）
  - 渐进增强降级（摄像头不可用时自动回退为纯文本输入）

## 3. Flux 中的 renderer/type 定义

- `type: 'barcode-input'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`（复合/高级字段层）
- `wrap: true`（参与 FieldFrame）
- rendererClass: `instance-renderer`
- 实现入口：基于 `createInputRenderer` 工厂扩展（继承 `input-text` 的校验和 field chrome 基线），叠加扫码相关 UI 和 hook。

## 4. schema 设计

继承 `BoundFieldSchemaBase`（表单字段基类），在 `input-text` schema 之上扩展扫码专属字段。

```typescript
interface BarcodeInputSchema extends BoundFieldSchemaBase {
  type: 'barcode-input';

  // — 扫码专属 —
  formats?: BarcodeFormat[]; // 限制可识别的码制，如 ["ean_13", "code_128", "qr_code"]；未声明时由 BarcodeDetector 默认
  continuousScan?: boolean; // 是否连续扫描（默认 true）；false 时每次扫码后关闭摄像头
  scanButton?: boolean; // 是否显示扫码按钮（默认 true）
  scanInterval?: number; // 解码间隔毫秒数（默认 300）
  wasmUrl?: string; // 自定义 @zxing/library WASM 地址（默认使用公共 CDN）
  autoSubmit?: boolean; // 扫码成功后自动提交所在表单（默认 false）
  scanOnFocus?: boolean; // focus 时自动打开扫码（默认 false；移动端 PDA 场景使用）

  scanButtonClassName?: string; // 扫码按钮额外 CSS class（informational, deferred）

  // — 事件 —
  events?: {
    onScan?: ActionSchema; // 扫码成功动作（payload: { barcode, format }）
    onScanError?: ActionSchema; // 扫码失败动作（payload: { error }）
  };

  // — 生命周期 —
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
}

type BarcodeFormat =
  | 'aztec'
  | 'code_39'
  | 'code_93'
  | 'code_128'
  | 'data_matrix'
  | 'ean_8'
  | 'ean_13'
  | 'itf'
  | 'pdf_417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e';
```

## 5. 字段分类

- `label`: `value-or-region`（复用统一 field frame）
- `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`validate`: `props`（表单校验规则，走 schema 编译期 validation rules 收集）
- `clearable`、`trimContents`、`readOnly`: `props`（继承 input-text 行为）
- `formats`、`continuousScan`、`scanButton`、`autoSubmit`、`scanOnFocus`: `props`（扫码专属业务字段）
- `scanInterval`: `props`（number，`valueType: 'number'`）
- `wasmUrl`: `props`（string，仅在需要自托管 WASM 时声明）
- `scanButtonClassName`: `props`（informational, deferred）
- `onMount`、`onUnmount`: `meta`（继承 BaseSchema 生命周期动作）
- `id`、`className`、`disabled`、`visible`、`hidden`: `meta`（继承 BaseSchema 元数据通道）
- `onScan`、`onScanError`: `event`（ActionSchema 事件入口）

## 6. regions 与 slot 约定

- `label` 复用统一 field frame（无特殊 region）。
- 无新增 region/slot：扫码按钮内嵌于 InputGroup addon（`align="inline-end"`），扫码覆盖层通过 portal 渲染到 body，不占用组件 body 区域。
- 若后续需要自定义扫码按钮内容，可扩展 `scanTrigger` region（当前不开放，避免过度设计）。

## 7. 运行期状态归属

- **字段值**：归最近表单或 owner scope（`FormRuntime`），通过 `name` 绑定。
- **摄像头状态**：`local`（局部交互状态，不属于表单值）。包括：
  - `cameraActive: boolean` — 摄像头是否开启
  - `torchOn: boolean` — 闪光灯是否开启（移动端）
  - `scanning: boolean` — 是否处于解码循环中
  - `lastResult: { barcode: string; format: string } | null` — 最近一次扫码结果
- **摄像头可用性**：`local`，renderer 挂载时探测一次（`navigator.mediaDevices` + HTTPS/localhost 检查），结果缓存。
- **WASM 加载状态**：`singleton`（跨组件实例共享，`prepareWasm` 幂等单例 Promise）。

## 8. 事件、动作与组件句柄能力

### 事件

| 事件名        | 触发时机           | Payload                                              |
| ------------- | ------------------ | ---------------------------------------------------- |
| `onScan`      | 成功解码一个条码   | `{ type: 'scan', barcode: string, format: string }`  |
| `onScanError` | 扫码过程发生错误   | `{ type: 'scan-error', error: { message: string } }` |
| `onMount`     | 组件挂载完成后触发 | —                                                    |
| `onUnmount`   | 组件卸载前触发     | —                                                    |

### 组件句柄（`component:<method>`）

| 方法       | 语义                                                        | 失败路径                                            |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `scanNow`  | 编程触发扫码（打开摄像头覆盖层，开始解码）                  | `not-available`（摄像头不可用或权限被拒）           |
| `stopScan` | 停止扫码，关闭摄像头                                        | `not-mounted`、`not-visible`、`scanning-not-active` |
| `clear`    | 清空字段值（继承 input-text，disabled/readOnly 时 skipped） | `skipped`                                           |
| `reset`    | 还原字段到 initial value（继承 input-text）                 | `fellBackToDefault`                                 |
| `focus`    | focus 底层输入框                                            | `not-mounted` / `not-visible`                       |

`scanNow` 的典型使用场景：作者在按钮的 `onClick` 中通过 `component:scanNow` 触发扫码，而非依赖用户点击 input 内的扫码图标。

### 扫码生命周期状态机

```
idle → opening-camera → scanning → result → (continuous ? scanning : idle) | error → idle
```

- `idle`：摄像头关闭，用户可手动输入
- `opening-camera`：`getUserMedia` 进行中
- `scanning`：解码循环运行中，video 可见
- `result`：解码成功，值写入表单，触发 `onScan`
- `error`：解码失败或摄像头出错，触发 `onScanError`

`continuousScan = false` 时，每次成功解码后自动回到 `idle`；`continuousScan = true` 时，解码循环持续运行。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled`、`readOnly`、`label` 可接表达式。
- 值写入通过 `name` 绑定，参与 form submit 通道。
- 无独立的 data-source 需求（扫码来源是本地摄像头，非远程服务）。
- `wasmUrl` 支持表达式，允许按环境动态切换 CDN 路径。

## 10. 样式与 DOM marker 约定

`className`、`classAliases` 继承自 BaseSchema，用于覆写根节点样式。`classAliases` 短名→Tailwind 串映射由宿主应用配置。

- 根节点输出 `nop-barcode-input` marker，同时保留 `nop-input-text` marker（因继承关系，工具链可通过 marker 判断组件族）。
- FieldFrame 包裹沿用 input-text 的 InputGroup 结构：
  - `<input>` 标准文本输入框
  - 扫码按钮（`scanButton = true` 时）：`<button data-slot="barcode-scan-button">`，Lucide `scan-line` 图标
- 扫码按钮 hover: 背景 #f1f5f9，active: scale(0.95)。overlay 关闭按钮 hover: 背景 rgba(255,255,255,0.2)。
- 扫码覆盖层（portal 到 body）：
  - 根 `<div data-slot="barcode-scanner-overlay">`（全屏半透明背景）
  - `<video data-slot="barcode-scanner-video">`（摄像头预览）
  - `<div data-slot="barcode-scanner-close">`（关闭按钮）
  - `<div data-slot="barcode-scanner-torch">`（闪光灯开关，仅移动端）
  - `<div data-slot="barcode-scanner-loading">`（摄像头启动中占位：旋转 loader + 文字「正在打开摄像头...」，opening-camera 状态显示，scanning/error 状态隐藏）
  - `<div data-slot="barcode-scanner-status">`（状态文字：「正在打开摄像头...」/「请对准条码」/「识别中」/「识别失败，请重试」）

overlay 打开时 backdrop fade-in 200ms + video 区域 scale(0.95→1) + opacity 过渡。关闭时 reverse：backdrop fade-out 150ms。避免突兀出现/消失。

扫码按钮在有意义的值时不隐藏（值来自扫码或手动输入均可），始终可见以允许重新扫码。

- Test anchor 优先顺序：getByRole > data-slot > .nop-\* > data-testid。

## 11. 实现拆分建议

```
src/
├── barcode-input-renderer.tsx            # 主 renderer 组件（扩展 input-text + 扫码按钮）
├── barcode-input.types.ts                # 类型定义
├── barcode-scanner-overlay.tsx            # 扫码覆盖层 UI
├── hooks/
│   ├── use-barcode-camera.ts              # 相机生命周期（sessionRef + stale check，参考 react-zxing useZxing.ts）
│   ├── use-barcode-detect.ts              # 解码循环（setTimeout 轮询 + detector.detect + 倾斜重试）
│   └── use-barcode-torch.ts               # 闪光灯控制（参考 react-zxing useTorch.ts）
└── utils/
    ├── prepare-wasm.ts                    # WASM 加载（幂等单例，参考 react-zxing prepareWasm.ts）
    ├── camera-utils.ts                    # 摄像头权限检测 + HTTPS/localhost 检查
    └── barcode-detector-utils.ts          # BarcodeDetector 实例化 + 码制限制 + 倾斜重试
```

### Hook 边界

| Hook               | 职责                             | 状态归属 | 参考来源                      |
| ------------------ | -------------------------------- | -------- | ----------------------------- |
| `useBarcodeCamera` | 相机流获取、video 绑定、资源释放 | local    | react-zxing useZxing          |
| `useBarcodeDetect` | 解码循环、倾斜重试、结果回传     | local    | react-zxing detectSkewedVideo |
| `useBarcodeTorch`  | 闪光灯能力探测与开关             | local    | react-zxing useTorch          |

### 实现要点

- `useBarcodeCamera` 的 session 管理：递增 `sessionRef`，所有异步步骤第一步检查 stale 会话，安全处理暂停/恢复/相机切换。
- 解码循环：`setTimeout` 递归，`timeBetweenDecodingAttempts` 缺省 300ms；倾斜重试角度 [-20,-15,-10,-5,5,10,15,20]。
- WASM 加载：`prepareWasm` 幂等单例（首次调用加载，后续返回同一 Promise），默认从公共 CDN 加载 ZXing WASM，`wasmUrl` 允许自定义路径。
- `BarcodeDetector` API 优先使用原生实现；降级时通过 `@zxing/library` ponyfill 提供。
- 关闭/卸载时：关闭摄像头流、清除定时器、释放 WASM 资源（如果需要）。

## 12. 风险、取舍与后续阶段

### 风险

| 风险                            | 影响                        | 缓解方案                                                          |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| 摄像头仅在 HTTPS/localhost 可用 | 开发/演示环境需要配置 HTTPS | 文档提示；非安全上下文时自动降级为纯文本输入                      |
| WASM 加载约 2MB 体积            | 首次扫码延迟 + 带宽消耗     | 默认 CDN 加载 + 懒加载（首次点击扫码按钮时加载）                  |
| BarcodeDetector 浏览器兼容性    | 部分浏览器不支持原生 API    | @zxing/library ponyfill 降级                                      |
| 移动端相机权限复杂              | 权限被拒时无扫码能力        | 静默降级为文本输入；无权限提示由浏览器提供                        |
| 连续扫码的 CPU 消耗             | 电池 / 性能                 | 可配置 `scanInterval` 降低频率；`continuousScan` 允许切换单次模式 |

### 取舍

| 决策点       | 选择                  | 舍弃                       | 理由                                                     |
| ------------ | --------------------- | -------------------------- | -------------------------------------------------------- |
| 扫码 UI 形式 | 全屏覆盖层            | 内联 video                 | 移动端屏幕有限，全屏更专注扫码体验                       |
| 扫码触发方式 | 按钮 + `scanNow` 句柄 | focus 自动打开（可选保留） | 按钮触发更符合预期；`scanOnFocus` 作为可选               |
| 扫码结果写入 | 直接写入字段值        | 先确认再写入               | PDA 场景效率优先；需确认的场景通过 `onScan` 事件自行实现 |
| 继承关系     | 复用 input-text 基线  | 独立实现                   | 减少重复代码，共享校验/clear/reset等行为                 |
| codec 加载   | 运行时懒加载 WASM     | 打包时内联 WASM            | 减小主包体积；CDN 缓存支持                               |

### 后续阶段

- **P1**：core hook（`useBarcodeCamera` + `useBarcodeDetect`）+ 基础 renderer + 全屏覆盖层 UI
- **P2**：`onScan`/`onScanError` 事件 + `scanNow`/`stopScan` 句柄
- **P3**：`continuousScan` 模式 + `scanInterval` 配置
- **P4**：闪光灯控制（`useBarcodeTorch`）+ 扫码振动反馈（移动端原生体验）
- **P5**：`scanOnFocus`（PDA 设备自动对焦扫描）
- **P6**：`autoSubmit`（扫码即提交，适用于单一扫码场景）

### §12.1 批量扫描队列设计要点（v2）

支持连续扫描多条条码后统一确认提交，适用于入库/盘点等需要批量录入的场景。

**BarcodeQueue 机制**：

```typescript
interface BarcodeQueueItem {
  id: string;
  rawValue: string; // 原始条码值
  timestamp: number; // 扫描时间戳
  format: string; // 条码格式（如 'code_128', 'ean_13'）
  status: 'pending' | 'submitted' | 'duplicate' | 'error';
  errorMessage?: string; // 提交失败时的错误信息
}
```

**UI 布局**：

- 扫码覆盖层底部展示队列面板（`data-slot="barcode-queue-panel"`），半透明背景
- 队列列表展示已扫条码（按时间倒序），每项显示：序号 + 条码值 + 格式标签 + 状态图标
- 每项可删除（左滑或点击删除图标）
- 队列顶部显示计数 "已扫 N 条"
- "批量确认"按钮（`data-slot="barcode-queue-submit"`）点击后逐条触发 `onScan` 事件

**提交逻辑**：

- 点击"批量确认"后逐条调用后端接口（通过 `onScan` 事件或专用 `onBatchScan` 事件）
- 成功提交的条码状态变为 `submitted`，显示绿色勾图标
- 提交失败的条码状态变为 `error`，显示红色叉 + 重试按钮
- 全部提交完成后按钮变为"完成"，关闭队列面板

**离线暂存（IndexedDB）**：

- 当检测到网络离线时，扫码结果存入 IndexedDB（`nop_barcode_queue` object store）
- 存储结构：`{ id, rawValue, timestamp, format, queuedAt }`
- 上线后自动读取 IndexedDB 队列并触发提交，提交成功后从 IndexedDB 删除
- IndexedDB 操作封装为 `useBarcodeQueue` hook，提供 `enqueue` / `dequeue` / `flush` / `clear` 方法

`onBatchScan` 事件应在实施前补充到 §8 事件表。`batchMode?: boolean` 字段应在实施前补充到 §4 schema。

### §12.2 离线/降级设计要点（v3）

在网络不可用或摄像头硬件/权限不可用时的降级和离线扫码方案。

**WASM 预缓存**：

- `zxing_reader.wasm`（约 2MB）在 ServiceWorker 安装阶段通过 `Cache.addAll` 预缓存到浏览器缓存
- 首次扫码时 ServiceWorker 拦截 WASM 请求直接从缓存返回，避免 CDN 加载延迟
- 预缓存策略在 `sw.js` 中通过 `PRECACHE_MANIFEST` 配置，构建工具自动生成 WASM 文件指纹

ServiceWorker WASM 预缓存是宿主应用职责，不是 Flux renderer 的责任。Flux barcode-input 仅提供 `wasmUrl` 配置入口。

**离线扫码流程**：

```
离线检测（navigator.onLine === false）
  → useBarcodeCamera 正常启动摄像头（离线不影响 getUserMedia）
  → 解码成功 → BarcodeQueue.enqueue() 写入 IndexedDB
  → 用户可见队列中的条码标为"待提交"
上线检测（'online' 事件触发）
  → BarcodeQueue.flush() 读取 IndexedDB 队列
  → 逐条触发 onScan（或 onBatchScan）提交
  → 提交成功 → IndexedDB 删除该条目
  → 提交失败 → 状态标记为 error，用户手动重试
```

**相机降级链**：

```
navigator.mediaDevices?.getUserMedia 不可用
  → 或 HTTPS/localhost 检查失败
  → 或用户拒绝权限
  → 自动隐藏扫码按钮，barcode-input 表现为纯 input-text
  → onScan 事件不再触发，值通过键盘手动输入
```

降级后 UI 变化：扫码按钮隐藏，input 宽度恢复正常（不加扫码按钮的 addon）。预留 `scanButton` schema 字段为 `true` 时按钮依然显示，但点击时显示 tooltip "扫码不可用"。

**"connection" 事件监听**：使用 `window.addEventListener('online'/'offline')` 监听网络状态变化。离线时在输入框下方显示黄色提示条 "当前离线，扫码结果将在恢复网络后自动提交"，上线后自动触发队列提交并在完成后显示绿色提示 "已自动提交 N 条扫码记录"。
