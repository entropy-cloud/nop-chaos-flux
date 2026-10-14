# 598 CX-18 共性重构：report↔spreadsheet 跨包 editor-domain 孪生并案批

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-18 条目（WA-12 批立案 WA-reportr-008+转发；台账 successor-required→本批）；先例：plan 588-597
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

report↔spreadsheet 跨包 editor-domain 三构件孪生并案收敛（快照切片族/deepEqual 15 行/undo-redo 时点骨架）+两项 watch 注记处理；多处 home 相对 roadmap 原文的更小门裁正（draft review 复核）。

## Current Baseline（2026-10-14 基线取证实测，HEAD `618c2736c`）

- **①快照切片族（勘误：三符号实居 spreadsheet-renderers 非 core）**：spreadsheet 侧=page-renderer.tsx:35-74（SpreadsheetPageSnapshotSlice:35-44/selectSpreadsheetPageSnapshot:46-58/equalSpreadsheetPageSnapshot:61-75——**均不在 spreadsheet-renderers index 公开导出**）+React 侧 useSnapshotSelector（use-snapshot.ts:14-31，React-free core 不可承载）；**report 孪生**=report-designer-renderers/page-renderer-snapshots.ts:55-95（三符号 diff vs spreadsheet=仅签名行，**函数体逐字**）；report 另有单源 RuntimeSlice 变体 :97-118（无孪生，不动）。SpreadsheetRuntimeSnapshot=spreadsheet-core/types.ts:249-259（index 导出）；**report-designer-core 已依赖 spreadsheet-core**（types.ts:3-7 已引其类型）+report-renderers 已双依赖（spreadsheet-core+spreadsheet-renderers）=零新依赖边。
- **②deepEqual（勘误：roadmap editor-core home 并非最小门）**：report=editor-core-adapter.ts:24-38 ↔ spreadsheet=editor-core-adapter.ts:27-41——**15 行 diff 零输出逐字**；**flux-core 已公开导出 deepEqual**（utils/object.ts:78，CX-6 产物；**R1 M1 判等语义勘误：非超集——Object.is 裁 +0≠-0 而孪生 === 裁 +0=-0；等价方向安全=flux-core-equal ⇒ 孪生-equal 已验[NaN/key in≡hasOwnProperty 于 JSON 形态/JSON 文档无环⇒缺环处理无影响]，唯一 delta=±0-only 文档增量将新增 undo entry[JSON.parse('-0') 可表达/spreadsheet cell values 为数值域]**）且两包均已依赖 flux-core→**home=flux-core 既有导出：零导出面变更+零新依赖边（严格小于 roadmap editor-core 选项）**；同文件相邻分歧=applyDiff clone（report structuredClone:74 vs spreadsheet cloneDeep:53——语义有差[structuredClone 支持更多类型]，**禁盲目统一**=watch 注记）。
- **③undo/redo 时点骨架**：spreadsheet=command-handlers/history-handlers.ts handleUndo:81-98+handleRedo:100-117；report=core-dispatch.ts :292-314/:316-336——**7 步 rebuild-opposite-entry 形状恒同**（peek/空栈 early-return/restore=inverse|forward/pop/**rebuild 对侧 entry {forward: current, inverse: restored, timestamp: Date.now()}**[刻意不移动原 entry=drift 后 redo 恢复 undo 时点文档]/setState/ok）+两侧同文理由注释（history-handlers:16-21↔core-dispatch:293-294）；分歧仅副作用（report+refreshDerivedState+spreadsheetSyncSource；spreadsheet+dirty+clearTransientState）；**editor-core undo-command-stack.ts:13-15 文档规定相反语义（同 entry 原样移入）——两消费方均偏离并各自重新论证=doc/impl split，共享 helper 顺带修复**。
- **editor-core=真实包**（零运行时依赖；两核均已依赖其 UndoCommandStack/registerEditorDomain）——③home 已接线。
- **watch a（readonly 门）**：report 已类型化（core.ts:372-387 MUTATION_COMMAND_TYPES=Set<ReportDesignerCommand['type']>，WA-report-designer-core-003 引注）vs spreadsheet **未类型化**（command-handlers/index.ts:28-39 READ_ONLY_COMMANDS=Set<string> 9 成员，core-dispatch.ts:20 门）——统一=retype Set<SpreadsheetCommand['type']>（漂移即编译错，镜像 report 修复）。
- **watch b（66 handle\* 收私）**：command-handlers/ 66 个 `export const handle*`（cell 25/sheet 18/selection 6/history 5/clipboard 4/search 4/structure 4）均仅文件内 register\*Handlers 消费；测试导入 grep=零→**de-export 机械零行为面**（7 文件）；registry 本体包内消费（editor-core-adapter 派生 SPREADSHEET_DOMAIN_COMMANDS）非 index 导出。
- **基线**（实测全绿）：report-designer-core 200/200、spreadsheet-core 314/314、spreadsheet-renderers 180/180、report-designer-renderers 216/216（910/910）。
- **授权链**：跨包公共导出面新增（spreadsheet-core index +3）+跨包归属决策=结构性，人工确认门=用户 goal 指令四要素（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。②flux-core home=零导出变更（比 roadmap editor-core 选项更小门，就地勘误）。
- **在途**：并行会话 plan-595 strictValidation 工作**触及三 census 文件**（report page-renderer-init.test.tsx/renderers.tsx/spreadsheet schema-integration.test.tsx，各 +5 行 opt-out）——本批不触碰该三件；其余证据文件全清洁；提交严格限定本批路径。

## Goals

- **G1（①）**：spreadsheet-core index **+3 公开导出**（SpreadsheetPageSnapshotSlice 类型+select+equal 纯函数；React hook 留 renderers）+spreadsheet-renderers 改消费 core 单源+report-designer-renderers 三符号改 import `@nop-chaos/spreadsheet-core`（report 侧孪生体删除；RuntimeSlice 变体不动）；**发现数/行为钉逐包等同**。
- **G2（②）**：两侧 15 行 deepEqual 删除改引 `@nop-chaos/flux-core` deepEqual（既有公开导出，零面变更）——**判别不弱钉**（R1 M1：NaN/键序/无环等价+**±0 用例双文档形态**入 Phase 1 钉面；±0-only delta 语义裁定=接受 flux-core 语义[±0-only 增量现在创建 undo entry]落 Deferred）。
- **G3（③）**：editor-core 增域工具（**R1 m1 审查员裁定形态**）：新 `editor-core/src/history-rebuild.ts`（index +1）`popAndRebuildOppositeEntry<TDiff>(stack: UndoCommandStack<TDiff>, direction: 'undo'|'redo', currentDocument: TDiff): TDiff | undefined`——吸收恰 5 共享步（peek→空返 undefined[调用点以各自 error 文本 early-return]→pop→push 对侧 entry {forward/inverse: currentDocument, opposite: restored, timestamp: Date.now()}→返回 restored）；调用点保留 2 分歧步（setState payload 形[spreadsheet 对象式+dirty+clearTransientState vs report 函数式+spreadsheetSyncSource]与 report await ctx.refreshDerivedState()）；回调吸收形被否（report dispatch 异步函数式 setState vs spreadsheet CommandHandler 同步类型——高阶壳迫使异步或仅内联分歧）；**doc 修复=undo-command-stack.ts:12-15 改记 stack entry-agnostic+host 约定（两 dispatcher 经共享 helper）=操作时点文档 rebuild 语义+drift 论证**。
- **G4（watch a）**：READ_ONLY_COMMANDS retype `Set<SpreadsheetCommand['type']>`（编译期防漂移，行为零变更）。
- **G5（watch b）**：66 handle\* de-export（7 文件，机械零行为面）。
- 台账 WA-reportr-008 `found → verified`（closure 后，范围注记）；roadmap CX-18 `todo → done`（home 裁正勘误随行）。

## Non-Goals

- applyDiff clone 语义统一（structuredClone vs cloneDeep 语义有差——watch）；report RuntimeSlice 变体；React hook useSnapshotSelector 迁移（core 无 react 依赖）；undo/redo 副作用统一；commandHandlers registry 导出化。

## Scope

### In Scope

- spreadsheet-core（index +3+READ_ONLY_COMMANDS retype+handle\* de-export+undo/redo 改引）
- editor-core（域工具+doc 修复+index +1）
- report-designer-core（deepEqual 改引+undo/redo 改引）
- spreadsheet-renderers/report-designer-renderers（切片消费改引）
- ledger/roadmap/dev log

### Out Of Scope

- 并行会话在途文件（含三 census 脏文件中本批不触的 report-init/renderers/schema-integration 测试）；applyDiff 统一；React hook 迁移。

## Failure Paths

不适用（行为保持收敛；快照/undo-redo 行为钉承载）。

## Test Strategy

档位：**必须自动化**。特征化先钉（切片族三函数现输出[spreadsheet+report 两面]/deepEqual 两用例面[含 ±0 双形态]/undo-redo 7 步形状[含 drift 场景 redo 恢复 undo 时点文档]/READ_ONLY_COMMANDS 门/66 导出面快照）→收敛→四包套件同绿+判别变异恰红；四包+editor-core filter 门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: done（2026-10-15，HEAD `618c2736c`；执行前复钉同 commit）
Targets: 四包+editor-core 测试

- Item Types: `Proof`

- [x] Proof：切片族三函数输出钉（spreadsheet+report 双面）+undo-redo 7 步形状钉（含 drift-redo 场景）+deepEqual 两用例面钉（**含 ±0 双文档形态，见 G2**[R2 nit 同步]）。
  - 落点：`packages/spreadsheet-renderers/src/cx18-page-snapshot-trio.pin.test.ts`（spreadsheet 面 5 用例：8 字段投影/引用判等/无关字段 churn/深等异引用=change/±0 异引用=change）+`packages/report-designer-renderers/src/cx18-page-snapshot-trio.pin.test.ts`（report 孪生面 4 用例，同断言面）。
  - undo-redo：`packages/spreadsheet-core/src/__tests__/cx18-undo-redo-shape-pin.test.ts`（4 用例：空栈 error text/深度迁移/drift 场景=事务内漂移后 redo 恢复 undo 时点文档/undo 清 transient selection）+`packages/report-designer-core/src/__tests__/cx18-undo-redo-shape-pin.test.ts`（6 用例：空栈 i18n error/文档引用恢复/syncSource 清除/dispatch 级 rebuild entry 精确字段 forward/inverse/timestamp/drift 场景=redo 恢复 undo 时点文档且 rebuild undo entry.inverse=漂移后文档/dispatch 级 syncSource 清除）。
  - deepEqual：`packages/spreadsheet-core/src/__tests__/cx18-deepequal-pin.test.ts` + `packages/report-designer-core/src/__tests__/cx18-deepequal-pin.test.ts`（各 6 用例：NaN 判等/键序不敏感/嵌套差异/键集差异/**±0 双文档形态**——钉面记录观测：现孪生 `===` 判 +0=-0→无变更[hasSpreadsheetDocChanges/hasReportDocChanges 均 false]；flux-core Object.is 判 +0≠-0→变更[deepEqual false]；G2 后 hasDocChanges 翻转为 flux-core 语义=预裁定翻面）。
  - READ_ONLY 门钉：`packages/spreadsheet-core/src/__tests__/cx18-readonly-gate-pin.test.ts`（5 用例：9 成员集合精确面/9 白名单命令 readonly 放行/变更命令 gate error/undo+redo readonly 拒绝[历史修改不入白名单]/gate 先于 handler lookup）。
- [x] Proof：基线落字（四包 910 用例+editor-core 套件+导出面快照[spreadsheet-core index/editor-core index]；**R1 m3 树态披露：910 实测于含 3 在途 census 文件的树——并行落地导致的计数漂移禁误归因本批**）。
  - 基线实测（2026-10-15，HEAD `618c2736c`，树含并行会话 3 脏 census 文件[report page-renderer-init.test.tsx/renderers.tsx/spreadsheet schema-integration.test.tsx 各 +5 行 opt-out 在途]）：spreadsheet-core 314/314（17 files）、report-designer-core 200/200（10 files）、spreadsheet-renderers 180/180（26 files）、report-designer-renderers 216/216（22 files）=910/910；editor-core 39/39（1 file）。与本计划基线记载逐数吻合。
  - 导出面快照钉（runtime keys 精确清单）：`packages/spreadsheet-core/src/__tests__/index-export-surface.pin.test.ts`（22 个 runtime 导出+trio 不在面断言；类型导出无 runtime key，Slice 类型由 renderers 消费钉编译面承载）+`packages/editor-core/src/index-export-surface.pin.test.ts`（9 个 runtime 导出+helper 不在面断言）+`packages/spreadsheet-renderers/src/__tests__/index-export-surface.pin.test.ts`（17 个 runtime 导出，全批零 diff 钉）。

Exit Criteria:

- [x] 钉全绿；导出面基线在案。（五包全绿：spreadsheet-core 331、report-designer-core 212、editor-core 41、spreadsheet-renderers 187、report-designer-renderers 220=991/991——**closure m1 算术修正：基线 910+editor-core 既有 39+新钉 42[36 cx18+6 export-surface]=991，非「+81」[81=42 新+39 editor-core 既有混计]；spreadsheet-core 基线=314 非 321[笔误]**。）

### Phase 2 - 提取与改引

Status: done（2026-10-15；执行同日同 HEAD `618c2736c` 树，含并行在途 3 census 文件未触）
Targets: 四包+editor-core

- Item Types: `Fix | Proof`

- [x] Fix G1：spreadsheet-core +3 导出+两 renderers 消费改引。
  - 新件 `packages/spreadsheet-core/src/snapshot-selectors.ts`（trio 逐字迁入，ex spreadsheet-renderers/page-renderer.tsx:35-75）；index 新增 `SpreadsheetPageSnapshotSlice`（type）+`selectSpreadsheetPageSnapshot`+`equalSpreadsheetPageSnapshot`（export surface runtime keys +2/类型 +1，快照钉同步更新）。
  - spreadsheet-renderers/page-renderer.tsx 删本地 trio 改消费 core（不再转口）；page-renderer-selector.test.tsx import 改指 core。
  - report-designer-renderers/page-renderer-snapshots.ts:55-95 孪生三符号删除（RuntimeSlice :97-118 与 ReportPageSnapshotSlice 族不动；SpreadsheetRuntimeSnapshot type import 保留供 RuntimeSlice）；page-renderer.tsx 改 import core 并以 core 名消费（:238-239），孪生名死亡；selector test 改指 core。孪生归零计数：`grep selectReportSpreadsheetSnapshot|equalReportSpreadsheetSnapshot|ReportSpreadsheetSnapshotSlice` 存活引用=0（仅 snapshots.ts 头注释记载删除事实）。useSnapshotSelector（spreadsheet-interactions/use-snapshot.ts）未动。
- [x] Fix G2：两侧 deepEqual 删改引 flux-core（等价钉同绿）。
  - report-designer-core/src/editor-core-adapter.ts 私有 15 行 deepEqual 删除（ex :24-38）→`import { deepEqual } from '@nop-chaos/flux-core'`；spreadsheet-core/src/editor-core-adapter.ts 同（ex :27-41）。hasDocChanges 行为保持除 ±0 预裁定 delta——两钉面 ±0 用例按 Deferred 裁定翻面（记录在案：Phase 1 观测孪生 `===` 判 +0=-0 无变更；G2 后 hasDocChanges 判 +0≠-0 有变更）；等价钉（NaN/键序/嵌套/键集）同绿。
- [x] Fix G3：editor-core 域工具+两核改引+doc 修复。
  - 新件 `packages/editor-core/src/history-rebuild.ts`：`popAndRebuildOppositeEntry<TDiff>(stack, 'undo'|'redo', currentDocument): TDiff | undefined`——恰吸收 5 共享步（peek→空返 undefined→pop→操作时点重建对侧 entry {forward/inverse: currentDocument, opposite: restored, timestamp: Date.now()}→返回 restored）；index +1（export surface +1 快照钉同步）。**吸收行数落字**：spreadsheet handleUndo/handleRedo 各吸收 5 行骨架（peek/if/pop/push 3 行）→调用点余 error early-return+setState payload+result（spreadsheet 保留 dirty+clearTransientState 对象式 setState；report 保留 i18n error 文本+函数式 setState+spreadsheetSyncSource 清除+await ctx.refreshDerivedState()）。
  - doc 修复：undo-command-stack.ts 类注释改记 entry-agnostic+host 约定（两 dispatcher 经共享 helper=操作时点 rebuild 语义）+drift 论证；并注记 editor-core 自带 EditorCore（结构化域）仍按原样移入并存；pushUndo/popUndo/pushRedo/popRedo 方法注释同步去除「原样」表述。
- [x] Fix G4/G5：READ_ONLY_COMMANDS retype+66 de-export。
  - G4：command-handlers/index.ts `READ_ONLY_COMMANDS: Set<SpreadsheetCommand['type']>`（9 成员逐字保留；编译期防漂移，行为零变更）。
  - G5：7 文件 66 个 `export const handle*` → 模块级 `const handle*`（cell 25/sheet 18/selection 6/history 5/clipboard 4/search 4/structure 4）；registry register\*Handler 导出与派生未动；零外部消费（预先 grep 验证）。
- [x] Proof：全部钉同绿+判别变异恰红→sha256 恢复+导出面快照 diff=预期（spreadsheet-core +3/editor-core +1/余零）。**[closure M1 披露：check:scanner-baselines 红=本批 4 钉测试文件 6 个模块级 let[find-test-global-leaks 114>108]——编排子门禁清单漏该子门禁且初报「余全绿」不实[审计员逮出]；修复=6 let 重构 holder.current[含简写属性语法修复]，scanner 回落 108=基线，worktree 直证 exit 0；教训=子门禁逐跑清单须取自 package.json 全链枚举非记忆]**
  - 五套件同绿（Phase 2 完成态）：editor-core 41/41、spreadsheet-core 331/331、report-designer-core 212/212、spreadsheet-renderers 187/187、report-designer-renderers 220/220=991/991。**环境披露**：收尾复跑 report-renderers 出现 2 环境红（page-renderer-shell/report-designer-inspector）——根因=并行会话在途写 `packages/flux-react/src/render-nodes.tsx`（mtime 距复跑 159s，schema 诊断 unknown-property"text"）——该两测试与零本批路径 import 边，本批相关 5 测试文件 18/18 同树绿；非归因（红文件属并行在途集）。
  - 判别变异恰红（全部 sha256 恢复字节等同，`_tmp/cx18-mutation-shasum-{before,after}.txt` diff 空）：A=helper 跳过 pop→spreadsheet undo 钉 2 红+report undo 钉 3 红（恰深度/entry 断言，空栈与副作用腿保持绿）；B=helper rebuild entry 字段错（forward:restored）→两核 drift 钉恰红（spreadsheet 2 红/report 2 红）；C=select 产 readonly 常真→两 trio 投影钉+report 行为级 selector 钉恰红（3 红）；D=READ_ONLY 注入非 union 成员→typecheck 恰红 TS2322（恢复后 0 错）。
  - 导出面快照 diff=预期：spreadsheet-core runtime keys +2（select/equal）+类型 +1（Slice，编译面）＝+3 公开导出；editor-core runtime keys +1（popAndRebuildOppositeEntry）；spreadsheet-renderers 零 diff（钉全绿未改）。

Exit Criteria:

- [x] 孪生体归零计数落字；五套件同绿。（孪生归零见 G1 行；991/991 见 Proof 行。）

### Phase 3 - 回写与收口

Status: done（2026-10-15：台账 WA-reportr-008 verified[220=found 55+verified 165/未处置 0]；roadmap CX-18 done[home 裁正勘误随行]；dev log 10-15；隔离五门禁=4 绿+check 披露部分[oversized 继承 endorsed+knip 单命中属并行未登记+scanner M1 已修复回落基线]；closure audit agent_e0bda349 R1 issues[0B/1M/3m]→M1 修复+C3 终态后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-reportr-008 verified；roadmap CX-18 回写（home 裁正勘误随行）；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] `pnpm workaround:reconcile`（scripts/workaround-audit/reconcile-coverage.ts）exit 0；closure audit approved。（closure audit agent_e0bda349 M1 修复后收口依据成立，据实回勾；m1 算术修正/m2 roadmap 立案行入提交清单/m3 标签修正均已履行）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_cfc5fac0-94c4-430f-aca7-57178fdc33c8，review-only）
- Verdict: R1 `fail`（0B/1M/3m）→全修转 R2 待审
- Rounds: 1
- Findings addressed: **M1** flux-core deepEqual「超集」声称不实（Object.is 裁 +0≠-0 vs 孪生 ===）→判别方向安全已验（flux-core-equal ⇒ 孪生-equal：NaN/key in≡hasOwnProperty 于 JSON 形态/无环）+唯一 delta=±0 判异更细→改口「判别不弱钉」+±0 双文档形态用例入 Phase 1+±0 裁定预落 Deferred（接受 flux-core 语义）+Phase 1 钉面增补；**m1** G3 形态审查员裁定转录=editor-core/src/history-rebuild.ts `popAndRebuildOppositeEntry<TDiff>(stack, direction, currentDocument): TDiff|undefined`（吸收恰 5 共享步/调用点保留 2 分歧步/回调形被否理由落字）+doc 修复具体化（:12-15 改记 entry-agnostic+host 约定+drift 论证）；**m2** 行号 nit 三处（equalSpreadsheet :61-75/use-snapshot :14-31/MUTATION literals :376-386）；**m3** 基线树态披露（910 实测含 3 在途 census 文件）。R1 verified-clean：三符号位点+孪生逐字+RuntimeSlice 单源/selector React 依赖不可入 core/deepEqual 逐字 15L+applyDiff 分歧/undo-redo 7 步逐步核对+doc split/READ_ONLY 9 成员均 union 成员 retype 可编译/66 handle\* 零外部消费+无 barrel/editor-core 真实包+零新依赖边/四包 910 实测复跑/3 脏 census 文件吻合/人工门四要素/Rule 18 合规。

## Closure Gates

- [x] 三构件收敛落地+watch 两项处理（home 裁正在案）
- [x] 行为保持判别（特征化同绿+导出面快照+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_e0bda349 R1 issues→M1 修复+C3 终态后据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx18-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——**披露部分通过**：oversized 红=并行已提交 data 文件 708/706[继承+审计员 endorsed]；knip 单命中=并行 form-load-action[未登记但非归因]；**scanner-baselines M1 本批红已修复回落 108**；其余子门禁全绿；编排首跑漏 9 路径同步事故已披露[c2 起为完整批证据]；新文件 git add -N）

## Deferred But Adjudicated

- **G2 ±0-only delta 语义（R1 M1 预裁定，2026-10-14）**
  - Classification: `adjudicated as residual-risk-only`
  - Why Not Blocking Closure: flux-core deepEqual（Object.is）判别严格不弱于孪生 ===——交换只会新增变更检测永不丢失；±0-only 文档增量（JSON.parse('-0') 可表达、cell values 数值域理论可入）现在会创建 undo entry 而非静默忽略=防御性偏差方向，非回归；两域现存测试与文档值域无 ±0 用例（Phase 1 钉面验证）。
  - Successor Required: `no`
  - Successor Path: 若未来文档值域出现 ±0 敏感场景，以 options 参数 exposing === 语义回退（editor-core 域工具或 flux-core options）。

## Non-Blocking Follow-ups

- applyDiff clone 语义统一（structuredClone vs cloneDeep 语义差，需独立裁定）。
- commandHandlers registry 导出化评估（现包内消费）。

## Closure

Status Note: 2026-10-15 收口。三构件收敛（快照切片族 spreadsheet-core +3 导出单源化/deepEqual 双删改引 flux-core[判别不弱，±0 裁定落 Deferred]/undo-redo editor-core history-rebuild 新件+doc split 修复）+watch 两项（READ_ONLY retype 编译防漂移/66 handle\* de-export 机械零行为）；判别 4 组变异外科手术式恢复+导出面快照恰如计划（+3/+1/零）；5 包 991/991 全绿；**closure M1 教训=编排子门禁逐跑清单漏 scanner-baselines 且初报不实被审计逮出→6 let 重构回落基线修复**；实施=派驻 agent（一次配额中断重派），本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_e0bda349-bffc-420b-98ae-a69da2d384cc，review-only）
- Rounds: 1
- Verdict: `issues`（0B/1M/3m）→M1 修复+C3 终态后收口依据成立；m1=Phase 1 算术修正（新钉 42 非 81[混计 editor-core 既有 39]+spreadsheet-core 基线 314 非 321 笔误）[已履行]/m2=roadmap 立案行显式入收口提交路径清单[已履行]/m3=标签修正（10 钉测试文件；knip 命中=未登记但非归因）[已履行]
- Findings addressed: 审计员逐项对账（trio 逐字节对 HEAD 快照/history-rebuild 恰 5 步/双 adapter 删改引/doc 重写/index +3 +1/66-66 de-export 清单 25-18-6-5-4-4-4/READ_ONLY 9 成员逐字/±0 Deferred 预裁定+钉面记录翻转/991 双树绿/c2 日志 42-42-42-78 任务实跑/9 事故漏路径 12 件 shasum 全 MATCH）+**亲判双腿**（helper 去 pop→spreadsheet 2 红+report 3 红；rebuilt entry forward:restored→drift 钉 2+2 红→sha256 168e29c6… 逐字节恢复→4/4+6/6 绿）+**scanner-baselines 亲证**（本批 +6 命中归因实证+纯 HEAD 108 复现实验=非归因证明机制运用）。

Follow-up:

- applyDiff clone 语义统一（structuredClone vs cloneDeep 语义差，需独立裁定）。
- commandHandlers registry 导出化评估（现包内消费）。
- 并行会话 data 文件超限拆分归其 plan-593/595 收口。
