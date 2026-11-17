# M2 时间旅行 UI + 截图地基（预览协议 + S2 截图管线 + 脱敏遮罩）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M2 节）· docs/research/2026-11-17-flux-devtools-design.md §5 · docs/research/2026-11-17-flux-devtools-capture-design.md §1–§4、§6
> Related: M1（completed：ForestSnapshot/DOM 影子/日志总线已落地）；M0 协议（ScreenshotResult schema 已冻结）

## Purpose

时间轴 hover/pin 还原"当时的 store 状态 + DOM 影子"（预览协议）；截图子系统 S2 通道上线并挂到步骤树；cid 元素截图 + 增量截图；脱敏遮罩 v1（克隆上遮罩）。

## Current Baseline（live repo 核对）

- M1 已交付：`ForestSnapshotCollector`（epoch 环形 + 结构共享）、`captureDomShadow`/`attachDomShadow`、日志总线（树/diff/4ms/display 投影）、automation V2（getStability/getSnapshotAt/getSnapshotEpochs）、controller 持久 collector。
- `__NOP_DEBUGGER_API__` 无 enterPreview/leavePreview（M0 协议 V2 面已预留方法名设计，§4.3）。
- 面板 `timeline-tab.tsx`（331 行）为虚拟化事件日志列表（搜索/过滤），非可视化时间轴控件；无 scrub 预览接线；无快照 diff 视图。
- 无任何截图子系统；M0 协议 `screenshot-result.schema.json` 已冻结（base64 + hash + refs + degraded）。
- redaction.ts 已有路径/值脱敏规则（normalizeRedactionOptions/redactData），无 DOM 遮罩应用。
- M1 Deferred：Suspense 边界精确计数归本里程碑（预览接线时补）。

## Goals

- 预览协议：`enterPreview(epoch)` = 活 DOM 备份（再照影子）→ DOM 影子挂载 + 遮罩横幅 → 状态层只读虚拟模式（不回写 store）；`leavePreview()` 还原；任何真实输入（捕获阶段 keydown/pointerdown）立即退出；`pin` 跨事件保持。
- 面板时间轴 scrub + 步骤树渲染（buildLogTree 先序遍历）。
- 快照 diff 视图：相邻 epoch `revisions`/`scopes` 路径级 diff；变更路径列表展示。
- S2 截图管线：克隆清洗 → XHTML 化 → SVG foreignObject → canvas → WebP/PNG `ScreenshotResult`（M0 schema 形状）+ 内容哈希。
- cid 元素截图（rect 裁剪）+ 增量截图（DOM 结构签名未变复用）；`autoScreenshot` 默认关。
- 脱敏遮罩 v1：`[type=password]` + redaction 路径规则在克隆上遮罩（活 DOM 不动）。
- Suspense 计数：React Suspense 边界经 M1 tracker 的 suspense 槽位接入（M1 Deferred 收口）。

## Non-Goals

- CDP 通道（M7 采集 §2.1）；S3 光栅回退（M5 后增强）；视频录制（M5）；深度预览显式回写 store 的完整交互探索（本阶段仅协议位 + 面板按钮占位，拓扑序回写实现归 M4/M5 消费时落地）；视觉基线对比（M3）。

## Scope

### In Scope

- nop-debugger：`preview-controller.ts`（enterPreview/leavePreview/pin + 真实输入退出 + 活 DOM 备份还原）、`capture/screenshot.ts`（S2 管线 + 增量签名 + cid rect 裁剪 + 遮罩）、automation V2 扩展（screenshot/enterPreview/leavePreview/setPreviewPin）、面板 timeline-tab scrub 预览接线 + diff 列表、store 挂截图引用
- flux-react：Suspense 边界接入 tracker（`acquire('suspense')`）——经既有 seam，不新增反向依赖
- playground debugger-lab：预览/截图演示入口
- e2e：预览协议程序化断言（store 值/DOM 影子一致、退出后表单可交互、预览中真实键入即退出）；截图管线像素/哈希断言（canvas 像素读回）
- 文档：quick-reference 更新；roadmap M2 行附注

### Out Of Scope

- 服务端归档/上传（M6）；M0 协议无变更（ScreenshotResult 已冻结）
- 面板视觉大改版（只在既有 timeline-tab 内扩展）

## Failure Paths

| 场景                       | 触发                         | 行为                                                             | 可重试 | 用户可见表现          |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------- | ------ | --------------------- |
| preview-epoch-miss         | enterPreview(不存在的 epoch) | 返回 false，不改变 DOM                                           | 否     | 面板提示快照缺失      |
| capture-cross-origin-taint | canvas 被跨域资源污染        | degraded.reasons 记 'canvas-taint'，返回已产出内容或空 bytes     | 是     | 面板截图标记 degraded |
| shadow-reattach-lost       | 预览中宿主容器被外部卸载     | leavePreview 容错（无节点可还原时跳过 DOM 还原，仅退出虚拟模式） | 否     | 状态层回到 live       |
| capture-zero-size          | 目标 rect 宽高为 0           | 返回 rejected（ProtocolError 语义的 CaptureError）               | 否     | 面板提示              |

## Test Strategy

档位选择：`必须自动化`（截图管线像素哈希 + 预览状态一致性为核心回归路径）

Proof 先行：S2 管线固定 DOM 夹具 → 像素哈希基线（同环境）；增量签名两次相同 DOM 零二次光栅化；遮罩像素断言——均先于面板接线。

## Execution Plan

### Phase 1 - 预览协议（kernel）

Status: completed
Targets: `packages/nop-debugger/src/preview-controller.ts`、`automation.ts`、`controller.ts`

- Item Types: `Fix | Proof`

- [x] `createPreviewController(input: {collector, domShadow helpers, host})`：`enterPreview(epoch)`（活 DOM 影子备份 → 目标 epoch 影子挂载覆盖层 + "预览中"横幅 + pointer-events 拦截）、`leavePreview()`（卸载覆盖层 + 还原备份）、`setPinned(boolean)`、真实输入捕获阶段（keydown/pointerdown）自动 leavePreview（pinned 时不退——pin 语义跨事件保持）
- [x] 状态层只读虚拟模式：`getPreviewSnapshot(epoch)` 供面板读取（不回写 store）；深度预览按钮仅 UI 占位（Non-Goal 声明）
- [x] automation V2：`enterPreview(epoch): boolean`、`leavePreview(): void`、`setPreviewPinned(pin: boolean)`、`isPreviewActive(): boolean`
- [x] controller 接线 collector + shadow helper
- [x] 单测：epoch 命中/未命中、真实输入退出、pin 保持、leavePreview 还原（jsdom/happy-dom）

Exit Criteria:

- [x] preview-controller 单测全绿（命中/未命中/输入退出/pin 保持/还原容错 5 语义各 1 判别用例）
- [x] automation V2 方法挂载且 V1 兼容用例仍绿

### Phase 2 - S2 截图管线 + 增量 + 遮罩

Status: completed
Targets: `packages/nop-debugger/src/capture/screenshot.ts`

- Item Types: `Fix | Proof`

- [x] Proof 先行：单测骨架（固定 DOM 夹具 → capture → hash/尺寸断言；二次相同 DOM 零二次光栅化计数器；遮罩像素色断言）——先红
- [x] S2 管线：`captureScreenshot(target?, opts)` = importNode 克隆（复用 dom-shadow 清洗）→ 遮罩 v1（`[type=password]` + redaction 路径规则命中的元素覆盖纯色块）→ DOMParser XHTML 往返 → SVG foreignObject → img → canvas（scale 归一）→ toBlob(png/webp) → base64 + 内容哈希（subtle crypto sha-256 短哈希；采集设计 §2.2 写 xxhash/sha-1——sha-256 为浏览器原生可用实现，哈希为不透明复用键，README 层面不受影响）
- [x] `ScreenshotResultWire` 形状与 M0 schema 对齐（encoding:'base64'、refs、degraded）
- [x] cid 元素截图：`querySelector([data-cid])` rect 裁剪；增量：DOM 结构签名（标签+cid+class+文本长度）未变 → 复用上帧结果（光栅化计数器为 0）
- [x] `capture.autoScreenshot(mode)` 默认 'off'；'on-step' 挂日志总线步进（挂 refs.screenshotId）
- [x] 跨域 img 预检替换占位 + degraded.reasons

Exit Criteria:

- [x] 夹具 hash 稳定（同 DOM 两次采集 hash 相同）且二次采集光栅化计数 0（判别：无增量缓存的旧实现必二次光栅化）
- [x] 遮罩区域像素 = 遮罩色（canvas 像素断言）；活 DOM 未被修改断言
- [x] degraded：跨域 img 占位 + zero-size 拒绝（断言拒绝错误形状：`CaptureError{code:'capture-zero-size'}`，Phase 2 新建错误类型）

### Phase 3 - 面板接线 + Suspense 计数

Status: completed
Targets: `packages/nop-debugger/src/panel/timeline-tab.tsx`、`packages/flux-react/src/`

- Item Types: `Fix | Proof`

- [x] timeline-tab：时间轴 scrub（epochs 滑条）hover/pin → enterPreview/leavePreview；步骤树（buildLogTree 先序）渲染 + 每节点 refs 展示
- [x] 快照 diff 列表：选中 epoch 与前驱比对（changedScopeIds + scope 内容浅 diff），变更路径渲染
- [x] flux-react：Suspense 边界（既有 Suspense 包装点）接入 tracker `acquire('suspense')`/release（M1 Deferred 收口）
- [x] debugger-lab：预览/截图演示按钮（Screenshot、Enter Preview、Leave Preview、Pin）+ 深度预览按钮 UI 占位（disabled，Deferred 记账对应物）

Exit Criteria:

- [x] timeline-tab 单测：scrub 触发 preview API 调用序列、diff 列表渲染变更路径
- [x] flux-react Suspense 计数单测（挂起期间 tracker.counters.suspense>0，恢复归 0）
- [x] debugger-lab e2e 扩展：Enter Preview → DOM 影子横幅可见 → 真实键入 → 预览退出；Screenshot 按钮产出 hash 显示

### Phase 4 - 性能 + 文档 + 收口

Status: completed
Targets: `scripts/__tests__/`、docs

- Item Types: `Proof | Follow-up`

- [x] 微基准：autoScreenshot 开启时步进（签名计算 + 未变更复用路径）耗时增量 < 15ms（scripts bench 断言）
- [x] quick-reference：preview/capture API 节更新；roadmap M2 行附注；daily log
- [x] M1 Deferred（Suspense 计数）从 Deferred 记账中关闭的说明

Exit Criteria:

- [x] 微基准绿（<15ms 红线）
- [x] docs 节与 live 契约一致
- [x] daily log / roadmap 附注落盘

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
- Verdict: pass-with-minors（0 Blocker / 0 Major；4 Minor 全部处理：深度预览占位按钮补执行项、sha-256 偏离理由、CaptureError 形状断言补 exit、timeline-tab 措辞收紧）
- Rounds: 1
- Findings addressed: Minor×4 如上

## Closure Gates

- [x] 预览协议全部语义落地且有判别性测试（命中/未命中/输入退出/pin/还原容错）
- [x] S2 管线 hash 稳定 + 增量零二次光栅化 + 遮罩像素断言 + degraded 路径
- [x] 面板 scrub/diff/步骤树接线且单测绿
- [x] Suspense 计数接入（M1 Deferred 收口）
- [x] autoScreenshot 步进 <15ms 微基准绿
- [x] 受影响 owner docs 已同步（quick-reference）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 深度预览（显式回写 store 的交互式探索）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap M2 核心是只读虚拟模式预览；深度预览的拓扑序回写与 reaction 过滤（`sourceScopeId:'__devtools'`）是独立风险面（设计 §13 风险 1），协议位与 UI 按钮占位已留，实现归 M4/M5 消费时按需落地。
- Successor Required: `yes`
- Successor Path: M4/M5 计划

## Non-Blocking Follow-ups

- 分段滚动截图拼接（采集设计 §3 v2 增强）
- 阴影 DOM 展开（采集设计 §5 v2）

## Closure

Status Note: M2 全部四 Phase 落地：预览协议（enterPreview/pin/真实输入退出）、S2 foreignObject 截图（sha-256 + 增量复用 + 遮罩 v1 + 跨域 degraded）、面板 scrub/diff、Suspense 计数（M1 Deferred 收口）、<15ms 步进微基准。首轮 closure audit 2 Major（跨域 degraded 声称未落、遮罩像素断言缺失）已修复后 round 2 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18，2 轮）
- Evidence: round 1 issues（Major×2：跨域 degraded 未落、canvas 像素断言缺失；Minor×3）→ 修复（img 预检替换 + degraded.reasons + 单测；e2e getImageData 像素断言 + controller 默认 password 遮罩规则；CaptureRefs.sessionId 移除；roadmap M1 就地勘误）→ round 2 approved（0 Blocker / 0 Major）。e2e 6/6（含像素级遮罩断言）、nop-debugger 231 单测、typecheck/lint/check/build 全绿。

Follow-up:

- （见 Non-Blocking Follow-ups）
