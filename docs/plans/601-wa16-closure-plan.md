# 601 WA-16 收口复检与门禁固化（临时方案与坏味道审计路线图收口）

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` WA-16 条目（:65+:141-146）；先例：interaction-state IS-9 同探针复检
> Related: `docs/audits/workaround-code-smell/ledger.md`

## Purpose

路线图收口：跨批裁决对账（含三处未消费 successor 承诺重裁定）、复检轮（8 样本分层探针重放）、静态门禁扩展评估落决策、台账 strict 对账锁定、汇总审计总结报告。

## Current Baseline（2026-10-15 对账取证实测，HEAD `9d9470f36`）

- **台账**：49/49 modules audited/uncovered 0/orphan 0；220 findings = pending 0+found 52+verified 168（**R1 m3 注：此为 G1 裁决前取证实测；裁决后计数=found 51/verified 169/successor 递减，G4/G5 与 --strict 锁定记录裁决后计数**）；watch-only 42/successor-required 9/n-a 1；未处置 0/violations 0；`reconcile --strict` PASS（今日实测）。**零 fixed 行=状态机全部 found→verified 直达**。
- **对账缺口（取证发现，本批须裁决）**：①**WA-pgroot-003 台账-现实脱节**——CX-19 已执行一行删（package.json 无此依赖实测），台账行仍 found/successor-required=全库唯一脱节行→翻转 verified；②WA-data-012/WA-layout-004（data-012 行内「CX-11 族扩围证据」/layout-004「successor=CX-11 扩围」[R1 m2 引文如实化]）与 WA-spreadsheet-core-002（「可随 CX-18 或 spreadsheet 域批并案」）——承诺目的地（CX-11/CX-18）closed 未消费→**显式重裁定**（重登记至具名 successor 载体或 watch-only 化+理由）；③其余 5 行[R1 M1 逐行如实归类：pages-001/pages-008/clab-001 三行带 CX-19/20 done-row 显式去向语言；**scheduling-002=design-export-snapshot.md:446 P3 deferred 锚点（无 CX 引用）；clab-005=行内「successor 载体裁决」载体未具名——因 G5 归档本表不应悬空出表，G1 Decision 扩为四行裁之**]。
- **转正清单（W2）**：经典 W2 无出口项唯一=WA-core-001（CX-2 移除→verified）；wa-10..15c 各报告均明记「经典转正件为零」；**W2 无出口清零成立**。
- **复检轮样本（8 分层，探针均 recorded）**：①WA-formula-001（CX-1 commitCompositeState 污染恰红）②WA-runtime-001（CX-4 三变异）③WA-ui-001（CX-9 useSurfaceFocusWrap 恰红 12）④WA-basic-001（CX-12 path→undefined 恰 5 红）⑤WA-fadv-001（CX-14 removeItem minItems 恰 2 红）⑥WA-pager-001（CX-16 选择器/stopPropagation+差分对照）⑦WA-cpages-002（CX-19 clampPages/封套/write-face）⑧WA-pgai-003（CX-20 恢复继承→tsc 红）。
- **静态门禁扩展评估输入**：现 check 链 23 子门禁（含 scanner-baselines[R1 m1 计数勘误]）+scanner-baselines 机制（3 扫描器数值基线先例）；(a) TODO/FIXME 无出口扫描——无现成 scanner，活体=恰 1（scheduling undo-stack:194=已裁定双轨设计残留非开放 TODO）→基线 1 起步近零成本；(b) as any 增量禁令——无 scanner/baseline，非测试活体 43（roadmap 拟制期 46=平降）；数值基线先例适配；(c) 归一化重复块——check:duplicates-baseline 已在链（jscpd packages/ minLines 6，ratio≤8%+count≤597 双轴）——**apps/（playground）不在扫描范围=天然扩展评估发现**。
- **汇总输入**：220=168 verified+52 found（全带显式去向 42 watch/9 successor/1 n-a）；39 工作项 done（WA-0..15c 19+CX-1..20 20）；窗口 2026-10-10 拟制→10-15；55 commits。
- **在途**：并行会话 17 脏路径（playground app shell/flow-designer palette/docs metamodel 域）——本批不触碰；提交严格限定本批路径。
- **授权链**：本批=对账+评估+复检（check 链若按评估结论接线新 scanner=scripts 增量非保护区），无新增人工门；既有各区人工门均已在其批次落字。

## Goals

- **G1 对账**：WA-pgroot-003 台账翻转 verified；data-012/layout-004/spreadsheet-core-002 三行显式重裁定落字（去向/理由）。
- **G2 复检轮**：8 样本探针重放全绿（变异恰红→sha256 恢复，各样本按其 recorded 协议）。
- **G3 门禁扩展评估**：三候选评估结论落字（建议形态+理由+非纳入项豁免理由）；若结论=纳入，机械接线（scanner 脚本+基线+check 链挂载）并全绿验证。
- **G4 汇总报告**：`docs/audits/workaround-code-smell/summary.md`（220 findings 终态/39 工项/窗口/successor 与 watch 完整清单/归档注记）。
- **G5**：reconcile --strict 锁定进路线图 WA-16 收口记录；roadmap WA-16 `todo → done`+归档注记（Rule 6：一次性战役收口）。

## Non-Goals

- 新增 watch/successor 项的执行（各自载体已登记）；apps/ 重复扫描扩围实施（评估结论若纳入=后继步骤注记）；并行会话任何文件。

## Scope

### In Scope

- ledger（pgroot 翻转+四行重裁定）；roadmap（WA-16 done+归档注记）；summary.md 新件；复检轮探针重放（仅临时变异+恢复）；check 链接线（若 G3 结论=纳入）

### Out Of Scope

- 并行会话 17 脏路径；任何 successor 项执行；apps/ 扫描扩围实施。

## Failure Paths

不适用（对账/复检/评估批）。

## Test Strategy

档位：**必须自动化**。复检轮=探针重放本体（8 样本变异恰红→sha256 恢复→套件绿）；reconcile --strict exit 0；若接线新 scanner→check 全链绿验证。

## Execution Plan

### Phase 1 - 复检轮与对账

Status: done（2026-10-15 执行 session；HEAD 9d9470f36 复钉）
Targets: ledger+八样本

- Item Types: `Proof | Decision`

- [x] Proof：8 样本探针重放（各按 recorded 协议：变异恰红→sha256 逐字节恢复→套件绿）——分层=早 2/中 3/晚 3。
  - 实测：8/8 恰红全绿。①formula-001 commit-state.ts key-check 污染=core 3/formula 3/compiler 4 红；②runtime-001 谓词→单层 message 嗅探=13 红/1543；③ui-001 去 visibility filter=5 红/352；④basic-001 compile 侧 path→undefined=恰 5 红/671（read 侧变体 4 红先证亦逐字节恢复）；⑤fadv-001 removeItem 删 minItems=恰 2 红/1213；⑥pager-001 Escape 去 stopPropagation=ui+page(A)+flow(B) 各 1 红；⑦cpages-002 clampPages 忽略=恰 2 红/41 pins；⑧pgai-003 恢复 SchemaObject 继承=core tsc 恰 4 钉位点红+playground tsc 恰 7×TS2322 五宿主（pre-mutation sha 1be0c668 与 CX-20 audit 记录同值）。八样本 shasum 前后逐字节一致；日志 \_tmp/wa16-replay-01..08；恢复后 11 受影响包套件全绿（core 698/formula 239/compiler 565/runtime 1542+1skip/ui 352/basic 671/fadv 1213/page 175/flow 306/industrial 1721/playground 528）。
- [x] Decision G1（**R1 交付处置，扩为四行**）：pgroot-003 翻转 verified；**WA-data-012/WA-layout-004 → watch-only 化**（引 CX-11 G5 邻接裁定[WA-form-003 行在案：三跨包邻接裁定非 ui 补偿形态 watch]+行内行为正确证据[自家子树+role/data-slot 契约标记、APG 注释]；**禁挂 CX-17「ui 原语 forwardRef 化」族**[该族专指补偿层形态，此两行已明裁非补偿形态=挂入即错分类]）；**WA-spreadsheet-core-002 → 保 successor-required 重指向具名载体「spreadsheet undo/dirty 守卫独立小批」**（~30 no-op handler 同值覆写守卫；须显式推翻 plan 547「逐字节一致」迁移语义=行为变更，watch-only 会低估 live-defect 类）；**WA-clab-005 → 裁「删 root+shim+导出行」微批载体**（全历史零消费[R1 交付]；归档后不悬空）。
  - 实测：五 ledger 行落字（277/148/174/235/291 行）；裁决后 reconcile=220=found 51+verified 169，watch 44/successor 6/n-a 1，未处置 0/violations 0（与计划预测 52→51、168→169、9→6、42→44 全符）。
- [x] Proof：reconcile --strict PASS 复验落字。
  - 实测：`reconcile --strict` PASS（uncovered=0/未处置=0/violations=0，exit 0）；日志 \_tmp/wa16-strict-final.log。

Exit Criteria:

- [x] 8/8 重放全绿；台账零脱节行；--strict PASS。

### Phase 2 - 门禁扩展评估与汇总

Status: done（2026-10-15 执行 session 完成 G3/G4；G5 的 roadmap 翻转+归档注记与 closure audit 由收口编排完成[agent_e750dbfd R1 approved 后回勾]）
Targets: check 链（若纳入）+summary.md+roadmap

- Item Types: `Decision | Proof`

- [x] Decision G3（**R1 裁定**）：(a) TODO/FIXME 无出口扫描=**include-now**（新脚本+scanner-baselines 数值条目基线=1[现态唯一活体=已裁定 scheduling 双轨残留]；零成本链保持绿）；(b) as-any 计数基线=**include-now**（scanner-baselines 数值先例直接适配，基线 43；**非测试过滤钉死**；后继 pages-008/clab-001 契约批走 --update-baseline 收窄）；(c) duplicates apps/ 扩围=**defer-with-reason**（jscpd scope 扩展=治理变更且命中量未知——pages-001 886 对预示大红集叠加并行在途；summary.md 记豁免理由+Follow-up 开工注记待 pages successor 落地后评估）。
  - 实测：(a)(b) 落地=新 scanner `scripts/audit/find-todo-exitless.mjs`+`scripts/audit/find-as-any-casts.mjs`（口径钉死：apps+packages 非测试）；(c) defer-with-reason 落 summary.md §7+本 plan Follow-ups 注记。**计数勘误披露[m3 同款]**：as-any 拟制期引用 43，执行期钉死口径实测=41（apps 30+packages 11；差 2 为拟制时点口径漂移），按实测登记基线 41 并落 scanner-baselines.json reRegistrationNotes——基线 1/41 依赖钉死过滤。TODO 活体恰 1=undo-stack.ts:194 与裁定一致。
- [x] Fix：若纳入→机械接线+**判别性 Proof[R1 m4]**：注入违规物（临时 TODO/as any）→新 scanner 红→移除恢复绿；**scanner 口径钉死**（测试文件排除、packages+apps 范围——基线 1/43 依赖该过滤）+check 全链绿验证。
  - 实测：接线=check-scanner-baselines.mjs BASELINED_SCANNERS 3→5+scanner-baselines.json 两数值条目+package.json `check:audit-todo-exitless`/`check:audit-as-any-casts` 独立入口（链上集成=check:scanner-baselines）。判别性 Proof 双双实证：注入临时 TODO→2>1 红（exit 1）→移除逐字节恢复→绿；注入临时 as any→42>41 红→移除逐字节恢复→绿（日志 \_tmp/wa16-g3-scanner-proofs.log）。`pnpm check` 全链 exit 0（含五扫描器数值门禁；日志 \_tmp/wa16-check-chain.log）。
- [x] Proof G4：summary.md 汇总报告落盘。
  - 实测：`docs/audits/workaround-code-smell/summary.md`（220 终态计数[G1 后]/39 工项+WA-16/窗口与 55 commits/successor 6 具名载体+watch 44 完整清单/W2 清零声明/G3 三决策/Rule 6 归档注记）。
- [x] Proof G5：roadmap WA-16 done+归档注记；独立 closure audit。（2026-10-15 收口编排完成：closure audit agent_e750dbfd R1 approved[0B/0M/1m]后 roadmap WA-16 done+归档注记据实回勾）
  - 状态：**留收口编排（Phase 3）**——执行侧已交付 `reconcile --strict` PASS 实测（\_tmp/wa16-strict-final.log）；roadmap WA-16 翻转、归档注记与 closure audit 不得由本执行 session 自办。

Exit Criteria:

- [x] 评估结论在案（含豁免理由）；summary 落盘；closure audit approved。（agent_e750dbfd R1 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_8edd162e-6cc4-4134-a1dc-2bd37c52fca5，review-only）
- Verdict: R1 `fail`（0B/1M/4m）→全修；R2 `pass`（0B/0M/1m[m5 三行→四行措辞已随 activation 折叠]）
- Rounds: 2
- Findings addressed: **M1** 基线③「5 行各带 CX-19/20 去向语言」仅 3/5 成立（scheduling-002=design-doc 锚点/clab-005=载体未具名）→逐行如实归类+G1 Decision 扩四行（clab-005 裁定微批载体不悬空出表）；**m1** 子门禁 22→23（含 scanner-baselines）；**m2** data-012 引文如实化；**m3** 裁决前后计数披露落字（G4/G5 与 --strict 记裁决后计数）；**m4** include-now 增判别性 Proof（注入违规→红→移除绿）+scanner 口径钉死。R1 三处具体处置交付：data-012/layout-004→watch-only 化（CX-11 G5 邻接裁定引+禁挂 forwardRef 族=错分类防护）/spreadsheet-core-002→保 successor 重指向「undo/dirty 守卫独立小批」（须显式推翻 plan 547 迁移语义=行为变更）/G3 三候选=include-now×2+defer-with-reason×1。R1 verified-clean：reconcile --strict PASS 实测/脱节行属实/三承诺属实/W2 清零成立/8 探针全 recorded 且两抽检实证/静态输入（23 门禁+TODO 恰 1+as any 43 平降+duplicates 在链 apps/ 缺口）/55 commits/17 脏路径域归属/模板合规。

## Closure Gates

- [x] 复检轮 8/8+对账裁决落字+门禁评估结论+summary 落盘
- [x] reconcile --strict PASS+受影响套件绿（复检轮恢复后）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_e750dbfd R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree wa16-verify@HEAD 9d9470f36，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——**全链 exit 0 含两个新子门禁**[audit-todo-exitless 基线 1+audit-as-any-casts 基线 41]；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- apps/ 重复扫描扩围（若 G3 结论纳入则为此项开工注记）。→ **G3(c) 裁定 defer-with-reason（2026-10-15 执行落字）**：jscpd apps/ 扩围=治理变更且命中量未知（pages-001 886 逐字探针对预示大红集，叠加并行 pages/ 域在途）；待 pages successor（WA-pages-001 demo-env 工厂批）落地后评估扩围。豁免理由全文档 `docs/audits/workaround-code-smell/summary.md` §7。
- 全部 successor 载体（各批次 Deferred 已登记）归各自路线图/批次跟踪。→ 完整具名清单已固化于 summary.md §5（successor 6+watch 44+n-a 1，G1 裁决后口径）。

## Closure

Status Note: 2026-10-15 收口——**临时方案与坏味道审计路线图收口**：全部 40 工作项 done（WA-0..WA-15c 19 批+CX-1..CX-20 20 批+WA-16 本批），本表归档（Rule 6 一次性战役）。复检轮 8/8 探针重放全绿（变异→精确红→sha256 逐字节恢复）；G1 五行台账裁决（pgroot-003 台账-现实脱节修复+四行重裁定；裁决后 220=found 51+verified 169/watch 44/successor 6/n-a 1/未处置 0）；G3 门禁扩展=TODO 出口扫描+as-any 计数基线 include-now（两新子门禁入链全绿+判别证明齐）+duplicates apps/ 扩围 defer-with-reason；summary.md 汇总落盘；reconcile --strict PASS；实施=派驻 agent，本会话编排/门禁/终局回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_e750dbfd-2180-4cf8-a06f-3d9740c8edfe，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/1m 非阻塞——m1=check-scanner-baselines --update-baselines writer 硬编码 three+重生成会丢 reRegistrationNotes：一词已修+notes-preservation 登记 Non-Blocking Follow-up[registered JSON 本体正确]）
- Findings addressed: 审计员逐项对账（两 scanner 口径钉死核验[apps+packages 非测试全词]/接线三处+链集成/summary 终态计数手工清点[watch 44/successor 6/n-a 1 与 reconcile 全吻合]/ledger 五行逐行[pgroot 脱节修复注记+forwardRef 族禁挂+plan-547 推翻披露+载体具名]/roadmap 单行 diff[无越权 done 翻转]/保护 17 路径零标识符）+**亲判 2/8**（WA-basic-001 path→undefined→恰 5 红 671→sha 6e5f4c8b 逐字节恢复；WA-pgai-003 恢复继承→flux-core 恰 4 钉位点红+playground 7×TS2322→sha 1be0c668 恢复→双绿）+**归档就绪 CONFIRMED**（39 done+WA-16 唯一未 done；strict live PASS；summary 无悬空出口）。

Follow-up:

- check-scanner-baselines --update-baselines writer 保留 reRegistrationNotes（手工维护段防重生成覆盖；registered JSON 本体正确）。
- apps/ 重复扫描扩围评估（pages successor 落地后）。
- 全部 successor 载体（6 具名+44 watch）归各自域跟踪。
