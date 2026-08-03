# I1 Gate 结论：调研 review + leafer-ui 选型可行性 spike

> 日期：2026-08-03
> 版本：v1（I1.1 + I1.2 产出）
> 上游：讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §八/§九；5 份调研报告 `docs/analysis/industrial-hmi/research-*.md`（I0.1–I0.5）；roadmap `docs/components/roadmap-industrial-hmi.md`
> 下游：`docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`（I2 设计文档，本文件为事实依据之一）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_03881b6b4ffepmBfXuw510CmHR`）审查，判定 `REVISE`——6 Major + 6 Minor 修正项（§3.2 数字与原始测量 JSON 不符/混用两轮数据、100 万对照数字无留档来源、§7 收口记录与 live 仓库状态矛盾、fps 判定口径声明缺失、A1/A2 实测过程不可复核、内存 +40% 与 30% 判读阈值关系未说明等），全部落地（§3.2 统一以 `results-2026-08-03.json` 为准、100 万留档 `million-2026-08-03.json`、§7 改为收口动作清单、§1/§5 补口径声明、A1/A2 改"调试中发现"附复现、§3.3 #4 补阈值口径说明），未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_0387ac851ffeyhcwOJ5fB3IN5d`）确认轮，判定 `REVISE`——R1 修正 11 类全部验证落地（数字与 JSON 逐项吻合、viewport 类型声明经 node_modules 源码核实）；新增 1 Minor（m-7：§3.2 #11 交叉引用 3.3 #5 → 应为 3.3 #4），已落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_038791ee4ffeCZzb5QntpMY7mV`）确认轮，判定 `AGREE`——m-7 落地核验 + 全文通读（11 行数字逐项对照 JSON、§3.3 算术自洽、跨文档引用全部存在），**零新增修正项，达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。

## 1. 结论摘要

| 判定项          | 结论                                                                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1.1 gate 审查  | 5 份调研报告对照讨论 §八/§九 范围覆盖完整、选型论证链成立，`pass-with-minors`（1 Major + 2 Minor 全部落地，零 Blocker）；同时作为 I0 调研文档「文档共识审查」终轮复核，**达成共识（0 新增未落地修正项）**                                                                                                       |
| I1.2 spike 实测 | **选型确认（LeaferJS/leafer-ui v2.2.9 底座成立）**——10 万图元验收包络三项全达标，无人工确认触发；附 API 契合度注意项 5 条供 I2 设计规避。**口径声明**：≥45fps 判定基于渲染吞吐代理口径（headless 无 vsync），真实指针事件路径实测 17–29fps（输入受限、无丢帧，见 §3.3 #3），指针端到端口径需 I14 真实浏览器复测 |
| 官方数字对照    | 100 万矩形实测 1.52 s / 448 MB（JS heap，含 stroke 属性），与官方自报 1.28 s / 320 MB 同量级；本次 spike 即对官方数字的独立复测（非第三方，但同量级支撑），官方数字**机制可信**的判定维持                                                                                                                       |

## 2. I1.1 review gate 审查记录（终轮复核）

- 执行：独立 agent（fresh session，task `ses_03892d672ffeSeXQMQCUBFBIjo`），输入 = 讨论文件 §八任务范围 + 5 份调研报告 + 与 roadmap 差异清单。
- 判定：`pass-with-minors`；零 Blocker。
- 修正项（3 项，全部落地，落地细节见各报告头部记录与 git diff）：
  - `M-1`（Major）：`research-scada-apps.md` §6 #9 动画表述修正——leafer 无帧动画/动画组队列类引擎，但 `@leafer-in/animate` 过渡/路径动画原语已有（非"无动画引擎"），消除与 `research-render-engines.md` §8 #4 的跨报告矛盾。
  - `m-1`（Minor）：`research-scada-apps.md` / `research-summary.md` 头部补「终轮复核说明」标准 bullet。
  - `m-2`（Minor）：roadmap「数值说明」等 4 处"待 I0 调研校准"过时表述回写为校准后状态（I1.1 gate 记录回写 roadmap 头部，roadmap Rule 4）。
- 差异清单裁定（全部维持）：① SceneV 源码不可获取降级浅层；② 许可矩阵如实记录（选型影响留 I1.2）；③ 共识超轮观察项（scada-apps 8 轮 / summary 4 轮，全为行号/计数精度类 Minor、单调收敛）不阻断；④ 性能数字观察项（内存阈值=官方 320MB 零余量、首屏验收比官方宽松 36% 方向有利）由本 spike 实测仲裁。
- 终轮复核结果：**0 新增未落地修正项，I0 调研文档共识审查达成共识**。

## 3. I1.2 spike 实测（leafer-ui v2.2.9）

### 3.1 环境与约束

- 工程：`~/sources/industrial-hmi-research/spike-leafer/`（scratch，不入仓库；Vite + leafer-ui 2.2.9 + `@leafer-in/viewport` 2.2.9 + Playwright；原始测量数据留档 `results-2026-08-03.json` / `million-2026-08-03.json`，脚本 `measure.mjs` / `measure-million.mjs` / `src/demo.js`）。
- 运行：headless Chromium（Chromium 151.0.7922.34），1440×900 视口，`--enable-precise-memory-info`（内存测量）+ `--use-gl=swiftshader`（无 GPU 环境，spike-env-fail 路径按预案启用）。
- 测量方式：`page.evaluate` 计时 + 读场景树（`app.tree.leafs`/`__world`/`selector.getByPoint`）程序化断言，**禁截图判定**（roadmap 测试纪律）；渲染帧计数经 `tree`（Leafer 层）`render` 事件（`RenderEvent.RENDER`）。
- 注意：headless 无 vsync，rAF 不受 60Hz 显示上限约束——「持续变换吞吐」反映**渲染器真实吞吐**（帧时间）；真实浏览器以 60fps 显示上限呈现（口径差异见 §4 A4）。

### 3.2 实测数据（数据来源：`results-2026-08-03.json` 与 `million-2026-08-03.json`，2026-08-03 单次实测留档）

| #   | 场景                                            | 实测值                                                         | 官方自报（对照）                   | 验收包络（10 万口径）          | 判定                            |
| --- | ----------------------------------------------- | -------------------------------------------------------------- | ---------------------------------- | ------------------------------ | ------------------------------- |
| 1   | 10 万矩形创建至首帧渲染（untilRenderMs）        | **165.3 ms**（实例化 125.5 + 入树 8.7）                        | 100 万 1.28 s（换算 10 万≈128 ms） | <2 s                           | ✅ 余量 ~12x                    |
| 2   | 100 万矩形创建（对照官方口径）                  | **1516.7 ms**（实例化 1309.2 + 入树 38.6）                     | 1.28 s                             | —（上下文对照）                | ✅ 同量级                       |
| 3   | 持续相机平移吞吐（rAF 连续 move，2 s 窗口）     | **114.3 fps**（8.7 ms/帧）                                     | 拖动 60 fps（单元素口径）          | ≥45 fps                        | ✅ 吞吐口径                     |
| 4   | 持续缩放吞吐（rAF 连续 scaleOfWorld，2 s 窗口） | **174.2 fps**                                                  | —                                  | ≥45 fps                        | ✅                              |
| 5   | 单元素移动吞吐（官方"单元素拖拽"同构口径）      | **235.6 fps**                                                  | 单元素拖拽 60 fps                  | —                              | ✅ 远优于                       |
| 6   | 真实指针事件拖动（30 Hz / 60 Hz 输入节拍，2 s） | 17.2 / 28.7 fps（**输入路径受限**，帧数=输入步数，渲染零丢帧） | —                                  | —（参考）                      | ⚠️ 非渲染瓶颈（见 3.3 #3）      |
| 7   | 命中检测（`selector.getByPoint`，page 坐标）    | **屏内 1.9–2.4 ms/次；屏外立即排除（0 ms）**                   | —                                  | —                              | ✅ 交互可用                     |
| 8   | 10 万 symbol 组态 JSON 批量加载（增量，含解析） | **178.9 ms**（JSON 11.6 MB：parse 23.4 + 实例化 88.5 + 渲染）  | —                                  | —                              | ✅                              |
| 9   | 1 万节点属性批量更新（点表刷新模拟，3 轮）      | 更新 1.7–2.6 ms + 渲染 ~15–17 ms（端到端 **16.9–19.7 ms**）    | —                                  | 1 万点刷新 <200 ms（I14 固化） | ✅ 余量 ~10x                    |
| 10  | 内存（10 万图元，CDP JS heap usedSize）         | **47.5 MB**                                                    | —                                  | ≤320 MB                        | ✅ 余量 ~6.7x                   |
| 11  | 内存（100 万图元对照官方口径）                  | **448.4 MB**（JS heap）                                        | 320 MB                             | —                              | ⚠️ 同量级，高 ~40%（见 3.3 #4） |

> 口径说明（m-6）：#6 的 "2 s" 指输入节拍窗口（60×33ms ≈ 2 s），实测 duration 含 down/up 与 300 ms 收尾（3484/4179 ms）。

### 3.3 分析与判定

1. **首屏 <2 s ✅**：10 万图元 165 ms，余量约 12 倍；100 万 1.52 s 与官方 1.28 s 同量级（约 18% 偏差，headless 软渲染 + 矩形含 stroke 属性），官方"1.28 s"口径**机制可信**。
2. **可交互 ≥45 fps ✅（吞吐口径）**：持续相机平移吞吐 114 fps（8.7 ms/帧）——换算到真实浏览器 60 fps vsync 上限，帧时间预算（16.6 ms）仍有 ~2 倍余量；单元素移动 235 fps 远优于官方 60 fps 口径。
3. **指针事件拖动 17–29 fps 为测量路径开销，非渲染瓶颈**：Playwright/CDP 逐事件输入（每事件 ~15–20 ms 往返）+ 60/120 步输入节拍；实测帧数=输入步数（60/60、120/120，渲染零丢帧），即渲染吞吐 ≥ 输入频率；判定以 #3（持续吞吐）为准。**指针端到端（输入→画面）口径的 45fps 保证需 I14 在真实浏览器复测**（roadmap I14.3 复测项，本 spike 不固化基准方法）。
4. **内存 ≤320 MB ✅（10 万验收口径）**：10 万图元 47.5 MB（余量 ~6.7 倍）；100 万 448.4 MB 高于官方 320 MB 约 40%，推测原因为 spike 矩形带 `stroke/strokeWidth` 属性与 headless 软渲染缓冲（**推测性归因，未做无 stroke 对照组**）；同量级、不构成选型否定。**口径说明**：该 +40% 处于 I0 校准"30% 判读阈值"之上，但该阈值仅用于"官方自报 vs 验收阈值"的安全方向判定（download §2.2 结论 3），不适用于 spike 实测与官方自报的直接对比；10 万验收口径（≤320 MB）实测余量充分，I0 观察项"内存 0% 余量"裁定为**不成立（实际余量大）**。
5. **首屏观察项 -36% 方向有利**：实测 10 万 165 ms 远低于验收 <2 s，裁定**维持有利方向**。
6. **组态 JSON 加载/更新 API 契合度 ✅**：JSON 解析→按 schema 实例化 Rect→`Group.add` 批量入树路径 179 ms 完成；1 万点表属性批量更新端到端 ~17–20 ms（watcher 节流 + partRender 局部重绘生效），满足"万级图元 + 每秒多次局部刷新"（research-render-engines §11 结论实测成立）。
7. **I0 观察项最终裁定**：① 内存零余量观察项——**实测推翻**（10 万实测 47.5 MB ≪ 320 MB）；② 首屏 -36% 有利——**实测维持**；③ 共识超轮（scada-apps/summary）——维持非阻断（见 §2）。**无人工确认触发**。

## 4. API 契合度注意项（供 I2 设计规避，spike-json-fail 路径产物）

| #   | 注意项                                                                                                                                                                | 来源（spike 调试/实测）                                                                                                                                                                                                   | I2 设计规避约束                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A1  | **viewport 插件需显式配置 `tree: { type: 'viewport' }`**，默认 `'design'` 类型无平移/缩放交互                                                                         | 调试中发现（复现：将 demo.js 的 `tree: { type: 'viewport' }` 改为其他值后指针拖动无任何视口位移；viewport 插件源码仅注册 `viewport/custom/design/document` 类型，`leafer-in/packages/viewport/src/LeaferTypeCreator.ts`） | design-engine.md 实例生命周期节必须固化 App/tree 类型配置；`scada-canvas` 引擎创建参数写死为 `type: 'viewport'` |
| A2  | 渲染帧事件经 `tree`（Leafer 层）监听 `render` 事件（App 层不转发 render 计数；复现：demo.js `watchRender` 最终实现为 `app.tree.on('render')`，改挂 `app` 层无帧计数） | 调试中发现（同 A1 复现方式）                                                                                                                                                                                              | 测试句柄（`window.__flux_scada_<cid>`）暴露引擎实例需含 `tree` 引用；性能测量基于 `tree` 事件                   |
| A3  | 命中检测 `selector.getByPoint({x,y}, radius)` 为 O(候选) 包围盒预检，10 万级屏内 ≤2.4 ms、屏外 0 ms 立即排除                                                          | 实测 #7                                                                                                                                                                                                                   | design-engine 命中章节：10 万级无需空间索引；百万级（I14 加压）需评估裁剪/索引策略                              |
| A4  | **headless 无 vsync，rAF 吞吐 ≠ 显示 fps**；I14 固化测量方法时需区分"渲染吞吐"与"显示帧率"口径                                                                        | 实测 #3-#6 口径差异                                                                                                                                                                                                       | I14 benchmark 计划：固定输入注入方式与口径；headless 只测吞吐上限，显示 fps 需真实浏览器抽测                    |
| A5  | 批量属性更新走 watcher→partLayout→partRender 合帧，1 万级端到端 ~17–20 ms；**上层仍需合并帧 + 脏属性收集**（roadmap 性能红线），避免逐点 setState 直刷 React          | 实测 #9                                                                                                                                                                                                                   | design-data-binding.md 刷新流水线：数据层合并帧 → 引擎批量 set；禁逐点更新触发多次渲染请求                      |

## 5. 选型结论

**选型确认：LeaferJS（leafer-ui v2.2.9）作为 `scada-canvas` 渲染底座成立**——mission 验收包络（10 万图元 ≥45 fps 可交互 / 首屏 <2 s / 内存 ≤320 MB；1 万点刷新 <200 ms）三项全部达标且有显著余量（≥45 fps 为渲染吞吐代理口径，指针端到端口径待 I14 真实浏览器复测，见 §3.3 #3）；100 万官方数字实测同量级复现（1.52 s / 448 MB vs 官方 1.28 s / 320 MB）；组态 JSON 批量加载与增量属性更新 API 契合度验证通过。§4 五项注意项作为 I2 设计文档的规避约束（非否决项），**不触发人工确认**（roadmap「人工确认阈值」：引擎选型变更 / benchmark 不达标均未发生）。

替代方案（Konva/Fabric/自研）对比依据已在 `research-render-engines.md` §11（万级图元 + 每秒多次局部刷新：leafer 唯一原生支撑）固化，本轮无需启用。

## 6. I2 设计文档约束映射（Follow-up）

I2 四份设计文档（`docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`）必须回应的约束：

- `design-engine.md`：A1（viewport 类型配置固化）、A2（测试句柄含 tree 引用）、A3（命中检测 10 万级 O(候选) 预检可用）、A4（性能测量口径）；I1.2 实测数字（首屏 165 ms / 吞吐 114 fps / 1 万点 ~20 ms / 10 万内存 47.5 MB）作为设计性能基线引用。
- `design-data-binding.md`：A5（合并帧 + 脏属性收集的引擎侧语义：watcher 节流实测 ~17–20 ms 端到端）；实测 #9 数字作为刷新流水线设计基线。
- `design-renderer.md`：A2（测试句柄契约）、I1.2 的 `selector.getByPoint` 命中 API 作为事件→图元解析的引擎接口。
- `design-symbols.md`：无新增约束（命中/属性模型与图元注册无 API 障碍）。

## 7. 收口动作清单（本文件定稿后由 I1 plan 执行）

- I1 plan：Phase 1（I1.1）与 Phase 2（I1.2）标 completed，Closure Gates 全勾选，Plan Status 置 `completed`。
- roadmap：I1 Phase Status `planned` → `done`；I1.1 gate 结论摘要已回写 roadmap 头部（Rule 4，见 roadmap 头部记录块）。
- 每日日志：`docs/logs/2026/08-03.md` 记录本 plan 产出摘要。
- 独立 closure-audit（fresh session）通过后执行以上收口（roadmap「closure audit 通过 → done」）。
