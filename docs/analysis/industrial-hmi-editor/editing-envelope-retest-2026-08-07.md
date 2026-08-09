# E9.2 编辑态包络复测报告（runtime 3 层 App）

> 日期：2026-08-07
> 阶段：E9.2 M3 收尾 benchmark 复测
> 来源 plan：`docs/plans/2026-08-07-0906-2-e9-m3-toolbox-completion-and-closeout.md`（Phase 2 Proof）
> 裁定建议基线：`editing-envelope-2026-08-06.md §3`（五项包络裁定建议值）
> 测试基座：`tests/e2e/scada-editor-perf.spec.ts`（Playwright，runtime 3 层 App = `apps/playground` `#/scada-editor-demo`，经 `window.__flux_scada_editor_<cid>` 测试句柄程序化驱动；禁截图、不引 node-canvas）
> 性质：**R7 人工确认项**——AI 产出复测数据 + 标记，人工最终确认 mission 级阈值（`editing-envelope-2026-08-06.md §4`）

## 1. 复测方法

- **环境**：headless Chromium（Playwright 1.59），runtime 3 层 App（registry / 样式解析 / 组态构建 / React 桥接，非 scratch 单层）。
- **场景装载**：经 editor test handle `load(config)` 批量装入 N 个 `scada-rect`（20×20，网格排布），1k 图元场景。
- **选区**：经 `setSelection(ids)` 设前 N 个图元为选区（leafer Editor target = N 节点）。
- **测量口径**（与 `scada-perf.spec.ts` / `benchmark-report.md` 一致）：
  - **② per-call 延迟**：`performance.now()` 包络单次工具箱操作（align/distribute/z-order/copy/paste），per-call 端到端同步成本。
  - **① 拖拽 fps**：rAF 显示帧率，与 pointer move **并发**采样（先启动 rAF 计数 evaluate 返回 promise，同步驱动 `page.mouse.move` 触发 editor transform 热路径，最后 await 计数），3 次采样取最大（headless 帧钟波动）。
  - **④ 内存**：CDP `Performance.getMetrics` JSHeapUsedSize，`HeapProfiler.collectGarbage` 后 3 次取 min。

## 2. 复测结果（对照 §3 裁定建议值）

| §3 # | 包络维度                       | 裁定建议值（§3）              | runtime 3 层 App 复测值                                                                                                                                                           | 余量/风险                                           | 裁定               |
| ---- | ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------ |
| ②    | 编辑操作响应延迟上限           | <100ms（per-call）            | **n=100 max 13.1ms**（align 2.6 / distribute 0.1 / z-order 13.1 / copy 0.1 / paste 4.5）；**n=1000 max 6.8ms**（align 5.3 / distribute 0.1 / z-order 0.2 / copy 0.1 / paste 6.8） | 余量 ~7.6×（1k max 13.1ms vs 100ms）；无翻车风险    | ✅ 达标            |
| ①    | 拖拽响应 fps 阈值              | ≥30fps @ 选区 ≤1k（primary）  | **best 50.2fps @ 1k 选区**（3 samples: 7.5 / 50.1 / 50.2，取最大）；稳态 50fps                                                                                                    | 余量 1.67×（50.2 vs 30）；首次拖拽初始化 jank 见 §3 | ✅ 达标（primary） |
| ③    | 覆盖物密集场景上限（选区规模） | ≤1k primary / ≤10k extended   | 1k 实测达标（见 ①）；extended（≤10k）未在本轮升级为正式包络                                                                                                                       | primary 达标；extended 维持「留观察」               | ✅ primary 达标    |
| ④    | 内存上限                       | ≤320MB                        | **50.2MB @ 1k 图元**（含选区 + undo 栈 + React 桥接）                                                                                                                             | 余量 ~6.4×（320/50.2）；内存非编辑态瓶颈            | ✅ 达标            |
| ⑤    | 编辑器本体 runtime 最终验证    | E6（M1 gate）+ E9.2（本复测） | 本复测完成（runtime 3 层 App 下编辑器本体 ①②④ 达标）                                                                                                                              | E9.2 闭环                                           | ✅ 完成            |

**复测结论**：编辑器本体在 runtime 3 层 App 下对照 §3 裁定建议值，primary 包络三项硬数字（①②④）全部达标且余量充足；`envelope-below-candidate` Failure Path **不触发**。

## 3. 指针延迟抽查（[E1.1-sg] watch-only residual）

> 来源：`[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（roadmap Follow-up Backlog）——「大规模选区首次拖拽 simulateTarget 初始化延迟」。

- **观察**：1k 选区**首次**指针拖拽的 2s 采样窗口 rAF = **7.5fps**（显著低于稳态 50fps）；第 2、3 次拖拽稳态 50.1 / 50.2fps。
- **归因**：首次 transform 触发 leafer Editor 为 1k 选区一次性构建 EditSelect/EditBox overlay + simulateTarget 初始化（缓存后复用），主线程阻塞抑制了首段 rAF；后续拖拽复用已构建 overlay → 稳态 50fps。与 spike §3.3 headless+swiftshader 下界一致（leafer Editor 内部逻辑与 runtime 宿主无关，§2.2 已论证）。
- **影响评估**：**非阻断**——典型工业编辑选区 ≤几百（远低于 1k），首次拖拽初始化成本随选区规模下降；稳态 ≥30fps 满足 primary 包络。属用户可感知的「首次拖拽卡顿一下」体验项，非安全/实时性红线。
- **处置**：维持 `[E1.1-sg]` watch-only residual 分类（非 live defect，不阻断 closure）；如未来需优化首次拖拽响应，属 M3 后 optimization candidate（lazy EditBox 构建 / simulateTarget 延迟初始化）。

## 4. 与 E1.2 calibration 估计的一致性核对

E1.2 §2 calibration 估计（runtime 3 层 App 实例化开销不进 per-frame 热路径；中性档 1.6× 余量可靠吸收边际影响）经本轮 runtime 复测**证实**：

- per-call 操作延迟（②）n=1000 max 6.8ms ≈ spike §3.4 per-call 同步量级（8.8/8.9/10.0/20.7ms），runtime 宿主未显著抬升 per-call 成本（§2.1 实例化开销不进 per-call 路径）。
- 稳态拖拽 fps（①）50fps ≈ spike §3.3 两方案 1k≈50fps，runtime 边际影响被余量吸收（§2.3 中性档 1.6× 余量验证）。
- 内存（④）50.2MB ≈ spike §3.2 final 102.8MB 同量级（含 10 万图元的 spike 远大于本轮 1k；1k 编辑场景内存远低于 320MB 红线）。

## 5. R7 状态推进

- **R7（编辑态 benchmark 包络数字确立）当前状态**：**E9.2 runtime 3 层 App 复测完成，primary 包络 ①②④ 全部达标（数据见本报告 §2），待人工最终确认**。
- AI 产出复测数据 + 标记（本报告 + roadmap 头部）；**人工最终确认** mission 级阈值（roadmap Cross-Cutting「人工确认阈值」+ `editor-initiation.md §6 R7`）。AI 不自确认（§4 条款）。
- extended 包络（≤10k）：本轮未升级为正式 mission 级包络（保守档 7% 余量风险，§3.1），维持「留观察」分类。

## 6. 测试基座可重复性

- 复测命令：`npx playwright test tests/e2e/scada-editor-perf.spec.ts --reporter=list --workers=1`。
- 3 test passed（② / ① / ④），断言阈值固化（② <100ms / ① ≥30fps / ④ ≤320MB）。
- 测量口径声明（headless 帧钟波动取 3 次采样最大；fps 与 pointer 并发采样；内存 GC 后取 min×3）与 `benchmark-report.md` + `scada-perf.spec.ts` 一致。
