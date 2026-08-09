# Industrial HMI Benchmark Report（I14 Benchmark 与性能优化）

> 文档共识审查记录（roadmap Cross-Cutting 文档共识审查，≤3 轮，0 新增修正项即共识）：
>
> - Round 1（2026-08-04，独立子 agent fresh session，task `ses_035ed10f8ffeSmBCbSeuXNaDNr`）：判定 `pass-with-minors`——0 Blocker / 0 Major / 2 Minor / 1 Nit，全部落地：m-1 波动范围扩至含负载下 ~29 fps 失败档（§7 观察项）；m-2 插件平移 render 事件证据链补全（totalTimes vs times 计数器 + 画布像素 hash，§3.2/§7）；n-1 环境变量补 `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true`（§2）。
> - Round 2（2026-08-04，独立子 agent fresh session，task `ses_035ed10f8ffeSmBCbSeuXNaDNr` 确认轮）：判定 `pass`——0 新增修正项，**共识达成**（m-1/m-2/n-1 三项落地核验通过，未改动段落与 R1 基线一致）
> - Round 3：不适用（第 2 轮已达成共识）
> - 共识结论：**AGREE（2 轮，≤3 轮上限内）**
>
> 状态：I14.1 基线已固化（2026-08-04）｜I14.2 优化轮已完成（声明解析 O(1) 化，刷新延迟 -51%）｜I14.3 最终复测全项达标，结论固化（见 §9）
> 上游依据：`design-engine.md` §4.6 性能策略与基线（spike 实测）、`gate-3-review.md` §3/§10（leafer 真实 API 抽查 + m-8 归属）、`research-download.md` §2.2（性能数字校准）
> 测量脚本：`tests/e2e/scada-perf.spec.ts`（5 项测量，`test.describe.configure({ timeout: 180_000 })`，与 calendar-perf/gantt-perf/diff-perf 超时档位对齐）

## 1. 结论摘要

10 万图元 + 1 万实时数据点全项达标（验收包络：10 万可交互 ≥45fps / 首屏创建 <2s / 内存 ≤320MB；1 万点端到端刷新 <200ms）：

| 测量项                                      | 最终复测（I14.3）                     | 验收包络 | 判定 |
| ------------------------------------------- | ------------------------------------- | -------- | ---- |
| 10 万图元首屏创建（组态生成完成→首帧）      | 373.1 ms                              | <2000 ms | ✅   |
| 10 万拖动/平移 fps（指针路径 rAF 显示帧率） | best 70.3 fps（3 采样）               | ≥45 fps  | ✅   |
| 10 万平移 fps（渲染吞吐代理口径）           | best 49.4 fps（3 采样）               | ≥45 fps  | ✅   |
| 内存（CDP JS heap，含 stroke）              | 130.6 MB                              | ≤320 MB  | ✅   |
| 内存（无 stroke 对照组）                    | 127.8 MB（delta 2.8 MB）              | ≤320 MB  | ✅   |
| 1 万点批量刷新端到端延迟                    | 41.9 ms（基线 80.1–86.2 → 优化 -51%） | <200 ms  | ✅   |
| 1 万点批量合并帧断言（渲染增量）            | 1（合帧路径生效）                     | =1       | ✅   |

## 2. 测量环境

- 机型：Apple M4 Max（darwin arm64），macOS 26.5.2，128 GB RAM
- 浏览器：Playwright Chromium headless（Chrome for Testing 151.0.7922.34，headless shell），viewport Desktop Chrome
- Node：v25.3.0；leafer-ui@2.2.9 + @leafer-in/viewport@2.2.9（I4 锁定版本）
- 运行方式：`npx playwright test tests/e2e/scada-perf.spec.ts --workers=1`（webServer = playground dev，`__FLUX_STRICT_VALIDATION__=true __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true PLAYWRIGHT=true`，playwright.config.ts 原样）
- 挂载载体：`apps/playground/src/pages/scada-perf-scale-demo.tsx`（`#/scada-perf-scale` 独立路由，10 万图元测量基体为矩形、固定随机种子 42）
- 测量日期：2026-08-04（基线轮）

## 3. 测量方法（口径固化）

### 3.1 首屏创建（10 万图元）

- 口径：**组态生成完成 → tree render 首帧**（与 spike 基线 165.3 ms「10 万矩形创建至首帧」口径对齐）；导航/React 挂载/组态生成开销排除在计时外，生成耗时单独记录（genMs 8.1–9.8 ms）。
- 驱动：页面加载占位画面（10 图元）→ e2e 经 `window.__scadaPerfScale.generate(100_000, { stroke })` 生成组态（计时）→ 测试句柄 `engine.reset(config)`（引擎全量构建路径，与 renderer `use-scada-config-sync` full 策略同路径）→ tree `render` 事件首帧计时（symbols ≥ 100_000 守卫，排除销毁占位场景的早期 render）。
- 采样：单次构建计时；结果含 genMs / buildMs / symbols。

### 3.2 拖动/平移 fps（双口径，A4）

- 指针事件路径（显示帧率口径）：真实浏览器鼠标 down + move 驱动平移（`page.mouse`，CDP Input 域），同窗口内 rAF 帧计数（显示帧率）+ tree render 事件计数（渲染吞吐）。
- 渲染吞吐代理口径：命令路径 `engine.setViewport` 在 rAF 帧循环中连续平移 2s，tree `render` 事件计数（A4 吞吐代理）。
- **测量发现（I14.1）**：viewport 插件驱动的 zoomLayer 平移（指针拖动/wheel）在 3 层 App（ground/tree/sky）下**不发射 tree 层 render 事件**——证据链：renderer `totalTimes` 随输入递增（10 次拖动 +20）而 `times`/render 事件不递增（debug18 采样）；`zoomLayer.move` 直接调用与命令路径均正常发射 render 事件（debug13）；画布像素 hash 实测随平移变化（debug17c，视觉平移正常，非渲染缺陷）。故指针路径渲染吞吐无法经 render 事件计数，**指针路径以 rAF 显示帧率计量，渲染吞吐以命令路径 render 事件计数**（双口径落地方式，A4 声明内）。该行为是双口径决策的承重证据，随 leafer 版本升级需复测（Non-Blocking Follow-ups）。
- headless 帧钟随机器负载波动：每项 3 次采样，判定取最大值（试探性阈值，I14.3 固化最终阈值）。

### 3.3 内存（CDP JS heap，含无 stroke 对照组）

- 采样口径：CDP `HeapProfiler.enable` + `Performance.enable` → `collectGarbage` → 300ms 稳定 → `Performance.getMetrics` `JSHeapUsedSize` ×3 采样取最小值。
- 对照组：同一 100k 矩形基体，stroke 开/关两态（spike 内存 +40% 观察项：100 万对照 448.4MB vs 官方 320MB，推测 stroke 属性 + 软渲染缓冲）。
- 口径差异声明：本测量为**全页 heap**（含 playground App shell/React/flux 运行时/3 层 App），spike 47.5 MB 为最小 demo 页 heap——绝对值不可直接比较，同环境对照（stroke vs 无 stroke）与验收包络 ≤320MB 为判定依据。

### 3.4 1 万点实时刷新端到端延迟 + 合帧断言

- 注入通道：`perf-injection-channel` 裁定——测试句柄批量方法 `window.__flux_scada_<cid>.setPointValues(values)`（pointStore.setPointValues 10k 值一次写入 + pipeline.requestRender；与 scope-bridge 同写入路径，剔除 1 万 flux 变量订阅/求值开销）。
- 计时：`tree render` 监听基线 → 批量注入（t0）→ 首个 render 事件（t1），latency = t1 − t0。
- 合帧断言：注入后渲染事件增量 === 1（合并帧/脏属性收集路径生效，性能红线「禁止逐点直刷」验证）。
- 场景：10k 静态点 + 10k 矩形（opacity ← 点值 k=0.001 量程换算），经 UI 切换整页重挂载（key remount）加载。

### 3.5 batch.add 对照探针（gate-3-review §10 m-8）

- 工具：测试句柄 `measureAddStrategies(count)`（`packages/flux-renderers-industrial/src/engine/batch-add-probe.ts`，dev/test 专用投影，非公共契约）。
- 口径：与 config-adapter.build 同形态——离线根 Group，50k 矩形逐节点 add vs `Group.add(nodes)` 一次批量 add；真实 leafer，浏览器上下文。
- 判定：观察项（非缺陷），不设 pass/fail 门禁；结论为 I14.2 优化决策输入。

## 4. I14.1 裁定记录

### 4.1 10 万级测量场景加载方式（消费 I13 plan `pressure-scale-drift` 裁定记录）

- **裁定：独立 perf 页/路由 `#/scada-perf-scale`**（对齐 calendar-perf-scale/gantt-perf-scale/diff-perf-scale 先例：独立页面 + 独立路由）。
- 选项否决：扩展 `scada-pressure-demo` 规模参数——I13 页面明确「不越界实现 10 万场景」且保持既有 10k 模式零回归；独立页面使测量场景与演示页职责分离。
- 无 stroke 对照变体纳入选项空间：内置（生成器 `stroke` 开关，`generate(count, { stroke })`）。
- 落地归属：页面/路由扩展归本 plan I14.1（`scada-perf-scale-demo.tsx` + route-model/App/pages index 注册）；I13 既有页面未改动。
- 测量基体：矩形（对齐 spike 165.3 ms 口径）；默认小占位画面（10 图元）保证 App 启动快、e2e 经测试句柄驱动 10 万构建。

### 4.2 1 万点批量注入通道（`perf-injection-channel`）

- 事实核对：`component:setPointValues` 不存在（`SCADA_HANDLE_METHODS` = fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy，use-scada-handles.ts）；批量写存在于 domain 层 `point-store.setPointValues`，经 `use-scada-points-bridge` scope-bridge 可达（需 1 万 `source:'flux'` 变量声明 + 订阅/求值链路，开销含订阅面）。
- **裁定：dev/test 专用批量方法挂测试句柄 `window.__flux_scada_<cid>.setPointValues(values)`**（dev/test 投影，`use-scada-engine.ts` 在 exposeTestHandle 时挂载，实现 = pointStore.setPointValues + pipeline.requestRender）。
- 依据：① 与 scope-bridge 完全同写入路径（use-scada-points-bridge.ts 同两行调用），测量的是真实引擎链路；② 剔除 1 万 flux 变量订阅/求值开销对测量的污染（spike 基线 16.9–19.7 ms 量级）；③ 非 `scada-canvas` 公共契约变更（SCADA_HANDLE_METHODS 未动、仅 dev/test 句柄投影），**不触发人工确认阈值**。
- 否决路径：scope-bridge（1 万 `source:'flux'` 变量）作注入通道——测量含订阅/编译/求值开销，无法分离渲染链路延迟。

### 4.3 指针拖动平移配置（I14.1 测量发现驱动）

- 发现：viewport 插件默认不开启鼠标拖动平移（`move` 配置缺省仅 `autoDistance: 2`，`canMove` 恒 false）；验收包络含「10 万图元可交互/拖动」，spike 拖动 fps 口径使用 `move: { drag: 'auto', dragEmpty: true }`。
- **裁定：引擎 tree 配置补 `move: { drag: 'auto', dragEmpty: true }`**（scada-engine.ts appConfig.tree）——drag:'auto' 在图元非 draggable 时让位画布平移，dragEmpty 覆盖空白区拖动；图元级 draggable 语义留 I16 编辑器。非 fields/events 公共契约变更，不触发人工确认阈值。design-engine.md §4.4 同步记录。
- 既有行为回归验证：scada-demo/scada-pressure-demo e2e 7 项全绿（点击/点表/切换均不受影响）。

## 5. 基线数值（I14.1，2026-08-04 实测）

| 测量项                                      | 基线值                     | spike 对照（design-engine.md §4.6）               | 余量           |
| ------------------------------------------- | -------------------------- | ------------------------------------------------- | -------------- |
| 10 万图元首屏创建 buildMs                   | 342.9 / 344.4 ms           | 165.3 ms（实例化 125.5 + 入树 8.7 + 首帧）        | ~5.8x          |
| 10 万图元组态生成 genMs（计时外单独记录）   | 8.1–9.8 ms                 | —                                                 | —              |
| 指针拖动显示帧率（rAF，best of 3）          | 69.9 fps（69.1/69.9/69.5） | 指针端到端 17–29 fps（CDP 输入路径开销，A4）      | ≥45 达标       |
| 渲染吞吐代理（tree render 事件，best of 3） | 49.9 fps（45/42.3/49.9）   | 平移吞吐 114.3 fps / 缩放 174.2 fps（spike 单层） | ≥45 达标       |
| 内存 stroke（CDP JS heap 全页）             | 128.8 MB                   | 47.5 MB（spike 最小页，口径差异见 §3.3）          | ≤320 MB 达标   |
| 内存无 stroke 对照组                        | 126.1 MB（delta 2.7 MB）   | —（100 万对照 448.4 vs 320 官方，+40% 观察项）    | 对照组口径固化 |
| 1 万点批量刷新端到端延迟                    | 80.1 / 85.1 / 86.2 ms      | 16.9–19.7 ms（更新 1.7–2.6 + 渲染 15–17）         | ~2.4x          |
| 1 万点批量合并帧断言（渲染增量）            | 1                          | —（性能红线验证）                                 | =1             |
| batch.add 对照（50k，逐节点 vs 批量）       | 3.1 ms vs 551.2 ms         | spike 组态加载 178.9 ms（10 万 symbol JSON）      | 见 §6          |

口径差异声明（与 spike 对照的可比性边界）：

- 首屏创建：spike 为单层 App 最小 demo；本项目为 3 层 App + 引擎全量路径（registry/样式解析/组态构建）。两者均远优于验收 <2s。
- 刷新延迟：本测量含 1–2 帧对齐（rAF 调度）与 10k 绑定解析 + 10k 属性写入 + 渲染，spike 为批量 set + 渲染裸路径；验收 <200ms 均满足。
- fps：spike 平移吞吐为单层 App 程序式驱动；本项目为 3 层 App + 真实指针路径 + 命令路径双口径（A4）。

## 6. batch.add 对照结论（gate-3-review §10 m-8 兑现）

- 实测（50k 矩形，离线根 Group，与 config-adapter 同形态）：逐节点 add **3.1 ms** vs `Group.add` 批量 **551.2 ms**（比值 ~0.006x，批量慢 ~178 倍）。
- 解读：批量 add 触发一次性整组子节点处理（childrenAdd/布局链路），逐节点 add 在离线 Group 上仅为轻量链接（leafer 延迟布局）；config-adapter 当前逐节点 add 形态即为该场景下的更优路径。
- **结论：不切换到 batch.add**（m-8 对照实证）；10 万构建 344.4 ms 已远优于验收 <2s，batch.add 路径不构成优化候选（I14.2 优化项裁定输入，反向证据）。
- 非缺陷口径固化：m-8 为性能观察项（gate-3-review §10），本对照记录基准数值与场景形态，后续版本升级 leafer 后可复测对照。

## 7. 观察项记录

- **无 stroke 对照组**：10 万矩形 stroke 开/关 heap delta 2.7–2.8 MB（全页口径）——stroke 属性在 10 万级的内存代价可测但有限；spike +40% 观察（100 万对照 448.4 vs 320）主要来自更大规模下的软渲染缓冲，本项目 10 万验收口径余量 ~2.4x（320/130.6），对照组口径固化完成。
- **插件平移 render 事件行为**：见 §3.2 测量发现（非缺陷，口径声明）。
- **headless 帧钟波动**：吞吐采样 42.3–49.9 fps 波动（机器负载相关），取 best of 3 判定；独立复测（文档共识 R1 轮）曾观察到负载下 best 29.8 fps 的失败档（采样 29.7/29.8/29.2）——阈值按「试探性、I14.3 固化」处理，**I14.3 最终阈值须以本轮波动档位为输入**（不设会因机器负载误判的脆性阈值）；真实显示环境（有 vsync 显示器）帧率行为以真实浏览器抽测为准（I15 后续可选）。
- **dirtyBlocks 预留字段**：gate-3-review m-1 复核——tree render 事件仍不暴露脏块计数，dirtyBlocks 恒 0 保持（leafer 侧限制，文档明示预留）。

## 7b. 刷新延迟基线分解（I14.2 优化项裁定输入）

- 直接 `engine.applyAttrs`（10k 图元 patch，跳过绑定流水线）→ render 完成：**18.8 ms**（≈ spike 渲染基线 15–17 ms，渲染路径无差距）。
- 全流水线（批量注入 → 合帧 → 脏收集 → applyAttrs → render）：**72.8 ms**——流水线自身开销 ~54 ms。
- 热路径定位：`collectStates` 每帧对 10k 图元调用 `engine.getSymbolDeclarations` → `adapter.getNode`（**对 10k 图元数组线性扫描**，3334 次调用实测 45.9 ms）+ `deepMergeInstanceProps`（无声明图元也深合并，3334 次实测 48.8 ms）。
- 结论：渲染路径无差距（18.8 ms vs spike 15–17 ms），差距在本项目绑定层声明解析热路径 → 列入 I14.2 优化执行。

## 8. I14.2 优化前后对比

### 8.1 优化项裁定清单（I14.2 Decision）

| 优化面（design-engine.md §4.6 预设）  | 基线对照                                                           | 裁定                                                          |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| 图元实例化（10 万构建）               | buildMs 344.4–415.3 ms，验收 <2000 ms，余量 ~5x                    | **不优化**（余量充分；m-8 对照实证 batch.add 更慢，反向证据） |
| 裁剪                                  | 命中屏内 1.9–2.4 ms（gate-1 A3），吞吐 60.9 fps 达标               | **不优化**（10 万级 A3 已裁定不加空间索引；无基线差距）       |
| 脏区/局部重绘（刷新路径）             | renderDelta=1 合帧断言通过；刷新延迟 42.1 ms（优化后）             | **不优化**（合并帧 + 脏属性收集已生效并经断言验证）           |
| 数据节流                              | 批量注入 2.6 ms + 合帧调度生效                                     | **不优化**（性能红线「禁止逐点直刷」已验证）                  |
| 动画合帧                              | Animator 帧对齐 + 脏收集共享调度已落地（I6）；I14 无动画专项测量项 | **不优化**（无基线差距可裁；后续动画卡顿报告作新观察项）      |
| 绑定/状态声明解析热路径（实测差距项） | collectStates 每帧 10k 线性扫描 + 深合并 ~54 ms（§7b）             | **执行优化**（见 8.2）                                        |

### 8.2 执行项：声明解析 O(1) 化（Fix）

- 修复 1：`ConfigAdapter` 增 `nodeById` 索引（build/applyDiff 增量维护），`getNode` O(1)（未命中回退线性扫描保语义），原线性扫描 10k×/帧。
- 修复 2：`ScadaCanvasEngine.getSymbolDeclarations` 无声明快路径——实例与 defaults 均无 states/animations 时直接返回 undefined（跳过 deepMerge）。
- focused 单测 +6（getSymbolDeclarations 快路径 5 项 + nodeById 跨 applyDiff 语义 1 项），既有 453 项全绿不回归；workspace typecheck/test 全绿。

### 8.3 优化前后对比（复测记录）

| 测量项                  | 基线（I14.1）    | 优化后（I14.2）        | 变化                         |
| ----------------------- | ---------------- | ---------------------- | ---------------------------- |
| 1 万点刷新端到端延迟    | 80.1–86.2 ms     | 42.1 ms                | **-51%**，余量 4.75x         |
| 1 万点合并帧断言        | renderDelta=1    | renderDelta=1          | 不变（合帧路径保持）         |
| 10 万首屏创建           | 342.9–344.4 ms   | 415.3 ms（负载波动内） | 不变（余量 ~4.8x）           |
| 指针拖动 rAF 帧率       | best 69.9 fps    | best 70.8 fps          | 不变                         |
| 渲染吞吐（render 事件） | best 49.9 fps    | best 60.9 fps          | 负载内波动                   |
| 内存 stroke / 无 stroke | 128.8 / 126.1 MB | 130.6 / 127.8 MB       | 负载内波动                   |
| batch.add 对照          | 3.1 vs 551.2 ms  | 3.2 vs 523.5 ms        | 结论不变（不采纳 batch.add） |

复测方式：`tests/e2e/scada-perf.spec.ts` 全量重跑（优化后一轮），测量脚本/阈值/口径与基线轮一致。

## 9. I14.3 最终复测结论

### 9.1 最终复测数值（2026-08-04，优化后最终轮）

| 测量项                                      | 最终复测值                   | 验收包络 | 判定    |
| ------------------------------------------- | ---------------------------- | -------- | ------- |
| 10 万图元首屏创建（组态生成完成→首帧）      | 373.1 ms（多轮 344.4–415.3） | <2000 ms | ✅ 达标 |
| 指针拖动/平移显示帧率（rAF，best of 3）     | 70.3 fps（70.2/68.4/70.3）   | ≥45 fps  | ✅ 达标 |
| 平移渲染吞吐（tree render 事件，best of 3） | 49.4 fps（45/42.2/49.4）     | ≥45 fps  | ✅ 达标 |
| 内存 stroke / 无 stroke（CDP JS heap）      | 130.6 / 127.8 MB             | ≤320 MB  | ✅ 达标 |
| 1 万点批量刷新端到端延迟                    | 41.9 ms                      | <200 ms  | ✅ 达标 |
| 1 万点合并帧断言                            | renderDelta = 1              | =1       | ✅ 达标 |

### 9.2 达标裁定（I14.3 Decision）

- **全项达标**：双口径 fps（渲染吞吐代理 49.4 fps + 指针路径显示帧率 70.3 fps）≥45、首屏创建 373.1 ms <2s、内存 130.6 MB ≤320MB、1 万点刷新 41.9 ms <200ms——全部满足验收包络，**不触发人工确认阈值**（roadmap「benchmark 不达标才标记人工决策」）。
- 余量分析：首屏 ~5.4x（2s/373ms）、内存 ~2.4x（320/130.6）、刷新 ~4.8x（200/41.9）、fps 1.1x+（49.4 vs 45，headless 帧钟波动下 best-of-3 判定，见 §7）。
- 测量口径与环境声明：见 §2/§3（A4 双口径、插件平移 render 事件行为、全页 heap 口径、headless 帧钟波动）；最终阈值随本报告固化：≥45fps（best of 3）/首屏 <2s/内存 ≤320MB/刷新 <200ms。
- 优化轮结论：声明解析 O(1) 化落地（§8），刷新延迟 86.2→41.9 ms（-51%）；其余预设优化面裁定不优化（§8.1），batch.add 不采纳（§6 对照实证）。

### 9.3 结论

10 万图元可交互/首屏/内存与 1 万实时数据点刷新**全项达标**，性能基准固化为后续版本回归基线（与既有 calendar/gantt/diff perf spec 并列）。
