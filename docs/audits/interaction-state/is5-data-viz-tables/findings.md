# IS-5 数据可视化与表格域十五页序列审查证据（plan 548 基线）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4/§6/§9；双审查组独立 fresh session 真实驱动浏览器取证（2026-10-07/08，Playwright chromium，strict-validation 环境，读数定罪/截图零使用）。
> 组 A：表格族 5 页 + dashboard-demo + graph-demo + leafer-examples（8 页，12 findings（P1×4/P2×4/P3×4）+ 56 条清洁序列 + watch 5）；组 B：map-demo + scada 四页 + three 两页（7 页，7 findings + watch 3 + 豁免 2，读数链探针 33 支）。
> 原始机器可读读数：本目录 survey-readings-a.json / survey-readings-b.json；可重放探针存 \_tmp/is5a-_.mjs / is5b-_.mjs（会话级）。

## Findings 摘要（19 = P1×5 + P2×7 + P3×6 + 观察×1）

| ID                           | 页面                               | 症状                                                                                                                                                                                        | 类别/级别 | 不变量  | 归属                                      |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- | ----------------------------------------- |
| IS-performance-table-001     | performance-table                  | 三个 schema 数据动作把 1000 行数据集静默替换为未求值模板串（对象展开表达式公式引擎不可编译→编译失败回退原始字面量写入 scope）：表格清空/分页消失/表头计数撒谎（109/144/252 = 表达式源长+2） | C/P1      | V3      | demo 表达式 + 框架静默回退面              |
| IS-table-column-width-001    | table-column-width                 | 无宽度（拉伸）列首次 resize 锚定 120px 兜底而非渲染宽（Name 列渲染 200）：80px 死区、提交值≠渲染宽+拖距、负向拖拽被吞但污染 tracked 状态                                                    | B/P1      | V4+V3   | renderer（use-column-resize 锚点）        |
| IS-dashboard-demo-001        | dashboard-demo                     | Save 死控件：onSave 链在裸 {scope} ctx 求值 `${event.serialized}` 失败被静默吞（setItem 间谍证实 persist 从未触达）、零反馈、刷新不可还原                                                   | C/P1      | V3      | renderer raw 事件通道求值面               |
| IS-dashboard-demo-003        | dashboard-demo                     | WorkbenchShell 左右 resize handle 死控件：受控 width 常量无 change 通道，拖拽预览释放即回弹（Δ0）                                                                                           | F/P1      | V3+V4   | renderer 接线（538 collapsed 契约姊妹面） |
| IS-map-demo-001              | map-demo                           | 区域/pin 点击派发 onClick 静默失败：`${event.name}` 模板对根级 payload 求值无 event 键 → Template evaluation failed 被吞；零可见反馈（6 探针定罪链）                                        | C/P1      | V3      | renderer bindings 形态                    |
| IS-performance-table-002     | performance-table                  | host 数据刷新（Run 20 Host Mutations）静默重置 scope 持有的选择（1→0）与分页（3→1），rowKey 存活却未保                                                                                      | A/P2      | V3      | renderer 候选（source 引用变化重置面）    |
| IS-table-column-width-002    | table-column-width                 | 列宽拖拽无取消路径：Esc 忽略、pointercancel 等同提交、无双击重置（先例：IS-4 print PD-1）                                                                                                   | E/P2      | V5      | renderer 能力缺口                         |
| IS-dashboard-demo-002        | dashboard-demo                     | demo schema 第三段「Saved Layout (→ host persist)」panel + json-view 整段从未渲染——保存链路唯一页面级反馈载体缺失                                                                           | D/P2      | V3      | demo bridge 候选                          |
| IS-graph-demo-001            | graph-demo                         | Focus Missing Node 静默 refit 视口（scale 0.653→0.445）且布尔结果被丢弃，零 not-found 反馈                                                                                                  | C/P2      | V2邻+V3 | renderer（focusNodeById 兜底分支）        |
| IS-scada-edge-cases-001      | scada-edge-cases                   | 同一 minimal config 重挂载后 fit 视口非确定（fresh scale 8.633 ↔ round-trip 3.6）                                                                                                           | A/P2      | V2      | renderer 重挂载 fit 时序候选              |
| IS-three-canvas-demo-001     | three-canvas-demo                  | schema 声明 `events.onReady`（类型 + demo 挂 showToast「场景就绪」）但 renderer 从不派发——F 类半接线（同 IS-4 collapsed 族形态）                                                            | F/P2      | V3      | renderer                                  |
| IS-scada-family-001          | scada-demo（+scada-pressure-demo） | 页面文案宣称「滚轮缩放」实测普通滚轮只平移（scale 恒 0.75）、缩放仅 ctrl+wheel——声明手势与行为不符                                                                                          | C/P2      | V3      | demo 文案 + engine 手势映射               |
| IS-data-verify-001           | data-verify                        | loop schema 节点 testid 未落 DOM（其余 testid 均在）                                                                                                                                        | D/P3      | —       | renderer（loop 未应用 meta.testid）       |
| IS-dashboard-demo-004        | dashboard-demo                     | 保存钮初始可点（session.dirty 挂载即 true），与禁用契约矛盾                                                                                                                                 | C/P3      | V3轻    | renderer 会话初态                         |
| IS-graph-demo-002            | graph-demo                         | 选中/搜索无取消 affordance：Esc 不清选中、点空白不清、Esc 不清搜索（IS-4 page-1 同型）                                                                                                      | E/P3      | V5邻    | renderer 能力缺口                         |
| IS-leafer-examples-001       | leafer-examples                    | 移动按钮首次点击零像素变化（第二次才生效）；参考页非产品面                                                                                                                                  | C/P3      | V3      | 参考页                                    |
| IS-scada-edge-cases-002      | scada-edge-cases                   | onError notify 文本切屏后永不清除，陈旧错误信息常驻后续所有画面                                                                                                                             | C/P3      | V3      | demo 接线（无复位路径）                   |
| IS-three-industrial-demo-001 | three-industrial-demo              | 零断线时重连计数基线即 1（页面契约「首次建连不计」被违反；StrictMode 双挂载 dev-only 观测）                                                                                                 | C/P3      | V3      | demo（候选链）                            |
| IS-scada-demo-001            | scada-demo                         | button-1 图元 ajax 零 UI 反馈（schema 未承诺反馈——观察项不立案缺陷）                                                                                                                        | 观察/P3   | V3      | demo 接线                                 |

## n/a 与豁免登记

- **pivot-table-demo**：交互面 n/a（grid 层级无展开/钻取，canvas widget；滚轮滚动/空槽 ✓）；watch：VTable 内建 sort-on-header-click 无法程序化定罪。
- **leafer-examples**：参考页 n/a（非 renderer 驱动面；像素签名证 Zoom In/Out/Reset 真实生效）；IS-leafer-examples-001 备查。
- **three-industrial-demo**：canvas=0（读数证明无 renderer 画布交互面）；断线重连链路真实（V3 ✓）。
- **scada-perf-scale**：清洁页，无需 IS-3 式豁免裁决（pan/ctrl+wheel zoom/注入均真实，无被抑制的应然反馈面）。
- **three-canvas OrbitControls 相机拖拽**：非 renderer 交互态缺陷面，n/a。

## Watch（未定罪，不进 P0–P3）

- three-canvas 滚轮缩放真实性（真实滚轮页面滚动 vs 合成 wheel 被 preventDefault——读数冲突，相机无 DOM 读数面）。
- three-canvas Retry 按钮活性（坏 url 永久失败属预期，无法区分重试失败与死按钮）。
- scada-edge 错误态/切换瞬态 canvas 1374×2784 读数（候选 key={screen} 重挂载瞬态）。
- perf-table 行 DOM 无稳定 key 属性（测试性缺口，IS-9 沉淀候选）。
- popover 复制按钮极简反馈（值真实）；pivot 指标头排序不可判别；graph wheel 缩放未单测；leafer Reset=fit 语义观感；data-verify fetcher 首屏双调用。
- 框架语义候选：raw 事件通道 `${event.*}` 模板求值依赖各 renderer 传递 bindings 形态（map/dashboard-editor 修复前均不含 event 键；scada-editor-demo 注释已记载该语义）——跨 renderer 统一契约候选，IS-9/框架批候选。

## 修复收口（plan 548 Phase 2，2026-10-08）

| ID                        | 裁决               | 修复面与证据                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IS-map-demo-001           | **fixed→verified** | map-renderer.tsx singleclick 派发 bindings 补 event 键（`{...payload, event: payload}`——CX-10 求值契约模板对 bindings 根求值）；map-demo env notify 接 notifyWithToast（schema 承诺 showToast 而原 env 仅 console——IS-4 taskflow-3 同面）。e2e：hit-test 命中省名 feature 点击 → toast 出现且含省名。                             |
| IS-dashboard-demo-001     | **fixed→verified** | dashboard-editor-renderer dispatchEventRef 传 `evaluationBindings: {...payload, event: normalized}`（原裸 {scope} 使 onSave 链 `${event.serialized}` 全灭）。e2e：点 Save → localStorage `flux-dashboard-layout:v2` 写入序列化面板数组（serialize=JSON.stringify(doc.panels)，≥4 面板）。                                         |
| IS-dashboard-demo-003     | **fixed→verified** | 渲染器 width 常量改受控 useState（220/280）+ `onLeftWidthChange`/`onRightWidthChange` 接线（同 538 collapsed 口径）。e2e：拖左 handle +80px → aria-valuenow 与左栏实测宽均 ≥ 220+60。                                                                                                                                             |
| IS-table-column-width-001 | **fixed→verified** | use-column-resize startResize/stepResize 增 measuredWidth 参（handle 端 closest('th') 实测），锚点 `widths[key] ?? 实测宽 ?? 120 兜底`；键盘步进同修。e2e：Name 列（200px）拖 +40 → colgroup col 宽 ≥230；stash 对照红态读数 committed=200（锚定缺陷复现）。判别注记：首列 ID 渲染 117px ≈ 120 兜底，非判别列——用例锚定 Name 列。 |
| IS-performance-table-001  | **fixed→verified** | demo 三个数据动作改 perfDemo namespaced host actions（shuffleScores/toggleActiveFlags/appendTag——对象展开表达式公式引擎不可编译，宿主承接变换沿 calendarDemo/dashboardDemo 先例）；Reset Dataset（可编译）不动。e2e：Shuffle 后 Total: 1000 rows 保持、零 empty-row、分页在。                                                     |

红→绿纪律：五用例 stash 对照取证（pre-fix 树 4 failed + 1 非判别用例，经判别修正后 5/5 红）；修复树 5/5 passed（30.3s）。红态原始读数（stash 树实测 error 行）：`Error: drag must commit rendered+delta (start 200, committed 200; ~160 = the 120px anchor defect)`——实测 committed 停留在渲染宽 200（120px 锚点落入死区后 re-measure 维持渲染宽），与静态推演的 160 不同但同为红；spec 断言注记已同步为死区语义。回归：flux-renderers-data 1208/1208、flux-renderers-dashboard 92/92、flux-renderers-map 64/64。
