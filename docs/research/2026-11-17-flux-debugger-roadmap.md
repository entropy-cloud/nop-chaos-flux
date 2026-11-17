# Flux DevTools 实施路线图（内置调试器 · nop-entropy 集成）

- 日期：2026-11-17（v2，与详细设计对齐）
- 上游分析：[2026-11-17-flux-debugger-cypress-deep-analysis.md](./2026-11-17-flux-debugger-cypress-deep-analysis.md)
- 详细设计：[总体设计](./2026-11-17-flux-devtools-design.md) · [截图与媒体采集专章](./2026-11-17-flux-devtools-capture-design.md) · [测试后端（替代 Playwright）](./2026-11-17-flux-test-backend-design.md)
- 性质：分阶段路线图。每阶段落地时按 `docs/plans/00-plan-authoring-and-execution-guide.md` 立正式执行计划（本文件不替代之）。
- 原则：所有插桩仅经三个既有 seam——`RendererPlugin`、RendererEnv 装饰、`ScopeStore.setSnapshot` 拦截；renderer 包零反向依赖；无监听者零成本。

---

## 阶段总览

| 阶段 | 主题                            | 设计章节                   | 依赖                | 相对 Cypress                                         |
| ---- | ------------------------------- | -------------------------- | ------------------- | ---------------------------------------------------- |
| M0   | 协议冻结（前置）                | 总体 §10.2                 | —                   | —                                                    |
| M1   | 稳定性 + 快照地基               | 总体 §3、§4                | M0                  | 追平 whenStable / snapshot 骨架                      |
| M2   | 时间旅行 UI + 截图地基          | 总体 §5 · 采集 §1–§4、§6   | M1                  | 追平 DOM 时间旅行，**超越**（store 快照 + 内置截图） |
| M3   | 断言等待 + 视觉基线对比         | 总体 §6 · 采集 §8          | M1                  | 追平 retry-ability，**超越**（schema 感知忽略区）    |
| M4   | 语义层 Why 面板 + 依赖图        | 总体 §7                    | M1                  | **超越**（低代码专属）                               |
| M5   | 录制回放 + 视频录制             | 总体 §8 · 采集 §7          | M1–M3               | **超越**（Cypress 无会话回放）                       |
| M6   | Java 网关 + 全栈拦截 + 媒体归档 | 总体 §10 · 采集 §9         | M0、M1（M5 后全量） | **超越**（全栈改包）                                 |
| M7   | 生产诊断模式 + AI 深化          | 总体 §9 · 采集 §2.1 通道 A | M4–M6               | **超越**                                             |

### E 轨道：e2e 测试后端（彻底替代 Playwright）

设计：[测试后端设计](./2026-11-17-flux-test-backend-design.md)。目标：`tests/e2e/` 全部 244 个 spec 迁移到自研测试后端（真实浏览器 + 页内内核驱动，Cypress 模式但无代理/扩展/driver 层），并全面转向 `ft.expect` 业务语义断言（终态无 DOM 判断），最终删除 `@playwright/test` 依赖与 `playwright.config.ts`。

| 阶段 | 主题                                                                                                                                                           | 依赖             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| E1   | flux-test-server 骨架（裸 CDP launcher / 本地网关 / runner / reporter）+ 页内驱动 + `ft.expect` 语义断言骨架 + Locator 兼容层（迁移脚手架）                    | M0、M1           |
| E2   | **Test Console v1**（Launchpad spec 选择 + Runner：Command Log 树/页面预览/时间旅行 scrub）+ 试点 2 spec + 缺口清单回灌                                        | E1、M2           |
| E3   | 双引擎 CI（Playwright 为 oracle 对照）+ 批量迁移（4–6 批，每批 ≤20 spec，"引擎替换→语义重写"两步）                                                             | E2、M3–M4        |
| E4   | 收尾：删 Playwright 依赖/config + DOM 断言门禁（白名单只减不增）+ 迁移 handbook 定稿；**Console v2**（会话/诊断页：历史 run、DevSession 回放、视觉 diff 画廊） | E3 全绿、M5      |
| E5   | T4 语义清零：删兼容层与 DOM 白名单，`ft.expect` 成为唯一断言写法                                                                                               | E4 + M4 全量落地 |

迁移铁律：双引擎期每个 spec "新全绿 + 旧删除"同 commit；断言强度不得降级；终态无 DOM 判断（例外仅视觉截图/axe/真输入/跨 tab 白名单）；失败 spec 自动产出 DevSession 诊断包（复用 M5）。

---

## 终局里程碑 B1：Cypress 实测对比（Bake-off，项目收官门禁）

**目标**：不是"功能清单上写了超越"，而是**用同一组真实场景实测对比 Cypress，逐项证实超越**；对比结论落正式报告，作为项目关闭（closure）的前置门禁。管控界面（DevTools Dock / Test Console）纳入对比范围。

任务：

1. **对比基准集（Benchmark Suite）**：选取 12–15 个代表性场景，每个场景 **Cypress 与 Flux DevTools 各实现一份**（Cypress 版跑在 `~/sources/cypress` 可安装的正式发行版上）：
   - 调试场景 ×5：定位 disabled 之谜、异步数据不渲染归因、接口失败回溯、表达式求值检查、跨 store 状态追踪；
   - 测试场景 ×5：表单交互链、CRUD 流、网络 stub、等待/重试稳定性、失败诊断到根因的耗时；
   - 管控界面场景 ×3：从打开工具到定位一个失败用例根因的全程操作、时间旅行/历史回看、失败会话回放；
   - 工程场景 ×2：接入新项目的成本（配置行数/依赖）、CI 接入。
2. **量化指标（全部程序化采集，禁止印象分）**：
   - 性能：冷启动耗时、单场景执行耗时 P50/P95、内存占用、产物体积；
   - 稳定性：同一场景 N=20 重复运行的 flake 率；
   - 诊断效率：注入的 N 个预置 bug，从"看到失败"到"说出根因"的耗时（人工计时，双人交叉）；
   - 覆盖：功能对照矩阵（本文档 §5 对照表逐项打分： Cypress / Flux / 双方缺失）；
   - 管控界面：任务完成率 + 操作步数 + 用户盲评（3–5 名开发者，双盲对比两套 UI 完成同样任务，收集 SUS 量表分）。
3. **报告与裁决**：
   - 产出 `docs/research/` 对比报告：指标表 + 录屏/截图证据（上传对象存储，遵守媒体产物政策）+ 未超越项清单；
   - **门禁标准**：性能不低于 Cypress（P95 ≤ 110%）、flake 率不高于、诊断效率显著优（中位耗时 < 50%）、对照矩阵无"Cypress 有而 flux 无且未说明取舍"项、UI 盲评 SUS ≥ Cypress；
   - 未达标项回灌 roadmap 形成新一轮 M/E 任务；全部达标方可宣布"全面超越 Cypress 实测成立"。

依赖：M7、E5 全部完成。节奏：约 2–3 周（基准集实现 1 周 + 实测 1 周 + 报告评审 0.5 周）。

> 变更说明（v2）：① 新增 **M0 协议冻结**前置里程碑；② 截图/媒体采集子系统按设计专章拆散嵌入各阶段（v1 仅一句带过）；③ 每个任务标注设计文档章节号，落地 plan 可直接引用。

---

## M0 协议冻结（前置，约 1 周级）

> 落地状态（2026-11-18 勘误附注，plan `docs/plans/2026-11-18-m0-devtools-protocol-freeze-plan.md`）：**前端半收敛**——JSON Schema 已发布（`packages/nop-debugger/protocol/`，含共享 fixtures）且前端符合性用例全绿；验收后半句"Java（模拟客户端）符合性用例"跨仓库，归 M6 网关实现时执行，本行不做整行 done。

**目标**：前端内核 ↔ Java 网关的全部消息协议先冻结，两端独立开发不阻塞。

任务：

1. 冻结 WebSocket RPC 封包（`{id, method, params}` / `{id, result|error}` / `{event, payload}`）——总体设计 §10.2。
2. 冻结方法清单 v1：`session.attach/detach/heartbeat`、`log.emit`、`intercept.register/resolve`、`capture.upload`、`baseline.get/put`。
3. 冻结 `intercept.frame` phase 帧与 resolve 语义（`continue | modify | shortCircuit` + 超时放行）。
4. 冻结 `ScreenshotResult` / `DevSession` / `VisualBaseline` 数据结构（采集专章 §2、总体 §8.1、采集 §8）——发布为独立 JSON Schema 文件（前端 TS 类型 + Java DTO 由 schema 生成）。

验收：JSON Schema 发布；前端（vitest mock 网关）与 Java（模拟客户端）各过一遍协议符合性用例。

## M1 稳定性与快照地基（flux 仓库内，纯前端）

> 落地状态（2026-11-18 勘误附注，plan `docs/plans/2026-11-18-m1-stability-snapshot-foundation-plan.md`）：**前端侧收敛**——任务 1–6 全部落地（StabilityTracker、插件三钩子、store 写观察者 + ForestSnapshot 环形、DOM 影子、日志总线 diff/4ms/display-full、`__NOP_DEBUGGER_API__` V2）；验收微基准与 e2e 绿。deferred：Suspense 边界精确计数原归 M2——已于 M2 收口（flux-react suspense-stability provider，2026-11-18 勘误）；dependencyPaths 完整依赖收集归 M4——计数字段已预留。

**目标**：把 Cypress 两大原语（whenStable、惰性快照）+ diff 日志总线落进 flux 运行时与 nop-debugger。（总体设计 §3、§4）

任务：

1. `StabilityTracker`（新模块，flux-runtime，§3.3）：计数器 = 在途 fetcher/stream + scope 变更去抖窗 + Suspense 状态；`whenStable(): Promise<void>` 等待队列；变更事件入调试事件总线。零监听者时退化为空操作。
2. `RendererPlugin` 扩展（flux-core 契约 + flux-runtime 适配，§3.1）：新增 `afterAction`、`onRender`（cid + durationMs + dependencyPaths）、`onExpressionEval`（采样开关，默认关）。
3. store 写观察者（§3.2）：flux-runtime 暴露 `registerStoreWriteObserver`（不做 monkey-patch）；内核按 epoch 收口构造 `ForestSnapshot`（revision 向量对齐 + 结构共享，环形上限默认 200）。
4. DOM 影子（§5.1）：`importNode` 克隆 + 剥 script + CSS 内容 ID 去重 + 惰性 attach（Cypress `cy/snapshots.ts` 移植）。
5. 日志总线升级（§4）：Log 树（嵌套插入）+ diff 触发 + 4ms 节流 + display/full 分层。
6. `__NOP_DEBUGGER_API__` V2 兼容扩展：`getStability()` / `getSnapshotAt(epoch)`。

验收：

- 单测：StabilityTracker 计数/等待/超时语义；scope 森林快照一致性（含 owner 派生 scope）；快照环淘汰与结构共享；插件零监听者快速路径。
- e2e：playground debugger-lab 页演示快照采集与稳定性指示。
- 性能基准：无监听者时渲染路径开销 ≤ 基线噪声（微基准脚本入 `scripts/__tests__/`，入 CI）。

## M2 时间旅行 UI + 截图地基（面板增强）

> 落地状态（2026-11-18 勘误附注，plan `docs/plans/2026-11-18-m2-time-travel-capture-plan.md`）：**前端侧收敛**——预览协议（enterPreview/leavePreview/pin/真实输入退出）、S2 foreignObject 截图管线（sha-256 哈希 + 增量复用 + 遮罩 v1 + CaptureError 降级路径）、timeline scrub + 快照 diff、Suspense 计数（M1 Deferred 收口）、autoScreenshot <15ms 微基准绿。deferred：深度预览（显式回写 store）归 M4/M5（协议位与 disabled 按钮已留）；S3 光栅回退与分段滚动拼接为 v2 增强。

**目标**：时间轴 hover/pin 还原"当时的 store 状态 + DOM 影子"；截图子系统 S2 通道上线并挂到步骤树。（总体 §5 · 采集 §1–§4、§6）

任务：

1. 预览协议（§5.3）：`enterPreview(epoch)` = 活 DOM 备份 → DOM 影子挂载 + 遮罩横幅 → 状态层只读虚拟模式；深度预览（显式回写 store，`sourceScopeId:'__devtools'`）为独立按钮；任何真实输入立即退出。`pin` 跨事件保持。
2. `NopDebuggerPanel` 时间轴 scrub + 步骤树渲染（先序遍历嵌套 Log 树）。
3. 快照 diff 视图（§5.4）：相邻 epoch 的 `ScopeChange.paths` 路径级 diff，变更路径 → cid 反查高亮。
4. **截图 S2 通道**（采集 §2.2–§2.4）：foreignObject 管线（克隆清洗 → XHTML 化 → SVG → canvas → WebP）；`ScreenshotResult` 统一结构 + xxhash 内容哈希；CDP/降级标记字段预留给 M6/M7。
5. **cid 元素截图 + 增量截图**（采集 §3、§4）：DOM 结构签名 → 未变复用；步骤树节点挂 `refs.screenshotId`，`autoScreenshot('on-change')` 默认关、面板可开。
6. **脱敏遮罩 v1**（采集 §6）：克隆上遮罩（`[type=password]` + redaction 路径规则），活 DOM 不动。

验收：

- e2e：拖动时间轴 → `page.evaluate` 断言 store 值与 DOM 影子内容一致；退出预览后表单可继续交互；预览期间真实键入即退出。
- 截图：固定 DOM 夹具 → S2 截图 → 与基线像素哈希比对；两次相同 DOM 采集 hash 相同且二次光栅化计数为 0；敏感区域为遮罩色（canvas 像素断言）。
- 性能：自动截图开启时步进耗时增加 < 15ms。

## M3 断言与等待 API + 视觉基线对比（自动化面）

> 落地状态（2026-11-18 勘误附注，plan `docs/plans/2026-11-18-m3-assertions-visual-baseline-plan.md`）：**前端侧收敛**——waitFor 四类谓词 + assertion:retry 日志 + stableGate、dispatch 二分、YIQ 像素 diff + diffRatio + cid 聚合 + xui:visual-ignore 忽略区（1px 注入判别与忽略区归零均为程序化断言）、2–3 个既有 e2e sleep 改写为 waitFor(stability)。deferred：WaitResult.trace 归 M4（表达式采样开启后）、fake-clock 归 M5（回放时钟需求）；基线网关版本化归 M6。

**目标**：flux 版 retry-ability + 内置视觉回归（schema 感知）。（总体 §6 · 采集 §8）

任务：

1. `waitFor(pred, {timeoutMs, intervalMs, stableGate})`：cid/scope/event/stability 四类谓词；每次重试发 `assertion:retry` Log（面板显示尝试次数与最近失败原因）。
2. 效果/查询二分文档化：`dispatch(action)`（一次）vs `waitFor(...)`（重试）；`__NOP_DEBUGGER_API__` 暴露。
3. **视觉基线对比（本地模式）**（采集 §8）：YIQ 像素 diff（自实现 pixelmatch 算法）、diffRatio、按 cid 聚合区域 diff；`xui:visual-ignore` schema 注解 → 忽略区；`visual` 谓词接入 `waitFor`。基线本地存储（`_tmp/baselines/` 政策 + 网关版本化留 M6）。
4. fake-clock（可选后置）：调试会话内接管 `setTimeout/Date`（sinon 思路），接口按 M5 回放需求设计。

验收：

- 用 waitFor 重写 2–3 个现有 e2e 等待场景并对比稳定性；断言 API 单测。
- 注入 1px diff → diffRatio 阈值行为正确；cid 忽略区生效（程序化断言）。

## M4 语义层 Why 面板 + 依赖图（低代码差异化）

**目标**：选中节点回答"为什么"。（总体 §7）

任务：

1. Why 归因（§7.1）：五类归因链——meta 归因（disabled/visible）、props 归因、不渲染归因（visible/region/error boundary）、reaction 归因、数据归因（反查快照历史首写 epoch）；产出 `WhyReport` + 可点击 `EvidenceLink`（跳时间轴/cid/表达式）。底座扩展 `explanations.ts`。
2. 依赖图（§7.2）：写边（快照 diff）/读边（依赖收集器）/派生边（region）；>2k 边退化为路径查询。
3. cid 选择器（§7.3）：点选元素 → `data-cid` 直达；附传统 selector 建议（`data-test` > `data-cid` > 最短唯一 CSS）。
4. Why verdict 自动附截图证据（复用 M2 capture：`tag: 'why:<verdict>'`）。

验收：demo 页构造"disabled 之谜/不渲染之谜"用例，Why 面板给出正确归因（e2e 程序化断言归因文本与 evidence 链接可达）。

## M5 录制与确定性回放 + 视频录制

**目标**：用户会话可录制、可在新 runtime 确定性重放；会话可出视频。（总体 §8 · 采集 §7）

任务：

1. 录制器（§8.1）：归一化输入事件（`FluxActionEvent` 载荷）+ fetcher/stream 响应帧 + fake-clock 事件 + 周期 checkpoint（revision 向量 + 关键路径哈希）；全程 redaction。`DevSession` v1 落 docs 规范（M0 schema）。
2. 回放器（§8.2）：新 `SchemaRenderer` + fetcher stub 走录制响应 + fake-clock；每步比对 checkpoint，分歧记 `Divergence {step, path, expected, actual}` 并可停驻检查；副作用默认 stub（navigate/dialog 记录不执行）。
3. **视频录制**（采集 §7）：`autoScreenshot` 的 canvas 产物 → 录制 canvas → `MediaRecorder`（webm/vp9）事件驱动帧；降级 = 关键帧序列 + 时间戳；产物入本地缓存，转码归档留 M6。
4. 本地会话缓存：IndexedDB LRU（配额 <200MB）。

验收：

- playground 录制 30 步交互 → 刷新页面重放 → 程序化断言最终 store/DOM 与录制终点一致。
- 注入随机数用例能被分歧检测捕获并定位路径。
- 100 步增量媒体总量 < 15MB（WebP）；录制含视频的会话可回看（页面内播放）。

## M6 Java 网关与全栈拦截 + 媒体归档（nop-entropy 侧）

**目标**：Cypress net-stubbing 的全栈版 + 媒体/会话服务端归档。（总体 §10 · 采集 §9）

任务（nop-entropy 平台工程，Java，模块划分见总体 §10.1）：

1. DevTools Gateway（`api/` + `session/`）：按 M0 冻结协议实现 WSS endpoint、会话 attach/detach/心跳、鉴权 + 权限位（`devtools:debug` / `devtools:intercept-write` / `devtools:replay-others`）、超时自动放行。
2. 服务端拦截（`intercept/`）：服务调用边界织入 phase 帧（`before:handler`/`after:handler`）；前端 resolve（continue/modify/shortCircuit，eventId 关联）；超时 continue 标记 degraded；改参默认禁用 + 会话级确认 + 审计。
3. 全栈关联（`correlate/`）：interactionId ↔ traceId/span，时间轴双泳道（前端 action/api 段 + Java span 段），点击互跳。
4. 归档（`store/`）：`capture.upload`（脱敏终检 → 对象存储 WebP/MP4 + DB 元数据）+ 会话归档 + ffmpeg 转码（webm→mp4 + 缩略图）+ 视觉基线版本化库（`baseline.get/put`，按 schemaFingerprint）。
5. 前端配套：GatewayClient 接入（log 镜像、拦截订阅 UI、上传重试队列、失败本地保留）。

验收（联调环境）：

- 时间轴显示同一次交互的前端 action → fetcher → Java span 全链。
- 拦截帧改一个响应参数，前端渲染随之变化（程序化断言）；超时不 resolve → 业务自动放行且面板显示 degraded。
- 无调试权限账号被网关拒绝；拦截帧改参需授权且有审计记录。
- 截图/视频上传经网关二次脱敏校验（漏配规则被拦截的负向用例）。

## M7 生产诊断模式 + AI 深化

**目标**：调试能力反哺生产支持与 AI 辅助（`nop-debugger-ai` 已有底座）。（总体 §9 · 采集 §2.1）

任务：

1. 构建开关（§9.4）：`__FLUX_DEVTOOLS__` 构建宏裁剪，生产仅留错误遥测 + 最小诊断包采集器（动态 import）。
2. 诊断包：脱敏 `DevSession`（事件流 + 快照摘要 + schema patch 审计 + **关键帧挑选**：断言失败/Why verdict/首末帧）上传 gateway；工程师开发环境**重放诊断包**复现。
3. CDP 截图通道 A（采集 §2.1）：可选调试通道接入 `Page.captureScreenshot`，用于诊断包高保真补图（跨域资源多的场景）。
4. AI：Why 面板结论 + 会话回放分歧报告 + 视觉 diff 区域作为 AI 修复建议输入（对接既有 `nop-debugger-ai` schema-patch 流）。

验收：

- 脱敏规则单测（敏感字段/敏感画面区域不出现在诊断包）。
- 生产构建产物中 DevTools 全量内核不可达（静态检查 + 运行时探针）。
- 端到端"生产诊断包 → 开发环境重放 → AI 建议"演示用例。

---

## 里程碑节奏建议

- **M0 尽快启动**（纯文档/Schema 工作，无代码风险）；M1–M3 flux 仓库内闭环，完成即"追平 Cypress 核心体验 + 内置截图超越"。
- M4 与 M5 可并行（不同子模块）。
- M6 需要 nop-entropy 平台侧排期：M0 完成即可并行开发网关骨架（用模拟前端联调），M1 完成后接入真内核；M5 完成后归档/转码全量接入。
- **E 轨道**：E1 在 M1 后启动；E3 批量迁移可与 M4/M5 并行推进；E4（删除 Playwright）必须等 244 个 spec 全部迁移且双引擎对照期无差异方可行。
- **B1（终局）**：M7 + E5 全部完成后执行 Cypress 实测对比；对比报告通过门禁标准 = 项目收官。
- 每阶段立正式 plan（`docs/plans/`），走 plan → implement → closure audit 链；跨仓库（M6）单列人工门禁。

## 全局验收（项目级）

1. `pnpm typecheck / build / lint / check / test` 全绿（每阶段）。
2. 性能红线：调试器关闭时渲染路径零额外开销（微基准守护）；开启时 P95 交互延迟增幅 < 10%；自动截图步进增加 < 15ms；增量媒体 100 步 < 15MB。
3. 安全红线：脱敏规则覆盖事件流、快照、录制帧、截图遮罩、上传链路（前端 + 网关双重）；网关拦截默认只读；生产构建全量内核不可达。
4. 协议红线：任何协议变更必须回到 M0 Schema 更新并两端符合性用例同步。
5. **收官红线（B1）**："全面超越 Cypress"必须以 B1 实测对比报告为准，未实测前任何文档/宣传口径不得声称超越。
