# QA.6 集成审计 #5 — missing-components（gate = L6 S2 标准页面设计器 MVP 完成）

> Auditor / Agent: 独立 fresh 子 agent（QA.6 集成审计员，2026-09-26/27，与 plan 523 执行/closure 会话无关）
> 审计对象: schema round-trip 无损性（fixed-seed 变异 fuzz 实跑 + INV-A~F 断言 vs S1 §6.1 清单）；inspector 由 propContracts 生成契约（editableProps 全覆盖断言实跑 + `resolveRendererAuthoringContract` 消费一致性）；与六域设计器边界不越界（classifyNode sourcePackage 兜底实跑 + 双包 import 图 grep + palette 白名单核对）；附带：两新包 vitest 全绿 + 覆盖率 + playground 注册边界 + `pnpm check` 全链
> 审计基线: HEAD `a48bb04c8`（plan 523 L6 S2 收口 commit 已入库：page-designer-core + page-designer-renderers + playground 入口 + e2e spec + 登记）。工作树仅 1 处与本审计无关的未提交改动（`docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md`，+10/-17，非 523 范围，不审计）
> 审计依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11 QA.6 行（Pass = round-trip 0 丢失 + 边界 0 越界）/ §13；`docs/components/page-designer/design-architecture.md` §6.1（INV-A~F）/ §6.2（fuzz 种子策略）/ §8.1 / §9 / §10.1-10.2 / §11.1；`docs/plans/523-missing-components-l6-s2-page-designer-mvp-plan.md`；`docs/audits/00-audit-execution-guide.md`（Pass = 0 Blocker 且 0 Major）；格式先例 `QA.5-integration-audit.md`
> 审计输入: Fresh Context 三件套（审计依据文档 + live 仓库 + 实跑验证输出），未读执行会话历史

## 1. schema round-trip 无损性（实跑）

命令：`cd packages/page-designer-core && npx vitest run --coverage src/round-trip` → **11 passed（exit 0）**；全包口径 `round-trip.ts` 覆盖率 Stmts 98.71% / Branch 94.59% / Funcs 100% / Lines 100%。

- **fuzz 矩阵**（`round-trip.test.ts:190-200`）：9 变异算子（subtree-insert / subtree-delete / subtree-move / prop-value-mutate / unknown-key-inject / region-subtree-replace / xui-star-inject / deep-nesting-12 层 / root-array-form）× 5 固定种子（1/7/42/1337/20260926）= **45 组合全绿**，每组合双断言：`deepEqual(stripSessionIds(injectSessionIds(doc)), doc)` + `JSON.stringify` 逐字节相等（深相等 + 键序一致）。变异口径 = S1 §6.2 立约的「固定种子 PRNG + 变异算子集枚举」确定性矩阵（roadmap §11 的「随机变异」由其实现承載——S1 review 已裁定，快照可复现）。
- **导入→导出全链**：`injectSessionIds` = 载入/导入单点（`session.ts:89` 新建会话亦注入）、`stripSessionIds` = 导出投影单点（`session.ts:55` adapter.serialize 内部调用）；`importDocument` 命令链（JSON.parse → `adapter.validate` 拒绝未注册 type 且 working 逐字保留 + undoDepth 0 → 注入 → 1 条 undo 步）在 `commands.test.ts:104-143` 实跑钉住；剥离后再注入再剥离恒等（`:202-208`）；含 sid 输入重注入全量重分配（sid-collision 失败路径，`:169-178`）。
- e2e 全链叙事实跑见 §4（拖放→inspector 改属性→导出 JSON 断言含变更且无 `xui:sid`/`psid-`）。

### INV-A~F 断言实现 vs S1 §6.1 清单逐条核对

| INV   | S1 §6.1 契约                                                    | live 断言落点（全实跑绿）                                                                                                                                                                                                                                                                                   | 结论 |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| INV-A | 导出恒等式：strip∘inject 与 doc 深相等且键序一致，fuzz 直接断言 | `round-trip.test.ts:190-200`（45 组合 deepEqual + stringify 逐字节）；`:202-208`（再注入恒等）                                                                                                                                                                                                              | ✅   |
| INV-B | 逐字保留：未知键/用户 `xui:*` 键原样保留，禁归一化重写          | `:151-161`（只注 schema 节点，纯数据对象零注入）；`:241-255`（`xui:imports`/`meta.xui:note` 逐字还原）；unknown-key-inject 算子含 `custom.key/with~tilde` JSON Pointer 转义键；edit-assembly `:24-34`（投影不动输入文档、用户键逐字）                                                                       | ✅   |
| INV-C | 键序保留：结构共享，未触碰子树保持引用与键序                    | `commands.test.ts:394-404`（兄弟子树 `toBe` 引用同一 + `Object.keys` 序不变 + 被触碰链重建）；fuzz stringify 逐字节断言兜底全树键序                                                                                                                                                                         | ✅   |
| INV-D | sid 稳定性：树内唯一；move/undo/redo 不变；复制新 sid；删除失效 | `round-trip.test.ts:138-149`（sid 数 === schema 节点数、集合唯一、`psid-[0-9a-z]{6}` 格式）+ `:217-226`（占用重试）；`commands.test.ts:249-263`（跨 region move sid 不变）、`:167-179`（undo/redo 逐字恢复同 sid）、`:202-214`（删除后 undo 恢复原 sid + 选区修剪）、`:359`（replaceRegion 复制全量新 sid） | ✅   |
| INV-E | 运行时零感知：导出不含 `xui:sid`；预览剥离；零运行时消费路径    | `round-trip.test.ts:163-167`（剥离零残留）+ `commands.test.ts:406-411`（commit().serialized 不含）+ e2e 第 3 例（预览态 `[data-psid]` 清零、回编辑态恢复）+ **静态 grep：`xui:sid`/`psid-` 在两 page-designer 包之外的 packages/apps src 零命中**（edit-assembly 只投影编译副本 testid，working 文档不动）  | ✅   |
| INV-F | 授权态单向：serialize/diff/applyDiff 只作用于授权态 SchemaInput | `session.ts:50-72`（adapter 四投影全部 SchemaInput 出入）；`TemplateNode` 在两包仅出现于文档注释；edit-assembly `beforeCompile` 只变换编译副本（`edit-assembly.test.ts` 4/4：输入不变异、导出投影永不带注入的 testid）                                                                                      | ✅   |

**本项结论：round-trip fuzz 45/45 全绿，INV-A~F 六条不变式逐条有实跑断言钉住、与 S1 §6.1 清单零缺项——Pass 标准「round-trip 0 丢失」满足。**

## 2. inspector 由 propContracts 生成契约（实跑 + 消费一致性）

命令：`npx vitest run src/inspector-schema.test.ts`（含于 core 全量）→ **17 passed**。

- **editableProps 全覆盖断言（QA.6 载体，`inspector-schema.test.ts:66-105`）**：3 条断言实跑绿——生成字段名集 === `editableProps` 键集（无遗漏无幻影）、覆盖矩阵内全部 fixture definition、每个生成字段名可回溯到声明的 prop 键。
- **region/event 零泄漏**（`:107-141`）：`kind:'region'` 键从面板剔除、event/reaction 与 `contract.events` 合并去重路由 `xui:events` 只读清单；propContracts 纪律违例（region/event 误注册为 prop）被生成器侧强制收容（面板零出现）。
- **editorType→控件直映 + shape 推导兜底**（`:143-270`）：内置六控件直映、expression 原样文本降级（不解析不失真）、all-literal union→select、混合 union→input+shape 提示（不静默截断）、无 propContracts 降级原始 JSON 直编（非空白面板）全绿。
- **消费一致性（`resolveRendererAuthoringContract` 单点路径）**：实现唯一点 `flux-core/src/types/renderer-authoring-contract.ts:71`（`editableProps = definition.propContracts ?? {}`）；全仓消费方三类且全部经该函数——① page-designer-core 生成器（`inspector-schema.ts` 类型面输入）；② page-designer-renderers 面板（`inspector-panel.tsx:188`，并以 `definition.fields` 作 fieldRules 分流）；③ nop-debugger（`controller-component-inspector.ts:100`，同源契约喂检查器）。零第二套解析路径、零面板私有 DSL；`check:schema-prop-coverage` 在 `pnpm check` 全链中 EXIT=0（§6）。

**本项结论：buildInspectorSchema 契约生成面全覆盖断言实跑绿，authoring contract 三类消费方同源单点，一致性成立。**

## 3. 与六域设计器边界不越界（实跑 + 静态核对）

- **classifyNode sourcePackage 兜底测试实跑**：`npx vitest run src/classify.test.ts` → **6 passed**。覆盖：`domain-host-renderer` → opaque-leaf；instance/flux-owner → page；缺失 class + 非六域 sourcePackage → page；**六域 11 包全枚举**（flow-designer-core/renderers、report-designer-core/renderers、word-editor-core/renderers、flux-print-core/renderers、flux-renderers-industrial、spreadsheet-core/renderers）在声明 `instance-renderer` 时仍收敛叶子（S1 review Major-1 回归点，`:45-53`）；前缀匹配不吞核心家族（`flux-renderers-layout` → page、`flux-renderers-industrial-core-x` → opaque-leaf）。palette-filter 11/11 绿（三序贯规则 + stage 白名单 + allowlist 不可绕过 no-default-schema/stage，放入即强制叶子）。
- **import 图零六域**：grep 两包全部 import 语句——page-designer-core 仅依赖 `@nop-chaos/editor-core` + `@nop-chaos/flux-core`（零 React，package.json 同）；page-designer-renderers 仅依赖 editor-core/flux-core/flux-formula/flux-i18n/flux-react/flux-renderers-basic/flux-renderers-form(definitions)/flux-renderers-layout/page-designer-core/ui。**六域包清单（flow-designer-\* / report-designer-\* / word-editor-\* / flux-print-\* / flux-renderers-industrial / spreadsheet-\*）在两包 src 的运行时 import 零命中**（全部命中为 classify 六域清单本体 + 测试 fixture + 文档注释）；无动态 import 变体。
- **palette 白名单零六域 type**：`designer-registry.ts` 自持 registry 只注册 basic/form/layout 三家族；`MVP_PALETTE_TYPES` = page/container/flex/grid/collapse/tabs + 17 个设计器侧脚手架原子（form 族 + text/button），无一六域 type；`buildMvpPaletteItems`/`resolvePaletteScaffold` 对每条目二次 `classifyNode` 反查（opaque-leaf 恒拒）——静态（不注册六域包）+ 动态（classify 兜底）双防线与 S1 §10.1/§10.2 相符。
- **Pass 标准「边界 0 越界」满足**（静态 import 面 + 分类运行时防线 + palette 白名单三层核对零越界；plan Phase 3 声称的第三层「import 边界扫描 check 项」未落地，见 Minor-2——不改变 0 越界事实）。

## 4. 附带核对（两包全绿 + 覆盖率 + playground 注册边界）

| 项                              | 实跑结果                                                                                                                                                                                                                                                                                                                                                                                                                        | 结论 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| page-designer-core vitest       | `npx vitest run --coverage` → **8 files / 109 passed（exit 0）**；coverage 全维 ≥90 阈值（Stmts 97.33 / **Branch 92.08** / Funcs 99.09 / Lines 99.22）                                                                                                                                                                                                                                                                          | ✅   |
| page-designer-renderers vitest  | `npx vitest run --coverage` → **12 files / 91 passed（exit 0）**；coverage 全维 ≥90 阈值（Stmts 97.44 / **Branch 91.42** / Funcs 100 / Lines 98.67）                                                                                                                                                                                                                                                                            | ✅   |
| e2e（playground 入口五件套）    | `npx playwright test tests/e2e/page-designer-mvp.spec.ts` → **3 passed（20.8s，exit 0，零截图全程序化断言）**：拖放→inspector 改 tag=h1→导出 JSON 含变更且无 `xui:sid`/`psid-`；undo+结构树投影；预览态锚点剥离/回编辑恢复                                                                                                                                                                                                      | ✅   |
| 两包 typecheck / lint           | `pnpm --filter @nop-chaos/page-designer-core --filter @nop-chaos/page-designer-renderers typecheck` 0 错；`lint` 0 错                                                                                                                                                                                                                                                                                                           | ✅   |
| playground 主 registry 不被污染 | `apps/playground/src/App.tsx:141` 主 registry 只注册标准 renderer 家族；`@nop-chaos/page-designer-*` 在 playground src 的唯一触点 = lazy import 的 demo 薄壳（`App.tsx:120` + `pages/page-designer-demo.tsx`），设计器自持 registry 在 `page-designer-page.tsx:60` `useMemo(createPageDesignerRegistry)` 内创建——主 bundle 与主 registry 零共享（S1 §11.1）；入口 `#/page-designer`（designer 分组）+ L0 注册表 home 卡派生在案 | ✅   |
| INV-E 静态面                    | `xui:sid`/`psid-` 消费者在两包之外 grep 零命中（§3 INV-E 行）                                                                                                                                                                                                                                                                                                                                                                   | ✅   |

## 5. roadmap §13 与登记面回写核对

- **§13 :239（L6 S0–S4）仍为 `proposed` / Plan `—` / 备注含「S1 未过 review 不写实现」**：与 live 三重不符——S0/S1 已完成（S1 过独立 review gate 是 plan 523 Current Baseline 明记前置）、S2 已随 523 commit 入库、备注文本事实过期。定性：per §11 纪律「审计未过，对应线不得回写 done」，`done` 回写本就须待本审计通过后由执行 session 落盘（沿 QA.5 先例「本审计不代写」）；但 plan 523 Phase 3 已把「roadmap §13 L6 行回写」勾选 `[x]`，而 523 commit（a48bb04c8，70 文件）**未触碰 roadmap**——勾选先于落地，构成登记面偏差（Minor-1）。
- **quick-reference / flux-guide / dev log 登记在案**：`quick-reference.md:1017-1024` Page Designer 节、`flux-guide/07-structural-nodes.md:192-194`、dev log 09-26/09-27 523 节，与实现抽查零 drift。
- **§4 线状态表 L6 行 `proposed`**：列头「初始状态」（历史初值非当前态），沿 QA.5 裁定非回写缺陷；§13 QA.2–QA.6 行「QA.6 gate=L6 S2 完成（待 523）」待本审计后回写。

## 6. `pnpm check` 全链复跑（实跑）

全链实跑（HEAD 工作树）：**EXIT=0**（15 sub-check 全过，含 `check:i18n-keys`——flux.pageDesigner.\* zh/en 键位 parity 过、`check:schema-prop-coverage` EXIT 0）。

- **oversized 台账**：**208w / 2e（均 flux-i18n locales 在册豁免）/ 2 exempt**——与 QA.5 Minor-1 的投影（206→207 scada-editor-canvas→208 binding-panel）逐跳吻合；**page-designer 两包零 oversized hit**（523 未新增任何 warn/error）。
- **audit-suspects 信息面**：discover 类 medium suspects（不 gates、exit 恒 0）新增少量 page-designer 条目——`inspector-panel.tsx:153`（json-stringify-change-detection 启发式误报：实为 textarea 值序列化非变更检测）、`commands.test.ts:53`（test-module-top-let：标准测试 pattern）、catch 块列举 3 处。无门禁影响，留 QA.7 ④ sweep 备案（Observation-1）。

## 7. Findings

**Blocker：无。Major：无。**

### Minor-1 roadmap §13 L6 行回写缺位 + plan 523 Phase 3 勾选先于落地

- 位置：`docs/backlog/missing-components-and-designer-roadmap.md` :239（L6 S0–S4 = `proposed`/Plan `—`/备注「S1 未过 review 不写实现」三重过期）；`docs/plans/523-...-plan.md` Phase 3 `[x] 登记：…roadmap §13 L6 行回写…`（523 commit 未触碰 roadmap）。
- 影响：权威动态区（§13 自declare「唯一权威动态区」）与 live 矛盾（整条 L6 线显示为未启动）；不改变本审计四项内容结论，属登记面偏差。`done` 回写须待本审计 pass 后由执行 session 落盘（§11 纪律），但勾选应与落地同步。
- 建议：随 523 最终收口批次回写 :239（S0/S1 done→514/523、S2 done→523+本审计档、S3/S4 后续线）、修正 Phase 3 勾选口径；**登记 QA.7 ⑥ 残余债登记册**。

### Minor-2 「新增 import 边界扫描项随本 plan 落地」声明未落地

- 位置：plan 523 Phase 3 首项括注声称「`pnpm check` 零新增红（新增 import 边界扫描项随本 plan 落地）」——523 commit 零 `scripts/` 变更；全仓 check 脚本/`scripts/__tests__` 无任何 page-designer 或六域 import 边界扫描项。
- 影响：边界本身经本审计三层核对成立（§3：依赖声明零六域 + classify 运行时兜底 + palette 白名单），QA.6 Pass 标准「边界 0 越界」不受影响；缺的是把该边界持续自动化的第三层（回归防线），以及声明与 live 的一致性。
- 建议：二选一随收口批次落地——①补最小扫描（如 check-workspace-manifest-deps 增 page-designer→六域禁入规则或 10 行独立脚本）；②更正声明文本并将边界回归防线登记 QA.7 ⑥。

### Minor-3 计数与勾选口径漂移（三类小簿记）

- ① dev log 09-27 与 commit message 记 core「108 tests」；live 实测 **109**（+1 = 载入单点 sid 注入补测，dev log 09-26 已按 109/109 登记，09-27 收口行回退为 108）——沿 QA.5 Minor-2 同类，一行勘误。
- ② plan Phase 3 `[x] QA.6 集成审计` 先于审计勾选（Closure Gates 对应项正确留空「审计进行中」）——本报告 pass 后该项方为事实，随收口批次对齐表述。
- ③ Phase 3 门禁清单自记 `pnpm test:e2e` 勾选；本审计实跑定向 spec 3/3 + check 全链 EXIT=0，全量 e2e 未由本审计重跑（gate Pass 标准 = round-trip 0 丢失 + 边界 0 越界，均实跑满足；执行侧登记口径为 523 commit 前全量实跑 1617 过 + 1 新红已修）。留痕不追。

### Observation-1 audit-suspects 信息面新增 page-designer 条目（非门禁）

`check:audit-suspects` discover 列举（exit 恒 0）新增：`inspector-panel.tsx:153`（json-stringify 启发式误报——值序列化非变更检测）、`commands.test.ts:53`（test-module-top-let——标准测试写法）、catch 块列举 3 处。无门禁影响；QA.7 ④ 代码质量终审 sweep 时顺手裁定即可。

### Observation-2 工作树留痕

工作树存在 1 处与 523/QA.6 无关的未提交改动（`docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md`）；本审计未触碰。审计产出的 `_tmp/qa6-check-output.txt` 中间证据已按 AGENTS.md 临时产物纪律删除，数值已蒸馏入本档。

## 8. Verdict

**pass**（0 Blocker / 0 Major / 3 Minor + 2 Observation）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。三项 Minor 均为登记/簿记类（roadmap 回写缺位 + 扫描项声明未落地 + 计数口径），不改变 gate 结论，全部登记 QA.7 ⑥ 残余债登记册并建议随 523 最终收口批次当场消化。
- 四项审计内容逐项结论：①round-trip fuzz 9 算子 × 5 种子 45/45 全绿，INV-A~F vs S1 §6.1 零缺项、六条全有实跑断言（§1）；②inspector editableProps 全覆盖断言 3/3 + region/event 零泄漏 + editorType/shape 双层映射全绿，authoring contract 三类消费方同源单点（§2）；③classifyNode 六域 11 包兜底 + 前缀不误判实跑绿，双包 import 图零六域、palette 白名单零六域 type、静态+动态双防线在位——边界 0 越界（§3）；④两包 vitest 109+91 全绿、coverage 阈值（90）双达标、e2e 3/3、typecheck/lint 0 错、playground 主 registry 零污染、`pnpm check` 全链 EXIT=0 且 oversized 208w 与 QA.5 投影吻合、523 零新增红（§4/§6）。
- QA.6 集成审计 #5 通过，L6 S2 设计器 MVP 出口获集成审计背书；roadmap §11 QA.6 行、§13 :239 L6 行与 QA.2–QA.6 汇总行的状态回写由编排层/执行 session 在本审计 pass 后执行（本审计不代写）。
