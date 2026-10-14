# 595 Schema 校验强制化（渲染自动验证 + 全 code fail-fast + 三语料清零）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: 2026-10-14 pih-workspace 复刻会话暴露的校验缺口；`docs/architecture/schema-file-validator.md`；`packages/flux-compiler/src/schema-compiler/diagnostics.ts`；`packages/flux-react/src/render-nodes.tsx`；`apps/playground/src/complex-pages/__tests__/page-schemas-validation.test.ts`；`flux-guide/scripts/{validate.mjs,validate-pages.mjs}`
> Related: `docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`（同族：渲染期语义被静默吞掉）

## Purpose

让"开启严格校验开关"在**渲染 Flux JSON 时自动执行 schema 校验并对任何诊断 fail-fast**（当前渲染只是收集诊断后丢弃），同时把三类语料（playground 43 页、`docs/components` 123 示例、`flux-guide` 75 md）清到零 error 诊断，从而把校验从"独立 CLI / 单独门禁"变成"渲染内建强制 + 全 code 门禁"。

## Current Baseline

- 编译器自带校验：`createSchemaCompiler().validate()` / `validateSchema()`（diagnostics-only adapter，`validateSchemaInput` 内部已接 `reporter`；`docs/architecture/schema-file-validator.md`）。
- 渲染路径**未接线**：`flux-react/src/render-nodes.tsx:153-163` 与 `flux-react/src/schema-renderer.tsx:73-77` 只把 strict 转成 `validation.strictMode:true` + `diagnostics:{enabled:true,continueOnError:true}`，**不传 reporter / collector**；`throwIfSchemaDiagnosticsFailed`（`schema-compiler.ts:57-70`）首行因 `continueOnError` 早退 → 诊断静默丢弃。`CompileSchemaOptions.diagnostics.reporter/collector` 通道已存在（`schema-diagnostics-types.ts`，`diagnostics.ts:327-328` 已消费），Phase 5 是纯接线。
- `shouldFailOnSchemaDiagnostics()` 在浏览器不可达（e2e webServer 的 `__FLUX_*` 只进 Node dev-server 进程，无 vite `define`）；vitest 由 `test-setup/strict-validation.ts` 置全局 true（`__FLUX_STRICT_VALIDATION__` 与 `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 双 true）。非法夹具今天不抛的根因正是渲染路径硬编码 `continueOnError:true`。
- 语料诊断 severity 模型（R2-M2 勘误，对齐 live 代码）：closed-prop-model 渲染器的 `unknown-property` 为 error（strictMode 或 `unknownBarePropertyPolicy:'error'` 均可，`shape-validation-node-fields.ts:239-254`），open-model 恒为 warning；`unvalidated-component-target` 随 `validation.strictMode:true` 从 warning 升 error（`action-selector-validation.ts:224`）；`unknown-import-alias` 恒为 error（`flux-formula/src/compile/symbol-diagnostics.ts:115`，不随 strictMode 变）；`ambient-dollar-reference` 恒为 **info**（`symbol-diagnostics.ts:88-91`，任何口径下都不入 error 门，但仍在 Phase 2 一并清理）。fail-fast 与门禁断言以 **error 级**为口径。
- 现有门禁只覆盖一种 code：`page-schemas-validation.test.ts` 断言 `unknown-property`，并带 `UNKNOWN_PROPERTY_BASELINE` 债务白名单（25 键，其中 24 个非空条目 + `combo-editor.json` 空数组占位）；`flux:validate-pages` CLI 做 L0/L1/L2（产物级）。
- **实测勘误（draft review R1 M1 独立复测，2026-10-14）**：起草会话的 150/115/18 计数失实——`input-datetime` 的 `steppers/hourStep/minuteStep` 三 prop **已声明**（`date-renderer-definitions.ts:93-95`），相应 6 条 unknown-property 与 3 个 prop 对为幻影。修正后基线（canonical `REGISTER_PACKAGES` 去 industrial、源码解析、`unknownBarePropertyPolicy:'error'`）：`apps/playground/src/complex-pages/page-schemas` 43 文件共 **144** 诊断（**127 error**）—— `unknown-property` **109**（**15** 个 `renderer:prop` 对）、`unvalidated-component-target` 10（advanced-query/airtable-grid/antdpro-list/approval-tasks/standard-crud 各×2）、`invalid-reaction-deps` 10（antdpro-list/approval-tasks/crud-views-export×2/form-wizard/standard-crud×5）、`unknown-import-alias` 7、`ambient-dollar-reference` 7、`unknown-renderer-type` 1（`bisheng-build.json` 用 `designer-page`，属 registry 缺口，非真错）。**以 Phase 1 启动时对 then-live 树的复测为准（报告入库 `_tmp/`）**；语料树在移动（见在途注记）。
- **测量工具链断裂（draft review R1 M2，预存缺陷）**：`pnpm flux-guide:validate` 与 `pnpm flux:validate-pages` 在 HEAD 均 exit 2——`flux-renderers-form/src/cron/` 模块（2026-10-07 `2a1c3a160` 落地）使用全仓唯一的无扩展名相对导入，tsc 原样产物使 `dist/cron/index.js` 不可被 Node ESM 加载（`css-stub.mjs` resolve hook 不补扩展名）。Phase 1 先修（源码补 `.js` 扩展，对齐全仓 ESM 约定）。
- `docs/components/*/example.json`（精确同名）**123** 文件（另存 5 个非同名 json：`examples.manifest.json`/`golden-vectors.json`/`amis-migration-example.json`/`example-layout.json`/`migration-example.json`，默认不入本 plan 语料）、`flux-guide/*.md` 递归 **75** 文件（起草稿 128/79 为口径漂移勘误），均尚未清零（guide 日志记载预存 errors≈37）。
- **在途约束（draft review R1 M4）**：plan 594（CX-15 test-support，active，Phase 1–2 done 未提交）正在改动 `packages/flux-react/src/__tests__/` 约 13 文件 + `test-support*` 族——与 Phase 5 夹具 opt-out 面重叠；另 `page-schemas/bisheng-build.json`、`content-landing.json` 两文件当前未跟踪。纪律：Phase 1 启动时对 then-live 树复测；Phase 5 夹具改动尽量避开 594 在途文件，无法避开时在收口提交中显式申报重叠文件；本 plan 提交严格限定本批路径，594 在途文件零触碰（repo 既有惯例）。
- **真实 blocker**：硬 fail-fast 一旦开启，`VITEST/PLAYWRIGHT` 下任何 error 诊断即抛错，因此必须先把语料清到零；且存在故意渲染非法 schema 以断言诊断的单测夹具，需要显式 opt-out（真实爆炸半径由 Phase 1 报告的夹具扫描给出）。

## Goals

- 渲染严格开关开 → 自动跑编译器校验，任何 error 诊断即 fail-fast（测试/CI 抛错；dev 至少外发 reporter）。
- 三类语料 error 诊断清零（或逐条裁定为 out-of-scope 并记录）。
- `page-schemas-validation.test.ts` 门禁覆盖**全部 code**（不再只 `unknown-property`），`UNKNOWN_PROPERTY_BASELINE` 清空移除。

## Non-Goals

- 不改表达式 / 数据源 / 表单值校验语义（那是 `form-validation.md` 的域）。
- 不新增第二套校验引擎（复用编译器 `validate()`）。
- 不负责补齐 flow-designer / scada 之外的注册表缺口治理（只保证测量与渲染用 canonical 注册表，并为 `designer-page` 建 canonical 注册）。

## Scope

### In Scope

- `packages/flux-react`：渲染路径 diagnostics reporter + 依 `shouldFailOnSchemaDiagnostics()` 的 fail-fast；`RendererEnv` 增加可选 `reportSchemaDiagnostics` 通道（宿主可接基线/上报）。
- `packages/flux-renderers-*`：为 15 个 `renderer:prop` 对补 definition 声明或显式裁定（14 Fix + 1 Decision；R2-M1 勘误对齐 Baseline）。
- `apps/playground/src/complex-pages/page-schemas`：35 条其它 code 诊断逐案修复（10+10+7+7+1，R1 M1 复测口径；severity 分布以 Phase 1 复测报告为准）。
- `docs/components/*/example.json` 123 文件按 `flux:validate-pages` 语义清理。
- `flux-guide/*.md` 75 文件按 `flux-guide:validate` 清理。
- `page-schemas-validation.test.ts` 扩到全 code；移除 `UNKNOWN_PROPERTY_BASELINE`。
- 故意非法 schema 的测试夹具 opt-out（`strictValidation:false` / 显式 `continueOnError`）。

### Out Of Scope

- scada/industrial 的渲染环境 stub 改造（但须把 industrial 纳入离线测量以消除假阳性）。
- `docs/architecture/*` design doc 重写（除非 owner-doc drift）。

## Failure Paths

| 可测场景编号       | 触发                                 | 行为                                                              | 可重试          | 用户可见表现                 |
| ------------------ | ------------------------------------ | ----------------------------------------------------------------- | --------------- | ---------------------------- |
| diag-strict-error  | strict 开且渲染 schema 有 error 诊断 | `shouldFailOnSchemaDiagnostics()` 时 `throw`（含 file/code/path） | 否（改 schema） | 测试/CI 红；dev console 报错 |
| diag-nonfatal-warn | strict 开、无 fail 标记              | 经 reporter 外发，不抛                                            | 否              | dev 可见告警                 |
| baseline-miss      | 语料清理后仍有 error                 | 门禁 `expect(errors).toEqual([])` 失败                            | 否              | suite 红                     |

## Test Strategy

本档选择：**必须自动化**。
判别性红门集中在 Phase 1 落地（全 code 门禁在现存语料下必红）；各 Phase 的 Fix 以 Phase 1 的红门为判别基准，Phase 收尾以 Proof（门禁绿 / CLI 零 error）闭环。Phase 5 另含独立判别测试（旧渲染实现必不抛、新实现必失败面可见）。

## Execution Plan

### Phase 1 - 测量基建与全 code 门禁骨架

Status: completed (2026-10-14, 执行 session)
Targets: `apps/playground/src/complex-pages/__tests__/page-schemas-validation.test.ts`、`flux-guide/scripts/shared.mjs`（canonical 注册表对齐）、`flux-guide/scripts/validate-pages.mjs`（`--strict` 测量口径）、`packages/flux-renderers-form/src/cron/`（ESM 导入修复）

- Item Types: `Proof | Decision | Fix`

- [x] `Fix`：修复测量工具链（R1 M2 预存缺陷）——`flux-renderers-form/src/cron/` 相对导入补 `.js` 扩展（全仓唯一无扩展名模块，tsc 产物致 `dist/cron/index.js` 不可被 Node ESM 加载，CLI 自 2026-10-07 起 exit 2）；修复后 `pnpm build && pnpm flux:validate-pages`（任一小目录）与 `pnpm flux-guide:validate` 可运行。
- [x] `Proof`：对 then-live 树复测并升级为 canonical 注册表（含 mobile/code-editor/industrial，industrial 走 `css-stub`/`env-stub` 离线加载），产出 playground 43 页全 code 诊断清单（yaml/json 报告入库 `_tmp/595-*/` 供本 plan 引用）；报告附**夹具爆炸半径扫描**——枚举单测中故意渲染非法 schema 的夹具文件清单（R1 m6，Phase 5 opt-out 输入）。
- [x] `Decision`：为 `designer-page`（flow-designer）纳入 canonical `REGISTER_PACKAGES`（现在缺，`registerFlowDesignerRenderers` 已存在于 `flow-designer-renderers`）——否则 `unknown-renderer-type` 假阳性；同步在 `validate-pages.mjs` 增加 `--strict` 测量口径（透传 `validation.strictMode:true`，对齐渲染路径 error/warning 升级语义），复测报告按 strict 口径出 error 清单。
- [x] `Proof`：把 `page-schemas-validation.test.ts` 断言从"仅 `unknown-property`"扩到**全部 code**（error 级，含 `validation.strictMode:true` 对齐渲染语义；判别性：先跑，确认现存 error 诊断致红）。
- [x] `Fix`：门禁支持"待清理清单"临时基线（按 file+code+定位枚举，仅用于 Phase 2 过渡，Phase 6 删除）。

Exit Criteria:

- [x] 全 code 门禁在现有语料下**红**（证明判别性），并输出完整 code 分布报告（`_tmp/595-*/`）
- [x] canonical 注册表包含 flow-designer（`designer-page` 不再假阳性）；`flux:validate-pages` / `flux-guide:validate` 修复后可运行

> **执行期勘误（Phase 1 落地时点）**：①`UNKNOWN_PROPERTY_BASELINE`（旧 unknown-property 白名单）在 Phase 1 即被过渡基线取代并删除（原计划 Phase 6 删）——全 code 基线按 file+code+path 覆盖其全部条目，双基线并存无意义；Phase 2/6 的对应表述按此口径读。②复测（canonical 12 包 dist 注册表 + `--strict`）实测 **139 error + 6 warning + 7 info = 152 条**，与 R1 复测的 144（无 strict、无 flow-designer/industrial）差异已定位：`input-datetime:steppers/hourStep/minuteStep` **确为真实诊断**（R1-M1 勘误自身失准——那三 prop 声明在 `input-time` 定义（`date-renderer-definitions.ts:93-95`），`input-datetime`（:59-77）未声明），strict 下 `unvalidated-component-target` 10 条由 warning 升 error，`radio-group:horizontal` 实为 **11 处**（3 文件）。Phase 2 的 Fix 清单以 18 对（14 Fix + radio-group Decision + input-datetime 三 prop）执行。③门禁注册表用 `showcaseRegistry`（渲染 canonical，含 flow-designer，与渲染路径同源）。④夹具爆炸半径静态扫描：flux-react `__tests__` 48 文件 + 其他包经 flux-react 渲染的测试 309 文件；Phase 5 以实跑红名单为准补全。

### Phase 2 - playground 语料清零（43 页）

Status: completed (2026-10-14, 执行 session)
Targets: `packages/flux-renderers-*` definitions、`apps/playground/src/complex-pages/page-schemas/*.json`

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：14 个 `renderer:prop` 声明补齐（另 1 对 radio-group:horizontal 归下条 Decision，合计 15 对）—— `select:placeholder/defaultValue/cell`、`input-number:placeholder/min/max/step/defaultValue`、`input-tree:placeholder`、`checkbox:defaultValue`、`switch:defaultValue/onValue`、`tabs:mountOnEnter`、`container:text`（使 `unknown-property` error 109 → 0；R1 M1 勘误：`input-datetime:hourStep/minuteStep/steppers` 已声明，非缺口）。
- [x] `Decision`：`radio-group:horizontal`（3 个 sundial 页）——definition 已声明语义等价的 `direction` prop：裁定补 `horizontal` 别名字段还是迁移 3 页 schema 到 `direction`，执行时依 renderer-interfaces 契约口径定夺并落字。
- [x] `Fix`：`unvalidated-component-target` 10（advanced-query/airtable-grid/antdpro-list/approval-tasks/standard-crud）。
- [x] `Fix`：`invalid-reaction-deps` 10（antdpro-list/approval-tasks/crud-views-export/form-wizard/standard-crud）。
- [x] `Fix`：`unknown-import-alias` + `ambient-dollar-reference` 14（business-document / combo-editor）。
- [x] `Proof`：playground 43 页全 code 门禁绿；`pnpm flux:validate-pages apps/playground/src/complex-pages/page-schemas --pattern '*.json' --strict`（或 Phase 1 等价口径）对同目录零 error。

Exit Criteria:

- [x] playground 43 页全 code error 诊断 = 0（门禁绿）
- [x] `UNKNOWN_PROPERTY_BASELINE` 24 个非空条目（共 25 键）的命中数 = 0（可删基线）

> **执行期裁定与勘误（Phase 2 落地时点）**：
> ①radio-group:horizontal 裁定 = **删除死 prop**（11 处全部为 `horizontal:false`，vertical 即缺省——删除零行为变化；补别名=说谎契约、迁移 `direction:'vertical'`=冗余显式化，均劣于删除）。
> ②其余 4 对歧义 prop 逐案裁定为**删除死 prop**（全部零运行时消费、删除零行为变化）：`select:cell`（approval-tasks queryForm select，crud-column DSL 残渣）、`tabs:mountOnEnter`（crud-views-export tabs **根**节点——mountOnEnter 是 item 级字段，根级无消费）、`switch:onValue`（linear-settings——amis `onValue`≡`trueValue:true` 即缺省值）、`container:text`（notion-database calendar-add——container 渲染器零 `text` 消费，"+" 本就未渲染；如需可见 + 归 notion-replica owner）。
> ③`input-datetime:steppers/hourStep/minuteStep` = **真实声明缺口**（InputDatetimeRenderer 消费、schemas.ts 已声明，definition fields 漏列）→ 补声明（对齐 input-time 先例）。
> ④`unvalidated-component-target` 10 根因 = **capability 契约漂移**（运行时已实现而 definition 未申报）：form 运行时 handle 实现 `refresh`（`form-component-handle.ts:23`）、crud 运行时实现 `querySubmit/queryReset`（`crud-renderer-state.ts:405,466`）→ definition 补 3 个 capability contract（**契约收敛**，非 schema 侧改）；连带更新 3 个静态契约 pin（form-renderer-contracts/data-renderer-contracts/contract-honesty discoveryBaseline 73→74、15→17）。
> ⑤`invalid-reaction-deps` 10 = loadAction 缺 `dependsOn`（运行时 fail-closed：无 deps 仅挂载执行一次）→ 补 guide 文档化惯例 `dependsOn: ["__init_load__"]`（18-reactions.md:191，零行为变化）。
> ⑥`$Arr` 14 条（7 error + 7 info）根因 = **编译器缺口**：验证符号表不感知宿主 formula registry 命名空间 → `FormulaCompiler` 增可选 `getFormulaNamespaces()`（flux-core 类型 + flux-formula 实现），`createSchemaCompiler` 以 `createFormulaAwareCompileSymbolTable()` 种化编译路径 + depth-0 验证遍历；CLI 增 `--setup <module>`（`validate-pages.mjs`）+ `apps/playground/scripts/flux-validate-setup.mjs` 登记与 render-host 同步的 `$Arr` 成员。**flux-core/flux-formula/flux-compiler 契约变更落字申报**（保护区 plan-first：本 plan active + owner doc Phase 6 同步 schema-file-validator.md）。
> ⑦过渡基线在 Phase 2 即删除（提前于原计划 Phase 6）：修复后命中数=0，门禁升级为纯零诊断断言（44/44）。基线文件 `page-schemas-validation-baseline.json` 已删。
> ⑧验证：门禁 44/44 绿；CLI `--pattern '*.json' --strict --setup` 43 文件 0 error/0 warning exit 0（报告 `_tmp/595-baseline/playground-43-final.json`）；compiler 链 697+239+565 绿；form 1121/form-advanced 全绿/data 1231/flux-react 596/playground 476 全绿。**契约变更（getFormulaNamespaces）判别性**：未 seed 时 business-document/combo-editor 必报 unknown-import-alias 7 条（Phase 2 中段实测 7 条→seed 后 0）。

### Phase 3 - docs/components 语料清零（123 例）

Status: completed (2026-10-14, 派驻 agent + 编排核验)
Targets: `docs/components/*/example.json`（精确同名 123 文件；R1 M3 勘误：起草稿 128 为全 json 计数）

- Item Types: `Fix | Decision | Proof`

- [x] `Decision`：对"松弛示例"（kanban `$slot`、gantt 工具栏 action、crud `variant`、`flex direction="col"`、calendar 空 body 等，见 `docs/logs/2026/08-30.md:19`）逐条裁定 修 schema 或 收窄示例语义并记录（裁定簿 `_tmp/595-baseline/phase3-adjudications.md`）。
- [x] `Fix`：按裁定修复/复写违规示例。
- [x] `Proof`：`pnpm flux:validate-pages docs/components/*/example.json --level validate --strict --setup flux-guide/scripts/validate-pages-setup-docs-components.mjs` 零 error。

Exit Criteria:

- [x] `docs/components/*/example.json`（123 文件）全 code 零 error（或每条保留项在 Deferred 裁定并附理由）

> **执行期要点（Phase 3）**：45 诊断 = ①8 个 invalid-root 为 registry 覆盖缺口（graph/map/pivot/report-designer 族/spreadsheet/word-editor 等真实渲染器不在测量注册表）→ 新建 `validate-pages-setup-docs-components.mjs` 注册（141→153 types，纯注册解决零 schema 改）；②css-stub 增 `@hufe921/canvas-editor` UMD→ESM 重定向（预存工具链缺陷，word-editor dist 不可加载）；③声明缺口 3 处（org 族 `clearable`、report-inspector-shell `emptyLabel`、gantt `zoomIn/zoomOut/scrollToToday/scrollToTask` capability contracts——运行时已实现，同 Phase 2 裁定④类契约收敛）；④死 amis-ism 迁移（barcode/kanban `events` bag→顶层事件、combo `itemSchema`→`items` region、picker `valueKey/labelKey`→`valueField/labelField`、dashboard-editor `col`→`column`/`panel`→`card`、designer-page `intent`→`variant`、echarts 根包裹、calendar 注释体删除）；⑤kanban `columnHeader/columnFooter` 区域 v1 无 slot params 不可表达逐列动作→删除（默认渲染已承载）；⑥遗留 owner-doc drift 一处（`docs/components/report-inspector/design.md` 仍文档化 `inspectorPanels` prop）→ Deferred 归 owner。scheduling 1084/1084 绿。

### Phase 4 - flux-guide 语料清零（75 md）

Status: completed (2026-10-14, 派驻 agent + 编排核验)
Targets: `flux-guide/*.md`（递归 75 文件，R1 m1 勘误）

- Item Types: `Fix | Proof`

- [x] `Fix`：清理 markdown ```json 片段诊断（实测基线 54 errors / 37 warnings，非起草稿的 ≈37）。
- [x] `Proof`：`pnpm flux-guide:validate` errors = 0。

Exit Criteria:

- [x] `pnpm flux-guide:validate` errors = 0

> **执行期要点（Phase 4）**：①gate 脚本 `validate.mjs` 冻结的 9 包注册表缺 ai/scheduling/dashboard → 10/54 errors 为真类型假阳性（`ai-chat` 等），升级 canonical 注册表后消失；②`flux-guide:validate` 脚本补 `--import env-stub.mjs`（同 Phase 1 的 industrial canvas stub 缺口）；③11 个 md 真诊断修复（bare action 数组、`validate.action` 字符串→对象、form.rules 非法 kind、伪 JSONC 前缀、`dependsOn: ["__init_load__"]` 惯例等）；④3 处 waiver（ai 族 md 补 `xui:imports`、input-number `format:"currency"` 设计提案改为 text fence 显式不可运行标注）——均为 error 级修复所必需，记录在案。终态 `blocks=541 errors=0 warnings=35 exit 0`。

### Phase 5 - 渲染路径接线 + 夹具 opt-out

Status: completed (2026-10-14, 执行 session + 2 派驻 agent)
Targets: `packages/flux-react/src/{render-nodes.tsx,schema-renderer.tsx}`、`packages/flux-core`（`RendererEnv`）、测试夹具（Phase 1 扫描清单）

- Item Types: `Fix | Proof`

- [x] `Fix`：`RendererEnv` 增可选 `reportSchemaDiagnostics(diag)`（INV-2 C 档先例同款：optional + capability check，评审来源落字本 plan + `docs/architecture/renderer-env.md` §4.3 回写；R2 m-b：回写时在 §4.3 条目内附 §4.1 五条评审标准逐项走查，或补短 discussion doc——二选一，禁止只记一行）。渲染路径在 `diagnostics.enabled` 时传 reporter（无宿主 hook 时默认 `console.error`）。
- [x] `Fix`：`continueOnError` 由 `shouldFailOnSchemaDiagnostics()` 决定 —— fail 模式下 error 诊断 `throw`（含 file/code/path），非 fail 模式只外发。
- [x] `Proof`：新增判别性测试（R1 m4 路径精确化）——`SchemaRenderer` 根编译被 try/catch 包裹转 `compileResult.error`，挂载渲染断言不观察传播抛错；判别面取 `normalizeNodeInput`/区域编译直呼（strict+fail 下渲染 `unknown-renderer-type` schema 必抛，断言含定位），并以根路径错误面（`SchemaRootError`/`reportImportFailure` 或 onActionError 通道）补一根路径断言；旧实现（continueOnError:true 无 reporter）两断言必不成立。
- [x] `Fix`：给故意渲染非法 schema 的单测夹具加 opt-out（`strictValidation:false` 或显式 continueOnError），保持其诊断断言语义；夹具清单以 Phase 1 扫描为准，与 plan 594 在途文件重叠处显式申报（见 Baseline 在途约束）。
- [x] `Proof`：全量单测绿。

Exit Criteria:

- [x] 判别性测试：strict+fail 下 `normalizeNodeInput` 渲染非法 schema 抛错（旧实现不抛）+ 根路径错误面断言成立
- [x] 全量 `pnpm --filter @nop-chaos/flux-playground test` 绿（夹具 opt-out 后）

> **执行期要点（Phase 5 落地）**：
> ①接线面：`RendererEnv.reportSchemaDiagnostics?`（flux-core types）+ `schema-diagnostics-reporter.ts` fallback（flux-react）+ `render-nodes.normalizeNodeInput` 与 `schema-renderer` 根编译双点接线（root 侧 strict 关闭时保持旧 diagnostics 包络——非 strict 宿主零行为变化）；`shouldFailOnSchemaDiagnostics()` 增显式 false override 且 **global 优先于 env**（vitest 以 `test.env` 注入 `'true'`，夹具必须能翻 global）；flux-compiler 的本地谓词副本去重改用 flux-core 单源。
> ②判别性测试 3 条（`render-diagnostics-fail-fast.test.tsx`）：fail 下 normalizeNodeInput 必抛 / report-only 经 reporter 外发不抛 / 根路径 throw→notify 错误面（旧实现该 schema 静默编译、notify 不触发）。
> ③**实证爆炸半径 167 测试 / 8 包**（turbo 逐包中断 + `pnpm -r --no-bail` 全量枚举；静态扫描远低估）：basic 19、flow-designer 3、report-designer 1、ai 1、page-designer 34、dashboard 5、form 59、data 44。全部处置（2 派驻 agent）：包绿 671/671、175/175、306/306、93/93、213/213、853/853、1121/1121、1231/1231。处置分类=夹具 stub 补字段（大头：test-support 影子定义缺 fields，如 449× `text:text`）、真声明缺口收敛（`validateOn/showErrorOn/equalsField/notEqualsField/requiredWhen/requiredUnless` 入 formFieldRules+form definition——compiler validation-collection/validation-lowering 消费实证；`optionsSourceState`、input-number `prefix/suffix/showStepper/inputMode`、crud `selectionField`、org `clearable` 等）、死 amis-ism 迁移（`level`→`variant` ×12、`action:'submit'`→`submitForm`、`visibleOn`→`visible`、死 noop/`pageSizeStatePath` 删）、`dependsOn:["__init_load__"]` ×15、静态不可判定模式 opt-out（recurse itemData scratch-scope 键对兄弟区域可见、dialog-open 时 `$slot.record`、运行时注册的 component 方法目标等）全部带 `// plan 595 opt-out:` 注释且 rerender 同步。
> ④连带契约收敛 3 件（agent 实证消费后落地）：`classAliases` 入 `BASE_SCHEMA_FIELDS`（编译器级框架字段，node-compiler 构建 classAliasesPlan）、builtin `xui` 命名空间校验器认 `xui:sid`（page-designer SESSION_ID_KEY，edit-assembly beforeCompile 消费）、crud pagination 契约 `optional:['mode']`（契约自述 "'pages' (default)" 即运行时可选——原契约为说谎契约）。
> ⑤编译器连带修复：loop/recurse `itemName/indexName/keyName` 字面量重命名 + 字面量 `itemData` 键并入 region slot 符号成员（否则一切重命名循环体在 fail-fast 下误报 `unknown-slot-param`，basic 19 失败的根因）。

### Phase 6 - 收尾与基线移除

Status: completed (2026-10-15, 执行 session)
Targets: `page-schemas-validation.test.ts`、`docs/architecture/{schema-file-validator.md,renderer-runtime.md,renderer-env.md}`、`docs/logs/`

- Item Types: `Fix | Proof`

- [x] `Fix`：删除 Phase 1 的过渡基线与 `UNKNOWN_PROPERTY_BASELINE`。
- [x] `Fix`：owner-doc 同步（`docs/architecture/schema-file-validator.md` 增"渲染期强制校验"最终设计；`docs/architecture/renderer-runtime.md` 的 `strictValidation` 语义；`docs/architecture/renderer-env.md` §4.3 增 `reportSchemaDiagnostics` 扩充记录，R1 m5）。
- [x] `Proof`：`pnpm check` 无新增红。

Exit Criteria:

- [x] 门禁无任何 code 白名单，全 code fail-fast
- [x] owner-doc 反映"渲染自动验证 + fail-fast"最终设计（三份 doc 同步）

> **执行期要点（Phase 6）**：①过渡基线与 UNKNOWN_PROPERTY_BASELINE 分别在 Phase 1/2 提前删除（命中归零，见各 Phase 勘误）；②owner-doc 第四份 `flux-core.md` 增 getFormulaNamespaces 条目（执行期契约变更连带）；③`pnpm check` 继承披露——执行中期 `find-test-global-leaks` 114>108 的 +6 为并行会话 cx18-\* 文件（HEAD worktree diff 实证本 plan 零新增），审计时点已由 plan 598 收口消解回 108=基线；knip 4 项登记（3 本批产物 + 1 继承 FormLoadState[plan 593 落地、CX-17/598 门禁先例披露]）；oversized 仅剩豁免 locales；④fail-fast 设计在执行期修正一轮（v1 `continueOnError:false` → v2 lowering 恒宽容 + 渲染路径编译后 error 检查，condition-builder 诚实降级特性实证驱动），owner-doc 已按 v2 终态落字。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者/子 agent 填写。

- Reviewer / Agent: 独立 fresh 子 agent（R1/R2/R3 同一独立审查会话 agent_1e0a60d4，general-purpose，不复用起草者上下文）
- Verdict: `revised` → R3 **pass**（R1 fail 0B/4M → 修订；R2 fail 0B/2M[m-a/m-b/m-c 附加] → 再修订；R3 pass 0B/0M，共识达成，升 active）
- Rounds: 3
- Findings addressed:
  - R1-M1 计数漂移（input-datetime 三 prop 已声明，150/115/18 → 144/127error/109/15 对）→ Baseline 勘误 + Phase 2 Fix 清单剔除三 prop + 以 Phase 1 then-live 复测为准。
  - R1-M2 双 CLI exit 2（cron 模块无扩展名导入致 dist 不可被 Node ESM 加载，2026-10-07 起预存）→ Baseline 落字 + Phase 1 新增 Fix（源码补 `.js`）。
  - R1-M3 Phase 3 Proof 命令默认 pattern 匹配 0 文件 → 改显式文件清单 `docs/components/*/example.json --level validate --strict`；语料计数 128→123（精确同名）。
  - R1-M4 plan-594 在途冲突未申报 → Baseline 增在途约束（复测时点/重叠申报/零触碰纪律）。
  - R1-m1 75 md 勘误；m2 Test Strategy 措辞（判别红门集中 Phase 1）；m3 radio-group horizontal 升 Decision；m4 判别测试路径精确化（SchemaRenderer try/catch 转错误面，判别面取 normalizeNodeInput）；m5 renderer-env.md 入 Phase 6 owner-doc；m6 Phase 1 报告附夹具爆炸半径扫描；m7 基线计数口径"24 非空（25 键）"。
  - R2-M1 Purpose/Scope 残留旧计数（128/79/18）→ 三处勘误对齐（123/75/15 对=14+1）。
  - R2-M2 Baseline severity 模型失实（unknown-import-alias 恒 error、ambient-dollar-reference 恒 info，均不随 strictMode 升级；仅 unvalidated-component-target 升级）→ 按 live 代码重写（symbol-diagnostics.ts:115/:88-91，action-selector-validation.ts:224）。
  - R2 m-a Phase 2 Fix 头计数 14+1 口径；m-b §4.3 回写须附 §4.1 五条走查或短 discussion doc；m-c 审查者 id 记账经编排方确认。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 渲染严格开关开即自动验证并 fail-fast（行为结果已达成）
- [x] 三语料 error 诊断清零（或逐条裁定并记录）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 执行中推翻/改判条目时，裁决当场落本节。

### input-tree placeholder 计算但未渲染（inline 模式）

- Classification: `watch-only residual`
- Why Not Blocking Closure: prop 声明已覆盖（schema-prop-coverage 绿），控制器消费链存在（triggerText 计算真实发生），仅 inline 空态不渲染 placeholder 文本——纯视觉增强缺口，不影响校验强制化语义；tree-crud.json 的 1 处授权用法零回归。
- Successor Required: `yes`
- Successor Path: 归 form-advanced owner（inline input-tree 空态渲染 placeholder 或显式移除声明，随 tree 族下批治理）。

### docs/components/report-inspector/design.md 的 inspectorPanels 文档漂移

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md 仍文档化 `inspectorPanels` 为 prop，与 type/definition/renderer 不符——host-scope 投影非 schema prop；属 owner-doc drift 但不在本 plan 的 owner-doc 清单（该文件非本 plan 交付面），example 已按真实契约修复。
- Successor Required: `yes`
- Successor Path: report-designer owner doc 轮次修正（Phase 3 agent 裁定簿已落字）。

### docs/components 5 个非同名 json（examples.manifest/golden-vectors 等）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 非 example 语料（manifest/向量/迁移样例），不属 `docs/components/*/example.json` 门禁面；金色向量文件非 schema 根形态。
- Successor Required: `no`

## Non-Blocking Follow-ups

- e2e 未在本会话重跑：语料修改全部为零行为变化删除/迁移（horizontal:false 删除、死 prop 删除、level→variant 迁移语义等价），沿用既有 e2e 基线；下轮 e2e 例行跑批时自然覆盖。
- ~~`find-test-global-leaks` 114>108~~ 已消解：plan 598 收口 M1 重构了 6 个 cx18 let，扫描器回到 108=基线（closure audit 复核时点实测），本 plan 零泄漏条目。

## Closure

Status Note: 2026-10-15 completed。渲染严格开关开即自动执行编译器校验：诊断经 `env.reportSchemaDiagnostics`（缺省 console fallback）外发，VITEST/PLAYWRIGHT/fail 旗标下 error 级诊断编译后抛错（lowering 恒宽容）；三语料 error 清零（playground 43 页门禁纯零诊断、docs/components 123 例 0/0、flux-guide errors=0）；全 code 门禁无白名单。`pnpm typecheck` / `pnpm build` 42/42 / `pnpm lint` / `pnpm test` 78/78 任务 / `pnpm check` exit 0（knip 4 项登记含 1 项继承披露）。full-green verification（unit 78/78 任务全绿；e2e 未重跑——语料改动全部零行为变化，已列 Non-Blocking Follow-ups）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（agent_2b93d135，general-purpose，不复用执行者上下文）
- Evidence: R1 verdict `issues`（2 Blocker 均为门禁卫生 + 3 Minor，概念面/Scope/Deferred/静默降级扫描全部 clean）：B1 gate 文件 unused import/disable（已修 + 顺带清理死基线脚手架并刷新头注释）、B2 knip 3 项未登记（已登记 + 继承 FormLoadState 一并落字；审计时点 find-test-global-leaks 已由 plan 598 消解回 108=基线）；M1 计数口径/M2 gate 头注释/M3 follow-ups 时态——均随本收口提交落字。审计实证项：44/44 门禁、双 CLI 0 error、v2 接线与 owner-doc 逐点对账、判别测试 3 条判别性确认、MUST-split 三文件行数、suite 计数抽查、Deferred 诚实性、静默降级扫描 clean。审计日志 `_tmp/595-closure-audit-*.log`。B1/B2 修复后 `pnpm lint` exit 0、`pnpm check` exit 0、受影响套件（flux-react 599 / fadv 1213 / playground 487 / form 1125）复跑全绿——审计预授权的机械修复条件逐项满足。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
