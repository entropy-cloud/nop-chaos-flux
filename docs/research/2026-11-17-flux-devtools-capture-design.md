# Flux DevTools 截图与媒体采集子系统设计（专章）

- 日期：2026-11-17 · 上游：[总体设计](./2026-11-17-flux-devtools-design.md) · [调研分析](./2026-11-17-flux-debugger-cypress-deep-analysis.md) · [路线图](./2026-11-17-flux-debugger-roadmap.md)
- 范围：静态截图、元素级截图、时间轴自动截图、视频录制、视觉基线对比、脱敏遮罩、存储与上传管线。
- Cypress 对照基准：Cypress 截图 = CDP `Page.captureScreenshot`（经 Node server）+ ffmpeg 服务端录视频 + 命令失败时自动截图；完全依赖外挂进程。我们的目标：**页内自主、cid 语义化、增量、脱敏前置、全栈归档**。

---

## 1. 需求与超越点

| 能力     | Cypress                          | Flux DevTools 目标                                            |
| -------- | -------------------------------- | ------------------------------------------------------------- |
| 截图来源 | Node 进程 CDP，必须外挂          | 页内三策略降级链，无外挂也可用；有调试通道时用 CDP 保真       |
| 元素截图 | clip 矩形                        | **cid 语义定位**：按节点截图，自动含外溢/滚动内容             |
| 时机     | 命令失败自动 + 手动              | 步骤树任意节点、epoch、断言失败、**Why 归因证据链**自动附图   |
| 增量     | 无                               | 脏区检测：DOM 未变复用上帧，交互序列体积大幅缩小              |
| 脱敏     | 无                               | 截图前 DOM 遮罩（redaction 规则同源）                         |
| 视频     | 服务端 ffmpeg 录制整跑           | 页内 canvas+MediaRecorder 按会话录制，服务端只做转码/归档     |
| 视觉对比 | `cy.matchImageSnapshot` 三方插件 | 内置基线库：像素 diff + **cid 区域 diff + schema 感知忽略区** |
| 归档     | 本地文件                         | 网关对象存储，与会话/trace 关联，可入诊断包                   |

---

## 2. 采集策略降级链（核心设计）

运行时探测，按优先级选择 `CaptureBackend`；所有后端产出统一的 `ScreenshotResult`：

```ts
type CaptureBackend = 'cdp' | 'foreign-object' | 'raster-fallback';

interface ScreenshotOptions {
  target?: { cid?: string; selector?: string; rect?: DOMRectReadOnly };
  format?: 'png' | 'webp' | 'jpeg';
  quality?: number; // webp 默认（体积）
  scale?: number; // devicePixelRatio 归一
  captureBeyondViewport?: boolean; // 全页/滚动截图
  maskSensitive?: boolean; // 默认 true（§6）
  tag?: string; // 步骤/断言/Why 证据 关联
}
interface ScreenshotResult {
  id: string;
  backend: CaptureBackend;
  width: number;
  height: number;
  bytes: Uint8Array;
  hash: string; // 内容哈希，增量复用键
  refs: { epoch?: number; cid?: string; interactionId?: string; tag?: string };
  degraded?: { reasons: string[] }; // 降级说明，UI 可见
}
```

### 2.1 S1 — CDP 后端（保真优先）

- 通道 A（开发态/联调）：DevTools 面板自身运行在扩展页或独立调试页时，经 `chrome.tabs`/`chrome.debugger` 调 `Page.captureScreenshot`（可选实现，优先级最低依赖）。
- 通道 B（**网关通道，推荐**）：浏览器页面自身执行 `navigator.mediaDevices` 之外的 CDP 不可行，因此网关通道定义为一个轻量"采集代理"：开发机/CI 起一个 headless 附加（或平台 e2e runner 内置），由 GatewayClient RPC `capture.cdp` 触发，参数含目标页 tab 标识。**仅开发/CI 环境可用**。
- 能力：像素级保真、`captureBeyondViewport` 原生、含视频帧/canvas。
- 语义增量：请求仍由 flux 内核发起（带 cid/epoch refs），结果回填 Log 树——与 Cypress 相比，截图与语义上下文强关联。

### 2.2 S2 — SVG foreignObject 后端（页内默认，无依赖）

流程：

1. 取目标 DOM（整页 `document.documentElement` 或 cid 子树），`importNode(true)` 克隆（避免 custom element 连接回调）。
2. 清洗克隆：
   - 删除 `script`、`link[rel=stylesheet]` 的外联改为**内联**（同源限制内）；
   - `canvas` 元素 → 以 `toDataURL()` 替换为 `img`；
   - `video` → 当前帧 `drawImage` 到临时 canvas 再替换；
   - iframe（跨域）→ 占位框 + url 文本（Cypress snapshots 同款处理）；
   - 脱敏遮罩（§6）在**克隆上**应用——不影响活 DOM；
   - 内联 `style` 保留；`@font-face`/阴影 DOM 处理见 §5 限制。
3. 序列化：`new XMLSerializer().serializeToString(clone)`，包进 SVG：

```xml
<svg xmlns="..." width="{w}" height="{h}">
  <foreignObject width="100%" height="100%">{xhtml}</foreignObject>
</svg>
```

4. 光栅化：`img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)` → `canvas.drawImage(img, 0, 0, w*scale, h*scale)` → `canvas.toBlob(format, quality)`。
5. 哈希：对 blob 计算 xxhash/sha-1 短哈希 → 增量复用（§4）。

要点：

- XHTML 化：克隆根节点需合法 XHTML（属性引号、命名空间）；实现上先经 `DOMParser` 往返一次修正。
- 跨域图片：canvas 会 taint——预检每张 `img.crossOrigin`，无法 CORS 的替换为同尺寸占位并记入 `degraded.reasons`（S3 兜底可补全）。
- scale 归一：默认按 `devicePixelRatio` 输出 2x，对比时统一缩放。

### 2.3 S3 — 光栅回退后端（html2canvas 思路，按需实现）

当 foreignObject 被浏览器限制（罕见）或需精确控制（阴影 DOM、复杂滤镜）时，遍历 DOM 手绘到 canvas（复用计算样式 → canvas 绘制指令映射）。**v1 仅实现 S2 + S1；S3 列为 M5 后的增强**，避免维护一个 html2canvas 分叉。

### 2.4 后端选择逻辑

```
if (网关/调试通道可用 && 保真要求(视频帧、跨域图多)) → cdp
else → foreign-object（默认）
若 foreignObject 产出 degraded 且用户选择"补全" → 提示切换 cdp（若有）或接受降级标记
```

---

## 3. 元素级与全页截图

- **cid 截图**：目标 = `document.querySelector('[data-cid="..."]')`；`getBoundingClientRect` 外扩 padding（可配）；`captureBeyondViewport` 时对滚动容器（`overflow:auto`）先 `scrollWidth/Height` 临时展开或分段截图拼接（v1：整页图 + rect 裁剪，避免分段拼接复杂度）。
- **全页**：S2 天然支持（克隆 documentElement 全高）；S1 用 CDP `captureBeyondViewport:true`。
- **滚动容器内容**：v1 = 全页截图后按 rect 裁剪；v2（增强）= 分段滚动截图 + canvas 拼接。

## 4. 增量截图（时间轴自动截图）

- 每步（interactionId 收口）计算 DOM 签名：对活 DOM 做**轻量结构哈希**（标签+cid+class+文本长度，忽略纯样式）。
- 签名不变 → 复用上帧 `ScreenshotResult`（同 hash 引用），体积近似 O(变化步数)。
- 签名变化 → S2 采集；两次相邻截图差异大时可配置"仅存 diff 区域元数据 + 完整帧按 k 步抽稀"。

## 5. 已知限制与对策（S2）

| 限制                      | 对策                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| 跨域图片 taint            | 预检替换占位 + degraded 标记；CDP 通道补全                                        |
| `@font-face` 外链字体     | 克隆时内联 base64（同源）或接受回退字体并标记                                     |
| 阴影 DOM                  | `attachShadow` 的克隆默认不含 shadow 树；v1 标记 degraded，v2 手动展开 shadowRoot |
| CSS `position:fixed` 布局 | 序列化时统一视口坐标系（absolute 化），偏差列入 degraded                          |
| 动画/过渡                 | 截图取当帧，文档注明非动画保真                                                    |
| 大页面内存                | 全页 >8M 像素时自动降 scale 或分段                                                |

## 6. 脱敏遮罩（截图前、于克隆之上）

1. 规则源：与 redaction.ts 同一份配置（路径 glob + 值正则）。
2. DOM 遮罩：对匹配元素（如 `[type=password]`、绑定敏感 scope 路径的节点——经依赖图反查 cid）覆盖纯色块 + "已脱敏"标注。
3. 双保险：上传网关前对最终 blob 的元数据剥离，且网关侧再跑一遍规则校验（防止前端规则漏配）。

## 7. 视频录制

- 页内方案：专用 `<canvas>` 捕获通道 `canvas.captureStream(30)` + `MediaRecorder`（webm/vp9）；帧来源 = 时间轴自动截图的 canvas（§4 的产物直接 drawImage 进录制 canvas，不重复采集）。
- 步进帧率：事件驱动——每步/每截图入帧，帧间以定时补帧保持时长感（fake-clock 会话回放时按回放时钟）。
- 结束：`MediaRecorder.stop()` → webm blob → 网关 `capture.upload` → Java 侧 ffmpeg 转码 mp4 + 缩略图（服务端只做转码，不做采集——与 Cypress 的服务端 ffmpeg 录制分工不同，体积更小）。
- 降级：不支持 MediaRecorder（Safari 旧版）→ 仅关键帧序列（每步 PNG/WebP 序列 + 时间戳），网关合成 GIF/视频。

## 8. 视觉基线对比（内置视觉回归）

```ts
interface VisualBaseline {
  key: string;            // schemaFingerprint + 视口 + 步骤标识
  imageRef: string;       // 网关对象存储
  ignoreRegions?: Array<{ cid?: string; rect?: Rect; reason: string }>;
}
compareScreenshot(result, baselineKey, opts): VisualDiffResult
// VisualDiffResult = { match: boolean; diffRatio: number;
//   regions: Array<{ cid, diffRatio, bbox }> }   // 像素 diff 按 cid 聚合
```

- 像素 diff：YIQ 空间逐像素（pixelmatch 算法，自实现避免依赖），阈值可配。
- **超越点——schema 感知忽略**：忽略区可按 cid/semantic 标记（时间戳节点、随机头像），由 schema 注解（`xui:visual-ignore: true`）驱动，Cypress 生态无此语义。
- 基线库在网关（按 schemaFingerprint 版本化）；对比可在本地（内核内置 diff）或服务端（归档时）执行。
- 遵守仓库既有政策：视觉产物不入 git，均走对象存储。

## 9. 存储与上传管线

```
页内 ScreenshotResult ─┬─ 本地会话缓存（IndexedDB，LRU，配额 <200MB）
                       └─ GatewayClient.rpc('capture.upload', {bytes, refs, redactionProof})
                            → 网关校验脱敏 → 对象存储（WebP/MP4）
                            → 元数据（会话 id、epoch、cid、tag）入 DB
```

- 上传时机：调试会话 detach、诊断包生成、或显式"保存证据"；失败本地重试队列。
- 诊断包：挑选关键帧（断言失败、Why verdict、首末帧）+ 会话 JSON 打包。

## 10. API 汇总

```ts
// 内核（面板与 __NOP_DEBUGGER_API__ 共用）
capture.screenshot(opts?: ScreenshotOptions): Promise<ScreenshotResult>;
capture.autoScreenshot(mode: 'on-step'|'on-change'|'off'): void;
capture.record(opts: { fps?: number }): RecordingHandle;   // stop() → blob
capture.compare(result, baselineKey, opts?): VisualDiffResult;
```

## 11. 测试策略与验收

- **Must automate**：
  - S2 管线单测：固定 DOM 夹具 → 截图 → 与夹具基线像素哈希比对（同环境基线，`_tmp/` 外的 `tests/e2e/__snapshots__` 政策）；
  - 增量复用：两次相同 DOM 采集 → hash 相同、零二次光栅化（计数器断言）；
  - 脱敏：敏感元素截图后该区域为遮罩色（`page.evaluate` 读取 canvas 像素断言）；
  - 上传协议：模拟网关（vitest ws server）往返 + 超时重试；
  - 视觉对比：注入 1px diff → diffRatio 阈值行为正确；cid 忽略区生效。
- 验收红线：自动截图开启时步进耗时增加 <15ms（不含上传）；会话 100 步增量媒体总量 <15MB（WebP）。

## 12. 里程碑嵌入

| 能力                               | 里程碑                                           |
| ---------------------------------- | ------------------------------------------------ |
| S2 截图 + cid 截图 + 自动/增量截图 | M2（时间旅行步挂截图）                           |
| 视觉基线对比                       | M3 后半（断言 API 的 `visual` 谓词复用 compare） |
| 录制视频                           | M5（随会话录制）                                 |
| 网关上传/归档/ffmpeg               | M6                                               |
| 诊断包关键帧、CDP 通道、S3 回退    | M7/增强                                          |
