# 507 Missing Components L2.3 — input-signature（手写签名）

> Plan Status: completed
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.3 行，matrix flip 前置）；§1 交付铁律；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md` §7（Vant Signature / Form.io Signature 基准）
> Related: `docs/plans/506-missing-components-l2-2-input-city-plan.md`（org 族外的独立控件；503 交付铁律模板）

## Purpose

按交付铁律 8 项收口 roadmap L2.3：`input-signature` 手写签名控件（canvas + pointer events + 笔画撤销），产出 PNG dataURL 作为表单值。落地后 roadmap L2.3 → `done`。

## Current Baseline

2026-09-25 live repo 核对：

- **matrix**：§5 notRetained 表含 `input-signature` 行（「specialized device/canvas behavior / future optional integration」）；Form Core 无此行。命名权威链：matrix 既有行名 + AMIS 无直接源 type → 定名 `input-signature`（flux `input-*` 族 + matrix 行名；roadmap 暂定名 `signature` 否决——与 506 `region`→`input-city` 同判例）。
- **canvas 测试基线**：unit-test 环境为 happy-dom，`getContext('2d')` 返回 null（qrcode.test.tsx:13 在库注释可证；`test-dom-polyfills.ts` 已有含 pressure 的 PointerEvent polyfill）——绘制/toDataURL 行为由 e2e 真浏览器钉住；单测以 fake 2d context stub 钉骨架、工具条、句柄契约、回绘调用，另设无 context 用例钉降级。scada-canvas 先例（`flux-renderers-industrial`）经 leafer 自带引擎，不适用。
- **控件形态先例**：506 region wheel 已确立「widget 自建样式落于 form 包、零 ui 公共导出」路径，signature canvas 同法。
- **验证基线**：master 0a6996e9e（bad7ba5dd + 506 漏提交测试回填）干净；e2e 失败面 = 502 存量台账 9 + watch-only 1。

## Goals

- 命名 pass + matrix flip：§5 删 `input-signature` 行；Form Core 增行。
- `input-signature` renderer：canvas 手写板（pointer events、笔画数组、undo 逐笔画撤销、clear）、值 = PNG dataURL（笔画集变化后即重新提交）；只读/禁用态、回显（初值 dataURL 经 Image 异步解码后 drawImage 回绘）。
- **值语义不变式（draft review r1 M1 裁决）**：`零笔画 ⇔ 值 undefined`——初始未绘制、undo 撤销至零笔画、clear 三条路径一致提交 `undefined`（绝不保留陈旧 dataURL 或提交空串）；每次笔画集变化（新增/撤销/清空）都以当前笔画集重算值并提交（非空 = 当前画布 PNG dataURL）。required 校验与提交契约由该不变式唯一决定。
- focused 单测 + e2e 真浏览器绘制断言 + 登记 + i18n + INV 审计 + roadmap 回写 + dev log。

## Non-Goals

- 不做压感线宽（roadmap L2.3 行原文「canvas + pointer events + 笔迹压感取消」之压缩措辞；其自declared 基准 Vant signature 为固定 lineWidth、Form.io signature_pad 为速度调宽，均不含指针压感——上游 gap-analysis 亦无压感要求。pointer pressure 采集不改变线宽，登记 Follow-up）。
- 不做导出 JPG/裁剪/高清倍率导出（v1 固定 PNG、固定 devicePixelRatio 缩放）。
- 不做手写识别/签名验签。
- 不进 ui 包公共导出（canvas widget 自建于 form 包）。

## Scope

### In Scope

- `docs/components/amis-baseline-matrix.md`：§5 删行 + Form Core 增行。
- `packages/flux-renderers-form/src/`：`schemas-signature.ts`（`InputSignatureSchema`：`penColor`/`penWidth`/`height`/`backgroundColor`/`clearable`，extends InputSchema，值 string dataURL）+ `renderers/signature-renderer.tsx`（定义 + 渲染核心 + canvas 控制：pointerdown/move/up 采集笔画、undo/clear 工具条、初值回绘）——行数 ≤500，超出则拆 canvas 控制模块。
- **画布几何契约**：位图尺寸 = 容器 CSS 宽 × `height` prop × 固定 devicePixelRatio；绘制坐标按 CSS 像素 → 位图像素 scale 映射（getBoundingClientRect 相对坐标 × DPR）——design.md §11 必须写明，e2e 须含一次「小视口绘制仍落笔在指针处」的几何断言（防 DPR 错位）。
- i18n：`signatureUndo`/`signatureClear`/`signatureUnsupported`（placeholder 键在实现中由 unsupported 降级提示取代）/`signatureAriaLabel`（zh/en）。
- playground：`signature-lab-page.tsx` + route/registry。
- 测试：focused 单测（happy-dom + fake 2d context stub，含无 context 降级用例）+ e2e `input-signature.spec.ts`（鼠标拖绘制作 → 值提交 dataURL 前缀断言 → undo 笔画递减 → clear 清值 → 初值回绘）。
- docs：`docs/components/input-signature/{design.md,example.json}` + 三处登记 + roadmap §13 + dev log。

### Out Of Scope

- L2.4–L2.6 各 work item；ui 包改动。

## Failure Paths

| 可测场景编号           | 触发                     | 行为                                                                                              | 可重试 | 用户可见表现           |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| signature-unsupported  | 宿主无 canvas 2d context | 控件降级为占位提示 + 工具条隐藏，不崩、值保持 undefined                                           | 否     | 「当前环境不支持手写」 |
| signature-empty-commit | 未绘制时无提交           | 值保持 undefined（不提交空白 dataURL）；undo 至零笔画 / clear 同样提交 undefined（§值语义不变式） | 否     | 表单校验 required 正常 |
| signature-invalid-echo | 初值非合法 PNG dataURL   | Image 解码失败（onerror）→ 画布保持空白、值保留初值字符串不崩                                     | 否     | 空白画布 + 原值保留    |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**

理由：交付铁律 4；canvas 行为分层验证——happy-dom 单测（fake 2d context stub）钉结构与句柄契约，e2e 真浏览器钉绘制/提交/撤销。

## Execution Plan

### Phase 1 - 命名 pass + matrix flip（前置裁决）

Status: completed
Targets: 本 plan 命名决议节、`docs/components/amis-baseline-matrix.md`

- Item Types: `Decision`

- [x] 命名决议落本 plan（`signature` → `input-signature`：matrix 行名 + flux input-\* 族；roadmap 暂定名否决理由）
- [x] matrix §5 删 `input-signature` 行；Form Core 增行

Exit Criteria:

- [x] matrix diff 可见；grep 实测仅 Form Core 新行 1 命中
- [x] 命名决议写在本 plan

### Phase 2 - renderer 实现 + 分层验证

Status: completed
Targets: `packages/flux-renderers-form/src/`、playground lab、`docs/components/input-signature/`

- Item Types: `Fix`、`Proof`

- [x] `InputSignatureSchema`（`src/schemas-signature.ts` + schemas.ts re-export）+ `signatureSpecificContracts`（input-contracts.ts）+ `inputSignatureRendererDefinition`（signature-renderer-definitions.ts，capability: clear/reset）+ `signature-renderer.tsx`（canvas 控制与工具条，312 行 ≤500）
- [x] focused 单测 7 条（happy-dom + fake 2d context stub 含 clearRect）：骨架/工具条、无 context 降级（占位 + 工具条隐藏 + 值 undefined）、空板 clear 提交 undefined（值语义不变式）、component:clear 句柄、禁用态、初值回绘 Image.onload、非法初值 onerror 保持空白——7/7 绿
- [x] e2e `input-signature.spec.ts` 3 用例：绘制→dataURL 提交→undo 递减→清空归 undefined（不变式全链路）、小视口 DPR 几何断言（位图采样指针处墨迹）、readonly 忽略绘制 + 初值回绘——3/3 绿
- [x] `design.md`（13 节，§11 工程点：原生 pointer 事件绑定、preventDefault 抑制 click 合成、收笔后 400ms click 吞除器、DPR 坐标映射、单点圆点渲染）+ `example.json`；i18n 4 键双语；playground `signature-lab-page.tsx` + route/registry（route-matrix 42/42 绿）

Exit Criteria:

- [x] focused 单测绿（7/7）；route-matrix 守卫绿（42/42）；e2e spec 全绿（3/3）

### Phase 3 - 登记 + INV 审计 + 收口验证与状态回写

Status: completed
Targets: 三处登记、roadmap §13、dev log

- Item Types: `Proof`、`Follow-up`（登记性）

- [x] 登记：examples.manifest.json（runtime +1）/ quick-reference.md（InputSignatureSchema 行）/ components/index.md（清单行 + 目录）——grep 复核命中
- [x] INV 审计（铁律 7）结论按 §4 模板落 Closure 节
- [x] 全量验证 + roadmap §13 L2.3 回写 `done`（grep 复核）+ dev log（簿记补正 2026-09-26）

Exit Criteria:

- [ ] 三处登记 diff 可见；roadmap/dev log 落盘一致

## 授权记录（human gate）

- 用户 2026-09-25 指令执行 roadmap 至彻底完成为 L2.3 行授权；matrix flip 随指令签认（先例：503/505/506）。
- ui 包零改动（canvas widget 自建于 form 包），ask-first 门不触发。

## 命名决议（Phase 1 交付物）

| 暂定名（roadmap） | 定名                  | 依据                                                                                                                  |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `signature`       | **`input-signature`** | matrix §5 既有行名即 `input-signature`；flux `input-*` 表单控件族约定；506 判例（matrix 行名权威 > roadmap 暂定名）。 |

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Round 1 `fail`（1M/5m）：M1 undo/clear 值语义未裁决 → 「值语义不变式」段（零笔画 ⇔ undefined 三路径一致）；m1 happy-dom 措辞、m2 fake 2d context stub 分层 + 无 context 降级用例、m3 roadmap 原文逐字引用 + 压感 Follow-up 预置、m4 signature-invalid-echo Failure Path、m5 画布几何契约条——全部落实。裁决核对：roadmap L92「笔迹压感取消」压缩措辞、基准不含压感，计划裁决成立。Round 2 确认闭合，n1–n3 文本卫生项（e2e checklist 补几何/非法初值短句、Baseline 注记 0a6996e9e、残留 jsdom 措辞）已顺手修入。观察项：506 漏提交测试已单独提交 0a6996e9e。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（执行中暴露的管线缺陷当场修复：布局位移致合成 click 误触工具条、画布尺寸重赋值清空位图、stringAdapter 空串回绘）
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成（`input-signature` `runtime` 八项交付面齐）
- [x] 必要 focused verification 已完成（7 条 focused 单测 + e2e 3 用例真浏览器断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（压感线宽/容器 resize 重排登记 Non-Blocking Follow-ups）
- [x] 受影响的 owner docs 已同步（design.md、matrix、三处登记）
- [x] new-renderer-introduction-audit 已过且结论按 §4 模板记录于 Closure 节
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（r2 approved；簿记补正 2026-09-26）
- [x] `pnpm typecheck`（2026-09-25 全仓 0 error）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0，仅存量 1 warning）
- [x] `pnpm test`（`--force` 零缓存 74/74 task 全绿；form 921 = 914+7）
- [x] `pnpm check`（exit 0；执行中触发 4 例 hardcoded-literal-color 新红——签名笔色/底色功能性默认值——按治理先例登记 ui-consistency-exemptions（附判例回链）后归零）
- [x] `pnpm test:e2e`（全量零新增红；失败面 = 502 存量台账 9 + 1 在册 watch-only）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- **压感线宽（pressure-aware stroke width）**：roadmap L2.3 行压缩措辞中的「压感」，指针 pressure 已采集但不驱动线宽。Why Not Blocking Closure：自declared 基准（Vant 固定 lineWidth、Form.io 速度调宽）均不含压感，上游 gap-analysis 无此要求。Classification: `optimization candidate`；Successor Required: no（host 需求出现时小 plan 增量）。

## Closure

Status Note: `input-signature` 全交付并经独立 closure audit 两轮通过（round 1 `issues` 1M readonly e2e 断言缺口 + 3m 死探针/i18n 键漂移/无操作语句 → 修复；round 2 diff 级复核 `approved` 0B/0M，附条件项 plan i18n 键名对齐已随本提交落盘）。`runtime`：matrix flip + design/example + 代码（7 focused 单测）+ e2e 3 用例真浏览器断言 + 三处登记 + i18n 双语 + INV 审计（铁律 7）全过。unit 侧 full-green（74/74 task；form 921）；e2e 全量零新增红（1558 passed；失败面 = 502 存量台账 9 + 1 在册 watch-only）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Evidence: round 1 `issues`（M1 readonly e2e 声称覆盖与实际断言不符 → 重写为行为断言：fixture 换 1×1 红 PNG + 位图采样 poll a=127 + draw 前后 ink 计数不变；m2 死探针删除、m3 plan i18n 键对齐、m4 无操作语句删除）→ round 2 diff 级复核 `approved`（审计员三重核实 fixture 解码 RGBA(255,0,0,127) 与断言精确匹配、画布索引无错位；实跑 focused 7/7 + e2e 3/3 + form 921/921 + route-matrix 42/42；commit 卫生警示记入审计证据）。

Follow-up:

- no remaining plan-owned work（压感线宽/容器 resize 重排已登记 Non-Blocking Follow-ups）

### new-renderer-introduction-audit 结论（§4 模板，2026-09-25，执行 session 自查、供 closure audit 复核）

- **INV-1 IO 边界**：纯受控 UI 控件，无任何 fetch/WebSocket/storage/动态 import（值即位图 dataURL）——过。
- **INV-2 新 IO 类型**：无 env 需求——过。
- **INV-3 复用边界**：复用 `useFormFieldFromProps`/`stringAdapter`/ui Button；canvas widget 自建于 form 包（零 ui 公共导出）；绘制用原生 pointer 事件绑定（canvas 形态惯例）——过。
- **INV-4 内部 state 边界**：笔画集/绘制中标记均为组件内部 ref，零 scope 写入——过。
- **INV-5 契约边界**：`RendererComponentProps<InputSignatureSchema>`；句柄 useInputComponentHandle（clear/reset）；definition 注册齐——过。
- **Checklist A–G**：A 无 IO ✓；B 复用 ✓；C 内部态 ✓；D 契约 ✓；E schema 驱动（5 prop 全登记 contract + fields）✓；F 样式（signature-\* marker 族、无 BEM；字面色默认值经 ui-consistency-exemptions 治理登记并附判例回链）✓；G 进既有包零新包 ✓。

### 工程纪要（执行期缺陷与修复，供审计复核）

1. **合成 click 误触工具条**：收笔提交 → 巨型 dataURL 撑爆布局 → 滚动锚定位移 → 浏览器在 pointerup 后合成的 click 落到滚到指针下的 undo 按钮（栈实锤 `at undo | at onClick (useButton)`）。修复：pointerdown `preventDefault()` 抑制兼容性 mouse 事件 + 收笔后 400ms document 捕获期一次性 click 吞除器。
2. **画布位图擦除**：setup effect 重跑时 `canvas.width` 重赋值清空位图（initializedRef 一次定型守卫）。
3. **stringAdapter 空串回绘**：未绑定时 hook value 为 ''，echo 守卫需用 falsy 判断而非 null 判断。
