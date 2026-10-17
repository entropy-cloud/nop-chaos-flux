# 585 CX-7 共性重构：React 运行时跨包契约缺口收敛批（ScopeRef 自省通道 + ReactionHandle 显式 configure）

> Plan Status: completed
> Last Reviewed: 2026-10-13
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-7 条目（WA-3 批立案 WA-react-004/005 两条"按住"型，台账 91/92 行 successor-required→本批）；先例：plan 579-584
> Related: `docs/architecture/renderer-runtime.md`、`docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

终结两条跨包"按住"型契约缺口：①ScopeRef 无来源/处置自省通道——flux-react useHostScope 用 id 前缀字符串约定双写+读取 flux-runtime cast 挂载的未登记 `__fdDisposed__` 标志（4a5f95662 症状性 message，runtime 改 id 方案即静默失效）；②ReactionHandle 缺配置 API——flux-runtime 猴补 `_setBindingsProvider`/`__setScopeOverride`/`__setIgnoreWritesTo`/`__setLoadCallbacks` 四通道、react 侧 cast+可选调用消费（双侧 12 处 cast，方法改名即静默 no-op，W4）。

## Current Baseline（拟制时 HEAD `51b2bd352` 实测）

- **WA-react-004 位点**：flux-react workbench/hooks.ts:6,69-78（三\_clause 守卫：`__fdDisposed__ !== true && parent === parentScope && id.startsWith(prefix)`）↔ flux-runtime runtime-host-projection-scope.ts:44-46（接口）/:62（scopeKey=`${path}:${scopeLabel}-host`）/:144（cast 挂载）[m1 行号勘误]；disposed 同步置位已核（:142-145 dispose 内闭包同步置位→契约化同一存储字段即等价）。
- **WA-react-005 位点**：flux-react reaction-handle-proxy.ts:177-260 ↔ flux-runtime renderer-reaction-handle.ts:358-385；cast 计数=runtime 4+proxy 8=12 + crud 本地接口 1+调用点 9[m2 补计]；runtime `__tests__/renderer-reaction-handle.test.ts:362-410` 自身 cast 消费 `_setBindingsProvider` 须同批迁移。
- **修复方向裁定（draft review R1 修正）**：①**择 roadmap ②变体**：flux-runtime 面正式化——`HostProjectionScopeRef` 接口（index.ts:2 已 type 导出）增 origin/disposed 类型成员+flux-runtime 值导出 `isHostProjectionScope(value, origin: { path, scopeLabel })`；**flux-core ScopeRef 零改动（显式禁令——types/scope.ts 并行在途，禁止本批增 origin/disposed/dispose）**。②configure 落 **flux-core types/renderer-core.ts:207 ReactionHandle**（B2：类型唯一定义位在 flux-core——三条消费链全部经 flux-core 类型；落 flux-runtime 侧则 crud 侧必须继续 cast=W4 存活）+新导出 `ReactionHandleConfigureOptions`。
- **B1（draft review 逮出审计漏计的第四消费点）**：`packages/flux-renderers-data/src/crud-renderer-load.ts:191-201` 本地 cast 接口声明四通道+调用点 :208/:220/:235/:260/:262+cleanup :332-335 四置 undefined——**入 scope**：删本地 cast 改 `loadReaction.configure({...})` 直调，保持现调用次序与 present-undefined 清除语义；crud-loadaction-\* 六个既有测试=安全网。
- **configure 时序裁定（draft review 交付）**：四通道均为纯赋值延迟读取、通道间零次序约束——**configure 可多次调用部分配置（per-key present 语义）**：present key ≙ 一次对应 setter；判定用 `'key in config'`（区分未提供与提供 undefined）；present-undefined=清除（crud cleanup 依赖）；数组整体替换不合并；单次全配置=多次调用特例。配套语义钉 4 条（激活前缓存→激活后生效/激活后 live 即时生效/present-undefined 清除/多次部分调用叠加=全量等效）。
- **语义张力点裁定（draft review R1）**：①disposed=同步置位（:142-145 已核）→契约化同一存储字段等价；②configure per-key present 语义（见修复方向裁定）；③旧猴补通道删除不留 deprecated 壳——**B1 修正：第三方消费真实存在（crud-renderer-load.ts）入批同改**；④:145 inner dispose cast 保留不动（m4）。
- **在途**（M2 补全）：flux-core types/scope.ts+flux-runtime 3+**flux-renderers-data 4[crud-renderer.tsx/state/ownership/state.unit.test——与 B1 新增的 crud-renderer-load.ts 同包同子系统（语义冲突风险非文本冲突），执行前 re-run git status 复核]**+form 3+layout 3 共 14 文件；提交严格限定本批路径。
- **:145 inner dispose cast 保留不动**（m4：`(hostScope as ScopeRef & { dispose? })?.()` 属 intra-runtime 防御调用非嗅探非猴补——禁止执行者为消它把 dispose 塞进 flux-core ScopeRef[撞在途文件+接口污染]）。
- **授权链（执行前人工确认门处置）**：包间公共契约变更（roadmap CX-7 显式标记）；**显式确认记录**（与 plan 580-584 同链）：时间=2026-10-12（会话期间下发并持续有效）；渠道=用户会话指令（goal）；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；单项可撤回（提交可逆）。
- **公开面影响（M3 实测改写）**：flux-core ReactionHandle.configure 新增+ReactionHandleConfigureOptions type 导出（index +1 type 行）；flux-runtime HostProjectionScopeRef 成员扩展（type 导出已在）+isHostProjectionScope 值导出新增（:2 邻位）；flux-react 零变更（useHostScope 签名不变；reaction-handle-proxy 非公共导出）；flux-react 已依赖 flux-runtime（package.json:28）零 package.json 变更。

## Goals

- flux-core：ReactionHandle.configure(options: ReactionHandleConfigureOptions)（per-key present 语义）+type 导出。
- flux-runtime：HostProjectionScopeRef 增 origin/disposed 类型成员+isHostProjectionScope 值导出（签名 `(value: unknown, origin: { path: string; scopeLabel: string }): value is HostProjectionScopeRef`——格式约定收拢回 runtime 单侧）；四猴补删除改 configure 原生实现。
- flux-react：useHostScope 改 `isHostProjectionScope(current, { path, scopeLabel }) && !current.disposed && current.parent === parentScope`（三\_clause 严格同构）；reaction-handle-proxy 改 configure 直调（pre-activation 缓存合并+post-activation live-forward，与现真值门控可观测一致）。
- flux-renderers-data：crud-renderer-load.ts 删本地 cast 改 configure 直调（现调用次序+present-undefined 清除保持）。
- 台账 WA-react-004/005 `found → fixed → verified`（closure 后）；roadmap CX-7 `todo → planned → done`。
- 两包 filter 门禁+双哨兵+隔离五门禁全绿；flux-react index 零变更。

## Non-Goals

- ScopeRef/ReactionHandle 其他成员的契约化；第三方宿主兼容层（仓内 grep 无第三方消费后删旧通道，不留 deprecated）。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-core.ts`（ReactionHandle+configure+ReactionHandleConfigureOptions）+flux-core index（type 导出 +1）
- `packages/flux-runtime/src/runtime-host-projection-scope.ts`、`renderer-reaction-handle.ts`（+index 值导出 isHostProjectionScope +1）
- `packages/flux-react/src/workbench/hooks.ts`、`reaction-handle-proxy.ts`
- `packages/flux-renderers-data/src/crud-renderer-load.ts`（B1：删本地 cast 改 configure 直调）
- flux-runtime `__tests__/renderer-reaction-handle.test.ts`（\_setBindingsProvider cast 消费迁移到 configure[m2]）
- 判别/特征化测试（含 reaction-handle-proxy 缓存/激活转发/清理时序新钉[m2]）；ledger/roadmap/dev log；`docs/architecture/renderer-runtime.md`（主同步节 :862-894+:235+:98 邻域）

### Out Of Scope

- 并行在途文件；其他 ScopeRef/ReactionHandle 成员。

## Failure Paths

不适用（契约正式化，无新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**。特征化先钉（现 id 前缀+cast 行为的正负例/四通道时序行为）→契约落地→套件同绿+新契约判别测试（isHostProjectionScope 正负例/configure 四语义/disposed 时机）；两包 filter 四门禁+双哨兵（ai+react——react 为本包本体，哨兵=ai）+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住与契约落地

Status: done（2026-10-13：实施派驻 agent agent_bd6a8457 执行——特征化先钉[react 8 钉 hooks 三_clause+proxy 四通道时序/runtime r13-r16 通道钉+crud-loadaction 六安全网直通]→四包落地→全部 exit 0[core 697/runtime 1536+1/react 570/data 1217]+ai 850；动态判别 2 组恰红→恢复[删 disposed 置位恰 2 红/key in→真值判定恰 1 红=present-undefined 清除钉]；执行期仓规拆分=types/renderer-reaction-handle-types.ts 新文件[renderer-core.ts 457→510 触发新 WARN 按规约拆，export * 回流公开面零变化]+runtime 测试拆 fixtures/configure 两件[原 528→394 行消 WARN]；:145 cast 原样保留[m4]）
Targets: flux-runtime + flux-react

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（useHostScope 现判定行为正负例/四通道现时序行为钉）重构前后同绿。
- [x] Fix：①HostProjectionScopeRef 契约+isHostProjectionScope+disposed 成员 ②ReactionHandle.configure+四猴补删除 ③react 两文件消费改写。
- [x] Proof：两包 filter 四门禁+双哨兵+flux-react index 零变更。

Exit Criteria:

- [x] 特征化前后同绿；四通道时序逐一对位核验在案。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账 WA-react-004/005 fixed→verified 翻转[终读 220=81+0+139]；closure audit R1 approved[agent_adb1e187，0B/0M/3m：m1 简报算式勘误/m2 两树读数口径注记/m3 门回填即闭合]；roadmap CX-7 done）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账 WA-react-004/005 `found → fixed → verified`（closure 后）；roadmap CX-7 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_06d0ea02-cc85-49bc-bbd9-42a0bf38175d，review-only）
- Verdict: `FAIL`（2B/3M/4m）→ 全修转 active（configure per-key 语义与 ScopeRef 零改动禁令=审查员两项核心裁定交付）
- Rounds: 1
- Findings addressed: **B1** 审计漏计的第四消费点 crud-renderer-load.ts 真实存在（:191-201 cast+:208-262 调用+:332-335 cleanup——按原稿执行即 TS 照常编译九处静默 no-op=W4 形态精确复现）→入 scope+crud-loadaction 六测试=安全网；**B2** ReactionHandle 类型唯一定义位在 flux-core renderer-core.ts:207（三条消费链全部经 flux-core 类型；落 flux-runtime 侧 crud 必须继续 cast）→configure 落 flux-core；**M1** 「择前者」表述失实→改择 ②变体+flux-core ScopeRef 零改动显式禁令+isHostProjectionScope 签名钉死（带 origin 实参否则前缀双写只删一半）+三\_clause 同构映射；**M2** 在途清单补全（14 文件+B1 扩大后 crud 同包语义冲突风险提示）；**M3** 公开面三处实测改写；**m1** 行号勘误（:58→:44/:62）；**m2** cast 计数补 crud 10 处+两个测试迁移/新钉点名；**m3** configure 时序裁定落字（per-key present/零次序约束/present-undefined 清除+语义钉 4 条）；**m4** :145 inner dispose cast 保留不动禁令。审查员 14 项实测（HEAD/在途 14 文件/四通道消费点全量 grep/isHostProjectionScope 零命中/flux-runtime index type-only/flux-core renderer-core :207/:276/:329/:434/flux-react index 零变更可行性/测试底料清单）。

## Closure Gates

- [x] 两条契约缺口已终结（无 cast 嗅探/无猴补通道）
- [x] 行为零变化（特征化前后同绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log/owner doc 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （契约设计如 draft review 另有裁定随节落字。）

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_adb1e187，review-only）
- Rounds: R1 `approved`（0B/0M/3m：m1 informational 简报算式勘误[实测 220=81+2+137]/m2 data 读数两树口径注记[主树 1217 含在途 crud 件+1 vs 隔离 1216]/m3 门回填即闭合——本节即证据）
- 审计员独立实证：契约逐项开档（①origin/disposed 对象字面量 getter 同步置位=与 HEAD **fdDisposed** 同存储字段等价+三\_clause 逐条映射纯谓词合取无观测差异②configure 四键 'key in' 判定+三处全删逐通道 setter 对照+proxy 守卫严格等价③crud 九处原次序保持④:145 字节原样⑤拆分文件逐字一致+公开链亲步验证）；动态判别 2 组亲手恰红（①删 disposed 置位恰 2 红[StrictMode 钉+disposed-clause 钉]②in 判定改真值恰 present-undefined 清除钉红）→sha256 恢复；旧通道全仓零残留（四通道名+**fdDisposed** grep）；公开面四点核验；reconcile 亲跑 220=81+2+137；两树 20 路径逐字节一致。
