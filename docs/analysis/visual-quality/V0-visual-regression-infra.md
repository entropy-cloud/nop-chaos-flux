# V0 研究报告：视觉质量基线与视觉回归守护基建

> 核查日期: 2026-09-19
> 基线: master @ 6fec8497e（full-green）
> 输入: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §8 / `docs/backlog/visual-quality-roadmap.md` V0 / AGENTS.md 2026-08-28 快照政策 / `tests/e2e/helpers/scada-canvas-assert.ts` 先例
> 性质: 基建与裁决报告——V0 不做任何产品代码修改（`packages/**` 不动）；落点限 `tests/e2e/helpers/`、`scripts/audit/`（仅门禁脚本输出能力）、`.gitignore`（补 `tests/e2e/__snapshots__/` 一行治理）、`docs/audits/visual-quality/`、`docs/plans/`
> 状态: 已独立核实（revised → 修订后零 Blocker/Major，见文末核实记录）

## 0. 目的

为整条 visual-quality 路线图提供三类可复用地基：

1. **证据卡**：每个 work item 的 findings/证据/裁决落到 `docs/audits/visual-quality/` 逐域卡片，形成跨 work item 可回溯的证据台账（对应普查报告 §8"债务只登记不消化"模式的治理载体）。
2. **程序化视觉断言工具链**：`tests/e2e/helpers/` 下的可复用断言 helper，让后续各域 work item 的"视觉证据"有统一、程序化、可进 CI 的判据写法。
3. **豁免基线快照**：`check:audit-ui-consistency-gaps` 豁免基数（live 复核 413 instances / 121 files / 32 entries，2026-09-19 本机复跑确认）固化为 V12a/b/c 的对照起点。

## 1. 裁决清单（本报告核心产出）

### A1. 截图基线机制：不引入快照 diff 门禁，判据一律程序化

**裁决**：V0 工具链**不引入** `toHaveScreenshot()` / `toMatchSnapshot()` 像素 diff 门禁；截图只作为**诊断证据产物**写入 `tests/e2e/artifacts/`（已 gitignore、每次运行重新生成、永不入库）。

**理由**：

- AGENTS.md 2026-08-28 政策与路线图 Cross-Cutting 3 均要求"pass/fail 判据必须程序化"；基线快照按同政策**永不入库**。
- **live repo 勘误（独立核实 M1）**：AGENTS.md 记载 `tests/e2e/__snapshots__/` "stays in .gitignore"，但 live `.gitignore` **并无该条目**（仅 `tests/e2e/artifacts/` :28、`tests/**/artifacts/` :31、`_tmp/` :19；`git check-ignore tests/e2e/__snapshots__/x.png` 不命中）。已验证的基线通道目前只有 `_tmp/baselines/`（命中 `.gitignore:19`）。本裁决据此追加一项 V0 交付：在 `.gitignore` 补 `tests/e2e/__snapshots__/`，使政策文档记载的基线落点成为真实受控通道（属仓库治理一行变更，非产品代码）。
- 若基线不入库，fresh checkout / CI 上无基线可比，`toHaveScreenshot` 只能靠 `--update-snapshots` 放行——判据退化为"本地碰巧有基线"，不可进 CI，形同虚设。
- 三起历史视觉回归（bugs/12 utility shim、bugs/13 小地图方斑、bugs/14 Tailwind content scan）的失败模式均可由**计算样式/几何/像素探测**类程序化断言覆盖（bugs/13 方斑本质是 canvas 局部像素异常，像素分块探测可判）。
- `_tmp/baselines/` 通道保留：未来个别 spec 若确需像素 diff（如复刻页大改前后的手工比对），按 AGENTS.md 走 ad-hoc 本地基线，不入工具链、不入 CI。

**判据分层**（与 scada-canvas-assert.ts 已验证的分层一致）：

| 层          | 手段                                                          | 捕捉的缺陷模式                                   |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------ |
| L1 结构     | testid/data-slot 可见性、DOM 结构                             | 组件整体缺失                                     |
| L2 几何     | `boundingBox()` 尺寸/位置/层叠                                | 高度硬编码、错位、零尺寸画布                     |
| L3 计算样式 | `getComputedStyle`：颜色令牌解析、字面色、间距、圆角、opacity | 死配置（属性无 CSS 消费）、浅色硬编码、dark 失效 |
| L4 像素     | canvas `getImageData`/`gl.readPixels` 分块采样                | 渲染管线黑屏、`renderFrames>0` 但实空            |

### A2. 视觉断言 helper 落点与 API 面

落点 `tests/e2e/helpers/`（与既有 `measure-perf.ts`、`scada-canvas-assert.ts` 并列，不重构既有两文件）。新文件两个：

**`tests/e2e/helpers/visual-assert.ts`**（L2/L3 层）：

```ts
// 读单个计算样式值（原样字符串，如 "rgb(255, 255, 255)" / "16px"）
getComputedStyleValue(locator, propertyName): Promise<string>
// 断言计算样式等于期望值（ 字符串全等，trim 后比较）
expectComputedStyle(locator, propertyName, expected): Promise<void>
// 断言 CSS 自定义属性（设计令牌）在宿主页面上解析为非空、非 initial 值
//   —— 捕捉"令牌未定义/被删"回归（dark 切换后令牌缺失的首要探测器）
expectCssVarResolves(page, varName): Promise<string>   // 返回解析值供进一步断言
// 断言元素样式不等于指定字面色（rgb/hex 归一后比较）
//   —— dark 工作项的核心断言：bg 不等于 rgb(255,255,255)、文字不等于 rgb(26,26,26) 等
expectComputedStyleNot(locator, propertyName, bannedColor): Promise<void>
// 诊断截图：写 tests/e2e/artifacts/<dir>/<name>.png（目录自动创建），仅证据不判据
captureVisualEvidence(page, dir, name): Promise<string> // 返回写入路径
```

**`tests/e2e/helpers/canvas-pixel-probe.ts`**（L4 层，泛化 scada 先例）：

```ts
export interface PixelProbeResult {
  probed: number;                 // 采样的 canvas 数量
  mode: '2d' | 'webgl' | 'mixed' | 'none';
  result: 'non-zero-pixels' | 'all-zero' | 'security-error' | 'no-canvas';
}
// 对 locator 容器内全部 <canvas> 分块采样，任一非零像素即 non-zero-pixels。
// 2d 上下文走 getImageData；webgl 上下文须在同一任务内先触发渲染帧再 gl.readPixels
// （preserveDrawingBuffer=false 时 readPixels 静默返回全零而非抛错——scada 先例的
// forceRender-then-probe 同模式；无法保证帧新鲜时以 toDataURL 前端缓冲兜底），
// 分类返回 'all-zero'，是否判失败由调用方按"非空场景"语义裁决。
probeCanvasPixels(locator): Promise<PixelProbeResult>
// 便捷断言：非空场景（调用方自行判定"非空"语义）必须 non-zero-pixels，否则抛错
expectCanvasPainted(locator, opts?: { allowZero?: boolean; note?: string }): Promise<PixelProbeResult>
```

**smoke spec** `tests/e2e/visual-assert-helpers.spec.ts`：工具链自身必须有 Proof——

- 打开 `#/flux-basic`（既有稳定演示页），断言页面背景色令牌解析（`expectCssVarResolves('--background')` + `getComputedStyleValue` 非 transparent）、`captureVisualEvidence` 落盘成功（artifact 路径存在）。
- 经 `page.evaluate` 注入程序化 2d canvas（涂色矩形）与 webgl canvas（clearColor），验证 `probeCanvasPixels` 对两种上下文均返回 `non-zero-pixels`；再注入全空 canvas 断言 `all-zero` + `expectCanvasPainted` 抛错路径。
- 全部断言程序化；截图仅落 artifacts。

### A3. 豁免基线快照：`--json` 输出 + 快照落 `docs/audits/visual-quality/`

- **机制**：给 `scripts/audit/find-ui-consistency-gaps.mjs` 增加 `--json` 旗标：向 stdout 打印机器可读 JSON（规则内计数 + 总计 + 逐文件明细），不改默认人读输出、不改 exit code 语义。属审计脚本输出能力增强，非产品代码。
- **快照落点**：`docs/audits/visual-quality/exemption-baseline-v0.json`（与证据卡同目录，作为 V12 对照起点入库——它是文本数据不是视觉快照，不受"截图不入库"约束）。
- **格式**：`{ snapshot: "v0", generatedFrom: "node scripts/audit/find-ui-consistency-gaps.mjs --json", totals: { instances, files, entries }, byRule: { "hardcoded-literal-color": { instances, files }, ... }, byFile: [{ file, rule, instances }] }`——**不含时间戳字段**，避免重跑漂移；生成命令写入文件头字段供复现。
- **V12 对照协议**：V12a/b/c closure 时复跑 `--json` 与 v0 快照 diff：①`totals.entries`（32）不得增加；②`totals.instances` 相对 413 的下降量需可归因到 V12 各批次的修复/adjudication 记录。
- **live 复核**（2026-09-19）：`node scripts/audit/find-ui-consistency-gaps.mjs` 输出 `Exempt baseline: 413 instance(s) across 121 file(s), covered by 32 registered exemption entr(ies)`，与路线图 Current Baseline 一致。

### A4. 证据卡模板定稿

沿 component-audit 卡模式（`docs/audits/per-component/README.md`）裁剪为"域级视觉质量卡"：组件审计按 renderer type 一卡一张，视觉质量按**域**一卡一张（域 = roadmap work item 粒度）。模板定稿如下（落 `docs/audits/visual-quality/README.md`）：

```md
# 视觉质量证据卡：<域名>（<roadmap work item>）

> 状态: seeded | verified | fixing | fixed-pending-closure | closed
> 来源: <普查报告章节 / 研究报告路径>
> Owner plan: <plan 路径或 —>
> Owner docs: <design.md 等>

## Findings 清单

- [V<x>-F<seq>] <一句话缺陷描述>（`文件:行`）
  - 证据: <live 核实记录或普查报告章节>
  - 裁决: <pending | fix-in-plan | adjudicated-watch-only | deferred: <理由> | fixed: <plan/commit>>
  - 状态: open | fixing | fixed | adjudicated | deferred

## 视觉证据

<程序化断言落点（spec/helper 引用）+ 诊断截图 artifacts 路径（如有）>

## Closure

<本域 work item closure audit 结论 + 日期（fresh session）>
```

种子卡 = 普查报告已三轮核实的 findings 逐域落卡，状态 `seeded`（裁决列 pending，由各域研究报告转 `verified`）；**种子卡不引入新的未核实 claim**。

**种子卡域清单（14 张，显式枚举）**：

| #   | 卡文件                    | 对应路线图 work item                      | 普查报告章节  |
| --- | ------------------------- | ----------------------------------------- | ------------- |
| 1   | `ai.md`                   | V2                                        | §1            |
| 2   | `threejs.md`              | V3                                        | §2            |
| 3   | `industrial-scada.md`     | V4                                        | §3            |
| 4   | `flow-designer.md`        | V5                                        | §4            |
| 5   | `spreadsheet.md`          | V6                                        | §5            |
| 6   | `report-designer.md`      | V7                                        | §5            |
| 7   | `print.md`                | V8a                                       | §6            |
| 8   | `word.md`                 | V8b                                       | §6            |
| 9   | `debugger-code-editor.md` | V9                                        | §6            |
| 10  | `rich-text-markdown.md`   | V10                                       | §6            |
| 11  | `scheduling.md`           | V11a                                      | §7.5          |
| 12  | `dashboard-map-graph.md`  | V11b                                      | §7.5          |
| 13  | `cross-cutting-theme.md`  | V1                                        | §7.1          |
| 14  | `consistency-debt.md`     | V12a/V12b/V12c（三 work item 共用一域卡） | §7.2–7.4 + §8 |

即：§2 缺口表 12 个测试域 + V1 横切主题域 + V12 一致性债务域（V12 三个 work item 闭环单位独立、证据同源故共用一张卡，卡内 findings 按 work item 标注归属）。SCADA 有卡（#3）：V4 处理 I17 后残余问题，卡内只登记残余 findings。

## 2. 交付④：AI/3D/三设计器 e2e 视觉断言缺口清单

live 统计口径：`grep -c` 各 spec 的 `getComputedStyle` / `screenshot` / 像素探测（`getImageData|readPixels|toDataURL`）命中数，2026-09-19 实测。

| 域                  | 现有 spec（视觉相关现状）                                                       | 实测                                                                                                                     | 缺口（后续 work item 补齐方向）                                                                                            |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AI                  | 19 个 `ai-*.spec.ts`                                                            | 计算样式断言仅 2 个文件 6 处调用（ai-coverage-widgets 1、ai-widgets-demo 5）；0 截图、0 像素探测                         | V2：气泡视觉层（data-shape/data-placement 消费）、流式光标可见性、滚动到底按钮、dark 双态的 L3 断言                        |
| 3D                  | `three-canvas-perf.spec.ts`                                                     | 像素探测 2 处（readPixels）；0 计算样式、0 截图                                                                          | V3：hover 高亮材质反馈（L4 像素/材质断言）、阴影启用（像素断言影子存在）、容器高度可配置（L2 几何）、加载/错误 UI（L1/L3） |
| Flow Designer       | 11 个 `flow-designer-*.spec.ts` + taskflow-ui                                   | 计算样式零散（css-diag 6、dingtalk-visual 3、ui 7、tree-mode 1）；ui spec 有 5 处截图（存档型）；无 dark、无主题令牌断言 | V5：dark 变体（L3 令牌断言）、吸附辅助线渲染（L1/L4）、节点实测尺寸（L2）、框选/多选（L1 行为+L2 选框几何）                |
| Report Designer     | `report-designer-demo.spec.ts`(6 处计算样式)、`report-designer-host.spec.ts`(0) | 无 dark、无画布结构视觉断言                                                                                              | V7：画布 schema 驱动尺寸（L2）、fallback 壳视觉（L3）、dark（L3）                                                          |
| Spreadsheet         | `spreadsheet-demo.spec.ts`（2 处计算样式）                                      | 29 处 hex 无断言、无 dark                                                                                                | V6：令牌化后 light/dark 双态计算样式断言（冻结/填充柄/选中态）                                                             |
| Print               | `print-designer.spec.ts`（0/0）                                                 | 全无视觉断言                                                                                                             | V8a：吸附辅助线渲染、选中/手柄可见性（L3/L4）                                                                              |
| Word                | `word-editor*.spec.ts`（0/0）                                                   | 全无视觉断言                                                                                                             | V8b：字体/字号控件、皮肤令牌边界（L3）                                                                                     |
| Debugger/CodeEditor | `debugger.spec.ts`(1)、`code-editor.spec.ts`(0 样式/3 截图存档)                 | 无令牌断言                                                                                                               | V9：亮色适配（L3 令牌）、活动行高亮（L3）                                                                                  |
| 富文本/Markdown     | `w3d-editor.spec.ts`、`w3d-markdown-editor.spec.ts`（0/0）                      | 全无                                                                                                                     | V10：图标化工具条（L1）、autoGrow（L2）                                                                                    |
| Scheduling          | calendar-demo / kanban-perf / gantt 相关                                        | 零计算样式断言                                                                                                           | V11a：任务条选中态、拖拽高亮、dark（L3）                                                                                   |
| Dashboard/Map/Graph | pivot-table-demo 等                                                             | 零                                                                                                                       | V11b：canvasWidth 几何（L2）、着色 schema（L3/L4）                                                                         |
| SCADA               | scada-demo 等 547 行 + 专用 helper                                              | **已有**分层断言（V0 之前唯一成体系者）                                                                                  | V4：仅需增量（grid 消费、画布尺寸声明一致性）                                                                              |

**结论**：视觉断言覆盖率≈0（SCADA 除外），工具链（A2）是后续所有域补断言的前置依赖，与路线图依赖表一致。

## 3. 边界（不做的事）

- 不改 `packages/**` 任何产品代码（含样式）。
- `.gitignore` 仅补 `tests/e2e/__snapshots__/` 一条（A1 勘误对应的治理项），无其它改动。
- 不重构 `scada-canvas-assert.ts` / `measure-perf.ts`（泛化通过新文件并存实现，scada spec 不动）。
- 不引入快照 diff 门禁、不改 playwright.config.ts 的 snapshot 配置。
- 证据卡种子只转录已三轮核实的普查 findings，不做新的 findings 判定（那是各域研究报告的事）。
- `--json` 旗标只加输出通道：不改扫描逻辑、不改豁免数据、不改 exit code；既有 `scripts/__tests__/find-ui-consistency-gaps.test.ts` 补一条 `--json` focused 测试。

## 4. 验证方式（V0 plan 的 Proof 面）

1. `npx playwright test tests/e2e/visual-assert-helpers.spec.ts` 全绿（工具链可用性 Proof）。
2. `node scripts/audit/find-ui-consistency-gaps.mjs --json` 输出合法 JSON 且 totals 与人读输出一致；快照文件与输出 diff 为空。
3. `docs/audits/visual-quality/` 目录存在：README（模板 + A4 枚举的 14 卡索引）+ §1-A4 清单所列 14 张种子卡 + `exemption-baseline-v0.json`。
4. `.gitignore` 含 `tests/e2e/__snapshots__/` 条目且 `git check-ignore tests/e2e/__snapshots__/x.png` 命中；`git status` 确认无 `packages/**` 变更、无 artifacts/ 基线入库。
5. `pnpm check` 全链绿（新增 JSON 为文档资产，不入扫描面）。

## 5. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-19）
- Verdict: `revised`（0 Blocker / 2 Major / 3 Minor）
- 已处理：M1——`tests/e2e/__snapshots__/` live 并未 gitignored（AGENTS.md 记载与 live repo 存在 drift），A1 改为"已验证基线通道仅 `_tmp/baselines/`"，并追加 V0 交付：`.gitignore` 补 `tests/e2e/__snapshots__/` 一行使政策通道真实化；M2——14 张种子卡在 A4 显式枚举（12 测试域 + V1 横切 + V12 共用卡），§4 验证项同步引用；Minor-1——A2 WebGL 采样措辞改为"帧内渲染后 readPixels，preserveDrawingBuffer=false 时静默全零非 SecurityError"；Minor-2——§2 AI 行计数口径统一为"2 个文件 6 处调用"。
- 数字复核：缺口清单 grep 实测全部吻合；豁免基线 413/121/32 实跑吻合；`#/flux-basic` 路由经 `flux-basic-row-inspect.spec.ts` 等 ≥8 spec 在用；`scripts/__tests__/find-ui-consistency-gaps.test.ts` 存在。
