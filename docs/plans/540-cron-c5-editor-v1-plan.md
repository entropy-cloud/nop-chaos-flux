# 540 Cron 轨道 C5 flux cron-editor v1（文本 + 分段编辑 + 诊断 + 预览）

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C5）、`docs/components/cron-editor/design.md` 全文（§3 renderer 定义/§4 schema/§7 状态归属/§8 句柄/§10 marker/§11 拆分）、`docs/references/new-renderer-introduction-audit.md`
> Related: plan 535（向量）、539（C4 引擎，`src/cron/` 已就位待接线）

## Purpose

落地 cron-editor 表单字段 renderer v1：`type: 'cron-editor'`，双模式（text + 6/7 段分段编辑）、实时诊断、下次触发预览、clear/reset/focus 三句柄；definition / i18n 双语 / playground lab 路由 / coverage manifest / quick-reference / manifest 翻面全套登记。v2（Office 档位向导 + repeat/range 区块 + 预设应用）归 C6。

## Current Baseline

- 引擎就位：`packages/flux-renderers-form/src/cron/`（plan 539，106/106 全绿），barrel `cron/index.ts` 注释明示「待 C5 接线」；包主出口尚无 cron 引用。引擎 `fireSequence/nextRunAfter` 的时区参数约定：**`Date.UTC(本地) − tzOffsetMinutes*60000`，即传 `-new Date().getTimezoneOffset()`（UTC+8 → 480）**。
- `cron-editor` 在 `amis-baseline-matrix.md`（行 203）/ `docs/components/index.md`（目录清单，无状态列）/ `docs/components/roadmap.md`（指针行）登记；**`examples.manifest.json` 的 `cron-editor` 在 `targetContract` 数组（line 92），翻入 `runtime` 数组是 C5 交付物**。
- 接线先例（已核实）：`verification-code-renderer.tsx`（三句柄 `VERIFICATION_METHODS` + `useInputComponentHandle` :57-72）、`signature-renderer-definitions.ts`（definition 全套）、`date-renderer-definitions.ts:104-127`（validation/schemaValidator/capabilityContracts/wrap 成对）、`schemas-signature.ts` + `schemas.ts:487` re-export、i18n 双语 `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`（`flux` 根平级命名空间 + `check:i18n-keys`）、playground 四处接线（`form-route-entries.ts:348` / `component-lab/renderers/` / `renderer-lab-registry.ts:168` / `route-matrix.test.ts:141,222` 双向对账）、e2e 先例 `tests/e2e/verification-code.spec.ts` + submit 回写 `component-lab/c3-5-host-surfaces.spec.ts`。
- 守卫实况：`check:schema-prop-coverage` 的 `rendererFiles` 为**硬编码清单，不含 sibling `*-renderer-definitions.ts`**（实测 26 个 type 无 sibling 家族成员）——对 cron-editor 该守卫默认空洞，本计划主动登记（见 M2 裁决）；`contract-honesty.test.ts`（声明的句柄须真实实现）与 route-matrix 对新 definition 生效。
- 诊断双通道：`schemaValidator`（flux-core）只拿静态 schema 节点——用于**创作期初值预检**（对 `schema.value` 跑 `validateCronScheduleValue`）；运行期实时诊断由**组件诊断区**渲染（`data-invalid` + `aria-live="polite"` + i18n 文案）。两通道不混用。

## 值提交门控（M3/M4 裁决，design §7 的落地细则）

1. **分段聚焦期本地草稿**：每段持本地草稿态；每次编辑尝试合成完整 cron 并解析——合法即提交 `{...boundValue, cron}`；非法则**不提交**（表单保持上一合法值），草稿留在段内显示并标诊断。
2. **repeat/range 透传保留**：v1 编辑只覆写 `cron` 键（`{...boundValue, cron: next}`），未触碰的 repeat/range 原样保留（example 实例 2 数据不因 v1 编辑丢失）；C6 区块落地后由区块接管。
3. **模式切换携带草稿**：visual→text 带走未提交草稿原文；非法 text 草稿切到 visual 期间不展示、切回 text 时原样恢复；text→visual 以已提交 `value.cron` 派生各段，非法草稿段以原文显示。
4. **text 模式显示已提交原文**（非 serializeCron 规范化）。
5. 本地草稿属 design §7 local 态（closure 时在 design §7 清单补「分段草稿」注记）。

## Goals

- `type: 'cron-editor'` renderer：双模式（`mode: 'visual'|'text'` 缺省 visual）、分段编辑（秒/分/时/日/月/周/年 7 段，年空 = 6 段）、实时诊断（全 10 码双语文案）、预览（`showPreview`/`previewCount` clamp 1-20 缺省 5，偏移传 `-new Date().getTimezoneOffset()`）、三句柄（clear 清值 / reset 回绑 / focus 聚焦主输入）。
- 值 = `CronScheduleValue`：编辑按「值提交门控」覆写 `cron` 键并透传保留 repeat/range。
- schema 面：v1 消费 `mode/showPreview/previewCount/clearable` 四 prop 进 propContracts；`showRepeat/showRange/presets` 按 design §4 声明进 schema + 最小锚点测试（「声明存在、效果 v2」防回归锚），propContracts 不挂（C6 接管时再挂）。
- 全套登记：definition 收录、i18n `flux.cron.*` 双语、lab 页 + 路由 + registry + coverage manifest、quick-reference、matrix 与 manifest 翻 `runtime`。
- 测试三层：L1 组件测试（RTL）、L3 守卫（definition contracts / handle contracts / schema-prop-coverage 登记 / route-matrix）、L4 e2e 冒烟。

## Non-Goals

- Office 频率档位向导、repeat/range 区块 UI、预设应用 UI（C6）。
- `timezone` 字段（design §12）。
- 设计器属性面板适配、视觉复核基线（C7）。
- 引擎语义改动（问题走既定向量勘误程序）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/`：`schemas-cron.ts`（新）、`renderers/cron-editor-renderer.tsx` + `cron-editor-segments.tsx` + `use-cron-editor-controller.ts`（design §11 controller hook：草稿/提交门控/焦点段/预览游标，新）、`cron-editor-renderer-definitions.ts`（新）、`definitions.ts`/`index.tsx`/`schemas.ts`/`cron/index.ts`（改）
- `scripts/check-schema-prop-coverage.mjs`：`rendererFiles` 登记 `cron-editor-renderer-definitions.ts`（+1 文件）
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`
- `packages/flux-renderers-form/src/__tests__/cron-editor-*.test.tsx`
- playground：`form-route-entries.ts`、`component-lab/renderers/cron-editor-lab-page.tsx`（新）、`component-lab/renderers/index.ts`、`component-lab/renderer-lab-registry.ts`
- `tests/e2e/cron-editor.spec.ts`（新）、`tests/e2e/component-lab/coverage-manifest-entries-form.ts`（按既有惯例登记）
- docs：`quick-reference.md`、`amis-baseline-matrix.md`（翻 `runtime`）、`examples.manifest.json`（targetContract 数组 → runtime 数组）、`design.md`（§3 prop 契约 v1/v2 注记 + §7 分段草稿 local 态注记，closure 时落）、`docs/backlog/cron-scheduling-roadmap.md`（C5 状态）、`docs/logs/`

### Out Of Scope

- C6/C7 全部内容；nop-entropy 仓；`docs/components/index.md`（目录清单无状态列，无翻面动作）

## Failure Paths

| 场景              | 触发                   | 行为                                                                                    | 可重试 | 用户可见                    |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------- | ------ | --------------------------- |
| invalid-cron      | 任一模式输入非法表达式 | 诊断区实时双语错误文案（`data-invalid` + `aria-live="polite"`），按「值提交门控」不提交 | 是     | 红色诊断文案 + 草稿保留段内 |
| impossible-cron   | `0 0 0 30 2 ?` 等      | `impossible` error 级拦截（前置，Java runaway 不对称）                                  | 是     | 同上                        |
| preview-empty     | 合法但序列终止         | 预览区空态文案，不报错                                                                  | 是     | 空态提示                    |
| disabled/readOnly | meta 状态              | 控件禁用；句柄 focus 仍可用                                                             | 是     | 禁用态                      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C5 明示 L1+L3+L4）。**Proof 先行执行顺序承诺**：Phase 1 的执行顺序为「契约测试骨架先行（definitions 三点/句柄三句柄/marker/值提交门控/repeat-range 透传判别断言——先写先红）→ 实现 → 行为断言收敛转绿」；L1 契约骨架在 Implementation 项之前执行。

## Execution Plan

### Phase 1 - 契约测试骨架（Proof 先行）→ schema/definition/renderer 实现 → L1 转绿

Status: completed
Targets: `packages/flux-renderers-form/src/`

- Item Types: `Proof`（L1 契约骨架，先执行）+ `Fix`（组件缺口）

- [x] **Proof 先行**：`__tests__/cron-editor-contract.test.tsx` 骨架——definition 五点（type/wrap/sourcePackage/propContracts/capabilityContracts 三句柄成对）、marker 契约（`nop-cron-editor` + data-slot 组）、值提交门控判别（非法输入不提交）、repeat/range 透传判别（装载 example 实例 2 → 编辑分段 → 提交值仍含 repeat/range）、预览偏移符号判别（固定 ±480 下 range.start 边界）——先写先红（definition/renderer 不存在）
- [x] `schemas-cron.ts`（CronEditorSchema 六 prop + 值类型）+ `schemas.ts` re-export；`cron-editor-renderer-definitions.ts`（propContracts=v1 四 prop、fields、createFieldValidation + schemaValidator 创作期初值预检、三句柄 capabilityContracts、wrap）+ `definitions.ts`/`index.tsx` 收录
- [x] `use-cron-editor-controller.ts` + `cron-editor-renderer.tsx` + `cron-editor-segments.tsx`：按「值提交门控」实现双模式/诊断/预览/三句柄/disabled-readOnly
- [x] `__tests__/cron-editor-*.test.tsx` 行为断言收敛：双模式渲染与切换往返、分段编辑提交、非法输入诊断与不提交、预览严格递增、三句柄行为、clearable 清除交互（guard 登记后 prop 消费判别）、required/disabled/readOnly、marker/data-slot、example.json 三实例零诊断、**v2 prop 最小锚点**（`showRepeat:false`/`showRange:false`/`presets:[…]` 与缺省渲染一致）；`scripts/check-schema-prop-coverage.mjs` 登记 definitions 文件
- [x] `cron/index.ts` barrel 按消费面扩展

Exit Criteria:

- [x] L1 套件全绿（contract 6 + renderer 13 = 19，含 Proof 骨架判别全部转正；closure audit M-2 补 schemaValidator 判别测试后 20/20）；四守卫全过；包内测试 1078/1078 全绿。执行期修正：InputSchema 基类链已有 mode 字面量（Omit 收窄重声明）、CronScheduleValue interface→type alias（SchemaValue 索引签名）、合成时无年段省略 year token（避免 6→7 段漂移）、mode 为内部交互态（prop 初值）
- [x] 文件 ≤500 行红线（超限按区块子组件拆分，`pnpm check` oversized 零新增）
- [x] 已知中间红窗注明：Phase 1 落 definition 后、Phase 2 落路由前，playground `route-matrix.test.ts` 红一次（FORM_RENDERER_ROUTES 未含新 type）——预期现象非破坏

### Phase 2 - i18n、playground 登记与 L3 守卫

Status: completed
Targets: `packages/flux-i18n/`、`apps/playground/`

- Item Types: `Fix`（登记缺口）

- [x] i18n：`flux.cron.*` 双语（模式/分段标签/预览标题与空态/10 诊断码文案/aria 标签；preset 键位 C6 规划就位），`check:i18n-keys` 过
- [x] playground：`form-route-entries.ts` 条目 + `cron-editor-lab-page.tsx`（MultiScenarioLabPage：text 诊断 scenario / visual 分段编辑 scenario / submit 回写 echo scenario）+ registry + re-export
- [x] L3：`form-renderer-definition-contracts.test.ts` / `component-handle-contracts.test.ts` 增补（三句柄钉住）；route-matrix 三点一线转绿

Exit Criteria:

- [x] `check:i18n-keys` 过；route-matrix 全绿；L3 增补全绿；playground typecheck/test 过

### Phase 3 - L4 e2e 冒烟、登记翻面与全量门禁

Status: completed
Targets: `tests/e2e/`、docs

- Item Types: `Proof`（e2e）+ `Fix`（登记翻面）

- [x] `tests/e2e/cron-editor.spec.ts`：编辑→值读回、非法输入报错且不提交、模式切换、预览严格递增、submit 回写、零页面错误（`assertTrackedPageErrors`）、键盘可达
- [x] coverage manifest 按 `coverage-manifest-entries-form.ts` 既有惯例登记 `cron-editor`（tier: write）
- [x] quick-reference 单行条目；matrix `cron-editor` 行 `targetContract` → `runtime`；`examples.manifest.json` targetContract 数组 → runtime 数组
- [x] design.md §3（prop 契约 v1/v2 注记 + schemaValidator 双通道澄清）与 §7（分段草稿 local 态注记）closure 注记
- [x] 全量门禁五项 + `pnpm test:e2e` 全量通过（含新增 cron-editor spec，既有 lab 冒烟不回归）

Exit Criteria:

- [x] cron-editor e2e 4/4 全绿（零页面错误断言）；登记翻面落盘；五门禁 exit 0。全量 e2e 1714 passed + 4 failed——失败经 stash 对照验证为**既有失败、与本改动无关**（ai-bubble-content ×2 用户消息编辑 + editor-demos-ux-r10 sc2-palette-thumb；无 cron-editor 相关），如实记录不声称全量 e2e green

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 6 Major + 6 Minor → 重写后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 M1 manifest 翻面误出 scope → 入 In Scope/Phase 3/Goals/Closure；M2 schema-prop-coverage 对 sibling definitions 空洞（实测 rendererFiles 硬编码）→ 裁决 (a) 主动登记 + v2 三 prop 锚点测试 + design §3 注记；M3 值提交门控未定义 → 专节五规则；M4 repeat/range 透传语义 → 透传保留 + 判别断言；M5 预览偏移符号 → 引擎约定钉死 + ±480 判别；M6 Proof 顺序 → 执行顺序承诺 + Phase 1 重排；m1-m6 全修（诊断双通道/controller hook 入 scope/route-matrix 红窗注记/e2e 全量措辞等）；R2 n1（clearable 行为测试点名）/n2（非法 text 草稿切换承载）/n3（可重试列 + 五点措辞）执行启动时已修

## Closure Gates

- [x] 所有 in-scope confirmed contract gaps 已收敛（renderer + 全套登记 + 三层测试）
- [x] 行为/契约结果已达成（双模式/诊断/预览/句柄/值提交门控与 design 契约一致）
- [x] 必要 focused verification 已完成（L1/L3/L4 三层全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap
- [x] 受影响的 owner docs 已同步（matrix+manifest 翻 runtime、quick-reference、design.md §3/§7 注记、roadmap C5、dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm test:e2e`（全量 playwright 1714 passed + 4 failed——全部 4 项经对照验证与本改动无关，见 Closure Evidence；cron-editor 家族 4/4）
- [x] `pnpm check`（零新增红）

## Deferred But Adjudicated

（无——执行中未推翻任何计划内条目）

## Closure

Status Note: cron-editor v1 渲染器 + 全套登记（definition/i18n 双语/lab 路由/coverage manifest/quick-reference/matrix+manifest 翻 runtime）+ 三层测试交付；值提交门控/透传保留/偏移符号/诊断双通道均钉判别测试。closure audit 两轮（R1 issues 3 Major：coverage manifest 静默未落、schemaValidator 创作期预检未实现、dev log 段丢失 → R2 focused 复核 M-4 plan 落盘声称未兑现 → 全部修复并 grep 实证）；全量 e2e 4 failed 逐项对照验证与本改动无关（3 项 stash 实证 + 1 项 three-industrial-demo 断言缺口属 plan 534/并行 industrial 工作面），cron-editor 家族 4/4 全绿，如实记录。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，R1 issues + R2 focused 复核）
- Evidence: R1 issues（M-1 manifest 登记静默未落 / M-2 schemaValidator 未实现 / M-3 dev log 段丢失 + 7 Minor）→ 修复（含 schemaValidator 判别测试 20/20）→ R2 复核 M-4（Non-Blocking Follow-ups 落盘声称未兑现）+ 2 Minor → 修复并 grep 实证（PREVIEW_CURSOR 行在位、计数 20/20 对齐）；R2 实跑五套件 43/43、route-matrix 42/42、e2e 4/4、guard/i18n exit 0。

Follow-up:

- no remaining plan-owned work（C6：Office 档位向导 + repeat/range 区块 + 预设应用 + v2 prop 契约挂接；C7：视觉复核 + PREVIEW_CURSOR 刷新机制候选）
