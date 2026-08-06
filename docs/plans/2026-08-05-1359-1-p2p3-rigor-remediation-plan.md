# P2/P3 扎实度修正计划（i18n 硬编码 + a11y + data-slot 裁决 + design.md 补齐 + CR 预提取）

> Plan Status: completed（执行完成：5 Phase 全 completed + 全量验证绿 + closure-audit pass，证据见 Closure 节）
> Last Reviewed: 2026-08-05
> Source: `docs/analysis/2026-08-05-p2-p3-findings-consolidated-analysis.md`（2 轮独立审查达成共识）
> Related: `docs/backlog/component-audit-roadmap.md`（CR work item `todo`）

## Purpose

把 C1–C6.5 逐组件审计发现的、当前仍在线上代码的"基本实现扎实度"缺陷收口：i18n 硬编码清理（I1–I10）、a11y 基础修复（搜索框 aria-label / aria-live / transfer aria 修正）、`data-slot="field-control"` 重复的跨家族裁决与修复（15 文件）、6 个组件 design.md 补齐，并为 CR 阶段预提取输入清单（92 处"归 CR"项）。本 plan 是分析报告 §8 行动建议的落地，作为 CR 阶段首批工作，不依赖 C7/C8 审计完成。

## Current Baseline

- i18n 机制成熟：`flux-i18n` en-US 857 叶键 + zh-CN 同步；carousel/icon-picker/tree-renderer/key-value/diff-file-list/picker-dropdown **已接入 `t()`**（live 核验）；alert-renderer、variant-field-helpers **未接入**（需新增 import）。
- **i18n lint 现状**：`eslint.config.js:185-306` 已启用 `i18next/no-literal-string`（error 级，`mode: 'jsx-text-only'`，覆盖全部 packages 源码，`pnpm lint` 生效），`scripts/check-i18n-keys.mjs` 随 `check:i18n-keys` 检查 t() 用 key 是否在 locale 定义。但存在 **3 个盲区**使 I1–I10 全部漏检（live 核验 2026-08-05）：
  1. **`words.exclude: '^[\s\d\W]*$'` 误放行中文**（:256）。`\W` 匹配所有非 ASCII 单词字符含 CJK——实测 `选择图标`/`上一页` 均命中被排除。修复版 `^(?!.*[\u4e00-\u9fa5])[\s\d\W]*$` 下纯符号/数字仍放行、中文报错，且全仓 `pnpm` eslint 跑测 **0 新增报错**（零风险收益）。**注意 JS 转义**：配置是 JS 字符串，文件层必须写双反斜杠 `\\u4e00-\\u9fa5` 与 `\\s\\d\\W`，否则 `\s` 被解析为 `s` 破坏规则。
  2. **`jsx-attributes.exclude: 'aria-.*'` 放行全部 aria 属性**（:236）→ `aria-label="Close"` 等语义文本不检查。移除会导致 C7/C8 族约 16 处（graph/scheduling/flow-designer/code-editor）lint 爆红，**本 plan 不修**（记 CR 阶段）。
  3. **`mode: 'jsx-text-only'` 只查 JSX 文本节点、不查 JS 字符串字面量**（:210）→ icon-picker:65 `'选择图标'`（JS 默认值）、diff-file-list `All(...)` 模板串（JS）、placeholder 字符串、STATUS_LABELS 对象（JS）全部漏检。改 `jsx-only` 会让 32 个含中文的文件全量爆红，**本 plan 不修**（No-Goals → 分析报告 §8.5 裁定保持）。
- **确认仍硬编码 10 处**（分析报告 §2.1/§2.2，live 核验）：
  - I1 icon-picker `选择图标`（`icon-picker.tsx:65`，schema-overridable 默认值，en-US 显示中文）
  - I2 alert `aria-label="Close"`（`alert-renderer.tsx:109`，`flux.common.close` 键已存在）
  - I3 carousel ``aria-label={`Go to slide ${index+1}`}``（`carousel.tsx:311`）
  - I4 diff-file-list tab `All/Added/Modified/Deleted`（`diff-file-list.tsx:79-82`；同文件 `:120` 已用 `t('flux.diff.noFilesMatch')`）
  - I5 diff-file-list `Search files...` placeholder（`diff-file-list.tsx:90`）
  - I6 diff-file-list `A/M/D` 状态字母（`diff-file-list.tsx:142-146`）
  - I7 variant-field `Variant field update failed`（`variant-field-helpers.ts:107`）
  - I8 tree `'Tree'` aria-label 兜底（`tree-renderer.tsx:421`，`label‖title‖id‖'Tree'` 第 4 优先级）
  - I9/I10 key-value `placeholder="Key"`/`placeholder="Value"`（`key-value.tsx:111/:165`；`:112/:166` aria-label 同样硬编码）
- 测试断言依赖硬编码文案（修复需同步）：`icon-picker.test.tsx:66`（`/选择图标/`）、`diff-cross-file.test.tsx:40/:50/:60/:70/:92`（`Search files...`/`Added`/`Deleted`/`Modified`）。
- **a11y**：picker-dropdown 搜索框已有 `t('flux.picker.search', {defaultValue:'Search'})` placeholder（`picker-dropdown.tsx:52`）但无 aria-label（`picker-dropdown.tsx:49-55`）；icon-picker 搜索框无 aria-label（`icon-picker.tsx:199-208`）；diff-file-list 文件搜索无 label（`diff-file-list.tsx:89-93`）；audio/video 错误回退文案已走 `t()`（`audio.tsx:48`/`video.tsx`）但无 aria-live；markdown-editor 预览区无 aria-live；transfer `aria-multiselectable="true"` 恒真（`transfer-renderer.tsx:416`）。
- **data-slot 重复**：15 个文件根 div 输出 `data-slot="field-control"`（FieldFrame 于 `field-frame.tsx:258` 输出同值）——form-advanced 9 文件（combo:523/input-table:333/object-field:485/array-field:523/picker:442/key-value:571/icon-picker:167/transfer:259/detail-field:320）+ form 5 文件（input-number:214/input-date:48/input-datetime:60/input-time:99/date-range:246 + date-field-control:204）。**待裁决**：哪些被 FieldFrame 包裹（应去掉子组件重复）vs 独立（保留合理）。
- **design.md 缺失 6 组件**：object-field/array-field/detail-field/detail-view/variant-field/statistics（live 核验均 MISSING）。
- **CR 跟踪机制已存在**：`component-audit-roadmap.md:56`（work item `todo`）+ `:178`（Phase 详情）+ `:213`（"卡内延期必须登记，不得静默跳过"）；92 处"归 CR"项分布在 41 张审计卡，未预集中。
- lab 页 CI 校验已存在（`route-matrix.test.ts:189-193`），无需新增。

## Goals

- 10 处 i18n 硬编码全部走 `t()`，双 locale（en-US/zh-CN）键齐全，相关测试断言同步（无硬编码文案残留断言）。
- a11y 基础修复：3 个搜索框可访问名称补齐、audio/video/markdown-editor 错误/预览 aria-live 补齐、transfer aria-multiselectable 按 multiple 语义化。
- `data-slot="field-control"` 15 文件完成裁决（区分 FieldFrame 包裹 vs 独立）并统一修复，DOM 契约不再重复。
- 6 个组件 design.md 补齐（家族级 flux-guide 基线之上，组件级契约文档）。
- CR 输入清单预提取：92 处"归 CR"项 → 单文件清单（`docs/audits/cr-input-inventory.md`），降低 CR 阶段启动恢复成本。

## Non-Goals

- **不处理 C7（mobile）/C8（ai）族的 i18n/a11y**——未审计，需先走审计（roadmap 已排期）。
- **不引入 AST 版中文字面量 CI 规则**——分析报告 §8.5 已裁"暂不引入"（naive rg 无法区分注释与字面量，无先例）。**本 plan 补充边界**：只修第 1 盲区（`words.exclude` 的 `\W` 正则，修复后全仓 0 新增报错、未来防 CJK JSX 文本漏检，属 eslint 配置修复而非引入新规则）；第 2 盲区（`aria-.*`）与第 3 盲区（`jsx-text-only`）**不修**——前者会牵连 C7/C8 族 ~16 处 aria-label 硬编码（超出本 plan 审计范围），后者会牵连 32 个含中文文件全量爆红（JS 字面量硬编码由本 plan Proof 测试 + `rg` Exit Criteria 兜底）。两盲区随 CR 阶段在 C7/C8 审计后统一评估。
- **不重开 CR 阶段本身**——CR 依赖"全部 C\*"（含 C7/C8）完成；本 plan 只做 CR 首批可独立交付的工作与输入预提取。
- **不处理"推荐句柄未实现"**（collapse/wizard/json-view/pagination）——P3 keep 裁定已达成（"recommended" 非契约承诺）。
- **不处理 useCallback 集群/性能观察项**——P3 keep 合理批量裁决。
- **不处理 wizard 焦点管理、cards role+aria-selected 模式**——需设计决策，随 CR 裁决。

## Scope

### In Scope

- flux-i18n en-US/zh-CN 新增键（约 12–16 个：form/date/common/diff 命名空间）。
- 6 个渲染器文件 i18n 接入（icon-picker/alert-renderer/carousel/diff-file-list/variant-field-helpers/tree-renderer/key-value）。
- 3 个搜索框 aria-label + 3 处 aria-live + 1 处 transfer aria-multiselectable。
- 15 个 data-slot 文件裁决 + 修复。
- 6 个 design.md 创建。
- `docs/audits/cr-input-inventory.md` 创建。
- 受影响审计卡状态同步、flux-guide 若引用硬编码文案则同步、analysis 报告状态翻转。

### Out Of Scope

- C7/C8 族（见 Non-Goals）。
- 各组件 design.md 中已裁定 keep 的 P3 项改写。
- i18n 键统一命名空间重构（仅按现有 `flux.<ns>.<key>` 惯例新增）。
- 除上述 10 处外的其他硬编码（如 graph/scheduling 包约 15 处，归 C7/C8 审计范围）。

## Failure Paths

> 不适用：本 plan 为 i18n/a11y/DOM 契约/DOC 修正，无外部 IO、鉴权、错误码契约。

## Test Strategy

本档选择：`必须自动化`

- i18n 是公共契约面（locale 输出）、a11y 是 DOM/ARIA 契约、data-slot 是 DOM 契约——均属于核心回归路径，**Proof 项（test-first）必须 precede Fix 项**（guide Rule 12/Test Strategy Tier）。
- 单测：各渲染器 focused 测试（断言 `t()` 解析后文案 / aria 属性 / data-slot 契约）。
- e2e：仅对 DOM 契约变化（data-slot 去重）补宿主断言；i18n/a11y 以单测为主（e2e 断言硬编码文案的既有 spec 同步更新）。
- 全量验证归 Closure Gates（guide Rule 18）。

## Execution Plan

### Phase 1 - i18n 硬编码清理（I1–I10）

Status: completed
Targets: `eslint.config.js`（words.exclude 盲区修复）、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、`packages/flux-renderers-content/src/{alert-renderer,carousel,diff-view/components/diff-file-list}.tsx`、`packages/flux-renderers-form-advanced/src/{icon-picker,key-value,variant-field/variant-field-helpers}.ts`、`packages/flux-renderers-data/src/tree-renderer.tsx`、相关测试

- Item Types: `Fix | Proof | Preflight`

- [x] **Preflight（eslint 盲区实证，已核验 2026-08-05）**：记录三盲区证据——`i18next/no-literal-string` 已启用（error 级）但 `words.exclude '^[\s\d\W]*$'` 因 `\W` 含 CJK 放行 `选择图标`/`上一页`；`aria-.*` 放行 `aria-label="Close"`；`jsx-text-only` 不查 JS 字面量（icon-picker:65 `'选择图标'`、diff-file-list tab/placeholder/STATUS_LABELS 均在 JS 非 JSX 文本）。修复版正则 `^(?!.*[\\u4e00-\\u9fa5])[\\s\\d\\W]*$` 下纯符号/数字仍放行、中文报错，全仓 eslint 跑测 **0 新增报错**。
- [x] **Proof（test-first）**：新增/改写 focused 测试使硬编码暴露——`icon-picker.test.tsx` 断言默认 placeholder 经 `t('flux.form.selectIcon')` 解析（en-US 断言 `Select icon`，zh-CN 断言 `选择图标`）；`diff-cross-file.test.tsx` 断言 tab/搜索经 `t()` 解析；新增 `alert-renderer` Close aria-label 走 `flux.common.close` 断言；carousel `Go to slide` 走 `flux.carousel.goToSlide` 断言；key-value Key/Value placeholder 走 `t()` 断言；tree 兜底走 `flux.data.tree` 断言。先红（当前硬编码文案 vs `t()` 解析不一致）后绿。
- [x] **Fix（I1）**：`icon-picker.tsx:65` 默认 placeholder 改 `t('flux.form.selectIcon')`；同步 `icon-picker.test.tsx:66` 断言（经 `t()` 或 locale 值）。
- [x] **Fix（I2）**：`alert-renderer.tsx:109` 改 `aria-label={t('flux.common.close')}`（键已存在），需补 `@nop-chaos/flux-i18n` import。
- [x] **Fix（I3）**：`carousel.tsx:311` 改 `t('flux.carousel.goToSlide', { index: index + 1 })`（新键含参数）。
- [x] **Fix（I4–I6）**：`diff-file-list.tsx:79-82` tab 标签 + `:90` placeholder + `:142-146` 状态字母走 `t()`（新键 `flux.diff.all/added/modified/deleted/searchFiles`，状态字母走 `flux.diff.statusAdded/Modified/Deleted` 单字母键）；`diff-cross-file.test.tsx:40/:50/:60/:70/:92` 断言同步。
- [x] **Fix（I7）**：`variant-field-helpers.ts:107` 改 `t('flux.form.variantUpdateFailed')`（新增 import + 惰性调用点核对——`t()` 为纯函数可安全调用）。
- [x] **Fix（I8）**：`tree-renderer.tsx:421` 兜底改 `t('flux.data.tree')`。
- [x] **Fix（I9–I10）**：`key-value.tsx:111/:165` placeholder + `:112/:166` aria-label 走 `t()`（新键 `flux.form.key`/复用 `flux.form.value`，aria-label 键 `flux.form.keyEntry`/`flux.form.valueEntry` 带序号参数，与既有 `flux.form.addEntry`/`flux.form.remove` 命名风格一致）。
- [x] **Fix（eslint 第 1 盲区）**：`eslint.config.js:256` `words.exclude` 的 `'^[\\s\\d\\W]*$'` 改 `'^(?!.*[\\u4e00-\\u9fa5])[\\s\\d\\W]*$'`（文件层**双反斜杠**，JS 字符串转义还原 `\\u4e00-\\u9fa5` 为正则 Unicode 范围）。验证：仅此一处改动，`pnpm lint` 全仓 0 新增 error；`node -e` 复现 `选择图标` 报错、`+`/`---` 仍放行。
- [x] flux-i18n en-US/zh-CN 新增全部键（保持命名空间惯例：`flux.form.*`/`flux.diff.*`/`flux.carousel.*`/`flux.data.*`/复用 `flux.common.close`）；`i18n-contract.test.ts` 自动校验双 locale 同步（既有机制）。
- [x] 受影响组件 design.md §i18n/文案节同步（icon-picker 占位文案节、key-value DOM 节、tree aria-label 注释、diff-view 文件列表节、carousel DOM 节、alert DOM 节；variant-field 由 Phase 4 新建 design.md 一并覆盖）。

Exit Criteria:

- [x] `rg` 实证：上述 10 处硬编码在 renderer 源码中零残留（`rg "选择图标|Go to slide|Search files\.\.\.|Variant field update failed|placeholder=\"Key\"|placeholder=\"Value\"|'Tree'"` 相关文件零命中，测试除外——实测仅 registry `displayName: 'Tree'`（组件元数据，非 10 处之一）命中）。
- [x] focused 测试全绿：content/form-advanced/data 三包 `pnpm --filter @nop-chaos/flux-renderers-{content,form-advanced,data} test` 通过（含新 Proof 用例先红后绿记录：proof 阶段 14 例失败 → 修复后全绿；bug-dual-state/e2e c3-4 断言同步 t() 键）。
- [x] eslint 盲区修复验证：`pnpm lint` 全仓通过且无新增 error；实证记录存于 plan（修复前 lint 通过 32/32 cached、修复后 lint 通过 32/32 0 error、`node -e` 复现中文放行→报错、eslint probe `选择图标` JSX 文本报 `i18next/no-literal-string` error）。

### Phase 2 - a11y 基础修复

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{picker-dropdown,icon-picker,transfer-renderer}.tsx`、`packages/flux-renderers-content/src/{diff-view/components/diff-file-list,audio,video}.tsx`、`packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] **Proof（test-first）**：新增/改写 focused 测试——`__tests__/searchbox-a11y.test.tsx`（picker/icon-picker 搜索框有可访问名称）、`diff-cross-file.test.tsx`（diff 搜索框 aria-label）、`audio.test.tsx`/`video.test.tsx`（错误态回退区含 `aria-live="polite"`）、`markdown-editor.test.tsx`（预览区 aria-live）、`transfer-renderer.test.tsx`（multiple 时 `"true"`、single 时不输出）。先红（7 例失败）后绿。
- [x] **Fix**：picker-dropdown 搜索 input 挂 `aria-label={t('flux.picker.search', {defaultValue:'Search'})}`（复用 placeholder 同源键，避免冗余 label 键）。
- [x] **Fix**：icon-picker 搜索 input 挂 `aria-label={t('flux.form.searchIcon')}`（Phase 1 新增键）。
- [x] **Fix**：diff-file-list 文件搜索 input 挂 `aria-label={t('flux.diff.searchFiles')}`（Phase 1 新增键复用）。
- [x] **Fix**：audio/video 错误回退容器加 `aria-live="polite"`（保持现有 `t()` 文案）。
- [x] **Fix**：markdown-editor 预览容器加 `aria-live="polite"`（预览为被动更新场景）。
- [x] **Fix**：transfer `transfer-renderer.tsx:416` 改 `aria-multiselectable={multiple ? 'true' : undefined}`——`multiple` 定义在 `TransferRenderer`（:69）而 :416 位于 `TransferPane`（:359），将 `multiple` 穿透 `TransferPaneProps`（:337-354，两调用点 :261/:306 传参）；`TransferPane` 内对 `props.multiple` 读值。
- [x] 受影响组件 design.md a11y 节同步（picker/icon-picker/diff-view/audio/video/markdown-editor/transfer 七处，见 Phase 1 同批 §DOM/a11y 更新）。

Exit Criteria:

- [x] 上述 6 处 a11y 修复的 focused 测试全绿（先红 7 例 → 后绿：searchbox-a11y 2 + transfer 2 + diff 1 + audio 1 + video 1 + markdown 1）。
- [x] `rg` 实证：3 个搜索框均挂 aria-label（picker-dropdown:52 / icon-picker:203 / diff-file-list:90）；transfer aria-multiselectable 不再恒真（按 `props.multiple` 条件发布）。
- [x] 局部 typecheck：`pnpm --filter @nop-chaos/flux-renderers-{content,form,form-advanced} typecheck` 通过。

### Phase 3 - data-slot="field-control" 重复裁决与修复

Status: completed
Targets: form/form-advanced 15 个渲染器文件、`packages/flux-react/src/field-frame.tsx`（只读参考，data-slot 于 :258 输出）、受影响组件 design.md §DOM 契约节

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：逐文件核对 15 个 data-slot 输出点是否被 FieldFrame 包裹——全部 15 个均被 FieldFrame 包裹（`NodeFrameWrapper` 对每个 `wrap: true` 节点无条件渲染 FieldFrame，node-renderer-resolved.tsx:428-438；form-advanced 9 文件定义 `wrap: true`：combo:578/input-table:420/object-field:506/array-field:563/picker:504/key-value:636/icon-picker:293/transfer:455/detail-field:407；date 族由 `date-renderer-definitions.ts:55/77/97/121` 驱动 `wrap: true`：input-date/input-datetime/input-time/date-range；`date-field-control.tsx` 为 date 族共享内部控件，位于被包裹 renderer 之内）。**裁决：全部 15 处移除**——DOM 契约以 FieldFrame 的 `data-slot="field-control"` 为唯一 owner；复合字段（object/array/combo 等）内部子字段各有自身 FieldFrame 属合法输出，故契约断言为「根节点不再输出」而非整棵子树计数。**注意**：schema 显式 `frameWrap: false/'none'` 时 FieldFrame 被跳过（node-frame-wrapper.tsx:11-13），属 schema 作者显式退出字段契约的选择，不影响本裁决。裁决结论记录于本 plan 与受影响审计卡（8 张：combo/array-field/object-field/icon-picker/key-value/input-table/input-number/picker，P3-1 标 fixed）。
- [x] **Proof（test-first）**：新增 DOM 契约断言——`field-controls-dom-contract.test.tsx`（form 包）5 用例：input-number/input-date/input-datetime/input-time/date-range 子树 `data-slot="field-control"` 恰好 1 个 + 根 marker 不再输出；`field-control-dedup.test.tsx`（form-advanced 包，新建）9 用例：combo/input-table/object-field/array-field/picker/key-value/icon-picker/transfer/detail-field 根节点 `data-slot` 为 null（不再输出）。先红（14 例失败）后绿。
- [x] **Fix**：被裁定去掉的组件根 div 移除 `data-slot="field-control"`（保留 `nop-*` marker 类 + `props.meta.className` cn 合并）——15 文件：combo-renderer.tsx:523 / input-table-renderer.tsx:333 / object-field.tsx:485 / array-field.tsx:523 / picker-renderer.tsx:442 / key-value.tsx:571 / icon-picker.tsx:167 / transfer-renderer.tsx:259 / detail-field.tsx:320 / input-number-renderer.tsx:214 / input-date-renderer.tsx:48 / input-datetime-renderer.tsx:60 / input-time-renderer.tsx:99 / date-range-renderer.tsx:246 / date-field-control.tsx:204。
- [x] **Fix**：e2e/既有单测若依赖子组件 `data-slot="field-control"` 选择器则同步——全仓 `rg 'data-slot="field-control"'` 排查：无测试对 15 文件计数该 marker；既有引用均为 first-match `querySelector`（命中 FieldFrame 输出，语义不变），零同步需求。受影响审计卡 P3-1 项 8 张状态同步为 fixed。
- [x] 受影响组件 design.md §DOM 契约/data-slot 节同步：transfer §6（原声明根节点输出 field-control 已更正为 FieldFrame 输出）+ combo/input-table/picker/key-value/icon-picker/input-number/input-date/input-datetime/input-time/date-range 十份 §样式与 DOM marker 各补一行「FieldFrame 为 field-control 唯一 owner」；object-field/array-field/detail-field 三份由 Phase 4 新建 design.md 覆盖。

Exit Criteria:

- [x] 15 文件裁决记录完整（每文件：FieldFrame 包裹 + 裁定移除 + 依据：`wrap: true` 定义/`date-renderer-definitions.ts` 驱动 + NodeFrameWrapper 无条件渲染；裁决详录本 plan Phase 3 Decision 项）。
- [x] focused 测试全绿（14 例新 DOM 契约断言先红后绿：form 5 + form-advanced 9）；全仓 `rg '[data-slot="field-control"]'` 测试引用已排查同步（零计数型引用，无破坏）。
- [x] 局部 typecheck：form/form-advanced 两包 `pnpm --filter @nop-chaos/flux-renderers-{form,form-advanced} typecheck` 通过。

### Phase 4 - design.md 补齐（6 组件）

Status: completed
Targets: `docs/components/{object-field,array-field,detail-field,detail-view,variant-field,statistics}/design.md`

- Item Types: `Fix`（文档）

- [x] 参照 `flux-guide/design-patterns/composite-fields.md`（家族级基线）+ 各组件源码（schemas.ts/渲染器/注册定义）+ 同族已有关卡（array-editor/tag-list/key-value design.md 结构）起草 6 份 design.md：schema 字段表（propContracts/eventContracts 对齐注册定义）、DOM 契约（marker/data-slot/data-state）、事件 payload、受控/非受控语义、示例 JSON。
- [x] `docs/components/index.md` 补齐 6 条目录条目（statistics 入「数据与工作流组件」节；object-field/array-field/detail-field/detail-view/variant-field 入「表单高级与复合组件」节）。
- [x] 各 design.md 经只读核验（与 live 源码三方一致：schemas.ts ↔ 注册定义 ↔ 渲染器消费——object-field/array-field/detail-field/detail-view/statistics 定义逐项比对：wrap/fields/validation/scopePolicy/propContracts 与文档一致；variant-field propContracts.variants 结构核对）；`check:audit-missing-renderer-markers` 0 新增命中。

Exit Criteria:

- [x] 6 个 `docs/components/<name>/design.md` 存在且与 live 源码三方核对一致（核验记录：Phase 4 执行节逐文件比对定义字段/wrap/validation/scopePolicy/DOM marker/事件 payload，见上项与本次执行记录）。
- [x] `docs/components/index.md` 6 条目录条目存在。

### Phase 5 - CR 输入清单预提取

Status: completed
Targets: `docs/audits/cr-input-inventory.md`、受影响审计卡

- Item Types: `Fix | Follow-up`

- [x] 执行 `rg "归 CR" docs/audits/per-component/*.md` 提取全部延期项，机械生成 `docs/audits/cr-input-inventory.md`：每条目含来源审计卡、组件、问题描述、file:line（卡内登记）、建议裁决类别（i18n/a11y/跨家族 DOM 契约/文档/other）。live 口径：94 处原始引用（16 处聚合汇总排除）→ 78 处 finding 级 → 去重后 69 条独立剩余条目。
- [x] 按类别汇总计数（i18n 5 / a11y 7 / DOM 契约 7 / 文档 17 / other 33），与本 plan Phase 1–4 已处理项交叉核对（17 条标注 handled-by 本 plan，交叉核对表 + 受影响审计卡状态同步为 fixed）。
- [x] `component-audit-roadmap.md` CR work item 行补充"CR 输入清单已预提取（`docs/audits/cr-input-inventory.md`）"，状态保持 `planned`（未提前翻转）。

Exit Criteria:

- [x] `docs/audits/cr-input-inventory.md` 存在且覆盖全部剩余"归 CR"引用（69 条剩余 + 17 条 handled-by = 86 条独立项全覆盖；分析基线 92 处引用中被本 plan 修复者已翻转，剩余条目零遗漏），格式统一可 grep。
- [x] 与本 plan Phase 1–4 已处理项交叉核对记录留痕（inventory §交叉核对表 17 行 + 9 张审计卡状态同步）。

## Draft Review Record

> 起草后、执行前由独立子 agent 审查。

- Reviewer / Agent: ses_02f7258bafferzzUk1qtvPM2GE（fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已处理——transfer `multiple` 穿透路径已写入 Phase 2 Fix（TransferPaneProps 两调用点）；diff-cross-file.test.tsx 断言行号 off-by-one（:92→:93）与 route-matrix.test.ts:189→:190-195 引用偏差不影响执行正确性，随 Phase 1 执行时同步。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`（guide `When Closing The Plan` + `Closure Audit Rule`）。

- [x] I1–I10 全部 i18n 硬编码已走 `t()`，双 locale 键齐全（Phase 1 Exit + live `rg` 实证）
- [x] eslint `words.exclude` 第 1 盲区修复落地（`pnpm lint` 全仓 0 新增 error + `node -e` 中文报错实证记录）
- [x] 6 处 a11y 修复落地（搜索框 ×3、aria-live ×3、transfer ×1）+ focused 测试全绿
- [x] data-slot 15 文件裁决记录完整 + 统一修复 + DOM 契约测试全绿
- [x] 6 个 design.md 创建且与 live 源码三方一致
- [x] CR 输入清单预提取完成（`docs/audits/cr-input-inventory.md`，69 条剩余 + 17 条 handled-by 全覆盖）
- [x] 受影响 owner docs（flux-i18n locales 双同步、组件 design.md、审计卡状态、analysis 报告状态翻转）已同步到 live baseline
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（guide Rule 16）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（执行 session 不勾选；待独立审计）
- [x] `pnpm typecheck`（32/32）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32，0 error；scheduling 1 条预存在 warning 与本次改动无关）
- [x] `pnpm test`（32 包全绿，10,363+ passed / 0 failed）

## Deferred But Adjudicated

### C7/C8 族 i18n/a11y 残留（graph/scheduling/ai/mobile 约 15 处硬编码 aria-label）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 未审计族不在本 plan 范围；C7/C8 审计计划已在 roadmap 排期（`todo`），其审计卡将按同机制登记延期项。
- Successor Required: `yes`
- Successor Path: roadmap C7（mobile 交互族）/C8.1/C8.2（ai 族）审计 plan

### 中文字面量 AST CI 规则（含 eslint 第 2/3 盲区）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 已修复第 1 盲区（`words.exclude` 的 `\W` 误放行中文），未来 CJK JSX 文本会被 lint 拦截（开发期反馈）。第 2 盲区（`aria-.*`）牵连 C7/C8 族 ~16 处 aria-label 硬编码、第 3 盲区（`jsx-text-only` 不查 JS 字面量）牵连 32 个含中文文件，均超出本 plan 审计范围，等待 C7/C8 审计后统一评估（分析报告 §8.5 裁定保持）。
- Successor Required: `yes`
- Successor Path: C7/C8 审计 card + CR 阶段 i18n 修复

### wizard 焦点管理 / cards selectable-card ARIA 模式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需设计裁决（非纯代码修复），屏幕阅读器仍可操作（审计卡裁定），随 CR 阶段裁决。
- Successor Required: `yes`
- Successor Path: CR 阶段（`component-audit-roadmap.md` CR work item）

## Non-Blocking Follow-ups

- 各审计卡"归 CR"项状态与本 plan 处理结果的交叉标注（CR 启动时统一回写）。
- `route-matrix.test.ts:182-183` layout/content 包 route 校验强度核对（是否统一为 def 枚举）——CR 阶段评估，非本 plan 阻塞项。

## Closure

Status Note: 执行完成——5 Phase 全 completed（Phase 1 i18n I1–I10 + eslint 盲区；Phase 2 a11y ×6；Phase 3 data-slot 15 文件裁决修复；Phase 4 六份 design.md；Phase 5 CR 输入清单），全量验证 `pnpm typecheck`/`build`/`lint` 32/32 绿、`pnpm test` 10,363+ passed 0 failed；owner docs（flux-i18n 双 locale、10+ 份组件 design.md、9 张审计卡状态、analysis 报告状态、roadmap CR 注记、daily log）已同步；closure-audit 由独立 fresh sub-agent 执行（证据见下）。

Closure Audit Evidence: Auditor / Agent: ses_002d8c16（fresh session，独立 closure auditor）。Evidence: 逐项回看 live repo 复核（未采信 [x] 标记）——Phase 1：`eslint.config.js:263` 已含负向前瞻 `^(?!.*[\\u4e00-\\u9fa5])[\\s\\d\\W]*$`；10 处硬编码在 renderer 源码零残留（rg 仅命中测试文件与 `data-renderer-definitions.ts:396` registry `displayName: 'Tree'`，属预期豁免）；16 个新键在 en-US/zh-CN 双 locale 均存在（keyEntry/valueEntry/selectIcon/searchIcon/variantUpdateFailed/goToSlide/all/added/modified/deleted/searchFiles/statusAdded/statusModified/statusDeleted/tree + 复用 flux.common.close 与 flux.form.key/value）；proof 测试存在且断言走 t()（icon-picker-i18n/key-value-i18n/diff-cross-file）。Phase 2：aria-label 于 picker-dropdown:52 / icon-picker:202 / diff-file-list:90；aria-live="polite" 于 audio:47 / video:57 / markdown-editor-renderer:296；transfer-renderer:418 按 `props.multiple` 条件发布，TransferPaneProps 两调用点 :262/:308 已穿透。Phase 3：form/form-advanced 非测试源码 `data-slot="field-control"` 零残留（FieldFrame 于 flux-react/src/field-frame.tsx:258 唯一输出）；field-controls-dom-contract.test.tsx（it.each 5 例）与 field-control-dedup.test.tsx（it.each 9 例）存在且语义正确。Phase 4：6 份 design.md 存在；docs/components/index.md:474（statistics，数据与工作流组件节 :461 下）与 :515-519（5 份，表单高级与复合组件节 :503 下）条目齐。Phase 5：cr-input-inventory.md 含类别汇总表（5/7/7/17/33=69）、条目表（类别/组件/编号/来源/问题描述）与交叉核对节；roadmap CR 行含「CR 输入清单已预提取」注记且状态仍 `planned`。验证命令实测：`pnpm typecheck` 32/32 绿；`pnpm build` 32/32 绿；p2p3 涉及 6 包（flux-i18n/flux-react/content/form/form-advanced/data）`pnpm lint` 全绿、`pnpm test` 全绿（26/285/729/1033/722/467 passed）。已知偏差（非本 plan 归属）：工作区存在另一在途 plan（dingtalk-visual-alignment，未提交）对 flow-designer-renderers 的中间态改动，导致全仓 lint 31/32（ding-flow-edge.tsx:3 `EdgeLabelRenderer` 未用、:9 `BRANCH_LABEL_MAX_WIDTH` 未用）与 test 58/59（ding-flow-edge.test.tsx:139 断言 label pill `pointer-events: none` 未实现）——失败行均出自该 plan 的 working-tree diff，与本 plan 改动及 eslint i18n 配置无关；本 plan 执行时点全绿（turbo 缓存 56/56 test、30/32 lint 回放为执行期绿态 + daily log 08-06 记录 10,363+ passed / 0 failed、lint 0 error）。结论：本 plan 全部 Phase 项、Exit Criteria 与 Closure Gates 均真实落地，接口与语义一致，deferred 项分类诚实，无静默降级；verdict: approved。

Follow-up:

- 各审计卡"归 CR"项与本 plan 处理结果的交叉标注已落地（inventory §交叉核对表 + 卡状态同步）；CR 启动时直接消费 `docs/audits/cr-input-inventory.md`。
- `route-matrix.test.ts:182-183` layout/content 包 route 校验强度核对——CR 阶段评估，非阻塞项（plan Non-Blocking Follow-ups 原文保留）。
- eslint 第 2/3 盲区（`aria-.*`、`jsx-text-only`）随 C7/C8 审计后在 CR 阶段统一评估（plan Deferred But Adjudicated 原文保留）。
