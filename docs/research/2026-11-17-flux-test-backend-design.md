# Flux 测试后端设计：以 nop-debugger 为核心彻底替代 Playwright e2e

- 日期：2026-11-17 · 状态：设计稿（v4：真实浏览器 + 页内内核驱动，Cypress 模式；启动端仅"拉浏览器+开tab+加载+注入"，无代理/扩展/driver 层）
- 上游：[总体设计](./2026-11-17-flux-devtools-design.md) · [截图专章](./2026-11-17-flux-devtools-capture-design.md) · [Roadmap](./2026-11-17-flux-debugger-roadmap.md)
- 目标：flux 仓库（`tests/e2e/`，现有 **244 个 spec**）的 e2e 全部迁移到自研测试后端（测试网关 + 内核驱动 API），最终从仓库依赖中**彻底移除 Playwright**。
- **终态断言模型（v2 定调）**：迁移完成后**不保留 DOM 判断**。测试断言全面基于业务语义层——节点 cid 的 meta/props 求值结果、scope store 状态、事件与 Log 树、reaction 命中、快照 diff、视觉基线。DOM 选择器兼容层只是**迁移脚手架**（T0–T3 存在），T4 连同 Playwright 一起删除。
- 现状量化（迁移规模依据）：`page.getByTestId` ×2078、`page.locator` ×1996、`page.evaluate` ×540、`page.goto` ×377、`page.waitFor` ×333、`page.keyboard` ×285、`page.mouse` ×222、`page.screenshot` ×18、`page.request` ×6；仅 4 个 spec 已用 `__NOP_DEBUGGER_API__`。结论：兼容层决定迁移**速度**，语义断言层决定迁移**终态质量**。

---

## 1. 目标与非目标

### 1.1 目标

1. e2e 语义升级：测试通过内核白盒 API（cid、waitFor、快照、store 断言、录制回放）表达，而不是黑盒 DOM 猜测——这是相对 Playwright 的**代际提升**，也是"基于 Cypress 思想"的自然终点（Cypress 的 command queue + retry-ability + snapshot，全部以内核白盒方式实现）。
2. 自研测试后端三件套：**测试网关**（Node，替代 Playwright Test Server）、**浏览器启动器**（裸 CDP，替代 Playwright browser 层）、**页内驱动**（nop-debugger 内核，替代 page.\* API）。
3. 全量迁移 244 个 spec 后删除 `@playwright/test` 依赖、`playwright.config.ts`、Playwright 专属 helper **以及 DOM 兼容层**；CI 命令面保持 `pnpm test:e2e` 不变（内部换引擎）。
4. 副产品：测试即调试会话——每个失败的 spec 自动产出可重放的 `DevSession` 诊断包（M5/M7 能力直接复用）。

### 1.2 非目标

- 不做多浏览器矩阵承诺（Chromium 系优先；Firefox/WebKit 支持列为远期，见 §9 风险）。
- 不迁移 `tests/` 之外的 Playwright 使用（如有）与本设计无关。
- 不追求 Playwright API 完全 1:1 兼容——兼容层覆盖常用子集（§5 迁移映射表），覆盖不了的部分改写为内核惯用法。

### 1.5 业务语义断言模型（终态核心，无 DOM 判断）

终态 spec 中**不出现任何 CSS 选择器/testid/innerHTML 断言**。断言对象从"页面长什么样"升级为"业务状态是什么、渲染结论是什么"：

```ts
// —— 断言原语（全部经内核白盒，零 DOM）——
ft.expect
  .cid('form-submit-btn') // 语义定位：cid / nodeId / 组件语义标记
  .meta({ disabled: false, visible: true }) // meta 求值结论
  .prop('label', '提交订单') // prop 求值结论（表达式求值后的值）
  .rendered() // 节点渲染结论（含 error boundary 归因）
  .not.rendered({ because: 'region-inactive' }) // 且断言归因原因
  .scope('orderForm.total') // 业务状态断言（scope 路径，非实现细节）
  .toEqual(9900)
  .reaction('orderForm.discount') // reaction 命中断言
  .triggeredBy('coupon.apply')
  .event('ajax:order/submit') // 事件/Log 断言
  .ended({ status: 'passed' })
  .withBackendSpan({ service: 'order.create', ok: true }) // 全栈结论（M6 后）
  .snapshotPath('orderForm.items') // 快照/数据流断言
  .writtenAtStep(3)
  .visual('order-form-default') // 视觉结论（截图对比，唯一的"看"手段）
  .matchBaseline();
```

分层规则（写 spec 时的断言选择顺序）：

1. **业务状态**（scope/store 路径）——首选；
2. **渲染结论**（cid 的 meta/prop/rendered + Why 归因）——验证"界面语义"；
3. **事件/数据流**（Log 树、reaction、快照 diff）——验证"行为"；
4. **视觉基线**——唯一的像素级手段，用于纯展示性验收；
5. `ft.evaluate`（裸 DOM/JS）——**禁止**，仅遗留迁移期存在。

这依赖三个主线能力落地：Why 归因与 `inspectByCid`（M4）、快照 diff（M2）、事件/Log 树（M1）。因此**语义断言 API（`ft.expect`）排在 E3 之后成熟，E4 才能删兼容层**。

**例外白名单**（仍允许 DOM/CDP 级手段，注册制）：视觉基线的截图本身（§5.3）、axe 可达性、真实输入（CDP Input）、跨 tab 编排。白名单在 `pnpm check` 门禁中按文件登记。

### 1.6 执行运行时：真实浏览器 + 页内内核驱动（Cypress 模式，唯一主运行时）

测试在**真实浏览器、真实页面**上运行——e2e 测的就是真实渲染。启动端的职责被压缩到极限（**比 Cypress 还少两件**：无网络代理、无浏览器扩展）：

启动端（Node，`flux-test-server`）只做四件事：

1. **拉起浏览器**：裸 CDP 启动 Chromium（`--remote-debugging-port`，复用系统安装的 Chrome，CI 装 chromium）；
2. **开 tab、加载页面**：`Target.createTarget` → playground/preview URL，每 spec 一个干净 tab（等价 Playwright per-test context）;
3. **注入测试代码**：spec 经 Vite 打包，CDP 注入页面执行（Cypress spec iframe 的简化版）;
4. **CDP 级杂项**：视口模拟（`Emulation`）、保真截图（`Page.captureScreenshot`）、真输入（`Input.*`，个别用例）——全部可选项，非通道依赖。

其余一切——定位、交互、等待、断言、截图、录制——都由**页内内核（nop-debugger 测试装配）**在同事件循环内完成，Node 与页面之间只有一个轻量 WebSocket（M0 协议本地子集）传结果与指令。这就是 Cypress "测试代码跑在浏览器里"的核心架构，但没有它的代理/扩展/同源 iframe 三大包袱。

jsdom 不用于 e2e（真实浏览器为准）；仅作为纯语义层单测（不涉及渲染的 store/reaction 逻辑）的可选快速通道，与 e2e 体系无关。

---

## 2. 总体架构

```
┌ pnpm test:e2e ──→ flux-test（Node CLI，新包） ─────────────────────────────┐
│  · SpecLoader：读取 tests/e2e/*.spec.ts（迁移期兼容旧写法）                  │
│  · Launcher：裸 CDP 拉起浏览器 + 开 tab + 加载真实页面（仅此四件事，§1.6）    │
│  · Gateway：本地 WSS（M0 协议本地子集）：传结果/指令，非控制通道              │
│  · Runner：spec 编排、worker 池、报告（JUnit/自研）、失败自动 DevSession      │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ 裸 CDP（启动/注入/杂项）+ WSS（结果/指令）
┌──────────────┴────────────────────────────────────────────────────────────┐
│ Chromium 页面（真实页面：playground dev/preview server 渲染的 flux 应用）    │
│  · flux 应用 + DevTools 内核（测试模式全开，无需面板 UI）                    │
│  · DriverAPI（页内，同事件循环）：ft.expect 语义断言 / byCid / waitFor /     │
│    dispatch / snapshot / capture / replay                                   │
│  · CompatLayer（迁移脚手架，T0–T3 存在，E4 删除）：                          │
│    page.locator/getByTestId/keyboard/mouse 的页内等价实现                    │
└────────────────────────────────────────────────────────────────────────────┘
```

关键决策（v4）：**测试代码执行位置 = 浏览器内**（Cypress driver 模式），Node 只做"启动 + 编排"：

- 与被测应用同事件循环（Cypress 核心优势）：`waitFor`/断言零网络往返，内核对象直接可用；
- 交互在页内派发：`ft.dispatch` 语义事件 + Locator 兼容层的合成 DOM 事件，`whenStable` 门控，天然消灭大部分 actionability 等待；
- Node 侧职责收敛为四件（§1.6），无代理、无扩展、无 Playwright driver 层——**比 Cypress 更简，比 Playwright 轻一个数量级**；
- `page.evaluate` ×540 的迁移大部分**直接删除**（白盒 API 替代）。

---

## 3. 模块设计

### 3.1 `@nop-chaos/flux-test-server`（Node 包，新）

```
packages/flux-test-server/src/
  cli.ts            # pnpm test:e2e 入口：filter/worker/timeout/report 参数
  launcher.ts       # 裸 CDP：拉起浏览器（复用系统 Chrome 或 CI chromium）→ 开 tab →
                    # 加载真实页面（playground/preview URL）。仅启动级控制（§1.6）
  gateway.ts        # 本地 WSS：M0 协议本地子集（session.attach/log.emit/capture.*/assert.*）
                    # 只传结果与显式指令，非浏览器控制通道
  spec-loader.ts    # spec 文件 → Vite 打包 → 经 CDP Page.addScriptToEvaluateOnNewDocument
                    # 注入页面（Cypress"spec iframe"思路的简化版：同页直接执行）
  spec-loader.ts    # spec 文件 → Vite 打包 → 经 CDP Page.addScriptToEvaluateOnNewDocument
                    # 注入页面（Cypress 同款"spec iframe"思路的简化版：同页直接执行）
  runner.ts         # 编排：每 spec 一个干净 tab（等价 Playwright per-test context），
                    # 超时/重试/并发 worker、结果聚合
  reporter.ts       # 终端 + JUnit XML + JSON（对齐现有 CI 消费格式）
  session-store.ts  # 失败 spec → DevSession 诊断包落 tests/e2e/artifacts/（gitignore 政策不变）
```

- 启动器实现选型：**不用 puppeteer/playwright 依赖**，直接 `ws` + CDP JSON 协议（`Target.createTarget`、`Runtime.evaluate`、`Page.captureScreenshot`、`Emulation.*`）。Cypress 的 launcher 证明这一层很薄。
- 视口/设备模拟：CDP `Emulation.setDeviceMetricsOverride`（替代 Playwright `viewport` 配置项）。
- console/网络监听：CDP `Runtime.consoleAPICalled`、`Network.*`（供断言与诊断）。

### 3.2 页内驱动 `@nop-chaos/flux-test-driver`（新包，复用 nop-debugger 内核）

```ts
// 测试模式内核装配（替代 NopDebuggerPanel，无 UI）
createTestKernel(app: SchemaRenderer挂载点, opts: { serveUrl?: string /* 连测试网关 */ })

// spec 全局对象（迁移期与 page.* 同名共存，见 §5）
ft = {
  // —— 导航/生命周期（Node 协同）——
  goto(url): void; reload(): void;

  // —— 定位（兼容层，仅迁移期；终态删除）——
  locator(sel: string | { testid: string; cid?: string }): Locator;
  getByTestId(id: string): Locator;

  // —— 业务语义断言（终态 API，依赖 M1–M4 能力）——
  expect: SemanticExpect;   // 见 §1.5：cid meta/prop/rendered、scope、reaction、event、snapshotPath、visual

  // —— 内核白盒（超越 Playwright 的部分）——
  byCid(cid: string): CidHandle;                    // 语义定位
  dispatch(cid: string, event: FluxActionEvent): void;
  waitFor(pred: WaitForPredicate, opts?): Promise<WaitResult>;   // M3 断言 API
  scope<T>(selector: (data) => T): T;               // 同步读 store
  snapshotAt(epoch): SerializedForestSnapshot;
  evaluate<T>(fn: string): Promise<T>;              // 兜底（等价 page.evaluate，仅存量迁移用）
  screenshot(opts?: ScreenshotOptions): Promise<ScreenshotResult>;  // M2 capture
  session: { record(): Handle; stop(): DevSession; replay(s: DevSession): ReplayHandle };
}

interface Locator {          // Playwright Locator 语义子集
  click(opts?): Promise<void>; dblclick?; fill(text): Promise<void>; type(text, opts?);
  press(key): Promise<void>; hover(): Promise<void>;
  text(): Promise<string>; innerHTML(): Promise<string>;
  attr(name): Promise<string | null>; isVisible(): Promise<boolean>; isEnabled(): Promise<boolean>;
  count(): Promise<number>; nth(i): Locator; first(): Locator;
  waitFor(state: 'visible'|'hidden'|'attached', opts?): Promise<void>;
  screenshot(opts?): Promise<ScreenshotResult>;
}
```

- Locator 实现：解析为元素后走内核检查（`inspectByElement` → cid 关联），操作前过 `whenStable` + actionability 检查（可见/可点/无动画——Cypress `actionability.ts` 思路），操作后自动 `waitFor` 默认稳定。**重试语义内建**（查询可重试、动作执行一次）。
- 键盘/鼠标：页内 `dispatchEvent` 合成事件（Cypress 同款）为主；`hover` 用 pointerover 序列；`page.mouse` ×222 迁移期映射到合成序列，涉及拖拽的 spec 优先改写为 `dispatch` 语义事件（更好）。

### 3.3 测试管控界面（Test Console UI，对标 Cypress App/Runner）

开发者的日常入口，对标 Cypress 的 **Launchpad（选择/配置）+ Runner（运行/观察）** 双形态，基于 `@nop-chaos/ui` 组件与 NopDebuggerPanel 既有组件拼装，随 `flux-test-server` 一同提供（`pnpm test:e2e --open` 进入，普通浏览器 tab 打开即可，无 Electron）。

```
┌ Test Console（http://localhost:<port>/__flux_test__）──────────────────────┐
│ ① Launchpad 页                                                             │
│   · Spec 树（tests/e2e/ 目录 + 搜索/标签过滤：交互/visual/白名单）           │
│   · 运行配置：浏览器（已检测）、视口预设、并发 worker 数、retry 策略           │
│   · 环境：dev server 选择（playground dev / preview）、env stub 配置          │
│ ② Runner 页（选中 spec → Run / Watch）                                      │
│   · 左：Command Log 树（= 内核 Log 树，嵌套 action/api/eval/assertion/capture│
│     节点；状态色 pending/passed/failed；点击节点 → 详情抽屉：full props、     │
│     快照、截图、Why 归因链接）                                               │
│   · 中：真实页面预览（被测页 iframe 嵌入或受控 tab 投影）+ 时间旅行 scrub 条   │
│     （复用 M2 预览协议：hover/pin 步骤 → store 状态 + DOM 影子还原）          │
│   · 右：断言详情（ft.expect 结论、尝试次数、失败时 diverge diff）             │
│ ③ 会话/诊断页                                                               │
│   · 历史 run 列表（本地 runner 落库）、失败 spec → DevSession 诊断包          │
│     一键回放（M5 回放器）、截图/视频画廊、视觉基线 diff 对比视图               │
│ ④ CI 模式：--open 不传时无 UI，runner 直接出报告（同一内核，两种宿主）         │
└──────────────────────────────────────────────────────────────────────────────┘
```

设计要点：

- **Runner 页的页面预览**：被测应用在受控 tab 中真实运行，Console 通过网关拉取 Log/快照/截图流展示；时间旅行 scrub 直接复用 DevTools 面板的预览协议（同一内核两套宿主：调试 Dock 面板 / 测试 Console）。
- **Watch 模式**：spec 或被测源码变更 → 自动重跑选中 spec，Command Log 增量刷新（diff 日志总线直接支撑）。
- **失败即诊断**：任何 failed 节点一键"导出 DevSession / 打开时间旅行 / 查看基线 diff"——把 Cypress "失败后开 trace viewer"的体验做成原生的。
- 实现复用清单：Log 树渲染与状态色（NopDebuggerPanel 时间线组件）、预览协议与 scrub（M2）、快照 diff 视图（M2）、视觉 diff 对比（M3 采集 §8）、会话回放器（M5）。**Console 无独立状态源**，一切读内核/网关。
- 路由边界：Console 是开发工具页，`pnpm check` 的 UI 一致性门禁照常适用（用 ui 组件、无裸元素）；不进入生产构建。

### 3.4 与 DevTools 主线的关系

- `flux-test-driver` = nop-debugger 内核的**无 UI 装配 + Locator 兼容层**，不是新内核；M1–M3 交付的 StabilityTracker/waitFor/capture 是它的地基。
- 测试网关（3.1 gateway.ts）与 M6 生产网关共用 M0 协议，实现仅本地子集——**一次协议，两个宿主**（本地测试 / nop-entropy 平台）。

---

## 4. 稳定性语义（替代 Playwright 自动等待）

| Playwright 行为                       | flux-test 等价                                              | 说明                                                |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| locator 自动等待可见                  | `Locator.click/fill` 内建 `whenStable` + actionability 重试 | Cypress retries.ts 语义                             |
| `expect(locator).toHaveText` 自动重试 | `ft.waitFor({type:'cid',...})` / `expect.poll` 等价物       | 断言重试 + 尝试次数日志                             |
| `page.waitForLoadState`               | `ft.waitFor({type:'stability'})`                            | 计数器含 fetch/suspense，比 load 事件更准           |
| `page.route` 网络拦截                 | env stub（总体 §3.4）                                       | flux 层拦截；浏览器级用 CDP `Fetch` 域（Node 协同） |
| 失败自动截图/trace                    | 失败 spec 自动 `DevSession` + 关键帧截图                    | 诊断包可直接重放复现                                |

---

## 5. 迁移设计（244 spec → 0 Playwright）

### 5.1 API 映射表（迁移 handbook 的核心）

| Playwright                   | flux-test                                                                        | 迁移方式                                                    |
| ---------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `page.goto` (×377)           | `ft.goto`                                                                        | 机械替换                                                    |
| `page.getByTestId` (×2078)   | `ft.getByTestId`（兼容层）                                                       | 机械替换；逐步改 `ft.byCid`                                 |
| `page.locator` (×1996)       | `ft.locator`（兼容层）                                                           | 选择器子集：CSS、`:has-text`、`:has`、`>>` 深度组合器需翻译 |
| `page.evaluate` (×540)       | 优先白盒 API 替换；无法替换的走 `ft.evaluate`                                    | **迁移后逐步清零**，注册"evaluate 债务"清单                 |
| `page.keyboard/mouse` (×507) | Locator 方法 + 合成序列                                                          | 拖拽类优先改 `dispatch`                                     |
| `page.waitFor` (×333)        | `ft.waitFor`                                                                     | 多数可换 stability 谓词                                     |
| `page.screenshot` (×18)      | `ft.screenshot`（M2 capture）                                                    | visual spec 走 §5.3                                         |
| `page.request` (×6)          | Node 侧 fetch（gateway 暴露）                                                    | 少量，Node 直发                                             |
| `test.describe/step`         | 保留同名结构（runner 解析）                                                      | 报告结构对齐                                                |
| `expect` 断言                | 引入 `@nop-chaos/flux-test-assert`（基于现有 strict helpers 风格）+ 内建重试断言 |                                                             |

#> 落地状态（2026-11-18 勘误附注，E2 T0 试点实测，plan `docs/plans/2026-11-18-e2-test-console-v1-plan.md`）：**T0 完成**——交互试点 `boolean-control-value-contract`（4 用例）与 visual 试点 `ai-chat-ux-visual`（5 用例）已迁 flux 引擎全绿，旧 spec 同 commit 删除。**试点实测兼容层缺口与绕行**（回灌 §3.2/§5.1，E3 处置）：

> 1. 嵌套 `locator.locator()`——试点用平铺后代 CSS 选择器绕行（`[a] [b]` 形态等价）；
> 2. 元素级 `evaluate`——用整页 `ft.evaluate` 兜底（evaluate 债务 2 处登记：getBoundingClientRect 高度、computed opacity）；
> 3. `getByRole`（含 name 过滤）——试点用 `[role=...]` 属性选择器 + nth 绕行；name 语义过滤待 E3 补；
> 4. CSS `:hover` 不可合成——已实现 §5.4 真实输入通道：driver 经 gateway `input.hover/click` 请求 → runner CDP `Input.dispatchMouseEvent`（trust 事件），Locator hover/click 自动 scrollIntoView + 真实坐标；合成事件仅在通道不可用时兜底；
> 5. 键盘组合键（ControlOrMeta 等 Chord）与 `page.mouse` 拖拽序列——试点未触及，E3 迁移 keyboard 密集 spec 时补 CDP `Input.dispatchKeyEvent` 序列；
> 6. `viewport` 由 runner CDP `Emulation.setDeviceMetricsOverride` 承接（E1 已有），Console 页面预览另需投影（E3）。
>    另：`waitForValue`（input value 轮询）以 `ft.evaluate` 读原生 value 兜底；E3 语义重写目标为 `ft.expect.prop/scope` 白盒断言。

## 5.2 分阶段迁移

- **T0 试点**（选 2 个 spec：1 个纯交互 + 1 个 visual）：验证 runner/兼容层/截图/CI 报告全链路。产出兼容层缺口清单回灌设计。
- **T1 双引擎期**：`pnpm test:e2e` 同时跑 Playwright（存量）与 flux-test（已迁移），CI 比对两份报告；**禁止删旧 spec 先于新 spec 全绿**（每个 spec 迁移 = 新 spec 全绿 + 旧 spec 删除，同一 commit）。
- **T2 批量迁移**：按 API 使用复杂度分层（只用 goto/testid 的先迁，mouse/route/request 的后迁）；每批 ≤20 spec，保持 full-green 记录节奏。**迁移分两步走，同一 spec 内允许共存**：
  - 第一步（引擎替换）：用兼容层机械替换 `page.*` → `ft.*`，保行为不变；
  - 第二步（语义重写，依赖 M2–M4）：把 DOM 断言改写为 `ft.expect` 语义断言（§1.5 分层规则）。第二步完成才标记该 spec "迁移完成"。
- **T3 收尾**：删除 `@playwright/test` 依赖、`playwright.config.ts`、`tests/e2e/` 内 Playwright 专属 helper；`pnpm check` 新增两项**防回归门禁**：① 禁止 `@playwright` import 出现在 workspace；② **DOM 断言门禁**：`tests/e2e/` 内 `ft.locator/getByTestId/evaluate/innerHTML` 等调用按文件登记白名单（仅 §1.5 例外 + 未完成语义重写的存量登记），只减不增。
- **T4 语义清零**：兼容层代码与 DOM 白名单一并删除——`flux-test-driver` 不再发布 Locator/`ft.evaluate` API；spec 全量基于 `ft.expect` 语义层 + §1.5 例外白名单。此后语义重写随功能开发持续进行（byCid/expect 为唯一写法）。

### 5.3 visual spec 专项（18 个 screenshot 调用 + 基线政策）

- `page.screenshot({path})` → `ft.screenshot`（S2 通道）+ `capture.compare`（M3 视觉基线）；基线走网关本地模式（`tests/e2e/__snapshots__` 政策不变，产物仍 gitignore）。
- CDP 保真通道（`Page.captureScreenshot`）作为全页/跨域场景的后端（launcher 已有 CDP 连接，零额外依赖）。
- 逐像素差异风险：Playwright 与自研截图像素级结果不同 → **迁移时重新生成基线**，并在 CI 双引擎期比对"判定结论"而非像素。

### 5.4 覆盖缺口与对策（诚实清单）

真实浏览器模式下语义断言之外的边界（均经 launcher 的 CDP 杂项通道承接，不引入 Playwright）：

| 场景                                  | 处理                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| 真实 OS 级输入（trust 事件）          | CDP `Input.dispatchMouseEvent/KeyEvent`（个别用例，launcher 直发）；页内合成事件为主 |
| 截图保真/全页                         | CDP `Page.captureScreenshot`；页内 S2 foreignObject 通道为默认（采集专章 §2）        |
| 跨 tab / 弹出窗口                     | CDP `Target.createTarget` 多 tab 编排（Node 侧 API：`ft.tabs`）                      |
| 浏览器级网络断言（`page.request` ×6） | Node 侧 fetch 直发（本就无需特殊控制）                                               |
| 下载文件、clipboard 权限              | CDP `Browser.setDownloadBehavior` / 权限域                                           |
| a11y-axe-baseline                     | axe 在页内执行（本就如此），经页内内核收集结果                                       |

所有 CDP 杂项均为**启动端可选项**：不用它们，页内内核照常完成全部定位/交互/等待/断言。

---

## 6. 测试策略

- **Must automate**：runner 编排（超时/重试/worker 隔离/tab 清洁）、Locator 兼容层语义（对照表逐项）、actionability 检查、失败 DevSession 产出、双引擎报告对齐、`pnpm check` 防回归门禁。
- **Should have**：`byCid` 断言用例集、重试断言的尝试次数日志、visual 判定一致性。
- 迁移全程遵守仓库 full-green 记录政策（每批迁移完整绿 → dev log + commit 注明）。

## 7. 风险登记

| 风险                                                       | 等级   | 缓解                                                                                       |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| 兼容层语义偏差导致"假绿"（测试松了）                       | **高** | 双引擎期结论比对（不是像素比对）；迁移 checklist 要求断言强度不降级；strict helpers 复用   |
| 244 spec 迁移工作量失控                                    | 中     | 分层批量 + 机械替换占比高（testid/locator/goto ≈ 70% 调用量）；每批限 20                   |
| 自研裸 CDP launcher 边角缺陷（僵尸 tab/崩溃恢复/版本差异） | 中     | launcher 单测先行（mock CDP）；双引擎期 Playwright 作为 oracle 对照；CI 锁定 chromium 版本 |
| Firefox/WebKit 支持缺失                                    | 中     | 明示降级：CI 仍留 Chromium 单浏览器（与现状等价则无损）；跨浏览器列为远期                  |
| 自研 runner 边角缺陷（超时/隔离/报告）                     | 中     | runner 单测先行                                                                            |
| 失去社区生态（trace viewer、parallel fixtures）            | 低     | DevSession 诊断包 > trace viewer（可重放）；worker 池自实现                                |

## 8. 里程碑（并入主 Roadmap 为 E 轨道）

| 阶段 | 内容                                                                                                                                                 | 依赖                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| E1   | flux-test-server 骨架（裸 CDP launcher / 本地网关 / runner / reporter）+ 页内驱动装配 + `ft.expect` 语义断言骨架 + 兼容层 Locator 子集（迁移脚手架） | M0、M1                          |
| E2   | **Test Console v1**（§3.3：Launchpad spec 选择 + Runner Command Log 树/预览/scrub）+ T0 试点 2 spec（1 交互 + 1 visual）+ 缺口清单回灌               | E1、M2（capture/预览）          |
| E3   | 双引擎 CI（Playwright 为 oracle 对照）+ 批量迁移（分 4–6 批，每批"引擎替换→语义重写"两步）；Console 增强（Watch 模式、断言详情抽屉）                 | E2、M3–M4（waitFor/visual/Why） |
| E4   | T3 收尾：删 Playwright 依赖 + DOM 断言门禁 + 迁移 handbook 定稿；**Console v2**（会话/诊断页：历史 run、DevSession 回放、视觉 diff 画廊）            | E3 全绿、M5                     |
| E5   | T4 语义清零：删兼容层与 DOM 白名单；语义重写随开发持续                                                                                               | E4 + M4 全量落地                |

> 与主 Roadmap 的关系：E1–E2 依赖 DevTools 主线 M1–M2 交付物；E3 可与 M4/M5 并行；E5 在 M7 后。

## 5.5 E3 批次 1 双引擎对照台账（2026-11-19，plan `docs/plans/2026-11-18-e3-batch-migration-wave1-plan.md`）

判定结论对照（非像素比对）：每 spec 新旧引擎均跑通、结论一致（全绿）后方同 commit 删除旧 spec；迁移时 20 个旧 spec 共 55 用例在 Playwright 上复跑绿（oracle），flux 引擎同批全绿。

| spec                        | 旧用例 | 新覆盖 | 升级点（判别性）                                                 | evaluate 债务              |
| --------------------------- | ------ | ------ | ---------------------------------------------------------------- | -------------------------- |
| table-density               | 1      | 1/1    | boundingBox ±2px 显式断言 + kernel 白盒错误检查替代 console 捕获 | 0                          |
| kanban-card-template        | 1      | 1/1    | getByText→toContainText 重试轮询                                 | 0                          |
| calendar-grid-shape         | 1      | 1/1    | toHaveCount 重试 + kernel 白盒                                   | 0                          |
| ai-tools                    | 1      | 1/1    | kernel 白盒错误检查                                              | 0                          |
| ai-citations                | 2      | 2/2    | kernel 白盒逐用例                                                | 0                          |
| ai-hitl                     | 2      | 2/2    | attr 显式等价检查 + 路由反弹隔离                                 | 0                          |
| ai-p4-widgets               | 3      | 3/3    | expectWeb 重试 + SVG 附着断言                                    | 0                          |
| scada-editor-panel-collapse | 2      | 2/2    | 显式 1280×800 viewport（runner 默认 756px 低于 md 断点）         | 0                          |
| form-atoms-input-color      | 3      | 3/3    | computed style 重试探针                                          | 1（toHaveCSS 缺口）        |
| form-atoms-rating           | 3      | 3/3    | 真实 CDP 鼠标偏移点半星                                          | 0                          |
| ai-attachments              | 2      | 2/2    | DataTransfer 真实选档                                            | 1（setInputFiles 缺口）    |
| ai-branches-linkage         | 3      | 3/3    | 稳定门控路由反弹隔离                                             | 0                          |
| w1b-feedback-family         | 5      | 5/5    | expectWeb 重试 + kernel 白盒                                     | 0                          |
| input-city                  | 3      | 3/3    | 视口 set/restore + 隔离反弹                                      | 0                          |
| org-select-department       | 2      | 2/2    | toContainText 等价替代 regex toHaveText                          | 0                          |
| nop-report-profile          | 3      | 3/3    | per-assertion timeoutMs + 显式视口                               | 0                          |
| calendar-demo               | 6      | 6/6    | toHaveText/not.toHaveText 重试导航断言                           | 0                          |
| three-industrial-demo       | 2      | 2/2    | expect.poll→重试谓词 helper                                      | 0                          |
| gantt-states                | 8      | 8/8    | SVG 可见性 helper（附着+非空 bbox）                              | 1（locator.evaluate 缺口） |
| w3d-upload-family           | 2      | 2/2    | expectWeb 重试 + 错误检查                                        | 1（setInputFiles 缺口）    |

批次 1 实测新增兼容层缺口（回灌 §5.1，E3 Wave 2 处置）：

1. SVG 可见性——driver `isElementVisible` 曾按 HTMLElement 判定，SVG rect 永不可见；本批已在 driver 侧修复（Element 判定 + checkVisibility）。
2. `nth(i).locator(sub)` 退化为后代选择器 `sel sub`、丢失索引——现以唯一属性选择器绕行；Wave 2 需要时实现 scoped-nth。
3. `toHaveText` 不接受 RegExp；`locator.getByText` / `locator.getByRole`（scoped）不存在——以页级 getByRole/toContainText 绕行。
4. `setInputFiles` / `locator.evaluate` / `allTextContents` 无对应——evaluate 债务 4 处登记（上表），语义重写期清偿。
5. `ft.reload()` 中途重载会摧毁 CDP 求值上下文（runner 每 spec 单次 evaluate 无上下文重试）——以稳定门控的 hash 路由反弹替代；runner 侧上下文重试列为 Wave 2 候选。
6. runner 默认视口 756×469 低于 Playwright 桌面断点——依赖桌面布局的 spec 须显式 `ft.setViewportSize`（或将 runner 默认视口提到 1280×800，Wave 2 裁定）。

### §5.5 续表：批次 2（2026-11-19，plan `docs/plans/2026-11-19-e3-batch-migration-wave2-plan.md`）

20 个旧 spec 共 101 用例 Playwright oracle 复跑绿后同 commit 删除（225→205）；flux 引擎全批绿。

| spec                      | 旧用例 | 新覆盖 | 升级点                                             | evaluate 债务 |
| ------------------------- | ------ | ------ | -------------------------------------------------- | ------------- |
| table-column-width-layout | 2      | 2/2    | resetRoute 隔离 + 显式 heading 门                  | 2             |
| ai-conversations          | 5      | 5/5    | kernel 白盒逐用例                                  | 0             |
| map-demo                  | 2      | 2/2    | OL 锚点暴露轮询 + kernel 白盒                      | 1             |
| m2-touch                  | 9      | 9/9    | 视口切换 matchMedia 门控（desktop 负断言重试轮询） | 0             |
| org-select-user           | 4      | 4/4    | 双变体全文本显式检查（强于单 regex）               | 0             |
| scada-size-consistency    | 2      | 2/2    | expect.poll→显式重试环 + 引擎白盒                  | 1             |
| w3d-markdown-editor       | 5      | 5/5    | computed style 精确串比较 + resetRoute             | 0             |
| gantt-editor-fields       | 9      | 9/9    | 逐用例 kernel 白盒                                 | 0             |
| tree-display-ux           | 6      | 6/6    | getByText.count→树级 toContainText 等价            | 0             |
| ai-persistence            | 2      | 2/2    | 存储引导 mount 重放 reload 路径                    | 1             |
| w2a-data-composition      | 6      | 6/6    | store 向导状态按序消费 + 稳定门                    | 0             |
| word-editor-template-expr | 7      | 7/7    | kernel 白盒 + 弹层卸载探针                         | 3             |
| m3-layout                 | 7      | 7/7    | waitForFunction→带末值报错显式轮询                 | 1             |
| w4a-multimedia-family     | 9      | 9/9    | 公共指示器复位替代重挂载                           | 2             |
| gantt-splitter-scroll     | 4      | 4/4    | expect.poll→带末值报错轮询 + 分步拖拽              | 3             |
| w3c-value-mapping         | 10+    | 11 块  | 一次性 evaluate→重试轮询类检查                     | 0             |
| ai-widgets-showcase       | 5      | 5/5    | 遮挡规避（fill+Enter 替代被覆盖点击）              | 1             |
| cron-editor               | 5      | 5/5    | roving tabindex 键盘走查保留                       | 2             |
| w4c-composite-form-family | 7      | 8 块   | kernel 白盒逐用例                                  | 0             |
| scada-pressure-demo       | 3      | 3/3    | assertScadaCanvasRendered 同强度重实现             | 1             |

批次 2 新增缺口回灌（Wave 3 处置候选）：Locator.focus()/toBeFocused 缺失（cron-editor 键盘走查兜底 evaluate）；真实点击遮挡检测（playground 固定 overlay 覆盖目标中心——driver 可加 elementFromPoint 命中断言）；CDP 逐字符 keyDown text+char 双插入（keyboard.type 对 React 受控输入不可用——fill 兜底）；`getByRole` string name 全匹配语义与 Playwright 的默认子串不匹配不一致（文档化即可）。

### §5.5 续表：批次 3（2026-11-19，plan `docs/plans/2026-11-19-e3-batch-migration-wave3-plan.md`）

20 个旧 spec 共 45 用例（+1 存量 skip 保留）Playwright oracle 复跑绿后同 commit 删除（205→185）；flux 引擎全批 65 全绿。附带两个 live defect 修复（详见 docs/bugs/15/16）与一个 runner 契约修复：

| spec                             | 旧用例 | 新覆盖           | 升级点                                                                  | evaluate 债务 |
| -------------------------------- | ------ | ---------------- | ----------------------------------------------------------------------- | ------------- |
| kanban-keyboard-reorder          | 1      | 1/1              | activeElement 轮询焦点证明（Space=' ' 键名约束记录）                    | 1             |
| three-canvas-ux                  | 2      | 2/2              | DPR 整数时 buffer 宽度改为精确倍数断言                                  | 1             |
| ai-component-handle              | 2      | 2/2              | 空 evaluate(true) 换真实挂载/气泡计数探针                               | 1             |
| leafer-examples                  | 2      | 2/2              | canvas buffer 像素尺寸 >0 追加断言                                      | 1             |
| graph-level-tint                 | 1      | 1/1              | 逐 level 表面色与卡片底色差异断言                                       | 1             |
| flux-basic-row-inspect           | 1      | 1/1              | 逐行 kernel 白盒（附带修复 flux-basic 页面装饰环境竞态 + docs/bugs/15） | 1             |
| calendar-perf                    | 2      | 2/2              | 到达门稳定等待 + 同阈值内联 fps                                         | 1             |
| scada-pointer-events-regression  | 3      | 3/3              | 引擎句柄存在断言追加                                                    | 2             |
| flow-designer-edge-creation      | 1+skip | 1/1（skip 保留） | 提交后追加 kernel 白盒                                                  | 2             |
| crud-views-export-tab-visibility | 1      | 1/1              | 400ms 判别窗口语义保留                                                  | 1             |
| diff-perf                        | 1      | 1/1              | hash 守卫防陈旧 0ms 读数                                                | 1             |
| condition-builder-formula        | 4      | 4/4              | 逐用例错误标记                                                          | 2             |
| debugger-ai                      | 1      | 1/1              | 资源时序双半判别保留                                                    | 1             |
| composite-editor-handles         | 5      | 5 断言           | 稳定门后再断言                                                          | 0             |
| w3d-period-family                | 4      | 4/4              | 逐用例 kernel 白盒（原 spec 无错误面）                                  | 1             |
| gantt-perf                       | 3      | 3/3              | measure-perf helper 内联等价                                            | 2             |
| mobile-number-keyboard           | 5      | 5/5              | 正则文本断言升级精确等值                                                | 0             |
| form-atoms-slider                | 3      | 3/3              | aria-valuenow 追加断言                                                  | 1             |
| verification-code                | 3      | 3/3              | 两次 Backspace 复查                                                     | 2             |
| w1a-content-family               | 7      | 7/7              | sanitize 三合一单趟断言                                                 | 1             |

批次 3 附带契约修复（driver/server）：

1. **runner 存储隔离**（docs/bugs/16）：单浏览器 profile 下 localStorage 跨 spec 泄漏（debugger-ai 打开的浮动面板持久化遮挡后续 spec 点击）——`Page.addScriptToEvaluateOnNewDocument` 每文档清空 storage，Playwright fresh-context 等价；mock 增加 methodLog 测试挂勾。
2. **nth() 谓词贯穿**（docs/bugs/15 附带）：getByRole name 过滤后的 `nth(i)/last()` 曾在未过滤全页选择器上取索引（点错按钮）——createIndexedLocator 复用 predicate；判别性单测恰红→绿。
3. **per-spec 超时约定**：`*-perf.flux-spec.ts` dir 模式自动 200s（对齐 Playwright describe 级超时），specTimeouts 覆盖机制 + 单测。

### §5.5 续表：批次 4（2026-11-19，plan `docs/plans/2026-11-19-e3-batch-migration-wave4-plan.md`）

20 个旧 spec 共 66 用例（57 绿 + 2 存量 skip + 7 pre-existing 红）Playwright oracle 复跑后同 commit 删除（185→165）；flux 引擎全批 85 全绿。7 红为 ai-widgets-button-actions 全部用例——strict-validation `unvalidated-component-target` 诊断击穿 console-error allowance，pre-existing（P1-MA9.2-001 已裁决的 ai-chat invoke-model contract 缺口），初记误为"复跑绿"已更正。

| spec                       | 旧用例 | 新覆盖              | 升级点                                                      | evaluate 债务 |
| -------------------------- | ------ | ------------------- | ----------------------------------------------------------- | ------------- |
| url-filter-sync            | 2      | 2/2                 | expect.poll→带末值重试环（hash 写回）                       | 2             |
| table-column-drag          | 1      | 1/1                 | dragTo→DataTransfer DragEvent 合成 + 顺序 oracle 重试       | 1             |
| large-dataset-windowing    | 2skip  | 2 skip 保留 + smoke | 旧用例本就 skip（页面未建），形态文档化保留                 | 0             |
| report-designer-ux-r9      | 3      | 3/3                 | waitForTimeout→stability 门控 + toHaveClass→带末值重试      | 2             |
| input-password-strength    | 1      | 1/1                 | kernel 白盒 + 场景标记可见性门                              | 1             |
| word-editor-persistence    | 1      | 1/1                 | reload→卸载重挂载 + localStorage 再水化（强于同包重载）     | 3             |
| convergence-n1-n2          | 2      | 2/2                 | fresh-load 循环→门控反弹                                    | 2             |
| form-input-enhancements    | 3      | 3/3                 | dispatchEvent→真实 CDP 长按                                 | 3             |
| table-virtual-body         | 2      | 2/2                 | waitForTimeout→滚动位置条件轮询                             | 2             |
| table-popover              | 3      | 3/3                 | 逐用例 kernel 白盒                                          | 1             |
| home-entry-navigation      | 6      | 6/6                 | 逐入口 kernel 白盒 ×6                                       | 1             |
| w1c-list                   | 4      | 4/4                 | ComponentLab helper 内联 + 逐用例反弹                       | 0             |
| word-editor-dataset        | 5      | 5/5                 | 持久化经完整重挂载再水化验证                                | 4             |
| w1c-list-pagination        | 2      | 2/2                 | IO 测试缝线移植 + 终态 no-op 复核                           | 2             |
| ai-virtual-scroll          | 2      | 2/2                 | waitForTimeout→几何可达性条件轮询                           | 0             |
| three-gallery              | 5      | 5/5                 | waitForTimeout→条件轮询（镜像帧）                           | 2             |
| designer-summary-renderers | 3      | 3/3                 | networkidle→标记计数到达门                                  | 0             |
| pivot-table-demo           | 4      | 4/4                 | hasText div→语义 slot 锚（更强）                            | 1             |
| ai-widgets-button-actions  | 7      | 7/7                 | waitForTimeout→去重条件轮询；console 守卫降级裁决见勘误附注 | 2             |
| ai-rich-text-sender        | 8      | 8/8                 | dark-flip finally 复位（防用例间泄漏）                      | 3             |

批次 4 附带契约修复（driver）：

1. **索引 locator 全方法委托**（Wave 2 缺口销账）：nth()/last() 重构为 index-predicate 普通定位器——isEnabled/inputValue/fill 等全部方法解析到索引元素（此前退化为第一个元素）；判别单测恰红→绿（2 个）。
2. **嵌套组合谓词泄漏修复**：nth 父定位器的谓词曾流入 `locator(sub)` 子定位器，子元素永不满足父匹配表 → click 永超时（debugger-ai adopt 按钮实修发现）；组合时清空父谓词 + 判别单测。
3. 超时约定扩充：pivot-table-demo 240s、ai-widgets-button-actions 120s（继承 Playwright describe 级超时）。

> **勘误附注（2026-11-19，closure audit B1 处置）**：oracle 复跑真实结果为 **57 passed + 2 skipped + 7 FAILED**——7 个失败全部是 `ai-widgets-button-actions.spec.ts`（该页 schema 的 `component:setSenderDraft` 触发 dev strict-validation `unvalidated-component-target` 诊断，fixtures console-error allowance 0 被击穿）。该红为 **pre-existing**（ai-chat capability contracts 因 invoke 模型未声明——`ai-renderer-definitions.ts` P1-MA9.2-001 已裁决的 follow-up），与本批 diff 无关，HEAD 与各历史点同样红。初记"57+2skip 复跑绿"系执行者误读 oracle 输出（截断未查失败行），在此更正。强度裁决：flux 替代 spec 的 `expectNoPageErrors` 走内核白盒通道而非 console 通道——ai-widgets 页的 console schema 诊断守卫在该 spec 维度确有降级，随 P1-MA9.2-001 follow-up（ai-chat invoke-model contract pattern 落地后 strict 诊断消除）一并收口；successor 登记于 Wave 5 plan。
