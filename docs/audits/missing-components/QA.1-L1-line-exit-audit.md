# QA.1 线出口审计 #2 — missing-components L1（P0 表单原子 slider / rating / input-color）

> Auditor / Agent: 独立 fresh 子 agent（QA 线出口审计员，2026-09-26）
> 审计对象: commit `58e716164`（plan 503，closure audit 已 approved 3 轮：r1 issues 2M → r2 issues 1M 记录滞后 → r3 approved）
> 审计输入: plan 503 文件 + 该 commit diff + 验证输出记录（Fresh Context 三件套，未读执行会话历史）
> 依据: `docs/backlog/missing-components-and-designer-roadmap.md` §1/§4/§11/§13；`docs/plans/503-missing-components-l1-p0-form-atoms-plan.md`；`docs/audits/00-audit-execution-guide.md`（severity 词汇；Pass = 0 Blocker 且 0 Major）；格式先例 `docs/audits/missing-components/QA.1-L0-line-exit-audit.md`
> 审计环境备注: 审计执行时 HEAD == `63b371fd8`（L2 线各计划提交在其后）。逐文件 `git log 58e716164..HEAD` 验真：L1 核心交付面（三 renderer、form-atoms definitions 模块、ui rating/color-picker 基元及其单测、form-atoms 渲染器单测、三份 design.md/example.json、三条 e2e spec）自交付提交后**字节不变**；`input-contracts.ts`/`schemas.ts`/`definitions.ts` 及登记面（index.md/manifest/quick-reference/ui index/i18n locales）的后续改动均属 L2 线新增类型的合法扩展，L1 交付内容完整在位。

## 1. 交付铁律 8 项逐行核对（三组件全量交付面）

| #   | 交付物         | 结论 | 证据（live repo 核对）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 前置裁决       | ✅   | 命名决议落 plan 503（`slider` 不变 / `rate`→`rating` / `color`→`input-color`，权威链 = matrix 既有行名 + AMIS 源类型 + roadmap 行名）；matrix Form Core 三行 runtime/owner/landed（`amis-baseline-matrix.md:139-141`）；§5 三行已删，仅剩 `input-range` 注记行（:283）与 `color` display 行（:285，附「display 行 ≠ input-color form 行」L7.5 澄清注）——与 plan Phase 1 Exit Criteria 的 grep 口径一致。授权记录节载明 matrix flip human gate 与 ui index.ts ask-first 门的授权来源（用户 2026-09-25 执行 roadmap 指令）                                                   |
| 2   | design.md      | ✅   | 三份齐备（`docs/components/{slider,rating,input-color}/design.md`），各 13 节（12 节先例 + 响应式，对齐 507/508 新先例）；与 live definition/schema/ui 契约逐点核对见 §3（发现 2 处 Minor 级文档偏差）                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | example + 入口 | ✅   | `example.json` ×3 且与 design.md §4 示例一致；playground 演示路由 = `form-route-entries.ts:45/52/59` 三条 + `component-lab/renderers/{slider,rating,input-color}-lab-page.tsx` 三页 + `RENDERER_LAB_REGISTRY:161-163` 三条；home 入口经 L0 注册表自动露出（lab 合并卡 + form 域卡），`route-matrix` 守卫实跑 391/391 绿（含 lab ⊆ registry 与 form 覆盖不变式、L0 修复的不变式 1c :304）                                                                                                                                                                                   |
| 4   | 代码 + 测试    | ✅   | definitions 新模块 `form-atoms-renderer-definitions.ts`（97 行，input.tsx 677 行冻结不增，先例 date-renderer-definitions）；`SliderSchema`/`RatingSchema`/`InputColorSchema`（schemas.ts:445/459/473）+ 三组 specificContracts + 三 renderer；focused 单测实点 **ui 16 条**（rating 8 + color-picker 8）+ **renderer 9 条**（3×3）；e2e 3 spec × 3 用例 = 9 条真浏览器程序化断言（含 zeroStep 回退 / 半星步进 / rgba alpha 保留 / 禁用态），各用例收尾 `assertTrackedPageErrors`。defaultSchema 项按 form 包标量字段先例裁决不适用（plan Phase 2 注记，draft review 已核） |
| 5   | 登记           | ✅   | `examples.manifest.json` runtime 数组三类型（:70-72）；`quick-reference.md` 新增「Form Package — flux-renderers-form（missing-components L1 atoms）」节（:860 起，schema 表 + 注册说明与 live 一致）；`components/index.md` form 清单行（:333）+ 目录条目（:503-505）                                                                                                                                                                                                                                                                                                      |
| 6   | i18n           | ✅   | `flux.common.ratingAriaLabel` / `flux.common.colorPickerAriaLabel` zh-CN（:36-37）+ en-US（:35-36）双份；`check:i18n-keys` 实跑通过。slider 无专用键——其 aria-label 取 `label ?? name`（表单绑定必有 name），无内置回退文案需求（见 Minor-4 记述）                                                                                                                                                                                                                                                                                                                         |
| 7   | 审计           | ✅   | INV 审计（铁律 7）结论按 §4 模板落 plan Closure 节（INV-1–INV-5 + checklist A–G）；本审计抽验其关键声称属实：三 renderer 无 fetch/WebSocket/storage/window.open/动态远程 import，字段读写全走共享 `useFormFieldFromProps`/adapter，内部态（hover 预览、弹层 draft）零写 scope，零新包。draft review 2 轮 + closure audit 3 轮在案（plan Draft Review Record / Closure Audit Evidence）                                                                                                                                                                                     |
| 8   | 验证           | ✅   | unit full-green 74/74 task 在案（本审计实跑抽验：ui 225/225、playground 391/391、form 927/927 含 form-atoms 9 条、typecheck 40/40——见 §5）；check 零新增红（ui-consistency 扫描器 + oversized + i18n-keys 实跑零新增）；e2e 全量零新增红（1547 passed 记录在案，台账结构验真见 §5）；dev log `docs/logs/2026/09-25.md` L1 条目在案。closure audit 3 轮通过后回写 done，顺序合规                                                                                                                                                                                            |

**本项结论：8 项无缺失；三组件交付面完整，`runtime` 状态成立。**

## 2. 该线 diff 代码质量抽查

| 检查项                      | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RendererComponentProps 契约 | ✅   | 三 renderer 均签名 `RendererComponentProps<XxxSchema>`；只读 `props.props`（name/min/max/step/count/allowHalf/allowClear/valueFormat/presetColors/label/placeholder/required）与 `props.meta`（className/cid/visible/showError）；值读写走 `useFormFieldFromProps` + `numberAdapter`/`stringAdapter`；句柄走 `useInputComponentHandle`。**零 store 直连、零 ad-hoc context、零 prop 钻孔**                                            |
| 禁裸 HTML（ui 优先）        | ✅   | 消费 ui `Slider`/`Rating`/`ColorPicker`；ui 基元内部用 `Button`/`Input`/`Popover`/lucide `Star`；`div`/`span`/`output` 为 ui 未提供的结构元素，不违反规则                                                                                                                                                                                                                                                                             |
| oversized-file 纪律         | ✅   | 交付时 `input.tsx` 677 行冻结（<700 ERROR 档），新类型进独立 definitions 模块（97 行）；`schemas.ts` 交付时 485 行（<500 WARN 档；live 现 496 行系 L2 增量，仍达标）；`check-oversized-code-files` 实跑 203 warnings / 2 errors / 2 exempt，与 L0 审计基线完全一致——**零新增**                                                                                                                                                        |
| styling 反模式              | ✅   | 三者为 widget renderer（自样式控件）——内部 `ml-2 text-sm tabular-nums` 等属视觉设计，合规；根 marker `nop-slider-field`/`nop-rating-field`/`nop-input-color` + `cn(props.meta.className)` 合并；ui 基元 `data-slot` + `cn()`、无 BEM；无字面样式色（swatch `backgroundColor` 来自绑定值/预设数据，是数据不是样式；contracts 描述文案 `#rrggbb` 触发扫描器一事已按 plan 记录改写 'hex (alpha dropped)' 消解——live 文件核实已无该字样） |
| React 19 纪律               | ✅   | 三 renderer 无 `useCallback`/`useMemo`/`useEffect`+setState 镜像；渲染期纯派生（numericValue/colorValue/format 归一化均为渲染期计算）；ref 仅作 focus target 容器引用                                                                                                                                                                                                                                                                 |

## 3. docs↔live 一致性（每组件 ≥3 个关键契约点）

### slider（`docs/components/slider/design.md` vs live）

| design.md 声称                                     | live 核对                                                                                                                                         | 结论         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------- | --- |
| §4：min(0)/max(100)/step(1)；`step ≤ 0` 回退 1     | `input-contracts.ts` defaultValue 0/100/1 + 描述 'falls back to 1'；renderer :13-15 三元回退；e2e zeroStep 用例（0→ArrowRight→11）钉住            | ✅           |
| §8：句柄 `clear`/`reset`/`focus`（focus 落 thumb） | definition capabilityContracts 三条 = renderer `SLIDER_METHODS` + `getFocusTarget` 查 `[data-slot="slider-thumb"]`；单测 component:clear 写回用例 | ✅           |
| §10：`data-slot="slider                            | slider-track                                                                                                                                      | slider-range | slider-thumb"`+ 值回显`slider-value` | ui `slider.tsx:31/41/45/51`（存量基元）逐字吻合；`slider-value` = renderer :58 = e2e 断言面 | ✅  |
| §3：`wrap: true` 标准字段 frame                    | definition `wrap: true`                                                                                                                           | ✅           |
| §13：ui 侧 `after` 扩展命中区                      | ui `slider.tsx:53` thumb `after:-inset-2`                                                                                                         | ✅           |

### rating（`docs/components/rating/design.md` vs live）

| design.md 声称                                                                   | live 核对                                                                                                                                        | 结论                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------- | --- |
| §4：count 默认 5、钳制 ≥1；allowHalf；allowClear                                 | contracts defaultValue 5 + 'clamped to >= 1'；renderer :14 `count >= 1 ? Math.floor : 5`；ui :44 `Math.max(1, Math.floor)`——三层一致             | ✅                             |
| §2/§12：allowHalf = 指针半区 + Shift+Arrow 半步（0.5）                           | ui `handleStarClick`（rect 左半判定 :63-66）+ `handleKeyDown`（`shiftKey && allowHalf ? 0.5 : 1` :77）；单测键盘整步/半步用例 + e2e 半星用例     | ✅                             |
| §2：allowClear 点击当前值清空（AntD 同款）                                       | ui :68-71 `next === value → commit(undefined)`；单测 'clears to undefined on repeat click'                                                       | ✅                             |
| §10：`data-slot="rating"`（radiogroup）/`"rating-star"`（radio，`data-level=full | half                                                                                                                                             | empty`）/值回显 `rating-value` | ui :109/132-133/`fillLevel` 返回值逐字吻合；单测 + e2e 均按此选择器断言 | ✅  |
| §12：超 count 值钳制                                                             | ui `commit` :51 `Math.min(Math.max(next, min), Math.min(max, starCount))`；单测 'clamps keyboard increment to count…'（closure r1 退回修复增补） | ✅                             |
| §13：触控命中 ≥ 24px（p-0.5 + star 16px）                                        | **算术不成立**：p-0.5 = 2px×2 + 16px = **20px** < 24px（ui :135/:150）。见 Minor-2                                                               | ✗                              |

### input-color（`docs/components/input-color/design.md` vs live）

| design.md 声称                                                    | live 核对                                                                                                                                                     | 结论               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------- | ------------------------------------------------ | --- |
| §4：`valueFormat` 'hex'（默认，alpha 丢弃）/ 'rgba'（保留 alpha） | contracts union hex\|rgba defaultValue 'hex'；`normalizeColorValue`（ui :41-73）hex 通道丢 alpha、rgba 通道 `alpha ?? 1`；单测 'drops alpha…' + e2e rgba 用例 | ✅                 |
| §4：非法输入不提交（回退不崩）；显式清空才提交 undefined          | `normalizeColorValue` 返回 null + `commitDraft` null 守卫 + 空串提交 undefined（ui :106-118）；单测 'returns null…' / 'does not commit invalid input'         | ✅                 |
| §4：`presetColors` 预设色板（hex/rgba 字符串）                    | contracts `array<string>`；ui 缺省 10 色板 :27-38 + 受控传入；e2e 自定义色板与默认色板两路径均断言                                                            | ✅                 |
| §10：`data-slot="color-picker                                     | color-picker-swatch                                                                                                                                           | color-picker-panel | color-picker-preset"` | ui :121/135/148/154 逐字吻合；e2e 全部按此选择器 | ✅  |
| §8：句柄 clear/reset/focus（focus 落触发钮）                      | definition `SCALAR_INPUT_CAPABILITY_CONTRACTS` = renderer `getFocusTarget` `'[data-slot="color-picker"] button'`                                              | ✅                 |
| §5：readOnly「禁触发」                                            | **live：readOnly 不禁用弹层触发钮**（trigger Button 仅 `disabled={disabled}`，:129）——面板可打开但色板/输入框全禁用，值完整性无损。见 Minor-3                 | ✗                  |

**本项结论：18 个抽验契约点 16 个逐字吻合；2 处 Minor 级文档偏差（§6），无契约级 drift（值协议/事件/句柄/schema 字段名与默认值全部一致）。**

## 4. 本线 roadmap 状态回写准确性 + 命名决议三处一致性

### roadmap §13 L1 行 vs live

| 声称                                                                      | 复核                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `done（2026-09-25）` / plan 503                                           | ✅ closure audit r3 approved（2026-09-25）后回写，顺序合规（r1 曾因「回写未落盘已勾」打回，修复带 grep 验证）                                                                                                                                                                               |
| 定名 rating（非 rate）/ input-color（非 color）                           | ✅ matrix Form Core 行名 / 三份 design.md / flux 注册表（definitions `type: 'rating'`、`type: 'input-color'`）/ lab registry / route entries / manifest 全部一致；`grep "type: 'rate'                                                                                                       | type: 'color'"` 渲染面零残留；`color` display 行保持 notRetained（:285 带澄清注） |
| matrix flip 落 Form Core 三行                                             | ✅ :139-141（runtime / owner doc / landed）                                                                                                                                                                                                                                                 |
| ui 新基元 Rating/ColorPicker                                              | ✅ `packages/ui/src/components/ui/{rating,color-picker}.tsx` + index.ts 导出 + shadcn 约定（data-slot/cn/无 BEM）                                                                                                                                                                           |
| closure audit 三轮（r1 2M → r2 1M → r3 approved）                         | ✅ plan Closure Audit Evidence 与 dev log 双处一致                                                                                                                                                                                                                                          |
| 裁决注记 unit full-green（74/74 task，**ui +15**/form +9/playground +1c） | ⚠️ 「ui +15」与实况差 1：ui 实增 **16** 条（rating 8 + color-picker 8，含 closure r1 增补的 clamp 用例；225 = 209+16）。plan Closure Gates（「16+9 条新单测」）与 dev log（「ui +16」）均正确；roadmap 行与 commit 标题（「15 focused tests」）系 r1 增补用例落地前起草、未回填。见 Minor-1 |
| e2e 零新增红（1547 passed，失败面 = 502 台账 9 + watch-only 1）           | ✅ 台账结构验真：9 条存量 spec:line + kanban-perf:34 全部解析到相符的 test 声明（c6-3/c7 实为 `tests/e2e/component-lab/c{6-3,7}-host-surfaces.spec.ts`）；commit message 记「zero-new-fails」不声明 e2e full-green，口径诚实                                                                |

### SCADA 色板复用评估（Phase 4 Decision）

✅ 结论「保留私有」落 plan + input-color design.md §9 双处，理由成立（编辑器内部紧凑实现、无值规范化协议/无 a11y 契约，与本 type 值协议定位不同轴）；未做迁移实现，符合 Non-Goal。

## 5. 验证输出复核（本审计实跑部分）

| 命令                                                      | 结果                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                                          | ✅ 40/40 successful（cache 全命中，当前树绿）                                                                                  |
| `pnpm --filter @nop-chaos/ui test`                        | ✅ 50 files / **225 passed**（= plan 声称；含 rating 8 + color-picker 8 新基元单测）                                           |
| `pnpm --filter @nop-chaos/flux-renderers-form test`       | ✅ **927 passed**（live 全量含 L2 增量；form-atoms 9 条在列全绿。L1 台账口径 850/850，差值 = L2 三计划增补 77 条，与本线无关） |
| `pnpm --filter @nop-chaos/flux-playground test`           | ✅ 37 files / **391 passed**（= plan 声称；含 route-matrix 守卫与不变式 1c）                                                   |
| `node scripts/audit/find-ui-consistency-gaps.mjs`         | ✅ No new unregistered（hardcoded-literal-color 等 5 规则零新增）                                                              |
| `node scripts/check-oversized-code-files.mjs`             | ✅ 203 warnings / 2 errors / 2 exempt——与 L0 审计基线逐字一致，零新增                                                          |
| `node scripts/check-i18n-keys.mjs`                        | ✅ passed                                                                                                                      |
| plan 声称的 build / lint / 全仓 `pnpm test`（74/74 task） | 记录在案（Closure Gates + dev log），本审计未全量重跑（ui/form/playground 三包已实跑抽验 + typecheck 实跑）                    |
| e2e 全量（27.6min / 1547 passed / 43 skipped）            | 按审计纪律**不重跑**；台账结构验真通过（§4 表末行）；QA.2 集成审计按 pass 标准将重跑全量                                       |

## 6. Findings

**Blocker：无。Major：无。**

### Minor-1 ui focused 单测计数台账漂移（+15 vs +16）

- 位置：roadmap §13 L1 行裁决注记「ui +15」、commit `58e716164` 标题「15 focused tests」
- 实况：ui 基元新单测 **16** 条（closure r1 退回修复增补的 rating clamp 用例落地于该两处字符串起草之后，未回填；plan Closure Gates「16+9」与 dev log「ui +16」正确，225 复跑亦证实）。
- 影响：纯账面不一致，不可变 artifact（commit 标题）无法改。建议 QA.2 前把 roadmap §13 L1 行注记改「ui +16」并以本报告为勘误记录。

### Minor-2 rating design.md §13 触控命中声明与实现算术不符

- 位置：`docs/components/rating/design.md:78`「触控命中 ≥ 24px（p-0.5 + star 16px）」
- 实况：p-0.5 = 2px × 2 + 16px star = **20px**（`rating.tsx:135,150`），低于文档声称的 24px（亦低于 WCAG 2.2 target-size 24px 指引）。
- 影响：a11y 响应式声明失真，无功能契约破坏。修复二选一：星按钮 padding 增至 p-1（24px）并复跑 ui/e2e，或改文档为实数 20px 并注明 demand 升级。

### Minor-3 input-color readOnly 触发行为与 design.md §5 措辞不符且无测试钉住

- 位置：`docs/components/input-color/design.md:42`「readOnly/disabled/placeholder | presentation | 只读禁触发」；`color-picker.tsx:123-131`（trigger 仅 `disabled={disabled}`）
- 实况：readOnly 下触发钮仍可点、面板可打开（内部色板/输入框禁用，值不可变——readOnly 值完整性契约成立）；对比 rating 的 readOnly 全 inertia + 双层测试。input-color 无任何 readOnly 行为断言（ui/renderer/e2e 均无）。
- 影响：文档措辞 vs 交互实况偏差 + 该 UX 面零覆盖。修复二选一：trigger 补 `disabled={disabled || readOnly}` 对齐措辞，或 §5 改为「只读面板禁编辑」；随手补 1 条廉价断言。

### Minor-4 plan 503 Phase 2 i18n 勾选项措辞宽于交付（slider 无专用键）

- 位置：plan 503 Phase 2 第 4 项「i18n 键（aria 标签，zh-CN/en-US 双份）」
- 实况：L1 实交付 `ratingAriaLabel`/`colorPickerAriaLabel` 两键双语；slider 无键——其 aria-label 取 `label ?? name`（表单绑定必有 name），无内置回退文案，故铁律 6 实质成立（`check:i18n-keys` 绿、无未治理内置文案）。边缘差异：nameless slider（退化场景）无可访问名，而 rating/colorPicker 有 i18n 回退兜底。
- 影响：勾选项字面宽于该 Phase 实际交付物，属记账措辞问题 + 微小 a11y 对齐缺口。建议 QA.2 前顺手在 plan 该项补一句实况注记即可（或给 slider 补 `sliderAriaLabel` 回退键，与姊妹组件对齐）。

### Observation-1 rating「roving tabindex」措辞与实现模式

- ui jsdoc 与 design.md §2 称「roving tabindex / roving 键盘」；实况为容器聚焦模式（radiogroup `tabIndex=0`，星按钮全 `tabIndex=-1`，方向键在容器层处理并直接提交值）。键盘功能完整且有单测，仅 WAI-ARIA 术语使用不严格。随 Minor-3 同批文档顺手校准即可，不单列 finding。

### Observation-2 审计环境：HEAD 已前移至 L2 提交

- HEAD == `63b371fd8`（L2.6 收口）。逐文件 git log 验真 L1 核心交付面字节不变；登记面（index.md/manifest/quick-reference/ui index/locales）被 L2 合法扩展（L1 三条目均在位且未被改写）。本审计对契约点一律以 live 为准核对，对交付声称以 `58e716164` 提交态核对，两者在本线无冲突。

### Observation-3 pushDefaultValue 首帧 gap 的登记去向完备

- plan Non-Blocking Follow-ups + `docs/lessons/12`（在案）+ 三条 e2e 内联注释（slider :26 / rating :15 / input-color :18 均注明断言移位原因）+ QA.7 残余债路径（Successor Required: yes）。跨域框架 gap，非 L1 交付面缺陷，披露诚实充分。

## 7. Verdict

**pass**（0 Blocker / 0 Major / 4 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minors 不阻断线出口。
- 按 roadmap §11 纪律：4 项 Minor 登记 QA.7 ⑥ 残余债登记册，**在下一 gate（QA.2）前修复并复审**（Minor-1/4 为文档记账勘误；Minor-2/3 为二选一小改 + 廉价断言，建议与 QA.2 前消化窗口同批处理）。
- L1 线出口放行：roadmap §13 L1 行 `done` 回写与裁决注记经本审计复核成立（仅 Minor-1 一处计数注记需勘误，不影响 done 裁决）；slider / rating / input-color 三组件交付铁律 8 项完整，`runtime` 状态与 docs↔live 一致性除上述 Minor 外无 drift。
