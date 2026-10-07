# 541 Cron 轨道 C6 flux cron-editor v2（Office 档位向导 + repeat/range 区块 + 预设应用；编号消歧：cron 轨道系列，另有 2026-10-03 历史同名号）

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C6）、`docs/components/cron-editor/design.md`（§2.2 Office 能力对照 / §4 schema / §7 状态归属）、plan 540（C5 交付：值提交门控/诊断双通道/definition v1/v2 prop 面注记）
> Related: plan 539（引擎）、540（v1 渲染器）

## Purpose

cron-editor v2：visual 模式升级为 Office 频率档位向导（每天/每周/每月/每年/自定义），补 `repeat` 与 `range` 区块（含互斥与锚点校验）与预设应用；a11y 键盘与 aria 完整覆盖；v2 prop（`showRepeat`/`showRange`/`presets`）从「声明缺省」转为真实契约挂接。

## Current Baseline

- v1 已收口（plan 540，f71cea381）：`cron-editor-renderer.tsx`（visual=分段编辑/text）/`use-cron-editor-controller.ts`（提交门控五规则）/`cron-editor-renderer-definitions.ts`（propContracts=v1 四 prop；v2 三 prop 声明进 schema 未挂契约，L2「效果缺省」锚点测试钉住）/`cron-editor-schema-validator.ts`（创作期预检）。
- 引擎面齐备：`deriveFrequency`（daily/weekly/monthly/yearly/custom 派生）、`builtinPresets`（七条稳定 id）、`validateCronScheduleValue`（repeatAnchorMissing/rangeConflict 等值对象诊断）、`fireSequence`（repeat 过滤 + range 截断）。
- 值提交门控（plan 540）：编辑覆写 cron 键透传 repeat/range——C6 的 repeat/range 区块**接管这两个键的结构化编辑**（仍走同一门控：结构编辑提交形状，冲突/缺锚出诊断不阻断形状）。
- L3 现状：`form-renderer-definition-contracts.test.ts` 有「v2 props propContracts 为 undefined」断言（v1 钉子）——C6 挂契约后须翻转该断言；`check-schema-prop-coverage` 已登记 cron definitions 文件（新挂 prop 需测试消费）。
- i18n：`flux.cron.*` 命名空间已建（22+ 键）；preset 键位（`flux.cron.preset.<id>`）已规划未落。

## Goals

- **档位向导**：visual 模式顶部档位条（每天/每周/每月/每年/自定义，由 `deriveFrequency` 派生当前档），四档向导编辑（时间三段 + 档位专属字段：周几多选/几号/月+日），编译回 cron 走既有提交门控；自定义档回落分段编辑器（v1 能力保留）。
- **repeat 区块**（`showRepeat` 缺省 true）：every（≥1）/unit（day|week）/anchor（YYYY-MM-DD，缺省显示「回退 range.start」提示）；结构编辑提交 `{...value, repeat}`，清除键移除 repeat；`repeatAnchorMissing` 诊断就近显示。
- **range 区块**（`showRange` 缺省 true）：start/end（YYYY-MM-DD）+ count（≥1），end 与 count 互斥——同填时形状仍提交、`rangeConflict` 诊断就近显示；清除键移除 range。
- **预设应用**：预设选择器（schema `presets` 覆盖内置 `builtinPresets`），应用 = replace 提交整个 CronScheduleValue（语义见裁决 4）；label 走 i18n（`flux.cron.preset.<id>`，宿主注入 label 时直显）。
- **a11y**：区块 fieldset/legend、档位条 radiogroup 语义、全部控件 aria-label、键盘可达（Tab 序 + 原生控件交互）。
- v2 prop 契约挂接：propContracts 增 `showRepeat/showRange/presets`；L3 断言翻转。

## Non-Goals

- 不做 Office「每 N 天/仅工作日」的专用控件（每天档时间 + 自定义段已可表达；`0 0 9 ? * MON-FRI` 属 weekly 多选/自定义）。
- 不改引擎语义与黄金向量；不动 text 模式；不做 minDate/maxDate 吸附（design §12）。
- 不做预设管理 UI（只应用）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/`：`cron-editor-wizard.tsx`（新建，四档向导）、`cron-editor-blocks.tsx`（新建，repeat/range 区块）、`cron-editor-renderer.tsx`（visual 集成向导 + 区块 + 预设选择器）、`use-cron-editor-controller.ts`（区块结构编辑提交 + 向导 commitWizard 通道，见裁决 2）、`cron-editor-renderer-definitions.ts`（v2 prop 挂契约 + fields）
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`（档位/区块/预设键）
- `packages/flux-renderers-form/src/__tests__/cron-editor-*.test.tsx`（L2 扩展；v1 锚点测试翻转为行为测试）
- `apps/playground/src/component-lab/renderers/cron-editor-lab-page.tsx`（新增向导 + 区块 + 预设 scenario）
- `tests/e2e/cron-editor.spec.ts`（全量用户旅程扩展）
- docs：`docs/components/cron-editor/design.md`（§3 prop 面注记翻 C6 已挂 + §7 local 态补向导草稿）、`docs/references/quick-reference.md`（cron-editor prop 面同步）、`docs/backlog/cron-scheduling-roadmap.md`（C6 状态）、`docs/logs/2026/10-07.md`

### Out Of Scope

- C7（跨仓对账审计、视觉复核、宿主映射示例）
- 引擎/向量变更；text 模式改动；timezone

## 向导与区块语义裁决（M-1/M-2/M-3，draft review 钉死）

1. **档位条状态**：手选档位在合法提交前为**本地选中态**（覆盖 deriveFrequency 派生显示；这是交互选中态而非派生值镜像，不违反 design §7）；合法提交后回落派生档显示。手选「自定义」即进入 v1 分段编辑器。
2. **向导合成通道归属**：向导为「模板 + 结构化字段」合成路径，组件本地持有字段草稿，经 controller 新增 `commitWizard(expr)` 通道提交（与 `setSegmentDraft` 的 7 段 token 合成并列；同一门控：parse 合法才提交）。
3. **向导草稿丢弃**：向导字段未提交（合成非法）时切「自定义」/切 text = 草稿丢弃，回落已提交 cron 的分段派生（与 C5 门控规则 3 对称）。
4. **预设应用 = replace 整值**：提交 `{...preset.value}`（builtinPresets 均不含 repeat/range，应用即重置为预设形状——Office「应用预设即重置」语义），**无确认交互**；应用后档位条随 deriveFrequency 重新定位。
5. **向导编译 canonical**：向导合成 expr → `parseCron` → `serializeCron` canonical 归一后提交（周几多选排序、`?`→`*`、不补零统一走 canonical），保证与分段编辑提交同形。

## Failure Paths

| 场景                            | 触发                                      | 行为                                                                                                                                                                                                                                                                                               | 可重试 | 用户可见     |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| range-conflict                  | end 与 count 同填                         | 形状照实提交（UI 反映用户输入），区块就近显示 rangeConflict 错误文案 + data-invalid                                                                                                                                                                                                                | 是     | 区块红字     |
| anchor-missing                  | repeat 无 anchor 且无 range.start         | repeatAnchorMissing 就近显示                                                                                                                                                                                                                                                                       | 是     | 同上         |
| wizard-compile-invalid          | 向导字段组合出非法 cron（如每周未选周几） | 不提交，向导字段保留输入 + 诊断                                                                                                                                                                                                                                                                    | 是     | 红字提示     |
| preset-apply                    | 应用预设                                  | 整值提交（cron+repeat+range），档位条随 deriveFrequency 重定位                                                                                                                                                                                                                                     | 是     | 值与 UI 更新 |
| repeat-range-structural-invalid | every<1 / unit 非法 / count<1             | 与冲突同规则：结构照实提交（UI 反映输入），outOfRange/badToken 就近显示<!-- 收口勘误（closure audit m-5）：outOfRange 的红字文案落组件级诊断区（aria-live 双通道），区块内为 data-invalid 红边（repeatAnchorMissing/rangeConflict/invertedRange 三码为区块内红字） -->（控件约束 minimize 触发面） | 是     | 区块红字     |
| blocks-mode-scope               | 区块显示范围                              | repeat/range 区块与预设仅 **visual 模式**渲染（text 模式为纯表达式编辑）                                                                                                                                                                                                                           | —      | —            |

值对象诊断（rangeConflict/anchorMissing 等）**不接 field validation rules、不阻断表单 submit**（C5 已实证 `createFieldValidation()` 只收 format 类规则；诊断双通道不混用）——错误展示仅就近区块文案 + `data-invalid`。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C6 明示 L2 扩展 + L4 全量用户旅程）。Proof 先行：L2 契约骨架（档位派生映射/区块值语义/互斥判别/预设应用判别）先于向导实现落盘。

## Execution Plan

### Phase 1 - Proof 骨架 → 向导与区块实现 → L2 转绿

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/`、`__tests__/`

- Item Types: `Proof`（L2 契约骨架先行）+ `Fix`（v2 缺口）

- [x] **Proof 先行**：L2 契约骨架（deriveFrequency 四档映射到向导字段形状、repeat/range 区块值提交形状、rangeConflict/anchorMissing 判别、预设应用 replace 整值判别、v2 prop propContracts 挂接断言翻转）——**先写先红机制：import 尚不存在的新模块**（`cron-editor-wizard.tsx`/`cron-editor-blocks.tsx`/controller `commitWizard`），与 C5 同款 import 失败级红
- [x] `cron-editor-wizard.tsx`：档位条（radiogroup）+ 四档字段（time 三段、周几多选 Checkbox、几号/月日 Input）→ 编译 cron → 提交门控；custom 档回落分段编辑
- [x] `cron-editor-blocks.tsx`：repeat/range 区块（fieldset/legend + 清除键 + 就近诊断）
- [x] `cron-editor-renderer.tsx`：visual 集成（档位条 + 向导/分段切换 + 区块 + 预设选择器 Select）；controller 扩区块结构提交
- [x] definitions：propContracts 挂 `showRepeat/showRange/presets` + fields 规则；L2「效果缺省」锚点测试翻转为行为测试（L3 propContracts=undefined 断言同步翻转）
- [x] L2 全绿（档位编译往返、区块交互与互斥、预设应用、a11y 语义、v1 回归不破）

Exit Criteria:

- [x] L2 套件全绿（v2 contract 5 + renderer 翻转与新增 7 = cron-editor 家族 20 + 引擎 114<!-- 收口勘误（closure audit m-4）：引擎套件实为 106（C4 收口口径，C6 未增删引擎用例）；「家族 20」为 C5 日志 L1 计数串写，家族 Phase 1 终态 25（contract 7 + renderer 13 + v2 contract 5）、含 Phase 2/audit 补测终态 32 -->）；`check:schema-prop-coverage` 过；文件 ≤500 行。执行期发现 3 条：① deriveFrequency weekly 规则扩展（多选周位回落 weekly，C6 裁决 1，C4 的 MON-FRI 钉子翻转）；② presets 契约 shape 必须为 array（object shape 触发 shape-validation 失败 → skippedPropKeys 静默剥离——proof 测试当场抓获）；③ 预设 label 键为 locale camel 约定（presetHourly），非 C4 规划的嵌套 preset.<id>
- [x] 已知中间红窗：definition 挂契约后 `form-renderer-definition-contracts` v1 断言翻转前红一次（预期）

### Phase 2 - i18n、lab scenario、e2e 用户旅程与全量门禁

Status: completed
Targets: `packages/flux-i18n/`、playground、`tests/e2e/`

- Item Types: `Proof`（e2e 旅程）+ `Fix`（i18n）

- [x] i18n：档位标签/区块标签/字段标签/预设标签（`flux.cron.preset.<id>` 七条 + 宿主 label 直显；执行期改判 camel 键 `presetHourly` 等，见 Phase 1 EC ③；另补 `tierGroup` 键修正 radiogroup aria-label）
- [x] lab 页新增 scenario：向导编辑旅程 + repeat/range 区块 + 预设应用（valuesPath echo 惯例）
- [x] e2e 全量用户旅程（roadmap L4 矩阵 C6 落位）：向导每周改周几 → echo cron 变化；repeat 区块设 every/anchor → echo 含 repeat；end+count 同填 → 诊断出现；预设应用 → 整值更新；submit 回写；键盘可达（档位条/区块/预设全键盘操作）；零页面错误

Exit Criteria:

- [x] e2e 旅程全绿（含键盘可达）；全量 e2e 失败集合与 C5 收口基线一致（4 项既有失败，无新增）。执行期发现 6 条：① v2 旅程测试初版置于 `test.describe` 外（beforeEach 导航不生效致 stage 恒缺）→ 移入；② hourly 预设（星号时分）deriveFrequency 派生 **custom** 非 daily → 断言改 daily-9 预设；③ 双档位条重复渲染（wizard 组件内部条与 renderer 条并存、testid 重复）→ wizard 收敛为纯字段编辑器，档位条单一化归 renderer；④ 裁决 4 补实现——预设应用重置手选档位回落派生（`setPickedTier(null)`）；⑤ 档位条 a11y 补齐——roving tabindex + 方向键换档（焦点随动）+ 专属 `tierGroup` aria-label；⑥ 门禁收敛——knip 新红两枚（未消费导出 Props 类型）取消导出、`react/no-array-index-key` 改内容派生 key

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 4 Major + 7 Minor → 修订后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 M-1 档位条状态语义与向导通道未定 → 裁决节五条（本地选中态/commitWizard 归属/草稿丢弃）；M-2 预设应用 replace-or-merge 未裁决 → replace 整值无确认；M-3 向导编译 canonical 未钉 → parse+serializeCron 归一提交；M-4 owner-doc 漏 design/quick-reference → In Scope+Closure 补；R1 Minor 1-7 全修；R2 残留 3 Minor（baseline L1→L2 措辞、e2e 重复 bullet 合并、controller/Goals 摘要指针）执行启动时已修

## Closure Gates

- [x] 所有 in-scope confirmed contract gaps 已收敛（向导/区块/预设 + v2 契约挂接；closure audit R1 两 Major——单关 prop 条件渲染、模式切换重置向导态——已修并带判别测试）
- [x] 行为/契约结果已达成（Office 五档 + repeat/range + 预设与 design §2.2 对照成立）
- [x] 必要 focused verification 已完成（L2 家族 32/32 + L4 e2e 5/5 全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap
- [x] 受影响的 owner docs 已同步（design.md §3/§7 注记、quick-reference、roadmap C6、dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务；form 包 120 文件 1093 用例）
- [x] `pnpm test:e2e`（全量 playwright 1716 passed + 5 failed：C5 基线既有 4 项 + 1 项 stash 对照定性负载 flake，无新增）
- [x] `pnpm check`（exit 0；knip 两类新红当场收敛，零未登记新增红）

## Deferred But Adjudicated

（无——执行中如推翻条目，当场落本节）

## Non-Blocking Follow-ups

-（无）

## Closure

Status Note: 2026-10-07 收口。C6 全部交付面 landing：Office 五档向导（单一档位条 radiogroup + roving tabindex + 方向键换档）、repeat/range 区块（单关 prop 条件渲染、结构照实提交 + 值诊断就近/data-invalid 双通道）、预设应用（replace 整值 + 档位条随 deriveFrequency 重定位）、v2 三 prop 实挂契约（v1 锚点断言翻转）；i18n 双语 / lab scenario / e2e 全量用户旅程齐备；五门禁 + 全量 e2e 失败集合与 C5 基线一致（full-green verification）。closure audit 两轮（R1 issues 2 Major + 5 Minor → R2 approved）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，两轮）
- Evidence: R1 `issues`（2 Major：M-1 showRepeat/showRange 单关语义未落地——blocks 双 fieldset 无条件渲染单关呈 no-op 脱节，修为按区块条件渲染 + 单/对偶判别测试；M-2 模式切换不清向导草稿与手选档位违背裁决 1/3，修为切换双侧重置 + 往返判别测试。5 Minor：m-1 roadmap 翻面滞后文本随收口成真、m-2 definitions 头 JSDoc stale 已更新、m-3 plan checkbox 键位改判就地注记、m-4 Phase 1 EC 计数串写就地勘误、m-5 failure path outOfRange 展示通道措辞勘误）→ 全部修复 + 复跑（家族 32/32、form 1093、e2e 5/5、check exit 0）→ R2 `approved`（R2 新发现勘误注记内「终态 31」笔误，随本收口改 32）。

Follow-up:

- 无 remaining plan-owned work。后续候选（非本 plan 义务，roadmap §12 已记）：视觉复核与跨仓对账归 C7（plan 542）；timezone / minDate-maxDate / 设计器属性面板适配为 design §12 后续候选，未排期。
