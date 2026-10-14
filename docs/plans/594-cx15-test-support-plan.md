# 594 CX-15 共性重构：渲染器包测试支撑收敛批（mock-props/honesty 脚手架/TestRuntimeProvider）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-15 条目（WA-7 批立案 WA-mobile-001 + WA-8 批扩围 WA-dashboard-002 + WA-10 批扩围 graph/map；台账 successor-required→本批）；先例：plan 588-592
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

收敛渲染器包测试支撑三族（createMockRendererProps ×5、contract-honesty 测试脚手架 ×6、TestRuntimeProvider/createTestScope 族+env stub ×7）到共享家，meta/node 种子语义拍板到类型契约诚实派——测试面收敛（非生产面），同名同约工具两派语义消除。

## Current Baseline（2026-10-14 基线取证实测，HEAD `e08d0759e`）

- **createMockRendererProps ×5（三 API 派）**：mobile:18(46L)/content:18(50L)/graph:18(50L，**与 content 逐字节相同 diff=空**)/map:18(52L)/ai:9(43L，**异构 API**=扁平 Partial+schema 必填)。漂移轴恰两条：①meta 种子三派——mobile **空 spread**（缺 required visible/hidden/disabled/changed）/content+graph+map **四 required 全种**（类型契约诚实）/ai 仅种 2（缺 hidden+changed）；②node 种子两派——仅 map 种 `scope`（诚实），余四家 `{}`（**ledger「graph 缺 node.scope」实测确认**）。全部以 `as` cast 纸糊缺失 required 字段。**消费面**：mobile 13 测试文件/graph 1/map 2/content 18/ai 30（ai 为 WA-ai-006 harness 属 `__tests__/` 设计内）。
- **contract-honesty 脚手架（roadmap「×3」勘误）**：**×6 副本**（content:120L↔layout:120L↔basic:120L 三件纯标识符重命名；data:121L +1 行/form-advanced:122L +2 行/**form:125L 额外引擎导入 isCapabilityHandleReferenced+注释块**[R1 m1：参数面须含 form 附加断言，薄壳禁静默回归]）+**2 同名异卫**（scheduling:41L=INV-1 IO-purity 正则扫描；ai:238L=INV-1+F1.4——非复制，不入族）；引擎已共享（flux-core/src/contract-honesty.ts 472L）；脚手架参数面=definitions 数组+srcDir 两形（content/layout 置 src/ 根、basic/data/form/form-advanced 置 src/**tests**/——隐含 walk 根不一致）+runtime-handle-factory 清单（4 文件恒同）+3 用例恒同。
- **TestRuntimeProvider/createTestScope 族**：content/test-support-runtime.tsx(60L)↔flux-react/test-support-runtime.tsx `createScope`:367-390（同 ScopeRef stub 形）+hook-contracts.test.tsx:62 第三本地 createTestRuntime（真 runtime）+3d/industrial test-support 结构孪生对；**env stub 手写 `{fetcher,notify}` ×7**（flux-react/basic/layout/data/dashboard/content/form-advanced）与既有共享 `createDefaultEnv`（flux-react 公开导出）重复。
- **dashboard（WA-dashboard-002）已在 HEAD 修复**：a439c55a3 把三抄定义表改 {...production} 派生（test-support.tsx:72-75/:96-99/:133，历史注释 :69-71）——本批继承=仅 meta/node 种子裁定；**遗留残渣=data/test-support.tsx:21 模块求值期 initFluxI18n 副作用**（WA-content-009 已在别处消除的形态）。
- **home 裁定输入**：flux-react 无测试专用导出路径（exports=`./`+`./unstable`+css；其 test-support\*.tsx 被 tsconfig.build 排除=源-only）；先例=`./unstable` 二级子路径（exports+tsconfig.base paths+vite alias 三处注册）与 `assertRendererRootAnchors` 走主 index；独立 test-utils 包=首例（vite alias 手写 map+paths+project references+knip 入口约定四重登记成本，且首个无运行时消费者包）。依赖深度：mock-props+脚手架只需 flux-core（引擎所在）；TestRuntimeProvider 需 flux-react contexts；7 目标包全部已依赖 flux-react。
- **基线**（实测全绿）：mobile 15/189、content 44/353、ai 103/850、graph 6/54、map 5/64、dashboard 12/93、layout 23/147。
- **授权链**：测试面收敛非生产面（roadmap 预注）；若 home 裁定落 flux-core（保护区）/新增导出=结构性，人工确认门=用户 goal 指令四要素（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。跨包测试文件改引=非生产面批量机械改。
- **在途**：主工作树并行会话 plan-593 form-load/data 域活跃（本批 ~20 个对象文件全部非在途，取证时核验）；提交严格限定本批路径。

## Goals

- **G1**：共享 `createMockRendererProps`（home=G4 裁定 Option A）+五包改引；**meta/node 种子拍板类型契约诚实派**（四 required 全种+node.scope=R1 裁定 B：统一+申报测试语义修正）——三段钉=①shape 钉（meta 恰 {visible:true,hidden:false,disabled:false,changed:false}+node.scope map 形；旧 mobile/ai helper 下红）②行为翻转钉（mobile 消费点 meta.visible 分支旧 falsy→新 observable 变化，旧 helper 下先红）③fallout 协议（断言不诚实形态的测试逐个修正+一行 plan 引用，Phase 2 Proof 枚举）；**ai 附加种子 className:'':testid/cid undefined 的共享面归属随钉裁定**[R1 m3]。
- **G2**：共享 honesty 脚手架 harness（R1 裁定落 flux-react 子路径；入参=definitions+srcDir 两形+factory 清单+**form 附加引擎 API 位**[m1]）+六包改薄壳（每包 ≤15 行）；scheduling/ai 同名异卫显式注记不入族。
- **G3**：TestRuntimeProvider/createTestScope 收敛（flux-react 家）+content 改引；**env stub ×7 改用共享 createDefaultEnv**（同族追加，取证发现）；**ai 异构 API=适配器薄壳**（≤15 行保扁平签名委托共享 options 核+诚实种子[R1 裁定 C]；**适配器状态显式申报**=常驻 ai harness 契约 or transitional+retirement follow-up，Phase 2 落字禁静默永续）。
- **G4（R1 裁定=Option A）**：flux-react `./test-support` 二级子路径承载三族（先例 unstable 三处注册；mock-props options 面系 React 类型=不宜落 core；保护区分析对 G4 消解；注册=exports/paths/alias 三处+**build-exclude 调整[src/test-support*.tsx 仅覆盖 .tsx，须放宽至 .ts 支撑件；子路径入口文件走 dist 构建=unstable.ts 模式]**+knip 新 dist 入口感知[R1 m4]）；人工确认门保留覆盖 flux-react 新公开导出注册（结构性）。
- **G5**：data/test-support.tsx i18n 模块求值副作用改工厂注入（WA-content-009 模式）；dashboard 修复核验+注记。
- 台账 WA-mobile-001 `found → verified`（closure 后，范围注记）+dashboard/graph/map 扩围行处置更新；roadmap CX-15 `todo → done`（范围勘误注记：×3→×6、dashboard 已修复）。

## Non-Goals

- scheduling/ai honesty 异卫改造；form/form-advanced 大 harness 族与 probe renderer 三件套收敛（取证发现，规模大，归 successor）；3d/industrial test-support 结构孪生（successor）；生产代码零变更（test-support 文件+测试文件+home 配置三处[exports/paths/alias]除外）。

## Scope

### In Scope

- flux-core 或 flux-react（G4 裁定）的共享测试支撑件+导出注册（exports map/tsconfig paths/vite alias）
- mobile/content/graph/map/ai 的 test-support.ts 改薄壳+其测试文件改引（机械批量）
- basic/data/form/form-advanced 的 contract-honesty.test.ts 改薄壳；data/test-support i18n 工厂化
- ledger/roadmap/dev log

### Out Of Scope

- 并行会话在途文件（data/form-load/plan-593 域）；scheduling/ai 异卫；form 族大 harness；生产渲染器代码。

## Failure Paths

不适用（测试面收敛；种子拍板语义修正由判别钉承载）。

## Test Strategy

档位：**必须自动化**。特征化先钉（五包 mock-props 现种子形态钉+诚实派翻转行为钉[mobile 缺 visible 的消费点]；honesty 脚手架现有发现数钉[各包 findUnreferencedContracts 输出基线——收敛后逐包等同]）→提取→六包+fadv 等相关套件同绿+判别变异恰红；涉及包 filter 四门禁+哨兵（react/ai）+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: done (2026-10-14, 执行 session)
Targets: 测试面

- Item Types: `Proof`

- [x] Proof：mock-props 种子形态钉（五包各 1：现 meta/node 输出快照）+诚实派翻转行为钉（mobile 消费点在四 required 种子下的行为差异面）+**content 本地同名 mock 四文件枚举裁定**[R1 m2：22 处引用 vs 18 导入文件之差——fold 或显式排除，否则 content 归零判据不可验]。
  - Status (2026-10-14, HEAD e08d0759e): 五包特征化钉全绿——`src/test-support-seed-characterization.test.tsx` ×5（mobile 3 tests：meta 空 spread+node 无 scope+meta.visible 分支旧 falsy 落 fallback；content/graph 各 2：meta 恰四 required+node 无 scope；map 2：meta 四 required+node.scope map 形 {id:'mock-scope',path:'mock.path',value:{}}；ai 3：扁平签名+meta {visible,disabled,className,testid,cid} 缺 hidden/changed+helpers stub+node 无 scope）。Phase 2 翻转为诚实派钉（红→绿判别）。
  - content 本地同名 mock 裁定（R1 m2）：**22 文件引用 createMockRendererProps = 18 静态导入 + 4 动态导入（`await import('./test-support.js')`：carousel.test.tsx、carousel-autoplay.test.tsx、diff-view/**tests**/diff-responsive.test.tsx、diff-view/**tests**/diff-view-renderer.test.tsx）——零本地同名 mock**；四动态导入文件 Phase 2 一并改引共享子路径（fold）。另 content 有 1 个异名本地内联 mock（ux-round2-a11y.test.tsx `rendererProps()`，meta {visible:true,cid:1}+helpers:{}）——**显式排除**：非 createMockRendererProps 族（异形断言面 cid:1 专属），折叠将改变其局部语义，不在 22-vs-18 差值内。
- [x] Proof：honesty 脚手架发现数基线钉（六包各包 findUnreferencedContracts 现输出=收敛后逐包等同判据）。
  - Status (2026-10-14 实测，临时探针取证后删除)：declared-contract 基线 {renderers, eventKeys, capabilityHandles} = content {20,6,0} / layout {9,8,0} / basic {18,13,17} / data {13,23,15} / form {31,6,73} / form-advanced {19,0,22}；六包现 contract-honesty.test.ts 全绿（violations === []）。Phase 2 薄壳内建同数钉。**实测勘误 vs 计划 Baseline 行**：`isCapabilityHandleReferenced` 引擎断言为 content/layout/basic/data/form-advanced 五件所有（非 form 独有）；form 恰相反**缺**该断言（test 3 仅注入 event contract，断言 unreferencedCapabilityHandles: []，不调用 isCapabilityHandleReferenced）；form-advanced H7 用例异于其余五件（硬编码 'addItem' capability probe + toContainEqual）。harness 参数面=definitions+srcDir（调用方解析）+capabilityProbe 布尔（form=false 保形）+h7 模式（form-advanced='sibling-wired'）+发现数基线钉。
- [x] Proof：基线落字（七包套件计数+env stub ×7 位点）。
  - Status (2026-10-14 实测全绿)：flux-react 65/580（哨兵精确）· ai 103/850（哨兵精确）· mobile 15/189 · content 44/353 · graph 6/54 · map 5/64 · dashboard 12/93 · layout 23/147 · data 178/1231（与计划七包名单外补测；data/form 域有并行会话在途改动，基线=本批开工前实测）。
  - env stub ×7 位点：flux-react src/test-support-core.tsx:28-33（`export const env`）· basic src/test-support.tsx:7-13 · layout src/test-support.tsx:6-12（:307 导出）· data src/test-support.tsx:23-28 · dashboard src/test-support.tsx:17-22（:107 导出）· content src/test-support-runtime.tsx:11-17（createTestRuntime 内联）· form-advanced src/test-support.tsx:259-266（站点特有：fetcher 记录 submitCalls、notify 记录 notifyCalls → createDefaultEnv({fetcher,notify}) spread 保形）。

Exit Criteria:

- [x] 钉全绿；发现数基线在案。（五包特征化钉 12 tests 全绿；六包发现数基线+七包套件计数+env stub ×7 位点如上）

### Phase 2 - 提取与改引

Status: done (2026-10-14, 执行 session; Phase 3 回写/收口=orchestrator)
Targets: home 件+五包 mock-props+六包 honesty+Provider+env stub+data i18n

- Item Types: `Fix | Decision`

- [x] Decision：home 裁定（G4）落字并注册（exports/paths/alias 按先例三处）。
  - Status (2026-10-14): G4=R1 裁定 Option A 落地。home=`packages/flux-react/src/test-support/`（mock-props.ts+contract-honesty-harness.ts+runtime.tsx）+子路径入口 `src/test-support.ts`（unstable.ts 模式，走 dist 构建已实证 dist/test-support.js+.d.ts+test-support/_ 生成）。注册四处：package.json exports `./test-support` · tsconfig.base.json paths · vite.workspace-alias.ts · tsconfig.build.json exclude 放宽（`src/test-support/\*\*/_.ts(x)`加入；入口文件`src/test-support.ts`保持构建）。knip 感知：check:knip-baseline 终态=仅剩并行会话在途文件新红（form-load-action.ts#FormLoadState，非本批）；本批曾现 2 个新红（probes barrel 改名致已登记死导出换路径 identity：FormContext/RendererPlugin）→ 删除该两死再导出后归零（基线可收缩项，未动基线文件）。连带：flux-react 内部 probe barrel`src/test-support.tsx`更名`src/test-support-probes.tsx`（消除与 .ts 入口的解析遮蔽，14 个内部测试 import 同步改引）。
- [x] Fix：三共享件提取+改引（mock-props 五包/honesty 六薄壳/Provider+content；env stub ×7 改 createDefaultEnv；data i18n 工厂化）。
  - Status (2026-10-14): ①mock-props：mobile/content/graph/map test-support.ts=7 行薄壳（re-export 共享）；ai=33 行适配器薄壳（扁平签名保持，状态申报=常驻 ai harness 契约、无 retirement follow-up，落字于文件头；ai 专属 meta extras className/testid/cid 留 shim 层，诚实四 required+node.scope 由共享核承载）。②honesty 六薄壳（content/layout 11 行、basic/data/form/form-advanced 12 行，均 ≤15）：参数面=packageName+definitions+srcDir+capabilityProbe（form=false 保形）+h7Mode（form-advanced='sibling-wired' 保形）+discoveryBaseline 钉；scheduling（INV-1 IO-purity）与 ai（INV-1+F1.4）同名异卫未入族（注记）。③Provider 族：TestRuntimeProvider/createTestScope/createTestRuntime 落 `src/test-support/runtime.tsx`（env 经 createDefaultEnv）；content/test-support-runtime.tsx=10 行再导出壳；flux-react test-support-runtime.tsx createScope→委托共享 createTestScope 别名。④env stub ×7→createDefaultEnv：flux-react test-support-core（裸）/basic/layout/data/dashboard（裸）/content（runtime.tsx createTestRuntime 内）/form-advanced（站点特有 fetcher/notify 经 input spread 保形）。⑤data i18n：模块求值 reset+init 移入 createDataSchemaRenderer 工厂（form/fadv 工厂先例），data 178/1231 全绿=14 个非工厂消费文件零 fallout。⑥判别钉：五包 honest-seed 钉翻转+flux-react 家 16 tests（含 harness 三形态对照 fixture）。fallout 协议=全批恰 1 处（ai-token-usage.test.tsx scope toBeUndefined→诚实 mock-scope 断言+plan 594 一行引用）；content 22-vs-18 之差=4 动态导入文件经壳改引自然 fold，零本地同名 mock。⑦dashboard verify-only：三抄定义表 spread 派生在位（test-support.tsx:65-69/:93/:129，WA-dashboard-002 派生+历史注释保持），i18n 已工厂化（:78-83），dashboard 12/93 全绿；本批仅 env stub 行改 createDefaultEnv。⑧门禁（涉及 12 包 filter 四门禁全绿）：typecheck 12/12 exit 0 · build 12/12 exit 0 · lint 12/12 exit 0（data use-list-windowing.ts + fadv transfer-renderer.tsx 各 1 条 react-compiler warning=既有，exit 0，文件非本批触碰）· test 计数如 Exit Criteria；哨兵精确：flux-react 596/596（基线 580 全数保持+16 家钉）、ai 853/853（基线 850 全数保持+3 钉）；knip=check:knip-baseline 仅剩并行会话在途新红（form-load-action.ts#FormLoadState，git diff 实证非本批）。
- [x] Proof：meta/node 拍板判别红→绿+发现数逐包等同+honesty 薄壳六包套件同绿。
  - Status (2026-10-14): 判别红（旧 helper 下，stash/HEAD 版本还原实测）=mobile 3 红（meta 形+node.scope+behavior flip falsy）/content 1 红（node.scope）/graph 1 红（node.scope）/map 0 红（诚实先例，等同钉）/ai 2 红（诚实 meta+node.scope）1 绿（扁平签名——by design）；换共享核后五包钉全绿（3/2/2/2/3）。发现数逐包等同：content {20,6,0}/layout {9,8,0}/basic {18,13,17}/data {13,23,15}/form {31,6,73}/form-advanced {19,0,22} 六包薄壳 discoveryBaseline 断言全绿+violations [] 全绿。

Exit Criteria:

- [x] 复制体归零计数落字；涉及套件全绿；判别在案。（复制体归零：mock-props 本地实现 5→0（4 薄壳+1 适配器）、honesty 脚手架本地 6→0（6 薄壳）、TestRuntimeProvider/createTestScope 本地 2→0（content 壳+flux-react 别名委托）；套件计数：flux-react 66/596[基线 65/580+16 家钉]、ai 104/853[+3 钉]、mobile 16/192[+3]、content 45/355[+2]、graph 7/56[+2]、map 6/66[+2]、dashboard 12/93 等同、layout 23/147 等同、basic 73/671 等同、data 178/1231 等同、form 125/1121 等同、form-advanced 171/1212 等同——全绿；判别红/绿+发现数基线在案如上）

### Phase 3 - 回写与收口

Status: done（2026-10-14：台账 WA-mobile-001 verified[220=found 58+verified 162/未处置 0]；roadmap CX-15 done[×3→×6 勘误+dashboard 已修复注记]；dev log 10-14；隔离五门禁诚实轨迹[首跑 lint 红=并行悬空锚点 doc 环境性→批基线锚定+脏版 doc 还原→audit m1 三交付件同步→C2 终态全绿]；closure audit agent_63e103f3 issues[0B/1M/2m]→m1 修复后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账行 verified+扩围行处置更新；roadmap CX-15 回写（×3→×6 勘误+dashboard 已修复注记）；dev log。
- [x] Proof：隔离五门禁（=Closure Gates 终态一次运行，本 Phase 引用其证据不重复跑）；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_63e103f3 m1 修复后 approved 依据=C2 终态链+54 路径字节一致[当时点]，据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_871c7555-cae1-49c6-b045-60e9006b9561，review-only）
- Verdict: R1 `pass`（0B/0M/5m——m1-m5 折入后 activation-ready，无需复审轮）
- Rounds: 1
- Findings addressed: **裁定 A**=G4 home Option A（flux-react ./test-support 子路径；决定性论据=mock-props options 面系 React 类型不宜落 core；保护区分析消解；人工门保留覆盖新公开导出注册）；**裁定 B**=G1 统一+申报测试语义修正（三段钉规范：shape/行为翻转/fallout 协议）+m3 ai 附加种子归属随钉裁定；**裁定 C**=ai 适配器薄壳（≤15 行；状态显式申报禁静默永续）；**裁定 D**=范围诚实（env stub ×7 同族追加成立/deferrals 合规）；**m1** honesty 措辞修正（三件纯重命名+form 附加引擎 API 入参数面）；**m2** content 本地同名 mock 四文件枚举裁定入 Phase 1；**m4** build-exclude .tsx-only 放宽+子路径入口走 dist（unstable.ts 模式）+knip 入口感知；**m5** Phase 3 引用 Closure Gates 终态不重复跑。R1 verified-clean：×5 尺寸/逐字节 content-graph/meta 三派/node.scope map-only/ai 异构/六副本+两异卫/Provider 族/env stub 七位点/dashboard 修复+data 残渣/配置三处/两套件实测（mobile 15/189+graph 6/54）.

## Closure Gates

- [x] 三族收敛落地+种子拍板（G4 裁定在案）
- [x] 行为保持+拍板判别（特征化同绿+发现数等同+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_63e103f3 issues→m1 修复+C2 终态复跑后据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx15-verify@批基线 e08d0759e，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——终态 C2 链全绿；首跑 lint 红=并行悬空锚点 doc 环境性非本批，批基线锚定后消解；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- form/form-advanced 大 harness 族+probe renderer 三件套收敛（successor）。
- 3d/industrial test-support 结构孪生（successor）。
- scheduling/ai honesty 异卫与主 harness 的关系裁定（不同卫非复制，留注记）。

## Closure

Status Note: 2026-10-14 收口。三族收敛（mock-props 五包薄壳+ai 适配器申报常驻/honesty 六薄壳+发现数逐包等同/Provider 族+env stub ×7+data i18n 工厂化）；种子拍板=统一诚实派（申报测试语义修正，三段钉+唯一 fallout 站点修正）；home=flux-react ./test-support 子路径（注册三处+build-exclude 放宽+入口 dist）；门禁诚实轨迹=首跑 lint 红（并行悬空锚点 doc 环境性）→批基线锚定→audit m1（隔离 worktree 三交付件未同步[编排排除清单过宽]）→同步+C2 终态全绿；实施=派驻 agent，本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_63e103f3-0958-4b0e-ab62-73b62184ddc0，review-only）
- Rounds: 1
- Verdict: `issues`（0B/1M/2m）→m1 修复[三交付件同步进门禁 worktree+C2 终态链全绿+字节一致重建]后收口依据成立；m2=门禁计数基准如实披露（worktree@基线 data 177/1224+form 124/1115 vs 主树 178/1231+125/1121=并行已提交测试差）；m3=17:20 批量 mtime 事件内容核验良性（仅 3 交付件落为批内字节，余逐字节不变——非本链操作，已披露）
- Findings addressed: 审计员逐项对账（home 三模块参数面+form 附加断言 reproduction/注册四处+dist 入口/五薄壳+适配器状态申报/六薄壳发现数钉逐一比对/env stub 七位点清零/data i18n/fallout 唯一性 diff 确认/探针桶改名+死 re-export 删除/并行文件零 CX-15 标识符/门禁日志 78 任务实跑）+**亲手判别双腿**（种子变异 hidden 删除→5/5 包 shape 钉红→sha256 f34887e6… 恢复；旧 helper 复原→mobile 3/3 红=申报修正红腿复现→sha256 dc8ecd3a… 恢复）。

Follow-up:

- form/form-advanced 大 harness 族+probe renderer 三件套收敛（successor）。
- 3d/industrial test-support 结构孪生（successor）。
- scheduling/ai honesty 异卫注记保持（不同卫非复制）。
