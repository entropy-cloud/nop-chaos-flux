# 临时方案与坏味道审计战役总结（Campaign Summary）

> 战役：`docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-0..WA-16 一次性线性战役，Rule 6）
> 台账：`docs/audits/workaround-code-smell/ledger.md`（生成机制 `pnpm workaround:inventory`，状态翻转随批次 plan 生命周期）
> 收口批：plan `docs/plans/601-wa16-closure-plan.md`（2026-10-15，HEAD `9d9470f36` 起）
> 窗口：2026-10-10 拟制 → 2026-10-15 收口，战役窗口内 55 commits（plan 601 baseline 取证实测，R1 verified-clean）

## 一、终态计数（G1 裁决后，`pnpm workaround:reconcile --strict` PASS 实测）

- 模块：49/49 audited / uncovered 0 / orphan 0。
- 发现：**220 条终态** = pending 0 + found 51 + fixed 0 + **verified 169**（零 fixed 行=状态机全部 found→verified 直达）。
- 处置：watch-only 44 / successor-required 6 / withdrawn 0 / n-a 1；未处置 0 / violations 0。
- `reconcile --strict`：PASS（uncovered=0 / 未处置=0 / violations=0）。
- 裁决前计数（plan 601 baseline，2026-10-15 对账取证实测）：220 = found 52 + verified 168，watch-only 42 / successor-required 9 / n-a 1。裁决净变化：pgroot-003 翻转 verified（found −1 / verified +1 / successor-required −1）；data-012、layout-004 watch-only 化（successor-required −2 / watch-only +2）。

## 二、工作项与窗口

- **39 工作项 done**：WA-0..WA-15c（19 项审计批次）+ CX-1..CX-20（20 项共性重构收敛批）；各批次 plan/closure audit 证据在各自 roadmap 条目。
- **WA-16 收口复检与门禁固化**（plan 601）= 本批：G1 对账四处落字、G2 复检轮 8/8 全绿、G3 门禁扩展 include-now ×2 + defer-with-reason ×1、G4 本报告、G5 strict 锁定。roadmap WA-16 `todo → done` 翻转与战役收口提交由收口编排执行（Rule 6：一次性战役收口，非本执行 session 职责）。

## 三、G1 跨批裁决对账（本批落字，详见 ledger 行内注记）

1. **WA-pgroot-003**：found/successor-required → **verified**（CX-19 已执行 playground 死依赖一行删+lock 同步+knip 基线外科重立；台账行未随 CX-19 翻转=全库唯一台账-现实脱节行，本批补记翻转）。
2. **WA-data-012 / WA-layout-004**：successor-required → **watch-only**（原承诺目的地 CX-11 closed 未消费；依 CX-11 G5 邻接裁定先例[WA-form-003 行在案：跨包邻接位点非 ui 补偿形态 watch]+行内行为正确证据[自家子树+role/data-slot 契约标记、APG 注释]；**禁挂 CX-17「ui 原语 forwardRef 化」族**——该族专指补偿层形态，此两行已明裁非补偿形态，挂入即错分类）。
3. **WA-spreadsheet-core-002**：保 successor-required，载体重指向具名 **「spreadsheet undo/dirty 守卫独立小批」**（原拟并案目的地 CX-18 closed 未消费；~30 no-op handler 同值覆写守卫；watch-only 化会低估 live-defect 类；须显式推翻 plan 547「逐字节一致」迁移语义=行为变更，随载体批显式申报）。
4. **WA-clab-005**：保 successor-required，载体具名 **「删 root+shim+导出行」微批**（全历史零消费[R1 交付取证]；归档后载体不悬空）。
5. 其余 5 行如实归类核对：pages-001/pages-008/clab-001 带 CX-19/20 done-row 显式去向语言；scheduling-002=design-export-snapshot.md:446 P3 deferred 锚点（无 CX 引用）；clab-005 载体本批具名（前项）。

## 四、G2 复检轮（8 样本分层探针重放，早 2 / 中 3 / 晚 3——全部恰红→逐字节恢复）

| #   | 样本           | 变异（目标文件）                                                       | 恰红观测                                                                                                    | 恢复                                                                            |
| --- | -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ①   | WA-formula-001 | commit-state.ts:18 key-check 污染（isEqual 取反）                      | flux-core 3 红/698 + flux-formula 3 红/239（CX-1 特征化）+ flux-compiler 4 红/565（CX-1 特征化）            | sha256 `b4745d6e…` 逐字节一致                                                   |
| ②   | WA-runtime-001 | unpopulated-scope-error.ts 谓词→单层 message 嗅探                      | flux-runtime 13 红/1543（plain-Error 钉+未发布 scope 全族钉）                                               | `37d9944b…` 一致                                                                |
| ③   | WA-ui-001      | use-surface-focus-wrap.ts 去 `.filter(isElementVisible)`               | ui 5 红/352（B-form 隐藏排除钉 ×3+initial-focus 隐藏候选 ×2）                                               | `559def9f…` 一致                                                                |
| ④   | WA-basic-001   | surface-open-binding.ts compile 侧 `path = undefined`（recorded 形态） | flux-renderers-basic 恰 5 红/671（plan-459 复开钉 ×3+CX-12 钉 ×2）                                          | `6e5f4c8b…` 一致（另 read 侧 openPath→undefined 变体先观测 4 红、亦逐字节恢复） |
| ⑤   | WA-fadv-001    | array-container-controller.ts removeItem 删 minItems 分支              | flux-renderers-form-advanced 恰 2 红/1213（CX-14 结果码钉）                                                 | `086b4f49…` 一致                                                                |
| ⑥   | WA-pager-001   | use-context-menu-shell.ts Escape 去 `stopPropagation()`                | ui 1 红/352 + page-designer-renderers 1 红/175（A）+ flow-designer-renderers 1 红/306（B）= 三面钉          | `a788860f…` 一致                                                                |
| ⑦   | WA-cpages-002  | mock-backend-replica-kit.ts clampPages 三元忽略                        | playground pins 恰 2 红/41（A 形空行 pages=1 钉+AB 并排判别钉）                                             | `7e48061a…` 一致                                                                |
| ⑧   | WA-pgai-003    | renderer-api.ts 恢复 SchemaObject 继承（extends+data?: SchemaValue）   | flux-core tsc 恰 4 钉位点红（env-stream-socket.test.ts 195/199/209/213）+ playground tsc 恰 7×TS2322 五宿主 | `1be0c668…` 一致（与 CX-20 closure audit 记录 sha 同值）                        |

探针日志：`_tmp/wa16-replay-0{1..8}-*.log`（临时产物，恢复后即弃；受影响套件恢复后复跑全绿见本批 dev log）。

## 五、开放项完整清单（归档后不悬空——successor 全具名载体）

### successor-required（6）

| ID                      | 模块                      | 具名载体                                                                                      |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| WA-scheduling-002       | flux-renderers-scheduling | design-export-snapshot.md:446 P3 deferred 锚点（html2canvas 装载收敛批次，无 CX 引用）        |
| WA-spreadsheet-core-002 | spreadsheet-core          | 「spreadsheet undo/dirty 守卫独立小批」（plan 601 G1 重指向）                                 |
| WA-pages-001            | pg-pages                  | pages/ 域批：demo-env 工厂提取（CX-19 Deferred 落字，57 文件改写面避让并行 churn）            |
| WA-pages-008            | pg-pages                  | CX-20 扩围：SchemaInput/registry 类型工效批（执行前人工确认门；as never ×79+as any 族 ×14）   |
| WA-clab-001             | pg-component-lab          | CX-20 根因第三波位点（与 WA-pages-008 同缝 SchemaObject/SchemaInput 契约评审耦合；63+4 承重） |
| WA-clab-005             | pg-component-lab          | 「删 root+shim+导出行」微批（plan 601 G1 具名；全历史零消费）                                 |

### watch-only（44）

WA-formula-002/003, WA-compiler-002, WA-runtime-006, WA-action-core-003/004, WA-react-006/009/010/011/012/013, WA-basic-006/007/008, WA-form-005/007/008/009, WA-fadv-008/009/010, WA-data-003/007/011/012, WA-content-006/008, WA-scheduling-004/006/007/008, WA-layout-004, WA-flowr-008, WA-sheetr-006/007/008, WA-wordr-008/010, WA-ai-005/008, WA-spreadsheet-core-003, WA-industrial-005/007（各行证据与观察条件在 ledger 行内）。

### n-a（1）

WA-form-010（ledger 行内理由在案）。

## 六、W2（经典无出口项）清零声明

经典 W2 无出口项唯一活体 = WA-core-001（CX-2 移除→verified）；wa-10..15c 各批次报告均明记「经典转正件为零」。**W2 无出口清零成立**。现态全库唯一 TODO/FIXME/HACK/WORKAROUND 标记 = scheduling undo-stack.ts:194（已裁定双轨设计残留注记，非开放 TODO），由本批新门禁 `find-todo-exitless` 以基线 1 钉死。

## 七、静态门禁扩展决策（G3）

- **(a) TODO/FIXME 无出口扫描 = include-now**。新 scanner `scripts/audit/find-todo-exitless.mjs`（口径钉死：apps+packages 非测试、整词原文匹配、注释内含），基线 = 1；接线 = `check:scanner-baselines` 五扫描器数值门禁（`check:audit-todo-exitless` 独立入口同在）。判别性证明：注入临时 TODO → 2 > 1 红（exit 1）→ 移除逐字节恢复 → 绿（exit 0）。
- **(b) as-any 计数基线 = include-now**。新 scanner `scripts/audit/find-as-any-casts.mjs`（同口径；后继 pages-008/clab-001 契约批走 `--update-baselines` 收窄），**基线 = 41**。判别性证明：注入临时 `as any` → 42 > 41 红 → 移除逐字节恢复 → 绿。**计数勘误披露**：plan 601 拟制期引用 43，执行期按钉死口径复测 = 41（差 2 为拟制时点口径漂移），以实测登记并落 `scanner-baselines.json` reRegistrationNotes。
- **(c) duplicates apps/ 扩围 = defer-with-reason**。jscpd 扫描域扩展属治理变更且命中量未知（WA-pages-001 的 886 逐字探针对预示大红集，叠加并行 pages/ 域在途）——豁免理由在案，Follow-up 开工注记：待 pages successor 落地后评估扩围（plan 601 Non-Blocking Follow-ups 已有对应条目）。

## 八、归档注记（roadmap Rule 6）

本轨道为线性一次性战役：全部工作项 done + WA-16 收口后 roadmap 归档。后续防回退不建持续闭环飞轮，依靠：

1. 本批沉淀的两个新数值基线门禁（`find-todo-exitless` 基线 1、`find-as-any-casts` 基线 41，随 `check:scanner-baselines` 链上运行）；
2. 既有 `check:audit-*` 族（renderer-browser-io、runtime-raw-schema-reads、styling-suspects、discover-audit-suspects、test-global-leaks 等）；
3. 台账 `ledger.md` 归档留存（本表不再作为活账推进；successor/watch 各归其载体批次跟踪）。

临时方案是否复发待后续实证：若新标记/cast 增量门禁红或审计发现复发，再评估是否新开闭环轨道（roadmap Rule 6 选型依据）。

## 九、执行与环境披露

- 本批执行（plan 601 Phase 1-2）零提交：台账四处裁决+五文件门禁接线+summary 为工作树变更，由收口编排统一审阅提交。
- 并行会话 17 脏路径（playground app-shell/flow-designer palette/docs metamodel 域）零触碰；复检轮全部变异均逐字节恢复（shasum 前后一致）。
- 复检轮涉及包套件恢复后复跑全绿；`pnpm check` 全链（含两个新子门禁）验证与本批 dev log 记录为准。
