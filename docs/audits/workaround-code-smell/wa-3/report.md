# WA-3 React 渲染层与 UI 库 临时方案与坏味道审计报告

> 批次: WA-3（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/563-workaround-audit-wa3-react-ui-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-3 行，不手抄）

## 快照基准注记

主工作树存在并行会话在途变更（flux-core/flux-renderers-\*/flux-runtime 共 14 文件，`git status` 实测；计数随并行会话漂移）。**两包自身零在途变更**（flux-react/ui `git status` 干净），本报告全部走读取证与扫描基于 HEAD `0b0f4cd00` 主树快照（两包无漂移，无需隔离 worktree 取证）；全量五门禁按 plan 隔离 worktree 方法验证（见 plan Closure Gates）。inventory 的 flux-react=9,436/63 文件、ui=9,058/80 文件经执行时独立实测逐字吻合。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。
> 声明口径：列出的模块 = 本批执行了 prompt §5 全量取证协议（字面扫描 → 模式扫描 → git 考古 →
> 重复块识别 → 抽读走读 → 误报排除）的对象。部分覆盖不得声明 audited（缩水走显式注记）。

| 模块 id    | 文件数 | 非测试行数 | 取证完成 | 备注                                                                                                                                                              |
| ---------- | ------ | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-react | 63     | 9436       | ✅       | inventory.modules[flux-react].files 63 项全读；hooks 族/auto-renderer/dialog-host 族/bindings/container-context hooks/defaults 全读 + 重复块程序化探针 + git 考古 |
| ui         | 80     | 9058       | ✅       | inventory.modules[ui].files 80 项全读；toolbar 五件全读 + components/ui 按行数降序 top-15 全文 + 其余全读 + token 归一化探针 + git 考古                           |

合计 143 文件 / 18,494 行，与 inventory 逐字一致（实测复核，零漂移）。

### dialog-host 同源取证专项小节（roadmap 历史教训档"surface 生命周期两份合一"live 判定）

**判定：收敛在位，未复发。** 证据链：

1. **生命周期单点**：surface 的打开/关闭/作用域装配本体在 flux-runtime `surfaceRuntime`（单点）；flux-react 视图层仅消费。`useSurfaceView`（dialog-host.tsx:208-288，出生 `5ad81bbf2` 2026-10-01 "cq-3 intra-package dedup — surface hook"）持有 handleClose、surfaceContext memo、title/actions/header/footer 节点、container 解析、confirm 按钮全部编排；DialogView/DrawerView 仅保留布局壳与 `closeOutsideField`（'closeOnOutsideClick' vs 'closeOnOutside'）及抑制规则差异——与 ：201-207 设计注释逐字吻合。
2. **支撑模块非复制**：dialog-host-surface.tsx（123 行）是 SurfaceScopeProviders/useSurfaceScopeSnapshot/renderSurfaceNode 支撑件，与 dialog-host.tsx 零生命周期重复；其 ：111 断言为守卫前置的动态边界（D 类排除）。
3. **残差立案**：视觉壳 JSX 层仍有 ~70 行平行（WA-react-003），属"收敛后的残差"而非教训复发；`5a8baa1ca`（2026-06-21 "E2f unify dialog/drawer surface family"）证明该区域的"统一"计划本身仍在按件双写——残差收敛值得排期（归 CX-8），不构成对历史教训的复发定性。

### 取证执行记录（prompt §5 步骤逐条，两包并行取证、各自独立探针后汇裁）

1. **字面扫描**：两包 `TODO|FIXME|HACK|WORKAROUND|XXX` = 0 命中；`临时|先这样|暂时|绕过|workaround|hotfix` = 0 命中（与 inventory baseline 一致）。
2. **模式扫描**（HEAD 主树口径）：flux-react typeBypass 14 处（auto-renderer 3 + schema-renderer 5 + hooks 3 + render-nodes 1 + dialog-host-surface 1 + test-support-runtime 1；9 处排除 + 5 处并入立案 WA-react-009）+ setTimeout 3 处（use-debounced ×2、use-keyboard-bindings:167，全部 C 类排除）；ui typeBypass 1 处（icon-utils.ts:292，D 类排除；另发现 baseline 扫描器不识别的 `as never` 1 处——json-viewer.tsx:24，D 排除）+ domRaid 4 处（定性见 WA-ui-001/006）+ pixelNudge 1 处（navigation-menu.tsx:111，定性=死样式化石 WA-ui-007）；静默 catch、keyRemount、测试环境分支（产品代码字面级）= 0。
3. **git 考古**：全部 29 处 baseline 候选 + 全部 21 条立案执行 `git log -S`/`-L`/`--follow`，出生 commit 读数见各条目。症状性 message 判定：WA-react-004 出生 `4a5f95662`（"useHostScope disposed scope guard"——只描述修复不描述契约缺口，W1 弱化信号）、WA-ui-006 的 onKeyDown 代理出生 `a0678cf39`（"chore(lint): add jsx-a11y rules and fix all violations"——为过 lint 的动机）、WA-ui-007 出生 `b6b4f4add`（radix→base-ui bulk 迁移，无根因描述，W1 失传强信号）；其余出生 message 为功能性。
4. **重复块识别**：token 归一化探针（12 行滑窗）分别覆盖两包全量文件；flux-react 坐实 6 组（组 1/4/5 骨架含语义差异段故窗口未全中，人工逐对对照控制流证实）；ui 原始命中以包装器脚手架噪音为主（最大档 dropdown↔context 172 窗），人工复核坐实 4 组、排除 2 组假同构（上游惯例样板）。探针用后即弃，零产物落盘。
5. **门禁交叉核对**：`check:audit-suspects` / `check:audit-async-failure-paths`——flux-react 命中 20 行（非 test 15 处 catch 站点逐个定性，0 升级立案；JSON.stringify ×3 系去重键/memo 稳定化惯用形，门禁误报）；ui 命中 4 处（drawer.tsx:326,334 best-effort 排除、use-dialog-drag.ts:116 排除、json-viewer.tsx:44 升级立案即 WA-ui-005）；`check:audit-hardcoded-type-dispatch` / `check:audit-runtime-raw-schema-reads` 两包 0。无 pre-existing 登记项需升级定性。
6. **范围结构走读**：flux-react 63/63 文件全读（hooks/ 全 5 文件、auto-renderer、dialog-host 608 行全文、dialog-host-surface、bindings、container/context hooks、contexts、defaults、schema-renderer、render-nodes、node-renderer\* 六件、workbench 全 5 文件等）；ui 80/80 文件全读（toolbar 五件全读；components/ui 按行数降序 top-15——drawer 518/dialog 405/chart 399/sidebar-layout 309/icon-utils 306/dropdown-menu 286/combobox 284/menubar 275/context-menu 249/carousel 246/sidebar-menu 240/use-dialog-drag 235/field 226/calendar 224/color-picker 205——全文 + 其余 65 文件全读）。grep 抓不到的信号（流程式复制、被注释分支、顺序耦合、静默兜底、无出口兼容层）按此走读取证并逐个消账。
7. **已收敛模式 live 复核**（roadmap 基线节三档）：live 可证档 AbortController——flux-react 反应句柄的 `disposed`/`cancelled` 是 debug-state 契约字段与 ZZ Bug 1 结构化结果，非手写取消标记，**未复发**；createLazyLibLoader——两包无 echarts/ol/zxing 类重库静态 import（ui 的 recharts 经独立 `./chart` 子路径导出隔离，收口在位），**未复发**。历史教训档——surface 生命周期两份合一：**收敛在位未复发**（专项小节）；strip errors 合一 / ajax 两份合一：两包不涉（flux-react 无 strip errors 面、无 ajax 执行实现），`dataPath` 双词汇两包 0 命中（直接引用 wa-1/wa-2 结论）。
8. **误报排除复核**：汇总前逐条对照 §2 误报排除与 W1–W6，56 项排除记录见 §4（flux-react 36 + ui 20）。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记 `docs/audits/workaround-code-smell/ledger.md`
> （ID `WA-react-<seq>` / `WA-ui-<seq>`），本节与台账一一对应，零静默。
> 本报告为审计产出；批内修复由执行会话按 roadmap 契约 §2–§4 实施（见《批内修复记录》节）。

### [类别H] StrictMode 延迟 dispose 骨架 6 份跨 3 文件（WA-react-001）

- **位置**: `packages/flux-react/src/use-node-scopes.ts:62-68,70-86,88-103`（mountedRef effect + actionScope 版 + registry 版）；`packages/flux-react/src/schema-renderer.tsx:283-297`（runtime 版）、`:317-337`（actionScope 版）、`:339-356`（registry 版）；`packages/flux-react/src/render-nodes.tsx:449-478`（fragment cache entry 版）
- **严重度**: P2（≥3 份同根因按协议 P1 起评；**降档显式记录**：各份 dispose 尾部语义互异——`runtime.dispose()`/`releaseActionScope`/`registry.dispose?.()`/cache-entry 清理，骨架段才同构；当前零行为缺陷；提取为纯行为保持 → 降 P2）
- **现状**: "mountedRef + activeXxxRef 镜像 + cleanup 内 `queueMicrotask(() => { if (!mountedRef.current || activeXxxRef.current !== disposed) dispose() })`"的 StrictMode 双挂载竞态防护骨架手写 6 份，骨架段 ~12-14 行/份，总冗余 ~75 行
- **按住的根因**: React StrictMode effect 双执行 + runtime/scope/registry 所有权竞态——机制真实，骨架本身是正解；被按住的是"该骨架无共享 hook 原语"
- **违约基准**: W3（处置策略级修复需 6 处同步）、W2（无收敛登记）
- **为什么是临时方案**: 症状消失（6 处均不再双 dispose）；根因仍在（骨架 6 份人肉同步，第 7 个资源出现时最省事仍是再抄）；出口缺失（零登记）
- **风险**: 形态漂移已现——schema-renderer actionScope 版有 `if (!disposedScope) return` 冗余守卫而 registry 版没有；未来竞态修复单侧落地
- **重构方向**: 提取 `useDeferredDispose(resource, dispose)` hook（包内），6 处收敛；回归测试=现有 StrictMode 套件（surface-lifecycle-contracts 等）+ 新增"remount 窗口内不 dispose、窗口外 dispose"特征化
- **重复组**: 6 份（3 文件）；冗余 ~75 行；漂移证据：actionScope 版独有 null 守卫
- **ROI 裁定**: CX-n 拟制（包内复制沉积收敛批，非结构性）
- **误报排除复核**: 不是表状注册（每处是独立资源的同一生命周期问题）；非各自独立演化——`5b267f6f9` 同日复制链可溯

### [类别H] workbench-shell 左右面板 resize 镜像孪生 ~100 行（WA-react-002）

- **位置**: `packages/flux-react/src/workbench/workbench-shell.tsx:162-172`（双份 refs/state）、`:184-200`（commitWidth ×2）、`:210-254`（Left 四 handler）↔ `:256-301`（Right 四 handler，符号反转）、`:366-382`↔`:420-436`（collapsed rail JSX）、`:384-410`↔`:438-464`（expanded panel + resize-handle JSX）
- **严重度**: P2（双份大块、同文件、活跃修改期——2026-10-04 仍有 footer 槽提交）
- **现状**: 可拖拽双面板的指针/键盘 resize 全套逻辑与 JSX 左右镜像手写两份，仅方向符号与 data-slot 前缀不同
- **按住的根因**: 无 `ResizerSide` 参数化原语/子组件；`af3805e49`（2026-08-05，panel-resize 功能提交）一次落两份
- **违约基准**: W3（resize 语义修 bug 两处同步）、W2（无登记）
- **为什么是临时方案**: 症状消失/根因仍在（镜像复制是第 3 个可 resize 面出现时的既定路线）/出口缺失
- **风险**: 附加漂移面——`gridColsClass`（:89-106）与 wide 路径 `gridTemplateColumns`（:307-330）把 15rem/22rem/2rem 面板宽度**双编码**在两处字面里，改宽度需同步 4 处；a11y 属性两侧各一份
- **重构方向**: 提取 `createPanelResizer(side)` 或 `<ResizablePanelSlot side=...>`；宽度字面收敛为常量。回归测试：现有 workbench-shell 套件（359+ 用例含 DOM 结构断言）
- **重复组**: 2 份（同文件）；冗余 ~100 行；漂移证据：无（镜像正确）；宽度字面另双编码 ×2
- **ROI 裁定**: CX-n 拟制（包内收敛批）
- **误报排除复核**: 镜像方向反转是真实语义差异，提取时保留为参数——不构成"两机制不同不该合"

### [类别H] dialog-host DialogView/DrawerView 视觉壳残差孪生 ~70 行（WA-react-003）

- **位置**: `packages/flux-react/src/dialog-host.tsx:338-365`↔`:498-512`（handleOpenChange 核心 ~10 行）、`:389-399`↔`:542-552`（onClickCapture ~11 行）、`:419-450`↔`:572-603`（confirm-bar + header/footer JSX，探针 58 行对齐区）
- **严重度**: P2（双份大块；文件为包内最高活跃度——2026-10-09 仍有交互态批落地）
- **现状**: cq-3 已把生命周期编排收敛进 useSurfaceView（:208-288），残存的布局壳 JSX/关闭抑制/确认条仍平行两份，仅 Dialog*/Drawer* 原语与 slot 前缀不同
- **按住的根因**: 无参数化 SurfaceChromeShell；`5a8baa1ca`（2026-06-21 "E2f unify dialog/drawer surface family"）建 confirm-bar 时即双写
- **违约基准**: W3（surface 交互新增字段需两处同步，现状已如此）、W2
- **为什么是临时方案**: 症状消失/根因仍在/出口缺失（残差体量与文件活跃度达 §3 P2 阈值，不适用"收敛已完成的合理残差免立案"）
- **风险**: dialog 获得的堆叠修复（isTopmost 抑制，:351-363）天然只落 Dialog 侧，drawer 无对应物——当前是需求差异，但该分叉正是复制壳的维护成本形态
- **重构方向**: `SurfaceShell` children-as-function 或配置对象吸收三组孪生；回归=frame-slot-meta/surface-lifecycle-contracts 套件
- **重复组**: 2 份（同文件）；冗余 ~70 行；漂移证据：isTopmost 抑制单侧存在（需求差异）
- **ROI 裁定**: CX-n 拟制（包内收敛批）
- **误报排除复核**: 见专项小节——非教训复发，系收敛残差

### [类别D+A] useHostScope 跨包 scope 身份协调：id 前缀字符串约定双写 + 未登记 `__fdDisposed__` 标志（WA-react-004）

- **位置**: `packages/flux-react/src/workbench/hooks.ts:6`（DisposableScopeRef cast）、`:69-78`（`__fdDisposed__ !== true` + `id.startsWith("${path}:${scopeLabel}-host:")` 前缀匹配）；上游 `packages/flux-runtime/src/runtime-host-projection-scope.ts:58`（scopeKey 命名约定的**另一份**）、`:144`（cast 挂载 `__fdDisposed__`）
- **严重度**: P2
- **现状**: flux-react 为判断"存的 scope 是否仍是我这个 path/label 的有效宿主投影"，读取 flux-runtime 用 cast 挂上的未登记布尔标志，并用字符串前缀比对复制了 runtime 的 scopeKey 命名约定
- **按住的根因**: ScopeRef 契约无 ownership/来源/已处置自省通道。**上游在 flux-core/flux-runtime**。`4a5f95662`（2026-08-08 "useHostScope disposed scope guard (flux-react + flux-runtime)"）两包协同落此 workaround，message 只描述修复不描述契约缺口——症状性（W1 弱化信号）
- **违约基准**: W6（前缀格式是命名约定非领域常量，两包必须人肉对齐）、W4 弱（约定漂移时守卫退化为每次重建 scope 或保留已处置 scope，均静默）、W2
- **为什么是临时方案**: 症状消失（StrictMode 下正确重建）；根因仍在（契约缺口在）；出口缺失
- **风险**: runtime 改 id 方案或标志名 → flux-react 守卫静默失效
- **重构方向**: flux-core 的 ScopeRef 增加可选 `origin?: { kind, path, label, disposed }` 或导出 `isHostProjectionScope(scope, path, label)` 判别 helper 至 flux-runtime 公共面；回归=现有 workbench StrictMode 用例 + "标志改名后守卫显式失败"负断言。**公共契约变更 → 需 CX-n + 人工确认**
- **重复组**: 约定双写 2 份（跨包）；漂移证据：无（同日协同落）
- **ROI 裁定**: CX-n 拟制（跨包契约缺口收敛批；结构性，执行前人工确认）
- **误报排除复核**: 不是防御式编程的正确用法——守卫读取的是契约外通道，正确防御应建立在登记过的契约上；非 AbortController 回归（scope dispose 无 signal 语义）

### [类别D] ReactionHandle 配置通道契约缺口：双侧 cast ×12（WA-react-005）

- **位置**: 消费侧 `packages/flux-react/src/reaction-handle-proxy.ts:177-205`（activate 段 4 处 cast+可选调用）、`:220-260`（`__setXxx` ×4 同构段）；生产侧 `packages/flux-runtime/src/renderer-reaction-handle.ts:358-385`（4 处 cast 挂载 `_setBindingsProvider`/`__setScopeOverride`/`__setIgnoreWritesTo`/`__setLoadCallbacks`）
- **严重度**: P2
- **现状**: flux-react 需给反应 handle 注入 bindings provider/scope override/忽略写路径/load 回调，但公共 `ReactionHandle` 契约未声明这些通道——runtime 用 cast 把私有方法**猴补**到 handle 上，react 侧用 cast + `?.()` 可选调用消费
- **按住的根因**: **上游在 flux-core/flux-runtime**——ReactionHandle 缺配置 API。消费侧可选调用是静默失败形态：方法改名即 no-op，bindings/scopeOverride 静默丢失（W4）
- **违约基准**: W4（漂移失效不可观测）、W6 弱（下划线命名即契约）、W2
- **为什么是临时方案**: 症状消失（CRUD 场景工作）；根因仍在；出口缺失
- **风险**: 双侧 12 处 cast 人肉同步；反应在 renderer 上下文外求值的隐性错数据
- **重构方向**: flux-core ReactionHandle 增加显式 `configure({ bindingsProvider?, scopeOverride?, ignoreWritesTo?, loadCallbacks? })` 或导出 `RendererReactionHandle` 扩展接口；回归=现有 reaction-handle-proxy 21 用例 + "handle 未实现配置时显式 throw"负断言。**公共契约变更 → 需 CX-n + 人工确认**
- **重复组**: 双侧 cast 对 ×4（跨包 12 处）；出生 proxy `9be4394e9`（2026-07-08）、setter 族 `d5d3ccb50`（2026-08-04 crud audit），非症状性 message
- **ROI 裁定**: CX-n 拟制（同 WA-react-004 载体；结构性，执行前人工确认）
- **误报排除复核**: 可选调用不是"能力探测正确用法"——能力由同一仓库的 runtime 提供，属契约内应声明的能力，不是第三方宿主

### [类别H] component-handle hooks 注册骨架 3 份（WA-react-006）

- **位置**: `packages/flux-react/src/hooks/use-composite-field-handle.ts`、`use-input-component-handle.ts`、`use-surface-component-handle.ts`（各 ~60 行；NOOP_BINDINGS + bindingsRef 同步 effect + useMemo 工厂 + register effect；`// bindingsRef is a mutable holder...` eslint 注释**逐字 ×3**）
- **严重度**: P3（≥3 份 P1 起评；**降档显式记录**：wa-2 对同 plan 出生、同形状的 flux-runtime 工厂四件套判 P3 的先例直通——表状"每 handle 族一 hook"注册形，骨架 ~35 行/份，2026-07 后稳定）
- **现状**: 同一"invoke-time bindings holder + 注册/注销生命周期"骨架三份；出生即三份（`4051b4e6b`/`4252eea59`，同为 2026-06-22 "unify component:\* handle family" 计划批——**统一计划本身按件复制了三份 hook**）
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，不满足严重形态——观察项立案保零静默
- **风险**: 低；第 4 个 handle 族继续复制
- **重构方向**: 提取 `useComponentHandleRegistration(handle, registry, cid)` + `useInvokeTimeBindings(holder, fields)`；workbench 的 `useEditorComponentHandles`（plan 557）已是 editor 族的收敛点，可对齐其形。回归=现有 handle 套件
- **重复组**: 3 份（3 文件）；冗余 ~70 行；漂移证据：无（骨架+注释逐字 ×3）
- **ROI 裁定**: 挂账观察（watch-only；如 CX 承载包内收敛可顺带）
- **误报排除复核**: 各 bindings 字段清单是真实语义差异，立案对象仅为骨架与逐字注释

### [类别H] `isTemplateNode` 16 行逐字双份（WA-react-007）

- **位置**: `packages/flux-react/src/render-nodes.tsx:57-72` ↔ `packages/flux-react/src/dialog-host-surface.tsx:32-47`（diff 证实**16 行完全逐字**；flux-compiler `runtime-value-compilation.ts:46` 另有单键弱变体）
- **严重度**: P3（双份 16 行逐字、稳定 6 个月、低成本）
- **按住的根因**: **上游在 flux-core**——TemplateNode 类型住在 flux-core 但未导出结构守卫（flux-core 只导出 isSchema/isSchemaArray）；`27cbdada1`（2026-04-10）**同一 commit** 在两个文件各落一份
- **违约基准**: W3、W2
- **为什么是临时方案**: 症状消失/根因仍在（守卫无单一来源）/出口缺失
- **风险**: TemplateNode 形状扩展时两处同步
- **重构方向**: flux-core 导出 `isTemplateNode`，两处改 import。回归=现有套件（typecheck 抓残余）。**公共导出新增 → 需 CX-n + 人工确认**
- **重复组**: 2 份；冗余 16 行；漂移证据：无（逐字）
- **ROI 裁定**: CX-n 拟制（flux-core 基础原语导出批）
- **误报排除复核**: 非巧合相似——逐字 + 同 commit 出生

### [类别H] deep-equality 无共享原语（flux-react 手写第 N 份，上游 flux-core）（WA-react-008）

- **位置**: 本包实例 `packages/flux-react/src/node-source-prop-controller.ts:53-91`（`arePlainObjectsEqual`，39 行，带环保护）；全仓对照：flux-core `json-merge/diff-delta.ts:16`（私有、无环保护）、flux-renderers-industrial `serialization/equality.ts:28`+`diff.ts`、page-designer-core `tree-patch.ts:18`、report-designer-core `editor-core-adapter.ts:24`、spreadsheet-core `editor-core-adapter.ts:27` 等 ≥7 份
- **严重度**: P2（上游 flux-core 仅导出 shallowEqual/shallowEqualRecords，无 deep 原语；每包手写是"同一基础设施多处手写"的 H 类典型，repo 级热区）
- **按住的根因**: **上游在 flux-core**。`5b870f9e0`（2026-05-21 deep-audit remediation）在 flux-react 落本包副本时无原语可导
- **违约基准**: W3（repo 级）、W2
- **为什么是临时方案**: 症状消失/根因仍在（deep 相等无单一来源）/出口缺失
- **风险**: 各副本语义漂移（diff-delta 版无环保护）——超集原语可统一
- **重构方向**: flux-core `utils/object.ts` 导出环安全 `deepEqual`；各包收敛（跨批共性）。回归=环图特征化（use-node-source-props 的 cyclic-graph 契约测试已在，可直接复用为共享原语测试）。**公共导出新增 → 需 CX-n + 人工确认**
- **重复组**: 本包 1 份 + 全仓 ≥7 份对照；漂移证据：环保护有无分叉
- **ROI 裁定**: CX-n 拟制（flux-core 基础原语导出批）
- **误报排除复核**: diff-delta 版无环保护是 JSON 文档域的合理限定，不是"两机制不同"——超集原语可同时覆盖

### [类别D/W5] schema-renderer 创建失败路径：5 处 `undefined as unknown as` + 复制错位注释 + 守卫顺序洞（WA-react-009）

- **位置**: `packages/flux-react/src/schema-renderer.tsx:186,203,210,215,222`（5 处断言）、`:184,208,220`（同一条注释 "Errors routed through **import error state** — prepare failure caught in catch handler" 逐字复制到与 import 无关的 runtime/page/surface 创建 catch 上）、`:299`（`props.parentScope ?? page.scope` 在 `:466` 的 creationError 守卫**之前**解引用 page）、`:283-297` cleanup（无 creationError 守卫，`disposedRuntime.dispose()` 潜在 undefined 调用）
- **严重度**: P3（当前 flux-runtime 构造器实际不可 throw——runtime-factory 全部 throw 点是构造后闭包的不变量检查；失败路径今天不可达，故为潜伏缺陷 + 断言销毁空值流检查）
- **现状**: useMemo 返回 `undefined as unknown as RendererRuntime` 使 TS 无法强制下游判空；唯一显式守卫（:466）排在会先崩溃的 :299 之后
- **按住的根因**: 防御性 try/catch 为一个（可能）不存在的 throw 落了五连断言，且守卫洞未被任何测试覆盖（无 creation-failure 用例）
- **违约基准**: W5（这段"如果删掉会怎样"只能答"无行为变化"——死防御）、W4 弱（若未来构造可 throw，错误路径以 TypeError 而非 SchemaRootError 呈现）
- **为什么是临时方案**: **不满足"临时方案"完整三要素**，按"防御式死路径+类型绕行"立案，非按住型
- **风险**: 潜伏守卫洞；注释错位误导读者
- **重构方向**: useMemo 返回 union（`{ kind:'ok', runtime } | { kind:'error', error }`）或直接不 catch（交给 SchemaRootErrorBoundary）；删除复制错位注释。回归=新增"构造 throw → SchemaRootError 渲染"注入测试
- **重复组**: 注释错位 3 份；出生 `eb1c7ebf1`（2026-06-02）/`5e5300f4b`（2026-07-28）
- **ROI 裁定**: 挂账观察（watch-only；死防御清理候选随下次触碰 schema-renderer 顺带）
- **误报排除复核**: 不属"动态边界一次性收窄"——是同包内类型化构造结果，union 可表达

### [类别I/W5] `dispatch.__actionScope`/`__componentRegistry` 印章零生产读者（WA-react-010）

- **位置**: `packages/flux-react/src/renderer-helpers.ts:276-287`（写入）；全仓 grep 证实**无任何生产代码读取**，唯一消费者是 `__tests__/helpers.test.ts:292-296`（测试自证存在）
- **严重度**: P3
- **现状**: 深审修复批（`0fadc9a3d`，2026-05-26 "close deep audit remediation"）给 dispatch 函数盖了两个下划线印章并配了钉住测试；预期消费者从未出现（或已移除）
- **违约基准**: W5（删除可回答：删印章+测试断言，生产行为零变化）、W2
- **为什么是临时方案**: 死出口化石；测试断言的是实现细节存在性而非行为（非标准可测性设计）
- **风险**: 极低；误导读者以为存在契约消费
- **重构方向**: 删除印章与测试断言；若确有暴露需求，走 unstable.ts 的显式导出面而非函数属性。回归=更新 helpers.test.ts
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only；随下次触碰 renderer-helpers 顺带，~10 分钟）
- **误报排除复核**: 见上

### [类别H] status-path 手写 `shallowEqualSummary`（flux-core 已导出等价原语）（WA-react-011）

- **位置**: `packages/flux-react/src/status-path.ts:10-29`（20 行）↔ flux-core `utils/object.ts` `shallowEqual`（已导出，本包其他文件已在用）
- **严重度**: P3（单份、语义重合、一行替换）
- **按住的根因**: 出生即自带（`21b8171a0`，2026-05-03），非从上游复制后的漂移；对既有导出面无感知
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 极低
- **重构方向**: 改 import flux-core `shallowEqual`；回归=现有 status-path 测试（零 API 变更）
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only；~5 分钟替换候选随下次触碰顺带）
- **误报排除复核**: 非语义差异（七键浅比较与 shallowEqual 同构）

### [类别H] hook-subscriptions `subscribeToSubmitting` 组合 5 连拷贝（同文件）（WA-react-012）

- **位置**: `packages/flux-react/src/hook-subscriptions.ts:94-104,106-115,131-141,143-153,176-188`（~8 行 ×5："可选 subscribeToSubmitting 订阅 + 双清理组合"）
- **严重度**: P3（同文件表状、稳定）
- **按住的根因**: 文件内无 `subscribeWithSubmitting(store, sub, listener)` helper
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 极低；第 6 个订阅点继续复制
- **重构方向**: 文件内 helper；回归=现有套件
- **重复组**: 5 份（同文件）
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 分支间主订阅通道确实不同，立案对象仅为 submitting 组合段

### [类别H] 同文件小孪生群 7 对（watch-only 合并登记）（WA-react-013）

- **位置/内容**: ①`hooks/use-form-hooks.ts:192-215` ↔ `:81-105`（useCurrentFormState ↔ useCurrentValidationValuesSelector，~20 行 subscribe+snapshot+调用三连）；②`form-state.ts:88-96` ↔ `:230-237`（FormFieldStateSnapshot 七键构造 ×2）；③`field-frame.tsx:123-136` ↔ `:137-150`（dynamicRequired 双 selector 同体）；④`node-source-prop-controller.ts:255-264` ↔ `:266-276`（updateSnapshot/syncSnapshot 同谓词孪生）；⑤`use-node-source-props.ts:46-88` 布尔 DFS ↔ `node-source-prop-controller.ts:117-151` 收集 DFS（同遍历语义，后者有 plan 2026-09-29-4 性能登记——**已登记的性能分叉，只记 watch**）；⑥`node-renderer.tsx:38-47` ↔ `use-node-scopes.ts:4-13`（createActionScope 9 行同体）；⑦`renderer-helpers.ts:65-76` ↔ `:241-254`（10 字段输入形状双声明，探针 13 行命中）
- **严重度**: P3（每处 8-20 行、同文件/邻文件、稳定；合并登记保持零静默）
- **按住的根因**: 各文件内小工具无提取；⑤为登记过的性能分叉
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项群
- **风险**: 低；逐对缓增
- **重构方向**: 逐对文件内提取或保持（低于块级阈值的合法情形占多数）；⑤若合并须先复核性能登记
- **重复组**: 7 对；冗余 ~85 行；漂移证据：无（⑤除外，为登记分叉）
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: ⑤不属于漂移——是 plan 登记过的有意分叉

### [类别E+I] Base UI 焦点管理补偿层：手写 Tab 环游 + 初始焦点回退，4 模态面只接 2，tabbable 枚举双实现已漂移（WA-ui-001）

- **位置**: `packages/ui/src/components/ui/wrap-surface-tab-focus.ts:3-42`（FOCUSABLE_SELECTOR + offsetParent 可见性过滤），消费点 `dialog.tsx:226-229`、`drawer.tsx:192-194`；`packages/ui/src/components/ui/use-dialog-initial-focus.ts:3-71`（TABBABLE_SELECTOR + isElementVisible 祖先链），消费点 `dialog.tsx:172`。**未接线**：`sheet.tsx`、`alert-dialog.tsx`（同为 Base UI 模态面，整文件无 wrapSurfaceTabFocus；`git log -S wrapSurfaceTabFocus -- sheet.tsx` = 空，出生即未接）
- **严重度**: P2（单一上游根因的补偿层非单一来源 + 双枚举漂移 + 无升级出口；行为当前正确且测试/真机 e2e 在位，不升 P1）
- **现状**: 为压住 @base-ui/react 1.3.0 的 focus guard cycle 逃逸（C1.1 真机观察）与 FloatingFocusManager 模块级 rAF（enqueueFocus）丢焦点，手写两层 DOM 级焦点补偿
- **按住的根因**: 上游 Base UI 1.3.0 缺陷（live 依赖 `"^1.3.0"`），注释自述在案
- **违约基准**: W2（补偿层无"上游修复后移除"出口——plan-2026-08-02-2043 C1.1 已 completed，其 exit criteria 是审计卡闭环，非补偿层退出条件）、W3（同一上游缺陷的补偿 4 面只接 2；两个 plan 各落一层无收敛）
- **为什么是临时方案**: 症状消失（真机 e2e 4/4 + dialog.test）✓；根因仍在（依赖 ^1.3.0，上游缺陷未修）✓；出口缺失（无 upstream-issue/升级判据）✓ → 坐实
- **风险**: 上游升级后 4 面行为分叉难查；新增模态面继续"各接各的"；两份 tabbable 语义已分叉（offsetParent 对 fixed 自身返回 null / checkVisibility 走祖先链；两者均不含 contenteditable）
- **重构方向**: ① Sheet/AlertDialog 补接线或下沉为 Popup 级共享 hook（useSurfaceFocusWrap）；② 两份枚举合一（选择器 + 可见性判定统一）；③ 登记上游升级退出条件。行为变更 test-first；不动公共导出面（两模块均为内部模块，不在 index.ts）
- **重复组**: 2 份 ~30 行；漂移证据=可见性判定语义分叉
- **ROI 裁定**: CX-n 拟制（ui 复制沉积与补偿层收敛批）
- **误报排除复核**: 不适用 §2E"宿主集成边界受控 DOM 访问"全额豁免——DOM 访问确属自家子树受控，但按住的是外部库缺陷且无退出登记，属 I 类"转正的临时层"；非时序贿赂（双 rAF 有明确协议：越过上游 rAF 窗口后健康路径 no-op，有注释）

### [类别H] toolbar 复合件 alignment ↔ text-format 全文件孪生 + 手写 pressed 样式绕开 Button 变体表（WA-ui-002）

- **位置**: `packages/ui/src/components/toolbar/alignment-controls.tsx:13-41` ↔ `text-format-controls.tsx:13-42`（组件骨架逐字同构，仅 items 数据/union 类型不同）；`alignment-controls.tsx:32`/`text-format-controls.tsx:33` 手写 `cn(active && 'bg-accent text-accent-foreground')`；另 `clipboard-controls.tsx:25-62` 同一 8 行 Button 块 ×4 连写
- **严重度**: P3（2 份同根因 ~35 行；**降档显式记录**：§3"两份都稳定不动→可观察"——出生后仅 format/kebab-case chore 触碰）
- **现状**: 两个控件组互为复制；pressed 视觉手写，而 `button.tsx:8-12` [G1-R2-视角3-02] 明示"pressed 视觉分支收口在变体表"（ghost 已有 `aria-pressed:bg-muted`）——手写 `bg-accent` 与该集中化声明相抵（前瞻漂移面）
- **按住的根因**: "toolbar 图标按钮组"无数据驱动共享原语；`ec922c337`（2026-04-03）一次提交同落 5 件，复制定形（一次成型的复制非增量沉积）
- **违约基准**: W3（弱）、W2（无收敛登记）
- **为什么是临时方案**: 行为正确，不满足严重形态——观察项立案保零静默
- **风险**: 第三组 controls 出现时再抄；pressed 视觉与变体表漂移（accent vs muted）
- **重构方向**: 提取数据驱动 ToolbarToggleControls 或改用现有 Toggle/ToggleGroup + aria-pressed；**若收敛涉及合并/删除公共导出（四件均在 `components/toolbar/index.ts` + 主 index 导出）→ 需 CX-n/人工确认**
- **重复组**: 2 份全文件（~35 行/份，逐字级零漂移）+ clipboard 文件内 ×4 表状（~24 行）
- **ROI 裁定**: CX-n 拟制（ui 收敛批）
- **误报排除复核**: 非上游样板（shadcn 无 toolbar 组件族，此 5 件为本仓手写新件）；alignment/text-format 之外两件无 aria-pressed，不计入同组

### [类别H] 覆盖层 zIndex 装配四胞胎（Sheet/Dialog/Drawer/AlertDialog 各自手写同一 Context 装配）（WA-ui-003）

- **位置**: `sheet.tsx:10,60-73,87-103` / `dialog.tsx:38,90-111,138,185,215-224` / `drawer.tsx:37,110-130,150,182-188,205` / `alert-dialog.tsx:8,22-36,54,58-70`
- **严重度**: P3（4 份同根因按协议 P1 起评；**降档显式记录**：每份 ~10 行、逐字零漂移、`540cb8e40` 一次同型铺开、提取属纯表达改动——wa-2 builtins/array-ops/component-handle 降档先例）
- **现状**: 每文件重复"`X ZIndexContext = createContext<number|undefined>(undefined)` + Overlay useContext + Content useGlobalZIndex + Provider 包裹 + style={{zIndex}}"
- **按住的根因**: overlay 家族无共享 zIndex 装配原语（共享 OverlayZIndexContext 或 scope helper）；plan-2026-06-22-2057 M0.1 落地时按件复制
- **违约基准**: W3（弱）、W2（无收敛登记）
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 极低；第 5 个覆盖层组件继续复制
- **重构方向**: `overlay-z-index.ts` 内部共享模块（context + `<OverlayZIndexScope>`）；新增内部模块不动导出面，无需人工确认
- **重复组**: 4 份 ~40 行；漂移证据：无（逐字）
- **ROI 裁定**: CX-n 拟制（ui 收敛批）
- **误报排除复核**: 非"各文件确需独立 context 实例"——四份语义完全同一（overlay 间栈序），共享 context 正是设计目的（use-global-z-index 注释自述"multiple host roots must share the same stack"）

### [类别H+A] media-query 订阅三代并存：use-mobile（上游代）+ use-breakpoint + use-breakpoints（新代），SSR 契约已分叉（WA-ui-004）

- **位置**: `packages/ui/src/hooks/use-mobile.ts:3-30` ↔ `hooks/use-breakpoint.ts:8-38` ↔ `hooks/use-breakpoints.ts:22-52`
- **严重度**: P3（3 份同根因 P1 起评；**降档显式记录**：use-mobile 为 shadcn 上游惯例文件（上游冻结件），use-breakpoint(s) 是成对的 1-vs-n 良构实现，三份全部 live 有消费方（useIsMobile→sidebar-context+playground component-lab；useBreakpoint(s)→flux-renderers-layout responsive-renderer））
- **现状**: 同一"订阅媒体查询"基建 3 份手写；语义分叉：无 matchMedia 环境下 use-mobile 静默 `false`、新代显式 `null`（调用方显式回退）——契约相反；use-mobile onChange 重读 `window.innerWidth` 而非 `event.matches`（微漂移）
- **按住的根因**: 统一订阅原语缺位下按需各自手写；`dd68a8d4e`（plan 456）新增新代时未并 5 个月前迁移期已有的 use-mobile
- **违约基准**: W3、W2（无收敛登记）
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 低——三份稳定；matchMedia 语义修正需 3 处同步
- **重构方向**: use-mobile 内部委托 useBreakpoint('(max-width: 767px)') 并归一 null→false（导出面与布尔契约不变，sidebar 行为回归先行）；不动公共导出
- **重复组**: 3 份 ~70 行；漂移证据：SSR null/false 契约相反 + matches/innerWidth
- **ROI 裁定**: CX-n 拟制（ui 收敛批）
- **误报排除复核**: 不因"use-mobile 是上游样板"整体豁免——上游样板豁免其存在形态，但新代手写第二/三份订阅基建属 H 类信号；降档而非排除

### [类别B] json-viewer DataViewer YAML 序列化静默吞错 → 空白面板零观测（WA-ui-005）

- **位置**: `packages/ui/src/components/ui/json-viewer.tsx:41-47`（`catch { return ''; }`）
- **严重度**: P2（静默兜底无观测：守卫被触发时零日志零上报，空白 YAML 面板与"空数据"不可区分——恰是 viewer 核心调试场景）
- **现状**: `stringify(data)` 抛错返回 '' 渲染空白 `<pre>`
- **按住的根因**: 渲染路径对任意数据（`Record<string,unknown>|unknown[]`，消费方传任意 schema 数据）的序列化失败通道未定义
- **违约基准**: W4（兜底零观测）、W2（无出口；出生批 `da669de8d` 只是惰性化包装，原始 try/catch 随 `401bc1301` 而来——补观测时机已过一次而未补）
- **为什么是临时方案**: 症状消失（面板不崩）✓；根因仍在（不可序列化数据仍抛）✓；出口缺失 ✓
- **风险**: 调试视图静默失真
- **重构方向**: catch → 可观测（console.warn 或仓库结构化路由）+ 面板错误占位；回归：不可序列化值断言占位而非空白。零 API 变更，**可批内修**
- **重复组**: —
- **ROI 裁定**: 批内修（先红后绿；~15 分钟窗内）
- **误报排除复核**: 非跨信任边界显式校验（降级无观测即 §2B 掩盖定义）；非测试专用分支

### [类别E] InputGroupAddon 焦点委托 DOM 突袭：querySelector('input') 与自家 InputGroupTextarea 语义破缺（WA-ui-006）

- **位置**: `packages/ui/src/components/ui/input-group.tsx:58-69`（两处 `parentElement?.querySelector('input')?.focus()`）
- **严重度**: P2（单点行为缺陷：含 `<textarea>` 的 input-group 内 addon 点击/Enter 聚焦静默无效；`InputGroupTextarea` 与 `InputGroupInput` 同挂 `data-slot="input-group-control"` 平级契约，委托却按标签名找；另多 input 组恒命中第一个。**降档理由显式记录**：影响为 a11y 便利降级而非契约/数据失败，取 P2 不升 P1）
- **现状**: addon 是 input 的 focusable proxy（[G6-视角3-01] 登记特性），用 DOM 查询定位兄弟控件；v12f 测试只钉 tabIndex+样式类，委托行为与 textarea 配对均无测试
- **按住的根因**: InputGroup 无控件登记机制（context/ref 注册）；`a0678cf39`（2026-05-17 a11y lint sweep）落下键盘代理时选了最小 DOM 改法——同一文件内 `input-group-control` 槽位契约在位却按标签名寻址，两种寻址机制并存。出生 message 为过 lint 的动机（W1 弱信号成立）
- **违约基准**: W1（根因可指认=控件关联缺失）、W2（G6 台账只登记 focus-visible 样式项，委托行为无出口）、W3（弱）
- **为什么是临时方案**: 症状消失（lint 过、input 场景工作）；根因仍在（无登记机制）；出口缺失
- **风险**: 下一个非 `<input>` 控件槽位（自定义 combobox input 等）再静默失效
- **重构方向**: InputGroup 提供控件注册 context（或 addon 走 htmlFor/id 关联），委托改注册引用；导出面不变，行为修复 test-first（先钉 addon→textarea 现状失败用例）。**可批内修**
- **重复组**: —
- **ROI 裁定**: 批内修（先红后绿）
- **误报排除复核**: 非宿主集成边界（自家子树+自家槽位契约在位）；非上游样板（G6 特性为本仓手写）

### [类别I] navigation-menu Positioner 死规则 `before:top-[-10px]`（pixelNudge baseline 唯一命中，裁定=死样式化石）（WA-ui-007）

- **位置**: `packages/ui/src/components/ui/navigation-menu.tsx:111`
- **严重度**: P3（观察项）
- **现状**: `data-[side=bottom]:before:top-[-10px] before:right-0 before:left-0` 无 `before:absolute`、无 `before:h-*`——Tailwind before: 变体仅给 content，伪元素为 static，`top/right/left` 无效 → 该 -10px 规则渲染上不可达，悬空像素值
- **按住的根因**: 根因失传形态——`b6b4f4add`（2026-03-30 radix→base-ui 全量迁移）抄类串时目标结构已变（positioner 取代 radix 版 viewport-bridge），原对齐目标不可考
- **违约基准**: W5（"删掉会怎样"——答：零变化，化石特征成立）、W1（原始对齐目标失传）
- **为什么是临时方案**: 死样式化石；非 §2F 设计意图光学对齐（无注释、无生效前提、删除不可观测）
- **风险**: 极低；显式定性防后续审计对 baseline 唯一 pixelNudge 反复立案
- **重构方向**: 删除三枚死类（行为零变化，typecheck+视觉快照即可）；若意图是 hover-bridge 则补全 `before:absolute before:h-2.5` 并留注释——二选一需真机 hover 验证，删除分支无此依赖
- **重复组**: —
- **ROI 裁定**: 批内微修（删死类分支，随 P2 修复顺带；~5 分钟）
- **误报排除复核**: 非生效中的 nudge 补偿

### [走读立案·B 邻类] dialog 拖拽 sr-only 说明引用不存在的 i18n 键 → 屏幕阅读器朗读字面键名（WA-ui-008）

- **位置**: `packages/ui/src/components/ui/dialog.tsx:235`（`t('flux.dialog.moveDialogInstructions')`）与 `:319`（`t('flux.dialog.moveDialog')`）；`lib/i18n.ts` messages 表**无此二键**（grep 复核 rc=1），`t()` 走静默 `?? key` 兜底
- **严重度**: P2（sr-only 段落朗读 "flux.dialog.moveDialogInstructions" 已 4.5 个月；静默资源回退掩盖缺失）
- **现状**: 拖拽说明的 sr-only 文案渲染为字面键名
- **按住的根因**: `t()` 调用键与 messages 表之间无存在性校验（无测试/门禁），缺失只能靠人肉发现
- **违约基准**: W4（缺失被静默兜底）、W2（无出口）
- **为什么是临时方案**: 症状消失（渲染不崩）✓；根因仍在（键缺口+无校验机制）✓；出口缺失 ✓
- **风险**: 宿主 i18n bridge 未提供该键的宿主同样朗读键名；后续新增 t() 调用继续可能漏登记
- **重构方向**: 补两键 + 在 `lib/i18n.test.ts` 挂"组件内全部 t() 键 ∈ messages 表或宿主 getter"的存在性测试（扫描 src 下 t() 字面量即可）；零 API 变更，**可批内修**
- **重复组**: —（toolbar aria-label 英文、color-picker placeholder 等散点与 008 同根因方向，随存在性测试一并收，单独不立案）
- **ROI 裁定**: 批内修（先红后绿）
- **误报排除复核**: `?? key` 兜底本身是 i18n 惯例（排除），立案对象是**缺失键 + 无校验**的组合，非兜底机制

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID         | 位置                                                                              | 出生时间（git 考古）                                                                     | 风险                                                    | 处置               |
| --------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| WA-ui-001       | wrap-surface-tab-focus.ts ↔ use-dialog-initial-focus.ts（4 模态面只接 2）         | `5a52f4425`/`a9e2f2691`（2026-08-03）+ `6bbece7d2`（2026-09-28），两 plan 各落一层无收敛 | 上游 Base UI 缺陷补偿层无升级出口；4 面行为分叉         | CX-n               |
| WA-react-004    | workbench/hooks.ts:6,69-78 ↔ runtime-host-projection-scope.ts:58,144              | `4a5f95662`（2026-08-08，症状性 message）                                                | 跨包命名约定+未登记标志，runtime 改 id 方案即静默失效   | CX-n（人工确认门） |
| WA-react-005    | reaction-handle-proxy.ts ↔ renderer-reaction-handle.ts（双侧 cast ×12）           | `9be4394e9`（2026-07-08）→ `d5d3ccb50`（2026-08-04）                                     | 可选调用静默 no-op，bindings/scopeOverride 丢失不可观测 | CX-n（人工确认门） |
| WA-react-001    | StrictMode 延迟 dispose 骨架 6 份（use-node-scopes/schema-renderer/render-nodes） | `d1dce1e20`（2026-05-03）→ `5b267f6f9`（2026-05-17 复制扩展）                            | 竞态修复 6 处同步；actionScope 版守卫已单侧漂移         | CX-n               |
| WA-react-008    | node-source-prop-controller.ts:53-91（全仓 ≥7 份 deep-equal 对照）                | `5b870f9e0`（2026-05-21，无原语可导）                                                    | repo 级热区；环保护语义漂移                             | CX-n（人工确认门） |
| WA-ui-004       | use-mobile ↔ use-breakpoint ↔ use-breakpoints                                     | `b6b4f4add`（2026-03-30）→ `dd68a8d4e`（2026-08-17 新代未并旧代）                        | SSR null/false 契约相反                                 | CX-n               |
| WA-react-007    | render-nodes.tsx:57-72 ↔ dialog-host-surface.tsx:32-47                            | `27cbdada1`（2026-04-10 同 commit 双落）                                                 | TemplateNode 形状扩展两处同步                           | CX-n（人工确认门） |
| WA-ui-003 / 002 | zIndex 四胞胎 / toolbar 孪生                                                      | `540cb8e40`（2026-06-22）/ `ec922c337`（2026-04-03）                                     | 低（逐字零漂移）；第 5 件/第 3 组继续复制               | CX-n               |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 各份位置                                                      | 冗余行数 | 漂移证据                                          | 裁定（三问句）                                          |
| --- | ---- | ------------------------------------------------------------- | -------- | ------------------------------------------------- | ------------------------------------------------------- |
| 1   | 6    | StrictMode 延迟 dispose 骨架（WA-react-001）                  | ~75      | actionScope 版独有 null 守卫                      | 同根因✅ 已漂移✅ 提取干净✅（包内 hook）→ P2           |
| 2   | 2    | workbench 左右 resize 镜像（WA-react-002）                    | ~100     | 无（宽度字面另双编码 ×2）                         | 同根因✅ 已漂移❌ 提取干净✅（参数化 side）→ P2         |
| 3   | 2    | dialog-host 视觉壳残差（WA-react-003）                        | ~70      | isTopmost 抑制单侧存在（需求差异）                | 同根因✅ 已漂移✅ 提取干净✅ → P2                       |
| 4   | 3    | component-handle hooks 骨架（WA-react-006）                   | ~70      | 无（注释逐字 ×3）                                 | 同根因✅ 已漂移❌ 提取干净✅ → P3（表状注册降档）       |
| 5   | 4    | zIndex 装配四胞胎（WA-ui-003）                                | ~40      | 无（逐字）                                        | 同根因✅ 已漂移❌ 提取干净✅ → P3（惯用形降档）         |
| 6   | 3    | media 订阅三代（WA-ui-004）                                   | ~70      | SSR null/false 契约相反 + matches/innerWidth      | 同根因✅ 已漂移✅ 提取需回归先行 → P3（上游冻结件降档） |
| 7   | 2    | tabbable 枚举双实现（WA-ui-001 内）                           | ~30      | 可见性判定分叉（offsetParent vs checkVisibility） | 同根因✅ 已漂移✅ 合一干净✅ → P2                       |
| 8   | 2    | toolbar alignment↔text-format 全文件（WA-ui-002）             | ~35      | 无（pressed 样式漂移为前瞻面）                    | 同根因✅ 已漂移❌ 提取涉导出面 → P3                     |
| 9   | 2    | isTemplateNode（WA-react-007）                                | 16       | 无（16 行完全逐字）                               | 同根因✅ 已漂移❌ 上游导出即收敛 → P3                   |
| 10  | 5+7  | hook-subscriptions ×5 / 同文件小孪生群 ×7（WA-react-012/013） | ~125     | 无                                                | 同根因✅ 已漂移❌ 低于块级阈值居多 → P3 watch           |

### 3. Top 重构建议（默认 3 项）

1. **flux-core/flux-runtime 跨包契约缺口收敛（WA-react-004/005/007/008 合并载体）**：根因修复点 = ①ScopeRef 增 origin/处置自省通道或导出 `isHostProjectionScope`；②ReactionHandle 增显式 `configure()` 通道；③flux-core 导出 `isTemplateNode` 与环安全 `deepEqual`；预期删除本体 = useHostScope 前缀嗅探+未登记标志读取、双侧 12 处 cast、两份 isTemplateNode、本包 39 行 arePlainObjectsEqual；回归 = 各消费点特征化 + "契约漂移显式失败"负断言；影响面 = flux-core/flux-runtime 公共面（**结构性，执行前人工确认**；建议拆 CX-6 原语导出批 + CX-7 契约缺口批两个载体）。
2. **flux-react 包内复制沉积收敛批（WA-react-001/002/003）**：根因修复点 = `useDeferredDispose` hook + `createPanelResizer(side)`/`ResizablePanelSlot` + `SurfaceChromeShell`（children-as-function）；预期删除本体 = StrictMode 骨架 6 份、resize 镜像 2 份、视觉壳残差 2 份（~245 行）；回归 = StrictMode 套件 + workbench-shell 359 用例 + surface-lifecycle-contracts；影响面 = 包内零 API 变化（非结构性），test-first 先行。
3. **ui 包复制沉积与补偿层收敛批（WA-ui-001/002/003/004）**：根因修复点 = useSurfaceFocusWrap 下沉+tabbable 合一+上游升级出口登记、toolbar 数据驱动原语、overlay-z-index 共享模块、media 订阅原语归一；预期删除本体 = 双份 tabbable 枚举、toolbar 孪生、zIndex 四胞胎、media 三代（~175 行 + 补偿层收敛）；回归 = dialog/sheet/drawer/alert-dialog 焦点 e2e + sidebar 行为回归；影响面 = 包内为主，toolbar 导出合并路径涉 ask-first（需人工确认）。

### 4. 误报排除清单（56 项：flux-react 36 + ui 20）

#### flux-react（36 项）

| 疑似点                                              | 位置                                                                                                                                                                                                                                   | 排除理由（§2 误报排除/W1-W6 对照）                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| setTimeout 防抖 ×2                                  | hooks/use-debounced.ts:13,49                                                                                                                                                                                                           | C：防抖原语，delayMs 为调用方参数，unmount 清理完备；注释登记了为何不用 flux-core scheduleDebounce                                                                       |
| setTimeout chord 超时                               | use-keyboard-bindings.ts:167                                                                                                                                                                                                           | C：长按匹配协议原语，chordTimeout schema 可配置，默认 1000 注释在案，disarm 清理完备                                                                                     |
| 探针 catch ×3                                       | bindings/flux-eval.ts:83,90,96                                                                                                                                                                                                         | B：失败即建模结果（compile/create-state/evaluate-failed status 判别联合）；本文件即 cq-4 收敛产物                                                                        |
| lazy load 失败                                      | lazy-renderer-component.tsx:34                                                                                                                                                                                                         | B：error boundary 路由注释在案                                                                                                                                           |
| String(error) 回退                                  | node-error-boundary.tsx:39                                                                                                                                                                                                             | B：展示层兜底 + 路由注释，`message \|\| fallback` 终态可见                                                                                                               |
| prevention 表达式 catch                             | renderer-helpers.ts:121                                                                                                                                                                                                                | B：console.error + falsy 语义降级（wa-2 同形先例）                                                                                                                       |
| fn.call(event) catch                                | renderer-helpers.ts:187                                                                                                                                                                                                                | B：宿主事件对象信任边界，false=未阻止即设计；观察注记：此份无日志，观测弱于 :121，若后续加防回归可补 warn（不立案）                                                      |
| resolveContainerElement catch                       | container-hooks.ts:83                                                                                                                                                                                                                  | B：console.warn + null 降级，注释在案                                                                                                                                    |
| releasePointerCapture catch                         | workbench-shell.tsx:205                                                                                                                                                                                                                | B：宿主 DOM API 边界（未捕获时抛 NotFoundError），注释在案，终点即目标态                                                                                                 |
| prepareSchema catch                                 | schema-renderer.tsx:437                                                                                                                                                                                                                | B：abort/请求 ID 双闸 + reportImportFailure 结构化上报 + setPrepareError 渲染                                                                                            |
| compile catch                                       | schema-renderer.tsx:79                                                                                                                                                                                                                 | B：compileResult.error 结构化通道 + effect 上报                                                                                                                          |
| `component as unknown as`（×3）                     | auto-renderer.tsx:99,139,146                                                                                                                                                                                                           | D：注册表动态边界（function/exotic/component 三态运行时守卫前置）；:146 为 WeakMap 泛型擦除（注释登记记忆化语义）                                                        |
| `as unknown as S`（×3）                             | hooks.ts:123,124,144                                                                                                                                                                                                                   | D：ScopeRef 动态数据→泛型 S，无可检查契约                                                                                                                                |
| meta Record 断言                                    | render-nodes.tsx:260                                                                                                                                                                                                                   | D：meta 通道任意键读取                                                                                                                                                   |
| `node as unknown as RenderNodeInput`                | dialog-host-surface.tsx:111                                                                                                                                                                                                            | D：isTemplateNode/isSchema/isSchemaArray 守卫前置                                                                                                                        |
| `input.schema as any`                               | test-support-runtime.tsx:413                                                                                                                                                                                                           | D/G：测试夹具接缝                                                                                                                                                        |
| NODE_ENV ×2                                         | schema-renderer.tsx:442、node-renderer-utils.ts:74                                                                                                                                                                                     | G 排除：dev-only console.warn 噪声门控，结构化上报（reportImportFailure）独立在位                                                                                        |
| JSON.stringify ×3                                   | node-renderer-utils.ts:45（import spec 去重键）、use-form-hooks.ts:111（query memo 稳定化）、render-nodes.tsx:158（cacheKey）                                                                                                          | 门禁误报：确定性键构建/memo 稳定化，非变更检测滥用                                                                                                                       |
| latest-ref 模式 ×4                                  | node-renderer-effects.ts:20-27、use-keyboard-bindings.ts:92-95、component-handle hooks ×3、use-editor-component-handles                                                                                                                | 惯用形：闭包刷新标准法，非测试迁就                                                                                                                                       |
| `() => () => undefined` 内联订阅回退 ×6             | hooks.ts:117、dialog-host.tsx:157、dialog-host-surface.tsx:55 等                                                                                                                                                                       | micro-idiom（已有 emptyUnsubscribe 命名版）；不立案                                                                                                                      |
| prop→region 回退三连                                | node-frame-wrapper.tsx:29-44                                                                                                                                                                                                           | 表状惯用形，每处 3 行                                                                                                                                                    |
| providerWrap kind 分发 + cast ×3                    | node-renderer-providers.tsx:44-83                                                                                                                                                                                                      | 编译计划（providerPlan）驱动的动态边界；观察注记：providerPlan/providerWrap 经 cast 读取、契约未声明，与 WA-react-005 同形但为编译产物内部面，如后续审计可复查是否入契约 |
| `__fdDisposed__` 作 Abort 回归                      | workbench/hooks.ts:6                                                                                                                                                                                                                   | 不是 cancelled-flag 回归——scope dispose 无 signal 语义，已按契约缺口立案 WA-react-004                                                                                    |
| `disposed`/`cancelled` 命中                         | reaction-handle-proxy.ts:31,77,211                                                                                                                                                                                                     | debug-state 契约字段 + ZZ Bug 1 结构化结果，非手写取消标记                                                                                                               |
| fragment 版本 state+ref 双记账                      | render-nodes.tsx:331-356                                                                                                                                                                                                               | React 提交两阶段的结构性复杂度，非按住（走读记录）                                                                                                                       |
| importBindingsScope effect-body+cleanup 双段处置    | node-renderer.tsx:202-224                                                                                                                                                                                                              | 顺序耦合经逐行核对自洽（cleanup 先清 ref 防 double-dispose）；记录不立案                                                                                                 |
| test-support env ↔ defaults.ts fetcher 孪生         | test-support-core.tsx:28-33 ↔ defaults.ts:16-25                                                                                                                                                                                        | 测试夹具 vs 产品默认，双份稳定                                                                                                                                           |
| createScope ↔ createPrivateEvalScope                | test-support-runtime.tsx:367-390 ↔ flux-eval.ts:21-41                                                                                                                                                                                  | 夹具 vs 产品，非同根因                                                                                                                                                   |
| optionRowBindingEquals ↔ shallowEqualArrays         | option-row.ts:62-68 ↔ hook-subscriptions.ts:28-35                                                                                                                                                                                      | 6 行 ×2 低于块级阈值                                                                                                                                                     |
| getInputNodeInstance ↔ render-fragment-element 内联 | render-nodes.tsx:553-557 ↔ render-fragment-element.tsx:14-17                                                                                                                                                                           | 5 行 ×2 低于阈值                                                                                                                                                         |
| strictMode unrecognized-input warn+null ×2          | render-nodes.tsx:203-207,230-234                                                                                                                                                                                                       | B：strict 观测/lenient 静默即 continueOnError 设计；信任边界                                                                                                             |
| I 类注释群                                          | dialog-host.ts:43（Plan 552）、use-node-source-props.ts:27-45（plan 2026-09-28-6/2026-09-29-4）、defaults.ts:17-20（obs-1）、unstable.ts:1-5（AUDIT-05）、reaction-handle-proxy.ts:31（ZZ Bug 1）、auto-renderer.tsx:38-43（登记豁免） | 带编号登记出口，说明性注释非待办                                                                                                                                         |
| useContainerDomRegistration 无 deps useLayoutEffect | container-hooks.ts:30-66                                                                                                                                                                                                               | 每 render 运行 + registeredRef 三元去重，ref 不进 deps 的合法形                                                                                                          |
| createIdleSourcePropController                      | use-node-source-props.ts:12-21                                                                                                                                                                                                         | null-object 模式                                                                                                                                                         |
| `__forTests` 类注入                                 | 本包 0 命中                                                                                                                                                                                                                            | —                                                                                                                                                                        |
| isEditableKeyboardTarget tagName 字符串             | keyboard.ts:111-123                                                                                                                                                                                                                    | 领域常量（HTML 可编辑元素协议集），W6 满足                                                                                                                               |

#### ui（20 项）

| #   | 疑似点                                            | 位置                                                                                                               | 排除理由（W 对照）                                                                                                                        |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Circle as unknown as LucideIconComponent`        | icon-utils.ts:292                                                                                                  | D：schema 驱动图标注册表动态边界一次性收窄，`?? Circle` 回退在位；出生 `b3090b0a5` 功能提交（W6 满足；更优解=用 lucide 导出类型，风格级） |
| 2   | `shouldExpandNode as never`                       | json-viewer.tsx:24                                                                                                 | D：第三方回调签名宽化一次性收窄；`401bc1301` 功能提交                                                                                     |
| 3   | 两处 pointer-capture catch ignore                 | drawer.tsx:326,334                                                                                                 | B：best-effort 注释在位，失败零后果（window 监听兜底）                                                                                    |
| 4   | `catch { void 0 }`                                | use-dialog-drag.ts:116                                                                                             | B：releasePointerCapture NotFoundError 常规竞态，teardown 零后果（对照 drawer 版补了注释——观察级瑕疵）                                    |
| 5   | `ml-[-0.3rem]` 负 margin                          | input-group.tsx:32-33                                                                                              | F：shadcn 上游 InputGroupAddon 惯例（抵消按钮内建 padding 的设计意图间距）                                                                |
| 6   | translate-[±2.5rem]/[±50%]                        | sheet.tsx:98、navigation-menu.tsx:85                                                                               | F：Base UI data-starting/ending-style 滑入动画距离                                                                                        |
| 7   | `after:bottom-[-5px]`/`after:-right-1`            | tabs.tsx:63                                                                                                        | F：line 变体指示线伸入 list padding 的设计意图（审计提示词 §1.5 tabs 先例同源，上游 line-indicator 惯例）                                 |
| 8   | arrow translate-y-[calc(-50%-2px)]                | tooltip.tsx:52                                                                                                     | F：Base UI Arrow 定位惯例                                                                                                                 |
| 9   | rAF 延迟一帧                                      | carousel.tsx:105、use-breakpoint.ts:29、use-breakpoints.ts:43                                                      | C：避免 effect 体内同步 setState（react-compiler lint），注释在位，非等待他系统                                                           |
| 10  | 双 rAF                                            | use-dialog-initial-focus.ts:60-64                                                                                  | C：协议明示排除类（等待上游 rAF 调度窗口过后测量），健康路径 no-op；并入 WA-ui-001                                                        |
| 11  | TOASTER_Z_INDEX=10000                             | sonner.tsx:12                                                                                                      | 语义常量：toasts 位于 z-index 波段（2000+）之上，导出常量                                                                                 |
| 12  | setGlobalZIndex test-only                         | use-global-z-index.ts:49                                                                                           | G：标准可测性设计，注释 "Production code MUST NOT call this"                                                                              |
| 13  | document.cookie 直写                              | sidebar-context.tsx:63                                                                                             | shadcn 上游 sidebar 惯例，eslint-disable+注释                                                                                             |
| 14  | 菜单族类串 5 份互同                               | dropdown-menu/context-menu/menubar                                                                                 | H 排除：上游文件结构本身如此（R5）；漂移注记挂 watch                                                                                      |
| 15  | 包装器脚手架互同档                                | card/item/empty/field/avatar/alert-dialog 等                                                                       | 探针噪音（归一化假同构），非逻辑复制                                                                                                      |
| 16  | drawer 内联 clamp vs clampDrawerResizeSize helper | drawer.tsx:378 ↔ :283-285                                                                                          | <10 行同文件微复制，观察不立案                                                                                                            |
| 17  | 覆盖层动画双代并存                                | data-open:animate-in 系（9 文件）vs data-starting/ending-style 系（sheet/drawer/navigation-menu；drawer 两套混用） | 结构债注记：视觉行为均正确无症状，不立案，挂 watch（下次触碰 overlay 家族时统一）                                                         |
| 18  | i18n 硬编码英文/中文散点                          | toolbar aria-label 英文、color-picker placeholder                                                                  | 与 WA-ui-008 同根因方向（i18n 契约无校验），随 008 的存在性测试一并收，单独不立案                                                         |
| 19  | sidebar-menu Math.random 骨架宽                   | sidebar-menu.tsx:161                                                                                               | shadcn 上游惯例（mount 期随机宽度），非 key 强刷                                                                                          |
| 20  | Header role="toolbar"+eslint-disable              | dialog.tsx:298-313                                                                                                 | a11y 设计意图（AMIS parity），注释在位                                                                                                    |

### 5. 范围整体判断

**零星个案叠加两个包内复制热区与两条跨包契约 workaround，不是系统性临时方案文化。** React 渲染层与 UI 库的字面临时标记为零、根因失传仅 1 项半（WA-ui-007 死样式化石）、错误路由纪律严格（flux-react 15 处 catch 全部有观测或结构化建模；ui 4 处门禁命中 3 排除 1 立案）、登记出口文化良好（ui 包 G6/UI-review/plan 链为全仓已审计批次中最好）。沉积集中在两维：**包内复制**（flux-react StrictMode 骨架 ×6 / workbench resize 镜像 / dialog-host 壳残差；ui zIndex 四胞胎 / toolbar 孪生 / media 三代 / tabbable 双枚举）与**跨包契约缺口**（WA-react-004/005——仅有的"按住"型发现，出口都在 flux-core/flux-runtime 契约层）。与 wa-1/wa-2 结论同构：该仓库的问题形态不是"用临时方案换进度"，而是"机制落地时不提取共享原语，事后也无收敛登记"。ui 另发现 2 条单点行为缺陷（yaml 静默吞错、i18n 键缺失）+1 条 a11y 委托缺陷（input-group），均批内修。无 P0/P1 级行为缺陷；批内修 3+1 项，结构性收敛归 CX-6..9，处置时机 WA-16 收口前，不阻断后续批次线性审计。

## 批内修复记录（Auto-Remediation）

> roadmap 自动修复契约 §2–§4：P0/P1 单点行为缺陷先红后绿修复；P2 低成本（约 15 分钟内）当场修；
> 结构性/跨批共性发现一律不批内硬修，以 CX-n 拟制独立修改计划。每项修复验证临时方案本体已删除。

| 发现 ID      | 严重度 | 修复方式（fix/CX-n/watch-only/…）                                                                                | 回归测试（先红后绿证据）                                                                                                                                                                  | 本体删除验证                                                      | commit          |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| WA-react-001 | P2     | CX-n（包内复制沉积收敛批）                                                                                       | 归 CX-8 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-002 | P2     | CX-n（同上）                                                                                                     | 归 CX-8 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-003 | P2     | CX-n（同上）                                                                                                     | 归 CX-8 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-004 | P2     | CX-n（跨包契约缺口批；结构性→执行前人工确认）                                                                    | 归 CX-7 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-005 | P2     | CX-n（同上）                                                                                                     | 归 CX-7 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-006 | P3     | watch-only（降档显式记录）                                                                                       | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-react-007 | P3     | CX-n（flux-core 原语导出批；公共导出新增→人工确认）                                                              | 归 CX-6 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-008 | P2     | CX-n（同上）                                                                                                     | 归 CX-6 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-react-009 | P3     | watch-only（死防御清理候选随下次触碰）                                                                           | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-react-010 | P3     | watch-only（~10 分钟清理候选随下次触碰）                                                                         | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-react-011 | P3     | watch-only（~5 分钟替换候选随下次触碰）                                                                          | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-react-012 | P3     | watch-only                                                                                                       | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-react-013 | P3     | watch-only（⑤为登记性能分叉）                                                                                    | —                                                                                                                                                                                         | —                                                                 | —               |
| WA-ui-001    | P2     | CX-n（ui 收敛批）                                                                                                | 归 CX-9 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-ui-002    | P3     | CX-n（同上；导出合并路径需人工确认）                                                                             | 归 CX-9 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-ui-003    | P3     | CX-n（同上）                                                                                                     | 归 CX-9 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-ui-004    | P3     | CX-n（同上）                                                                                                     | 归 CX-9 plan                                                                                                                                                                              | —                                                                 | —               |
| WA-ui-005    | P2     | 批内修（safeYaml 判别联合 + console.warn + 错误占位 t('flux.jsonViewer.yamlError')）                             | 红→绿 2/2：Symbol 值触发序列化抛错，占位缺失先红（可序列化路径同套钉住）→ 修复后 2/2 绿（json-viewer-yaml-error.test.ts 新增）                                                            | catch{return ''} 删除验证；类别清扫无兄弟                         | 本批收口 commit |
| WA-ui-006    | P2     | 批内修（InputGroupControlsContext 控件注册机制 + 槽位契约回退，替代标签名嗅探）                                  | 红→绿 7/7：3 条 textarea 用例先红（click/Enter/Space 委托静默失效）+ 4 条钉住现状（input 委托/raw 回退/首个控制/button 不抢焦点）→ 修复后 7/7 绿（input-group-addon-focus.test.tsx 新增） | querySelector('input') 本体删除验证；类别清扫 ui 全包标签名寻址=0 | 本批收口 commit |
| WA-ui-007    | P3     | 批内微修（删三枚死 before: 类，W5 零行为分支）                                                                   | 无行为面（W5 实证：伪元素 static 类无效）；现有套件全绿                                                                                                                                   | grep 残留=0                                                       | 本批收口 commit |
| WA-ui-008    | P2     | 批内修（补 flux.dialog.moveDialog/moveDialogInstructions 两键 + 新增 i18n-keys.test.ts 全 src t() 键存在性守卫） | 红→绿：存在性测试先红（全 src 扫描恰好只缺立案的 2 键——守卫覆盖面实证）→ 补键后绿                                                                                                         | 缺键状态消除（守卫测试长期在位）                                  | 本批收口 commit |

共性裁定：CX-6（flux-core 基础原语导出批：isTemplateNode + 环安全 deepEqual，WA-react-007/008）、CX-7（React 运行时跨包契约缺口收敛批：ScopeRef 自省 + ReactionHandle 配置通道，WA-react-004/005）、CX-8（flux-react 包内复制沉积收敛批：StrictMode 骨架/resize 镜像/视觉壳残差，WA-react-001/002/003）、CX-9（ui 包复制沉积与补偿层收敛批：焦点补偿层/toolbar/zIndex/media，WA-ui-001/002/003/004）已插入 roadmap Phase Status（CX-5 与 WA-16 之间）。CX-6/CX-7 涉公共面（执行前人工确认门）；CX-8/CX-9 非结构性（CX-9 内 toolbar 导出合并路径除外）。

- **closure audit R1 approved**（独立 fresh 子 agent agent_c6218731-3193-4d95-bf96-55ba22640e6f，0B/0M/4m 随收口修正）：审计员独立实跑 ui 254/254、flux-i18n 30/30、check-i18n-keys zh/en 1792/1792 parity、下游消费者套件（barcode-input 136 / command-palette 33 / json-view 7）全绿、reconcile 逐字吻合、index.ts 零变更机器判定；input-group 注册机制四项质量红线逐项核验。

## 批内修复 filter 门禁

- ui 包四门禁：typecheck ✓ / build ✓ / lint ✓ / test **254/254**（56 文件，含新增 3 测试文件 10 用例）。
- flux-react 零代码改动（13 条发现全部 watch-only/CX-n 去向），filter 门禁不适用；全量门禁见 plan Closure Gates。

## 台账回写核对

- 本批新增 findings：21 条（WA-react-001…013、WA-ui-001…008）；批内修 4 条翻转 fixed（fixed→verified 归 closure 复检后决定）
- modules 行翻转 audited：flux-react、ui
- `pnpm workaround:reconcile` 输出摘录（收口终态）：modules 49 total / audited 7 / uncovered 42 / orphan 0；findings 38 total = pending 0 + found 32 + fixed 0 + verified 6（WA-ui-005/006/007/008 于 closure audit 通过后 fixed→verified）；dispositions watch-only 12 / successor-required 20 / withdrawn 0 / n-a 0；未处置 0（pending 0 + found-without-disposition 0）；violations 0（uncovered 42 为未执行批次，WA-16 关闭前置为归零）
- **保护区核验**：`git diff --exit-code packages/ui/src/index.ts` 通过——本批零公共导出面变更（builtinMessages 为 lib/i18n.ts 模块级导出，仅供同包测试消费，不经 index.ts 再导出）

## 附：台账行草稿（供执行会话回写 `docs/audits/workaround-code-smell/ledger.md`，status 一律 pending）

| id           | module     | category | severity | location                                                                                               | status  | disposition | note                                                                                                                                        |
| ------------ | ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| WA-react-001 | flux-react | H        | P2       | use-node-scopes.ts:62-103 / schema-renderer.tsx:283-356 / render-nodes.tsx:449-478                     | pending | CX-n        | StrictMode 延迟 dispose 骨架 6 份 ~75 行（d1dce1e20→5b267f6f9 复制）；actionScope 版守卫已单侧漂移；提取 useDeferredDispose；successor=CX-8 |
| WA-react-002 | flux-react | H        | P2       | workbench/workbench-shell.tsx:162-301,366-464（+宽度字面 :89-106,:307-330 双编码）                     | pending | CX-n        | 左右 resize 镜像 ~100 行（af3805e49 一次落两份）；提取 createPanelResizer(side)；successor=CX-8                                             |
| WA-react-003 | flux-react | H        | P2       | dialog-host.tsx:338-365,498-512 / :389-399,542-552 / :419-450,572-603                                  | pending | CX-n        | DialogView/DrawerView 视觉壳残差 ~70 行（5a8baa1ca 双写）；cq-3 生命周期已收敛、此为残差；successor=CX-8                                    |
| WA-react-004 | flux-react | D+A      | P2       | workbench/hooks.ts:6,69-78 ↔ flux-runtime/runtime-host-projection-scope.ts:58,144                      | pending | CX-n        | ScopeRef 无来源/处置自省通道→前缀约定双写+未登记 **fdDisposed**（4a5f95662 症状性 message）；公共契约→人工确认；successor=CX-7              |
| WA-react-005 | flux-react | D        | P2       | reaction-handle-proxy.ts:177-260 ↔ flux-runtime/renderer-reaction-handle.ts:358-385                    | pending | CX-n        | ReactionHandle 缺配置 API→双侧 cast ×12 猴补+可选调用（W4 静默 no-op）；公共契约→人工确认；successor=CX-7                                   |
| WA-react-006 | flux-react | H        | P3       | hooks/use-{composite-field,input-component,surface-component}-handle.ts                                | pending | watch-only  | handle hooks 注册骨架 3 份 ~70 行+注释逐字 ×3（统一计划批内按件复制）；降档显式记录                                                         |
| WA-react-007 | flux-react | H        | P3       | render-nodes.tsx:57-72 ↔ dialog-host-surface.tsx:32-47                                                 | pending | CX-n        | isTemplateNode 16 行完全逐字（27cbdada1 同 commit 双落）；上游 flux-core 导出即收敛；successor=CX-6                                         |
| WA-react-008 | flux-react | H        | P2       | node-source-prop-controller.ts:53-91（全仓 ≥7 份 deep-equal 对照）                                     | pending | CX-n        | deep-equality 无共享原语（5b870f9e0 时无原语可导）；flux-core 导出环安全 deepEqual；successor=CX-6                                          |
| WA-react-009 | flux-react | D/W5     | P3       | schema-renderer.tsx:183-222,283-297,299,466                                                            | pending | watch-only  | 创建失败死防御 5 断言+注释错位 3 份+守卫顺序洞（当前构造不可 throw，潜伏）；非按住型                                                        |
| WA-react-010 | flux-react | I/W5     | P3       | renderer-helpers.ts:276-287                                                                            | pending | watch-only  | dispatch.**actionScope/**componentRegistry 印章零生产读者（0fadc9a3d 死出口）；删除零行为变化                                               |
| WA-react-011 | flux-react | H        | P3       | status-path.ts:10-29                                                                                   | pending | watch-only  | 手写 shallowEqualSummary 20 行，flux-core shallowEqual 已导出；~5 分钟替换候选随下次触碰                                                    |
| WA-react-012 | flux-react | H        | P3       | hook-subscriptions.ts:94-188 五段                                                                      | pending | watch-only  | subscribeToSubmitting 组合 5 连拷贝（同文件表状）                                                                                           |
| WA-react-013 | flux-react | H        | P3       | 7 对同文件/邻文件小孪生（位置清单见报告）                                                              | pending | watch-only  | 合并登记；⑤为 plan 2026-09-29-4 登记的性能分叉非漂移                                                                                        |
| WA-ui-001    | ui         | E+I      | P2       | wrap-surface-tab-focus.ts ↔ use-dialog-initial-focus.ts；消费点 dialog/drawer；sheet/alert-dialog 未接 | pending | CX-n        | Base UI 1.3.0 焦点缺陷补偿层无升级出口+4 模态面只接 2+tabbable 双枚举已漂移；successor=CX-9                                                 |
| WA-ui-002    | ui         | H        | P3       | toolbar/alignment-controls.tsx ↔ text-format-controls.tsx（+clipboard ×4）                             | pending | CX-n        | toolbar 孪生 ~35 行零漂移+pressed 手写绕开变体表（ec922c337）；导出合并路径需人工确认；successor=CX-9                                       |
| WA-ui-003    | ui         | H        | P3       | sheet/dialog/drawer/alert-dialog 四文件 zIndex 装配                                                    | pending | CX-n        | zIndex 四胞胎 ~40 行逐字（540cb8e40）；提取 overlay-z-index 内部模块；successor=CX-9                                                        |
| WA-ui-004    | ui         | H+A      | P3       | hooks/use-mobile.ts ↔ use-breakpoint.ts ↔ use-breakpoints.ts                                           | pending | CX-n        | media 订阅三代 ~70 行；SSR null/false 契约相反；successor=CX-9                                                                              |
| WA-ui-005    | ui         | B        | P2       | components/ui/json-viewer.tsx:41-47                                                                    | pending | 批内修      | YAML 序列化 catch 静默吞错→空白面板零观测（W4）；修=可观测+错误占位                                                                         |
| WA-ui-006    | ui         | E        | P2       | components/ui/input-group.tsx:58-69                                                                    | pending | 批内修      | InputGroupAddon 焦点委托 querySelector('input')（a0678cf39 为过 lint）；textarea 配对静默失效；修=控件注册机制                              |
| WA-ui-007    | ui         | I        | P3       | components/ui/navigation-menu.tsx:111                                                                  | pending | 批内修      | 死样式化石（b6b4f4add 迁移遗留，根因半失传）；删三枚死类零行为变化（W5 实证）                                                               |
| WA-ui-008    | ui         | B 邻类   | P2       | components/ui/dialog.tsx:235,319 ↔ lib/i18n.ts（缺键）                                                 | pending | 批内修      | sr-only 拖拽说明引用不存在 i18n 键 4.5 个月（0fadc9a3d 补深审时未随行）；修=补键+存在性测试                                                 |
