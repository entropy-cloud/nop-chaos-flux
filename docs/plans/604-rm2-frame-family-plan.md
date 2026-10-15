# 604 RM-2 帧族收敛：wrap/frameWrap 单权威生效路径 + FrameWrapMode 归一单点

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-2；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A5（下称"分析报告"）；plan 460 B3 语义（`packages/flux-renderers-form/src/renderers/input.tsx:511` 注释）
> Related: 前置 `docs/plans/603-rm1-type-layer-plan.md`（completed）；RM-0 retention policy 钉面（renderer-runtime.md Channel Authority 节 frameWrap 权威通道）

## Purpose

帧族控制（definition `wrap` 布尔、definition `frameWrap` 默认、schema `frameWrap` 实例覆盖、`resolvedMeta.frameWrap`）收敛到单一生效路径与单一 boolean 归一化点：definition 级帧默认经同一 resolver 生效（plan 460 B3 的 radio/checkbox-group fieldset 语义落地不回退），`FrameWrapMode` 的 boolean→词表归一化全仓仅 `resolveFrameWrapMode` 一处，对外 schema 兼容 boolean 不变。

## 授权链（保护区）

本 plan 代码面触 `packages/flux-react/src/`（非 flux-core）、`packages/flux-renderers-form-advanced/src/`（variant-field 归一化迁移）；definition fields 只读（radio/checkbox-group 的 `frameWrap: 'group'` 声明不改动——本 plan 恰是让它生效）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 plan 603 授权链节；CX-20 先例）。

## Current Baseline（live 核对 2026-10-15，HEAD 460ed9c42）

- **帧生效链现状**：`resolveFrameWrapMode(definitionWrap, schemaFrameWrap)`（`packages/flux-react/src/node-renderer-utils.ts:3-20`）是唯一 boolean 归一化点：`!definitionWrap→'none'`；`false|'none'→'none'`；`'group'→'group'`；其余→`'label'`。入参 `definitionWrap` 来自 `node-renderer-resolved.tsx:435` 直读 `props.node.component.wrap`；`schemaFrameWrap` 来自 `resolvedMeta.frameWrap`（schema authored 值经 metaProgram 编译，`flux-compiler/src/schema-compiler/fields.ts:82` + `flux-runtime/src/node-runtime.ts:251-259`）。消费点唯一：`node-frame-wrapper.tsx:17-20` → FieldFrame `layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}`（`frameRootTag` 直读在同文件 :71）。
- **definition 级 `frameWrap` 是零消费死声明（live 重枚举，纠正分析报告 A5）**：分析报告 A5 称 definition 级 frameWrap"须经 metaProgram → resolvedMeta.frameWrap 间接生效"——live 核实**不成立**：flux-compiler/flux-runtime/flux-react 无任何 `definition.frameWrap` 运行时读取点（grep 全仓仅 `compiled-renderer-contract.ts:77` 的透传拷贝、若干类型位与两处声明本体）；metaProgram 只编译 schema authored 字段、无 definition 种子注入。声明位点仅 `packages/flux-renderers-form/src/renderers/input.tsx:512`（radio-group）与 `:535`（checkbox-group），均注释 plan 460 B3"fieldset frame——`<label>` wrapper 会把 gap 点击转发给第一个 option"。**实际效果：B3 fieldset 语义从未生效**——无 authored frameWrap 的 radio/checkbox-group 今天渲染 label 帧（`<label>` wrapper，gap 点击 steal 首个 option 的原始问题仍在）。
- **第二处内联归一化（违反单点）**：`packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:98-104` 自带 `meta.frameWrap ?? schemaProps.frameWrap` 的 boolean 三元归一化（`false|'none'→'none'；'group'→'group'；否则 'label'`），与 `resolveFrameWrapMode` 平行。
- **对外 schema 词表**：`FrameWrapMode = boolean | 'label' | 'group' | 'none'`（`flux-core/src/types/schema.ts:75`，`BaseSchema.frameWrap` :116）；definition 级类型为 `'label' | 'group' | 'none'`（无 boolean）。`frameRootTag`（definition 级，`'div'|'label'`）由 `node-frame-wrapper.tsx:72` 直读 compiled contract，路径健康、不在本 plan 范围。
- **行为面四象限基线（radio-group：wrap=true、definition frameWrap='group'）**：authored absent→**label**（B3 未生效的现状）；`'group'`→group；`false|'none'`→none；`true|'label'`→label。无 definition 声明的 renderer：absent→label；`wrap=false` renderer：恒 none。
- 既有测试锚点：`packages/flux-react/src/frame-slot-meta.test.tsx`（resolveFrameWrapMode 单测 + NodeFrameWrapper 集成）；`packages/flux-react/src/__tests__/data-source-and-node-identity.test.tsx:293`（"uses group layout when frameWrap is group"，authored 'group' 用例——迁移后必须保持绿）。
- owner docs：`docs/architecture/field-frame.md:42-49`（"unset: follow the renderer definition's wrap"——未记 definition frameWrap 默认）；`docs/architecture/renderer-runtime.md`（Renderer-Level Static Metadata 节有 `frameRootTag` 小节，无 definition frameWrap 记载；L233 schema.frameWrap per-instance override 记载与 RM-0 钉面一致）。
- 基线验证：HEAD 460ed9c42 五门禁全绿（RM-1 收口提交）。主工作树有并行会话 RM-9 在途脏路径（docs/missions 面 7 M + 2 untracked，快照随执行刷新），本 plan 零触碰；roadmap/dev log 为混合脏文件，收口提交 hunk 级 staging（plan 602 先例），提交格式依 roadmap Cross-Cutting 5：`refactor(renderer-metamodel): <description>`。

## Goals

- definition 级 `frameWrap` 经 `resolveFrameWrapMode` 单路径生效：新增第三入参 `definitionFrameWrap`，仅在无 authored 覆盖时作为默认（B3 fieldset 语义落地：radio/checkbox-group 无 authored frameWrap 时渲染 group 帧）。
- boolean 归一化全仓单点：variant-field 内联三元迁移至 `resolveFrameWrapMode`；`FrameWrapMode` 对外 schema 词表不变（boolean 仍合法输入）。
- 判别变异覆盖 label/group/none × authored 覆盖四象限 + 两条不变回归线（无声明 renderer、wrap=false）。

## Non-Goals

- 不改 `FrameWrapMode` 类型与 schema 兼容面（boolean 输入保持合法，仅在归一化点收敛）。
- 不动 `frameRootTag` 路径、不动 FieldFrame 内部、不动 metaProgram 编译（schema.frameWrap→resolvedMeta 通道保持）。
- 不迁移 variant-field 的帧消费语义本身（其 `meta.frameWrap ?? schemaProps.frameWrap` 取值顺序保留，仅归一化实现换单点；零行为变更）。
- 不清理 definition.frameWrap 声明（本 plan 使其生效而非删除；若裁定应删除须单独立 plan）。

## Scope

### In Scope

- `packages/flux-react/src/node-renderer-utils.ts`：`resolveFrameWrapMode` 增 `definitionFrameWrap` 入参与默认回退逻辑。
- `packages/flux-react/src/node-frame-wrapper.tsx` + `node-renderer-resolved.tsx`：透传 `definitionFrameWrap`（compiled contract `frameWrap`）。
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx`：内联归一化迁移到单点。
- 判别钉测试：`frame-slot-meta.test.tsx` 四象限单测 + radio-group 集成 pin（无 authored frameWrap → fieldset 帧）+ 既有 authored 'group' 用例保绿 + 两条不变回归线。
- docs：`field-frame.md` unset 语义 + `renderer-runtime.md` definition frameWrap 记载（Renderer-Level Static Metadata 节）。
- roadmap RM-2 状态流转 + daily log 条目。

### Out Of Scope

- flux-core 类型面（`FrameWrapMode`/Shape 定义不动）；frameRootTag；e2e 重跑（判别变异 + focused 测试承载行为验证，提交披露）。

## Failure Paths

不适用：无错误处理/API 行为/外部集成面。行为面变化（radio/checkbox-group 默认 label→group 帧）为 B3 语义的既定落地，判别变异钉死并以提交信息+dev log 披露 DOM 结构变化。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——本 plan 是行为面改动（roadmap Cross-Cutting 5 明列 RM-2 为行为面项，须判别变异）。Proof 项（四象限判别钉）先于 Fix 项落地：先写四象限用例（definition 默认生效前 absent→label 红/生效后 group 绿），再接线。

## Execution Plan

### Phase 1 - 单权威路径 + 单点归一化（行为面，先红后绿）

Status: completed
Targets: `packages/flux-react/src/node-renderer-utils.ts`、`node-frame-wrapper.tsx`、`node-renderer-resolved.tsx`、`packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx`

- Item Types: `Fix`（死声明生效 + 单点收敛）、`Proof`

- [x] Proof 先行（判别层级裁定，R1 M1）：四象限钉 + 先红实录走 **NodeFrameWrapper/管线级**——接线前实录：象限钉 `expected 'DIV' to be 'FIELDSET'` 红（探针 frameRootTag='div' 故 label 布局帧根为 DIV）、form 集成钉 `expected 'LABEL' to 'FIELDSET'` 红（B3 未生效实况）；既有 resolver 单测随签名迁移至三参契约并新增 definition 默认单测（防位置变义假绿）。
- [x] `resolveFrameWrapMode(definitionWrap, definitionFrameWrap, schemaFrameWrap)`：authored 覆盖优先（false|none→none、group→group、true|label→label），无覆盖时回退 definitionFrameWrap（group/none/缺省 label），`!definitionWrap` 恒 none 前置不变；JSDoc 钉单点语义。
- [x] `node-frame-wrapper.tsx` 增 `definitionFrameWrap` prop、`node-renderer-resolved.tsx:435` 传 `props.node.component.frameWrap`；四象限钉全绿。
- [x] 集成 pin：flux-renderers-form `dom-structure-contract.test.tsx` radio-group 用例加强 `tagName === 'FIELDSET'` 断言（接线前 LABEL 红→接线后绿，全链 B3 真语义）；`data-source-and-node-identity.test.tsx:293` authored 'group' 用例保绿。**B3 落地的两处下游断言适配**（意图保持）：`component-handles-input.test.tsx` focus 用例与 `input-source-state.test.tsx` group-names 用例的 `getByRole('group')` → `getAllByRole`（fieldset 隐式 role=group + 内层容器双命名，注释钉明原因）。
- [x] variant-field-view.tsx 内联三元迁移为 `resolveFrameWrapMode(true, undefined, frameWrap)`（取值顺序保留；判别测试 `variant-field-field-frame.test.tsx:267`/`:307` 绿）；`resolveFrameWrapMode` 新增 flux-react 公开导出（公开面新增，授权链覆盖；FADV 两处 vi.mock 补 stub 导出）。

Exit Criteria:

- [x] 四象限钉（NodeFrameWrapper 级）+ 两条不变线全绿（含接线前 absent 象限先红实录）；radio-group 集成 pin（form 包 FIELDSET 断言）绿；variant-field 迁移零行为（`:267`/`:307` 判别测试绿）；`pnpm --filter @nop-chaos/flux-react test`（602/602）+ `--filter @nop-chaos/flux-renderers-form-advanced test`（1213/1213）+ `--filter @nop-chaos/flux-renderers-form test`（1125/1125）全绿。

### Phase 2 - docs 同步 + 前提勘误 + 收口验证

Status: completed
Targets: `docs/architecture/field-frame.md`、`docs/architecture/renderer-runtime.md`、`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md`、`docs/backlog/renderer-metamodel-roadmap.md`

- Item Types: `Fix`（owner-doc 同步 + 前提就地勘误）、`Proof`

- [x] `field-frame.md:42-49` "unset" 语义更新：unset → definition `frameWrap` 默认（无声明回退 label，`wrap=false` 仍 none）。
- [x] `renderer-runtime.md` Renderer-Level Static Metadata 节 `frameRootTag` 小节旁增 `frameWrap` (definition-level default) 小节（默认回退语义 + B3 判例 + "Effective since RM-2 (plan 604); before that the declarations were inert"）。
- [x] `renderer-runtime.md:249`（Channel Authority，RM-0 钉面）权威句同步：生效模式改为 `resolveFrameWrapMode(definitionWrap, definitionFrameWrap, authoredFrameWrap)` 三参语义。
- [x] 前提就地勘误两处：分析报告 A5 第 2 点 + roadmap 当前基线节（"metaProgram 间接生效"表述）就地附注【勘误 2026-10-15,RM-2/plan 604…】，历史文本不改写。
- [x] strict validation 语料：playground `page-schemas-validation.test.ts`（plan 595 全 code 门禁，showcaseRegistry + strictMode）44/44 绿——CLI 独立跑自 2026-10-07 起有既有 exit 2 问题（语料门禁以测试形态承载），plan 原"validate-pages --strict CLI"写法以此为准。
- [x] 全量五门禁（Closure Gates；typecheck/build/lint/test/check 五链 exit 0，`_tmp/rm2-closure-gates2.log`[typecheck/build] + `_tmp/rm2-lint.log`[lint 修复后重跑绿,audit m3 证据补列] + `_tmp/rm2-gates-tail.log`[test/check]；收口前修补：XuiImportSpec import 恢复、4 个既有 NodeFrameWrapper 测试位补 `definitionFrameWrap={undefined}`、variant-field 失用 `FrameWrapMode` import 清理）。

Exit Criteria:

- [x] 两文档与 live 行为一致；Channel Authority 权威句已同步；两处前提就地勘误附注落位；strict 语料 44/44；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_340fed9e（独立 fresh 子 agent，全部关键声称亲证含反例排除）
- Verdict: `pass`（R1 fail 0B/3M/7m → 按 M1+M2+M3+四 m 修订 → R2 pass 0B/0M/2m 残留随执行清）
- Rounds: 2
- Findings addressed: R1 M1=判别机制层级错误（裸 resolver 级三参调用二参函数会假绿/错象限红）——四象限钉+先红实录改钉 NodeFrameWrapper/管线级，resolver 单测随签名迁移防位置变义假绿；R1 M2=renderer-runtime.md:249 Channel Authority 权威句（RM-0 钉面）将随本 plan 失真——Phase 2 增同步条目；R1 M3=分析报告 A5+roadmap:67 前提被推翻——Phase 2 增就地勘误条目；m1=frameRootTag 行号 :72→:71；m3/m6=并行脏路径计数刷新+提交格式复述；m7=集成 pin 裁定 form 包 dom-structure-contract.test.tsx:73 加强 FIELDSET 断言（天然判别钉）；m5=variant-field 零行为点名 :267/:307 判别测试；m2/m4 枚举完备性与单测迁移义务随落字。

## Closure Gates

- [x] 单权威路径落地且判别变异四象限先红后绿实录在案（NodeFrameWrapper 级；B3 fieldset 语义生效不回退，form 包 FIELDSET 钉；audit 亲证变异 definition 回退分支→flux-react 2 红 + form 1 红→sha256 逐字节恢复→双绿）
- [x] boolean 归一化全仓单点（variant-field 迁移零行为，`:267`/`:307` 判别测试绿；audit 全仓 grep 归一化实现仅 resolver 一处）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红 + 契约门禁零豁免新增（audit 亲核三 log + 亲算 14,980/0）
- [x] owner docs 两处同步 + Channel Authority :249 权威句同步，与 live 一致
- [x] 前提就地勘误两处（分析报告 A5 + roadmap 当前基线节）落位（audit 亲证就地附注、历史文本未改写）
- [x] strict validation 语料 0 error（page-schemas-validation.test.ts 44/44，audit 亲跑）
- [x] roadmap RM-2 状态流转 + daily log 条目（含 radio/checkbox-group 默认帧 DOM 变化披露；随本提交 hunk 级 staging）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_c198acc9，R1 approved 0B/0M/3m，m1-m3 随回写处理）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- 若 B3 生效后发现下游视觉回归（依赖 radio/checkbox-group label 帧的宿主页面），按登记制记录，修法=宿主 schema 显式 `frameWrap: 'label'`（对外兼容面不变）。

## Closure

Status Note: RM-2 交付全部落地——①`resolveFrameWrapMode` 三参化成为帧族单权威生效路径与全仓唯一 boolean 归一化点（definition 级 `frameWrap` 默认经第三入参生效，plan 460 B3 的 radio/checkbox-group fieldset 语义自本 plan 起真实生效——此前为死声明，分析报告 A5"metaProgram 间接生效"表述经就地勘误纠正）；②authored 覆盖四象限 + 两条不变线判别钉（flux-react）+ form 包全链 FIELDSET 钉，先红后绿实录且 audit 亲证变异→双红→sha256 恢复→双绿；③variant-field 内联归一化迁移单点（零行为）；④`FrameWrapMode` 对外 schema 词表不变。行为面 DOM 变化披露：无 authored frameWrap 的 radio-group/checkbox-group 帧根由 `<label>` 变为 `<fieldset>`（gap 点击 steal 修复），B3 判例两处下游测试断言按意图适配。全量五门禁 exit 0（test 14,980/0，audit 亲算）；e2e 未重跑（判别变异+focused 承载，提交信息披露）。

Closure Audit Evidence:

- Auditor / Agent: agent_c198acc9（独立 fresh 子 agent，R1 approved 0B/0M/3m；m1=先红实录留档链不完整[audit 以变异复现补强，两种 AssertionError 逐字重现]；m2=测试位计数 4→5 已校正；m3=门禁证据补列 rm2-lint.log——均随回写落字）
- Evidence: resolver 三参逐分支亲证；判别变异亲证（注释 definition 回退分支→flux-react 2 failed + form 1 failed→sha256 `7bd7e9e3…` 逐字节恢复→602/602 + 1125/1125 双绿）；单点声称全仓 grep 亲证（归一化实现仅 resolver）；form-advanced 1213/1213 亲跑；strict 语料 44/44 亲跑；docs 四处亲证（勘误就地附注）；范围纪律亲证（RM-9 并行路径零混入）；门禁三 log 亲核（14,980 tests 零失败汇总行）

Follow-up:

- 若 B3 生效后发现下游视觉回归（依赖 radio/checkbox-group label 帧的宿主页面），按登记制记录，修法=宿主 schema 显式 `frameWrap: 'label'`（对外兼容面不变）。
- 其余：no remaining plan-owned work。
