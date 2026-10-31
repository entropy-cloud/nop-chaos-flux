# 814 M3-O1 OCR 校正工作台页复刻（business-page-replication roadmap M3-O1）

> Plan Status: active
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-O1（依赖 M2 done；roadmap 现值 `todo`，本 plan 激活时置 `planned`，收口置 `done`）
> Related: D1 总体设计；D4 §2.3（O1 页设计）/§4.2（doc 模块端点）/§5 O1（断言）/§6.1（临时形态边界）；R3 §1 O1；R4 §1 L36、§2 G19/G20；plan 813（mall 域先例）、plan 810（form 包裹 input-table 先例）、plan 802（C2 detail 族先例）

## Purpose

落地 M3-O1「OCR 校正工作台页」（桌面，新 type 临时形态）：grid 两栏——左 `image`（preview 放大）原件 + `image-compare`（原件 vs 识别参考整图，≈bbox 整图近似，G19 不实现 bbox）；右 `wizard` 四步（原件对照 → 字段确认 → 明细行 → 回流提交）：步骤 2 以 form 承载 `detail-field` 逐字段确认（surface 草稿编辑 + 写回 = G20 字段级门禁近似）+ `labelRemark` 原值悬浮 + `inputClassName` 低置信高亮 + `badge` 置信度三档，beforeLeave → `ocrValidate` 服务端门禁；步骤 3 form 包裹 `input-table` 明细行增改 + 校验（step `formId`）；步骤 4 `ocrCommit` 回流。新建 ReplDoc mock 域（O1 三端点，O2 后续扩展）+ focused e2e + axe 分支 A 登记。收口为 roadmap §2 O1 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication helpers 六件套（`tests/e2e/helpers/replication.ts`：openReplicationPage/seedReplicationCounters/expectEndpointCall/readEndpointCalls）；showcase-env `createReplicaBranches`（`apps/playground/src/complex-pages/shared/showcase-env.ts` L117-138，mall/mes 等域以 `create<Domain>FetcherBranches()` 挂载）；`mock-backend-replica-kit`（createEndpointCounter/createUrlParamReader/readOptInHooks/paginateRows）；page-schemas glob 自动装载 + strict 全量校验（`__tests__/page-schemas-validation.test.ts`，零诊断门槛）；replication CSS（`shared/replication.css`，S1 `repl-price` 先例）。
- **ReplDoc 域不存在**（无 `mock-backend-repl-doc.ts`）；`apps/playground/public/` 目录不存在（Vite 默认 publicDir，静态资产需新建）。
- live 能力核对（2026-10-31）：
  - `wizard`（layout schemas.ts L13-70）：`steps[{key,title,body,actions,formId,beforeEnter,beforeLeave}]`；beforeLeave 结果 `ok:false` 阻断导航（wizard-renderer.tsx L250-266，含 failureHandled 失败仍为 ok:false）；`formId` 仅对暴露 `validate` 的 form 生效（L375-384）；步进后焦点移入新步 body 首个可聚焦元素（L153-172，APG）。
  - `detail-field`（form-advanced `src/composite-field/composite-schemas.ts` L70-82；form 宿主 + 键控对象 + content 相对绑定先例 `detail-view/detail-field-basic.test.tsx` L16-27）：BoundFieldSchemaBase（须 form 宿主），`content` 必填（surface draft form 编辑体）、`viewer`、`triggerLabel`、`surface`、`editMode`；`labelRemark` 为 FieldRemarkSchema 对象 `{content}`、`inputClassName` 作用于控件 wrapper（flux-core types/schema.ts L154/L158）；labelRemark 渲染 `[data-slot="field-label-remark"]`（field-frame-layout.test.tsx L218）。D4 片段①的 detail-view+无 content 的 detail-field 形态仅能只读展示（live `crm-customer-360.json` L66-71 先例为纯展示），逐字段**可编辑**确认须 form 宿主 + content（surface 草稿编辑体）——本 plan 以 form 宿主 + detail-field（content=input-text value）落地并按「可编辑性 gap」口径勘误 D4。
  - `image`（content schemas.ts L152：src/alt/preview/fit/width/height）、`image-compare`（L180：before/after/defaultPosition/alt/orientation）、`grid`（layout schemas.ts L120：items/columns 字符串 → grid-template-columns/gap）。
  - form 宿主 input-table：`item` 为逐列单元格渲染器平铺数组（plan 810 `mes-work-reporting.json` 先例），`addable` 增行；form `loadAction` 取数直入 form 值（plan 813 勘误 6：form 初始 `data` 为快照，不随 data-source 到达更新）；form `valuesPath` 将表单值发布到作用域路径（`wms-stock-ledger.json` 先例），供 wizard beforeLeave / 回流提交读取。

## Goals

- ReplDoc 域新建（O1 子集）：`ReplDoc__ocrCase`（get）/`ReplDoc__ocrValidate`（post）/`ReplDoc__ocrCommit`（post）三端点（D4 §4.2 逐名）+ 计数 `__replDocCalls` + 钩子 `__replDocTestHooks`（写镜像 + consume-once 错误注入）+ showcase-env 挂载。
- `page-schemas/doc-ocr-workbench.json` + entry + 静态资产（原件/识别参考整图）+ e2e `tests/e2e/replication-doc-ocr-workbench.spec.ts` + axe 分支 A 登记。
- e2e 覆盖 D4 §5 O1 清单（①-⑤ + focus 三条），全部 `--retries=0` 绿。

## Non-Goals

- 不实现 bbox 高亮框/zoom/字段↔图区联动（G19 demand-gated，D4 §6.1）；不自研字段粒度门禁编排组件（G20 由 detail-field 草稿写回 + ocrValidate 承担）；不做置信度热力图/阈值策略配置；不实现 O2 端点（ReplDoc 域留扩展位）。

## Scope

### In Scope

- ReplDoc 域 mock（O1 三端点）+ showcase-env 挂载；O1 页 schema + entry + replication.css 低置信/置信度分档类；静态资产两张；e2e；axe 分支 A；roadmap §2 O1 回写；D4 §2.3/§5 O1 勘误就地落档（至少：detail-view→form+detail-field 承载、detail-field content 必填、静态资产形态）。

### Out Of Scope

- 其余 5 页（O2/V1-V3）；上游 OCR 引擎/样本回流真实链路；G19/G20 专用 renderer 立项（只登记不越权）。

## Failure Paths

| 编号            | 触发                                       | 行为                                                                                             | 可重试 | 用户可见表现              |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------ | ------------------------- |
| field-unconfirm | 低置信字段（confidence<0.7）未校正即下一步 | ocrValidate 返回 `status:1 REPL_DOC_FIELD_UNCONFIRMED`（含 unconfirmedFields）→ beforeLeave 阻断 | 是     | 停留步骤 2 + 错误 toast   |
| rows-invalid    | 明细行必填缺失                             | 步骤 3 `formId` 表单校验失败 → 阻断                                                              | 是     | 停留步骤 3 + 字段错误提示 |
| commit-failed   | 回流提交失败（钩子 `forceOcrCommitError`） | ocrCommit 返回 `status:1 REPL_DOC_COMMIT_VALIDATION_FAILED`                                      | 是     | 错误 toast，停留步骤 4    |
| case-miss       | ocrCase id 不存在                          | 返回 placeholder case（D4 §4.2）                                                                 | —      | 页面以占位数据渲染        |
| e2e-fail        | focused e2e 失败                           | 定位修复 → 重跑至绿（显式 `--retries=0`）；设计与 live 不符以 live 为准并勘误 D4                 | 是     | e2e 全绿                  |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱：程序化交互 + axe 基线 + focus），显式 `--retries=0` 全绿；strict schema 校验零诊断。

## Execution Plan

### Phase 1 - O1 页全链实现

Status: planned
Targets: `apps/playground/src/complex-pages/shared/mock-backend-repl-doc.ts`（新）、`showcase-env.ts`（挂载）、`apps/playground/public/repl-assets/`（新）、`shared/replication.css`、`page-schemas/doc-ocr-workbench.json`（新）、`complex-pages-entries.ts`、`tests/e2e/replication-doc-ocr-workbench.spec.ts`（新）、`tests/e2e/a11y-axe-baseline.spec.ts` + `__fixtures__/axe-baseline.json`

- Item Types: `Fix | Proof`

- [ ] mock：新建 `mock-backend-repl-doc.ts`（mall 单工厂形态）——`ocrCase`（get ?id=；确定性 case：caseId、imageUrl/annotatedUrl 指向 `/repl-assets/` 静态资产、`fields` 数组 6 字段〔invoiceNo 0.62 低 / invoiceDate 0.95 高 / sellerName 0.88 中 / buyerTaxId 0.72 中 / totalAmount 0.93 高 / taxAmount 0.78 中；`{name,label,value,originalValue,confidence,valueType}`〕+ 按 name 键控的字段对象（form 绑定面，多余键容忍）+ `detailRows` 3 行 `{rowNo,description,quantity,amount}` + targetEntity；id miss → placeholder）/`ocrValidate`（post；规则：confidence<0.7 且 value===originalValue 视为未确认 → `REPL_DOC_FIELD_UNCONFIRMED`；成功 `{valid:true, unconfirmedFields:[]}`；写镜像 `lastOcrValidateBody`）/`ocrCommit`（post；consume-once 钩子 `forceOcrCommitError` → `REPL_DOC_COMMIT_VALIDATION_FAILED`；成功 `{docId, sampleReflowed:true}`；写镜像 `lastOcrCommitBody`）；showcase-env `createReplDocFetcherBranches()` 挂载
- [ ] 静态资产：`apps/playground/public/repl-assets/ocr-invoice-original.svg` + `ocr-invoice-annotated.svg`（手写确定性 SVG 发票样张；annotated 版叠加识别框着色，各 <50KB）——D4 §4.2 写「PNG（SVG 光栅化）」，本 plan 裁决直出 SVG（同为程序化确定性功能资产、免光栅化工具链、`<img>` 渲染等价），收口时就地勘误 D4
- [ ] replication.css：`.repl-low-confidence`（背景读 `--repl-low-confidence-bg`）+ `.repl-conf-high/mid/low` 置信度分档类
- [ ] schema JSON（D4 §2.3 组件树，live 契约落地）：data-source `ocrCase`；`grid` 两栏 `2fr 3fr`（左：image preview 原件 + image-compare before=原件/after=识别参考；右：wizard 四步）；步骤 1 原件对照摘要；步骤 2 form（id `doc-ocr-workbench-fields-form`，`loadAction` ocrCase，`valuesPath` 发布字段草稿）内 6 个 `detail-field`（name=字段对象键；`labelRemark {content:"原值：…（置信度 …）"}`；`inputClassName` 低置信条件类；viewer=值文本 + badge 三档〔text 三元 + `repl-conf-*` 类〕；content=input-text `value` required；triggerLabel 校正），步骤 `beforeLeave` ajax ocrValidate（data 读 valuesPath 草稿）+ onError 错误 toast；步骤 3 form（id `doc-ocr-workbench-rows-form`，loadAction 取 detailRows，`valuesPath` 发布）包裹 input-table（addable，item：rowNo 文本/description input-text required/quantity input-number/amount input-number），步骤 `formId` 指向该 form；步骤 4 actions 回流提交按钮 ajax ocrCommit（data：caseId + 字段草稿 + 明细行）+ 成功结果文本（docId）+ onError toast；testid `doc-ocr-workbench-<element>`；strict 零诊断
- [ ] entry（`complex-pages-entries.ts`，category `business-replication`）
- [ ] e2e spec（D4 §5 O1）：前置〔原件 img src 命中 `/repl-assets/ocr-invoice-original`、image-compare 双图、wizard 首步、ocrCase 计数〕/〔步序：交互②③ 在步骤 2 内、交互① 点下一步之前断言〕交互① 校正 invoiceNo（detail-field surface 草稿 → 确认写回）→ 下一步 → ocrValidate +1 + 请求镜像含校正值 → 步骤 3/交互② 低置信 wrapper `getComputedStyle(background-color)` = `--repl-low-confidence-bg` 解析值 + 类存在（仅 invoiceNo）/交互③ badge 三档文本计数（高 2/中 3/低 1）+ labelRemark 原值悬浮内容/交互④ 步骤 3 增行 + 改数 + description 空 → formId 校验阻断（停留步骤 3）→ 填写后进入步骤 4/交互⑤ ocrCommit +1 + 载荷镜像（校正后 invoiceNo + 明细行数）+ 成功 docId 文本；`forceOcrCommitError` → 错误 toast；未确认直接下一步 → UNCONFIRMED toast + 停留步骤 2/focus ① wizard 步进后焦点落新步首控件 ② image preview 打开 Esc 关闭 ③ detail-field 编辑 surface 焦点落入 + Esc 返回；预期拒绝分支 `allowConsoleErrors` 按 W3 先例登记；显式 `--retries=0`
- [ ] axe 分支 A 登记：ROUTES + `complex-pages/doc-ocr-workbench` 基线键（首跑实测回填 + `_notes` 节点溯源）
- [ ] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + replication 全族回归 + strict 校验 + playground unit

Exit Criteria:

- [ ] O1 页可达可交互且列表页收录，strict validation 零诊断
- [ ] focused e2e `--retries=0` 全绿（`__replDocCalls` 计数证据 + 写镜像载荷断言在）
- [ ] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_8694eecc-9f8a-4d36-a650-51c7e01ce71b）
- Verdict: pass（零 Blocker / 零 Major / 3 Minor）
- Rounds: 1
- Findings addressed: Minor-① composite-schemas.ts 路径补全为 `src/composite-field/`；Minor-② 「content 必填→契约不符」措辞校准为可编辑性 gap（crm-customer-360 只读先例）；Minor-③ e2e 步序显式化（②③ 在步骤 2 内先于 ① 的下一步断言）。

## Closure Gates

- [ ] in-scope 工作全部落地（O1 页 + ReplDoc 域 + 静态资产 + roadmap 回写）
- [ ] 行为/契约结果已达成（D4 §5 O1 断言清单全绿，`--retries=0`）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；D4 §2.3/§4.2/§5 O1 勘误）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（触达面零新增红口径）
- [ ] `pnpm check`（零新增未登记命中）

## Deferred But Adjudicated

### （继承）layout contract-honesty ELOOP 环境红

- Classification: `watch-only residual`
- Why Not Blocking Closure: 807 Deferred 在案 HEAD 既有环境级 symlink 循环红（flux-renderers-layout contract-honesty），与本计划触达面（apps/playground、tests/e2e、docs）零交集。
- Successor Required: `no`
- Successor Path: 不适用

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- G19 bbox overlay / G20 字段门禁编排专用组件 → 维持 R4 §2 demand-gated 登记线（本计划不扩约）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
