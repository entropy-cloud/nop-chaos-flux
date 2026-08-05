# P2/P3 审计发现汇总分析报告

> 状态：active（2 轮独立子 agent 审查 pass-with-minors，共识达成）
> 日期：2026-08-05
> 范围：C1–C6.5 逐组件审计（basic/form/form-advanced/data/layout/content 全已收口族；mobile C7 / AI C8 **不在范围**——约 40% 组件未审计，本报告结论仅对已审计族成立）
> 方法：5 个并行 explore agent 全量提取每张卡的 P2/P3 发现 + live 仓库实证核验 + 2 轮独立子 agent 审查
> 驱动：用户要求"i18n 硬编码需要处理，lab 页缺失也要处理，很多基本实现必须做得非常扎实"

## 0. 执行摘要

对 95 张审计卡（basic/form/form-advanced/data/layout/content 族）的全量提取得到约 **182 条 P2 + 约 133 条 P3 发现**。其中约 76% P2 已在审计执行期 test-first 修复，约 86% P3 被正确裁定为 keep（设计决策留痕）。

经 live 仓库实证核验，以下两类"基本实现扎实度"问题确认仍在线上代码，需要处理：

1. **i18n 硬编码**（13 处确认仍在线上代码：10 处待修 + 3 处裁定 keep）—— 包含 1 处**中文硬编码**（icon-picker `选择图标`，schema-overridable 默认值但在 en-US 环境下仍显示中文）、2 处 key-value `placeholder="Key"/"Value"`、以及 diff-file-list 全部状态 tab 与搜索框等用户可见文案。
2. **a11y 缺口**（约 15 处）—— 搜索框无 aria-label、aria-live 缺失、aria 语义误用等。

lab 页方面状态良好（现有 lab 页 CI 校验 + 92 个 lab 页文件），CR（跨族集中修复）作为 roadmap `todo` work item 已登记但**尚未启动执行**。

**核心结论**：已审计族的 P2/P3 中约 76%/86% 已修复或正确裁定，剩余约 40 条延期项分布在各审计卡内、等待 CR 阶段集中处理。i18n 硬编码是其中最影响"世界一流产品扎实度"的类别，应在 CR 阶段首批处理。**round-1 审查纠正了本报告 v1 的一个重大误判**（v1 曾称"CR 是流程黑洞"——实际 CR 是 roadmap 已登记的 `todo` work item，见 `docs/backlog/component-audit-roadmap.md:56,178,213`，延期项有审计卡登记 + roadmap 跟踪，非静默丢弃）。

---

## 1. 数据基线

| 指标                 | 数值                                                                                                     | 来源                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 审计卡总数           | 95                                                                                                       | `docs/audits/per-component/*.md`（排除 README）             |
| P2 发现（提取）      | ~182                                                                                                     | 5 批 explore agent 全量提取                                 |
| P3 发现（提取）      | ~133                                                                                                     | 同上                                                        |
| P2 已 fixed          | ~76%                                                                                                     | 各卡发现清单状态                                            |
| P3 keep（设计留痕）  | ~86%                                                                                                     | 各卡发现清单状态                                            |
| "归 CR"延期发现      | 92 处引用（41 卡）                                                                                       | `rg "归 CR" docs/audits/per-component/`                     |
| CR 跟踪机制          | roadmap work item `todo`（`component-audit-roadmap.md:56`）+ CR Phase 详情（`:178`）+ 复验规则（`:213`） | live 核验                                                   |
| flux-i18n en-US 叶键 | 857                                                                                                      | `packages/flux-i18n/src/locales/en-US.ts`                   |
| component-lab 页文件 | 92                                                                                                       | `apps/playground/src/component-lab/renderers/*lab-page.tsx` |
| lab 页 CI 校验       | 已存在                                                                                                   | `apps/playground/src/route-matrix.test.ts:189-193`          |

---

## 2. i18n 硬编码 —— 确认仍在线上代码（MUST FIX）

这是用户最关注的问题。审计期间大量 i18n P2 已修复（input-text/input-number/date 族/markdown-editor/editor/table 等），但一批 i18n 发现被标注"归 CR"后等待集中处理。经 live `rg` 实证，以下确认仍硬编码。

### 2.1 用户可见 UI 文案硬编码（P2 must-fix）

这类是 builder 不易通过 schema 覆盖、或即使可覆盖默认值也不应在国际化框架中硬编码单一语言的文案：

| #   | 组件           | 文件:行                        | 硬编码内容                                                                | 语言     | 备注                                                                            |
| --- | -------------- | ------------------------------ | ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| I1  | icon-picker    | `icon-picker.tsx:65`           | `选择图标`（placeholder 默认值，`schemaProps.placeholder ?? '选择图标'`） | **中文** | schema-overridable，但 en-US 环境下默认值显示中文                               |
| I4  | diff-file-list | `diff-file-list.tsx:79-82`     | `All/Added/Modified/Deleted` tab 标签（含计数）                           | 英文     | 用户可见 UI；同文件 `:120` 已用 `t('flux.diff.noFilesMatch')`，机制就在隔壁未用 |
| I5  | diff-file-list | `diff-file-list.tsx:90`        | `Search files...` placeholder                                             | 英文     | 用户可见                                                                        |
| I6  | diff-file-list | `diff-file-list.tsx:142-146`   | `A/M/D` 状态字母                                                          | 英文     | 缩写可接受但应走 i18n                                                           |
| I7  | variant-field  | `variant-field-helpers.ts:107` | `Variant field update failed`（error 兜底）                               | 英文     | 用户可见错误回退文案                                                            |
| I9  | key-value      | `key-value.tsx:111`            | `placeholder="Key"`                                                       | 英文     | 用户可见；`:112` 的 `aria-label={`Key ${index+1}`}` 同样硬编码                  |
| I10 | key-value      | `key-value.tsx:165`            | `placeholder="Value"`                                                     | 英文     | 用户可见；`:166` 的 `aria-label={`Value ${index+1}`}` 同样硬编码                |

### 2.2 a11y 兜底文案硬编码（P3，建议随 CR 一并处理）

这类是 aria-label 兜底文案（非用户可见正文），英文作为 SR 兜底在技术上可接受，但世界一流产品应走 i18n：

| #   | 组件     | 文件:行                  | 硬编码内容                                         | 备注                                                            |
| --- | -------- | ------------------------ | -------------------------------------------------- | --------------------------------------------------------------- |
| I2  | alert    | `alert-renderer.tsx:109` | `aria-label="Close"`                               | `flux.common.close` 键**已存在**（en-US:8/zh-CN:9），零成本可修 |
| I3  | carousel | `carousel.tsx:311`       | ``aria-label={`Go to slide ${index+1}`}``          | a11y 兜底                                                       |
| I8  | tree     | `tree-renderer.tsx:421`  | `'Tree'`（`label‖title‖id‖'Tree'` 第四优先级兜底） | 深层兜底，a11y-only                                             |

### 2.3 低优先级 i18n 观察项（P3 keep）

| 组件        | 文件                         | 内容                                               | 裁定 |
| ----------- | ---------------------------- | -------------------------------------------------- | ---- |
| chart       | `chart-renderer.tsx:351`     | `'References: '` sr-only 前缀                      | keep |
| statistics  | `statistics-renderer.tsx:14` | 复用 `flux.pagination.total`（语义复用，非硬编码） | keep |
| scope-debug | `scope-debug.tsx`            | `'Scope Debug'` 默认 title（调试工具）             | keep |

### 2.4 范围声明

以上仅覆盖 C1–C6.5（basic/form/form-advanced/data/layout/content）。graph/scheduling/ai/mobile 包**未在本轮审计范围**，初步观察这些包也存在硬编码英文 aria-label（如 graph 的 `Zoom in/out`、kanban 的 `Resize column`、ai-bubble 的 `Previous/Next branch` 等），数量约 15+，应在 C7/C8 审计时纳入。

### 2.5 根因分析

这些 i18n 缺陷的共同模式：审计时发现 → 标注"跨包 i18n 机制项（>15 分钟）→ 归 CR" → 等待 CR 阶段执行。CR 是 roadmap 已登记的 `todo` work item（`component-audit-roadmap.md:56`），延期项在各审计卡内有 file:line 登记（92 处），**并非静默丢弃**——但 CR 阶段尚未启动，这些项处于"已登记、待执行"状态。

I1（icon-picker 中文硬编码）值得关注：它被归类为 P3/CR，但实际上 `flux-i18n` 已有完整 `t()` + 双 locale 机制，同族 editor/markdown-editor 的 i18n 在同一审计期已修复——它是被错误低估优先级的典型（应至少 P2）。

---

## 3. component-lab 页 —— 已达标，CI 校验已存在

### 3.1 当前状态

lab 页在审计执行期（各 plan Phase 3）已系统性补齐。live 核验：

- component-lab 页文件：92 个（`apps/playground/src/component-lab/renderers/`）
- **lab 页 CI 校验已存在**：`apps/playground/src/route-matrix.test.ts:189-193` 断言"every shared renderer route has a lab page component"，且 `:124-158` 校验注册 renderer def → route 链路完整。

结论：**lab 页覆盖率已达标，防回退机制已存在**。

### 3.2 残留观察

1. **CI 校验覆盖范围**：`route-matrix.test.ts:182-183` 对 layout/content 包的 route 计数采用 `LAYOUT_RENDERER_ROUTES.length` 而非枚举 defs，覆盖强度略弱于 basic/form 族。建议 CR 阶段核对是否需统一为 def 枚举校验。
2. **statistics design.md 缺失**（P2-4，归 CR）：lab 页存在但 design 文档缺失。

---

## 4. a11y 缺口 —— 约 15 处 keep/backlog

a11y 是"世界一流产品"的核心扎实度指标。以下发现被 keep 或归 CR 待处理：

### 4.1 搜索/输入框无 aria-label（跨家族模式）

| 组件        | 文件                        | 问题                                       | 现状    |
| ----------- | --------------------------- | ------------------------------------------ | ------- |
| picker      | `picker-dropdown.tsx:49-55` | 搜索 input 无 aria-label（仅 placeholder） | CR keep |
| icon-picker | `icon-picker.tsx:199-208`   | 搜索 input 无 aria-label                   | CR keep |
| diff-view   | `diff-file-list.tsx:89-93`  | 文件搜索 input 无 label                    | keep    |

这是一个跨家族重复模式：搜索框仅靠 placeholder 提供可访问名称，屏幕阅读器在 placeholder 消失后无法定位。应统一修复。

### 4.2 aria-live / 焦点管理缺失

| 组件            | 问题                                 | 现状    |
| --------------- | ------------------------------------ | ------- |
| markdown-editor | 预览区无 aria-live                   | CR keep |
| audio/video     | 错误回退文本无 aria-live（被动场景） | keep    |
| wizard          | 步骤切换无焦点管理（需设计决策）     | keep    |
| editor          | `focus:outline-none` 无可见焦点环    | CR keep |

### 4.3 aria 语义误用

| 组件           | 问题                                                                                  | 现状       |
| -------------- | ------------------------------------------------------------------------------------- | ---------- |
| cards          | `role="button"` + `aria-selected` 非 ARIA 规范组合（需 selectable-card 模式设计裁决） | CR backlog |
| tree           | `aria-selected={isTabbable}` 误用（roving-tabindex 语义）                             | keep       |
| transfer       | `aria-multiselectable="true"` 恒真（single 模式错误）                                 | CR keep    |
| checkbox-group | `aria-errormessage` 未接（仅 aria-describedby）                                       | CR keep    |

### 4.4 严重度评估

a11y 缺口在单组件层面多为 P3（低影响），但跨家族累积后构成系统性可访问性债务。其中部分（cards selectable-card 模式、wizard 焦点管理）需要**设计决策**而非纯代码修改——这也是它们被 keep 的合理原因。搜索框 aria-label 则是纯代码修复，应优先。

---

## 5. 跨家族代码模式缺陷 —— 等待 CR 集中裁决

### 5.1 嵌套 `data-slot="field-control"` 重复（15 个文件）

FieldFrame 已在 `field-frame.tsx:258` 输出 `data-slot="field-control"`，以下 15 个组件的根 div **重复输出同一 data-slot**，造成选择器定位歧义：

| 包            | 组件               | 文件:行                           |
| ------------- | ------------------ | --------------------------------- |
| form-advanced | combo              | `combo-renderer.tsx:523`          |
| form-advanced | input-table        | `input-table-renderer.tsx:333`    |
| form-advanced | object-field       | `object-field.tsx:485`            |
| form-advanced | array-field        | `array-field.tsx:523`             |
| form-advanced | picker             | `picker-renderer.tsx:442`         |
| form-advanced | key-value          | `key-value.tsx:571`               |
| form-advanced | icon-picker        | `icon-picker.tsx:167`             |
| form-advanced | transfer           | `transfer-renderer.tsx:259`       |
| form-advanced | detail-field       | `detail-field.tsx:320`            |
| form          | input-number       | `input-number-renderer.tsx:214`   |
| form          | input-date         | `input-date-renderer.tsx:48`      |
| form          | input-datetime     | `input-datetime-renderer.tsx:60`  |
| form          | input-time         | `input-time-renderer.tsx:99`      |
| form          | date-range         | `date-range-renderer.tsx:246`     |
| form          | date-field-control | `date/date-field-control.tsx:204` |

这是一个明确的跨家族架构决策问题，每个组件单独标注"归 CR 集中裁决"。**裁决要点**：需区分"被 FieldFrame 包裹"（应去掉子组件重复）vs"独立无 FieldFrame"（data-slot 是唯一输出，保留合理）。CR 阶段应一次性裁决并统一修复。

### 5.2 设计文档缺失（6 个组件无 design.md）

| 组件          | 现状                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| object-field  | 无 design.md（CR backlog，flux-guide `composite-fields.md` §5 有家族级基线） |
| array-field   | 无 design.md（CR backlog）                                                   |
| detail-field  | 无 design.md（CR backlog）                                                   |
| detail-view   | 无 design.md（CR backlog）                                                   |
| variant-field | 无 design.md（CR backlog）                                                   |
| statistics    | 无 design.md（CR backlog）                                                   |

这是文档补齐工作（非"裁决"），应由 CR 阶段批量起草 + 人工确认。

### 5.3 "推荐句柄未实现"（design 声明 recommended 但未落地）

| 组件       | 声明句柄                                                    | 现状       |
| ---------- | ----------------------------------------------------------- | ---------- |
| collapse   | `component:setValue/openItem/closeItem`                     | CR backlog |
| wizard     | `component:setValue/getValue/next/prev/goToStep/commitStep` | CR backlog |
| json-view  | `component:copy/onCopy`                                     | CR backlog |
| pagination | `component:setPage/setPageSize/resetPage`                   | keep       |

design.md 用词为"推荐支持（recommended）"而非契约承诺，实现需组件 capability 注册面（>15 分钟）。裁定为 P3 keep 合理。

---

## 6. 其他 P2/P3 类别（已大量修复，记录完整性）

### 6.1 定义契约补齐（fields/propContracts/eventContracts/defaultSchema）

审计发现的最大 P2 类别。大量渲染器的注册定义缺少 fields/propContracts/eventContracts/defaultSchema 声明（closed model strict 下会 unknown-property error）。绝大部分已在审计期 fixed。残留：fieldset 无 propContracts（keep）、input-number `validate` 未注册 fields（CR keep）。

### 6.2 测试加固（假绿/盲区）

审计期 test-first 修复了大量测试盲区（statistics 零测试、icon-picker 存在性断言、editor 零 mount 测试、各 onChange payload 零断言等）。绝大部分已 fixed。

### 6.3 文档漂移

design.md 与实现漂移（BEM 残留声明、字段名不一致、未实现功能声明已实现）。绝大部分已 fixed。

### 6.4 性能观察项（useCallback 集群）

多个组件被 react19-optimization-candidates 工具命中 useCallback 集群。统一裁定 keep（Compiler 基线无害，有稳定性测试锚定）。合理的批量裁决。`t()` 本身是纯同步字典查找（`flux-i18n/src/i18n.ts:122`），无订阅无重渲染，性能不是 i18n 缺陷的原因。

---

## 7. 根因分析：为什么这些 i18n/a11y 问题等待至今

### 7.1 准确定位：CR 是已登记待执行阶段，非黑洞

CR（跨族集中修复与裁决）是 `docs/backlog/component-audit-roadmap.md` 中明确登记的 work item：

- **`:56`** —— CR work item 行，status `todo`，dependencies `全部 C*`
- **`:178`** —— `### CR — 跨族集中修复与裁决` Phase 详情节，定义 CR 汇集"各审计卡 shared 标记的剩余跨组件缺陷 + C 阶段 deferred P1 + 各审计卡 P2 backlog + 机制落地后复验项"
- **`:213`** —— 工作流规则："卡内延期必须登记，不得静默跳过"

92 处"归 CR"引用是各审计卡内的 file:line 登记，CR 阶段启动时可经 `rg "归 CR" docs/audits/per-component/` 全量恢复。**延期项有审计卡登记 + roadmap 跟踪，非静默丢弃**。

（v1 报告曾误判为"流程黑洞"，经 round-1 审查纠正：v1 的 `rg "归 CR" docs/backlog/` 搜索过窄——CR 不是以独立文件跟踪，而是 roadmap work item + 审计卡分布式登记。）

### 7.2 真实差距：CR 尚未启动 + 延期项未预集中

准确的问题是：

1. **CR 阶段尚未启动**（status `todo`，C1–C6.5 已 done 但 CR 依赖"全部 C\*"含 C7/C8 未完成）。
2. **延期项分布在 41 张审计卡内**，CR 启动时需先执行一次 `rg` 恢复 + 分类，存在恢复成本。
3. **优先级断层**：P0/P1 是功能性缺陷（当场修复），P2/P3 的 i18n/a11y 是扎实度缺陷（推到 CR），当 CR 因依赖未满足而迟迟不启动时，这些扎实度项持续等待。

### 7.3 可优化点

- **预集中**：CR 启动前，可先将 92 处延期项机械提取为一张 CR 输入清单（降低恢复成本）。
- **i18n 提前批**：i18n 硬编码不依赖 C7/C8，可作为 CR 的首批工作提前执行（CR 依赖的是"全部 C\*"的审计完成，但 i18n 修复不依赖未审计族）。

---

## 8. 行动建议

### 8.1 i18n 硬编码修复（MUST FIX，建议作为 CR 首批工作）

修复第 2.1 + 2.2 节的 10 处硬编码（I1–I10）。按 round-1 审查建议，**不单独起 plan**（8 处是一行级字符串替换，机制 `t()` 已在隔壁文件使用），而是作为 CR 阶段入口的首批具体工作：

- **I1（icon-picker 中文）**：最高优先级，新增 `flux.form.selectIcon` 键 + `t()` 消费；注意 `icon-picker.test.tsx:66` 的 `name: /选择图标/` 断言需同步更新。
- **I2（alert Close）**：`flux.common.close` 键已存在，零成本。
- **I4–I6（diff-file-list）**：新增 `flux.diff.all/added/modified/deleted/searchFiles` 键；同文件 `:120` 已有 `t()` 先例。
- **I7（variant-field）**：新增 `flux.form.variantUpdateFailed` 键。
- **I9–I10（key-value）**：新增 `flux.form.key/value` 键。
- **I3/I8（a11y 兜底）**：新增对应键，P3 优先级可随 CR 一并处理。

建议附 test-first：en-US locale 下断言关键文案经 `t()` 解析（而非字面量）。

### 8.2 驱动 CR 阶段（而非新建跟踪机制）

CR 跟踪机制已存在（roadmap work item）。建议：

- 将 92 处"归 CR"发现预提取为 CR 输入清单（降低 CR 启动恢复成本），存放于 `docs/audits/cr-input-inventory.md` 或直接纳入 CR plan。
- i18n 修复（8.1）作为 CR 首批工作，不阻塞于 C7/C8 审计完成。

### 8.3 a11y 系统性修复

- **搜索框 aria-label 统一修复**（picker/icon-picker/diff-view）：跨家族一次性处理，纯代码修复。
- **aria-live 补齐**（markdown-editor/audio/video）：随 CR 处理。
- **aria 语义修正**（cards/transfer/checkbox-group）：需设计决策，随 CR 裁决。

### 8.4 跨家族模式裁决

- **`data-slot="field-control"` 重复**：15 个文件，一次性裁决（区分 FieldFrame 包裹 vs 独立）+ 统一修复。
- **design.md 缺失**：6 组件批量补齐（文档工作，非裁决）。

### 8.5 防回退机制

- lab 页 CI 校验已存在（`route-matrix.test.ts:189-193`），无需新增。建议核对 layout/content 包的校验强度是否需统一为 def 枚举。
- renderer 源码中文字面量防回退：round-1 审查指出 naive `rg` 无法区分注释与字面量（renderer 源码含大量中文注释），且无 AST 规则先例。建议**暂不引入 CI 规则**，依赖 CR 阶段 i18n 修复 + 后续审计覆盖。若需引入，应基于 AST（eslint `no-restricted-syntax` 针对 JSX text / string literal expression，排除注释）+ 豁免清单。**2026-08-05 补充核验**：`eslint.config.js:185-306` 实际已启用 `i18next/no-literal-string`（error 级，`mode: 'jsx-text-only'`），但存在 3 盲区使 I1–I10 漏检：① `words.exclude '^[\s\d\W]*$'` 的 `\W` 含 CJK 误放行中文 JSX 文本（修复版 `^(?!.*[\u4e00-\u9fa5])[\s\d\W]*$` 全仓 0 新增报错，零风险）；② `jsx-attributes.exclude 'aria-.*'` 放行 aria-label（牵连 C7/C8 族 ~16 处）；③ `jsx-text-only` 不查 JS 字符串字面量（I1/I4–I6/I9–I10 均属此类）。**修正裁定**：①在修正计划 Phase 1 落地（eslint 配置修复而非新规则）；②③等待 C7/C8 审计后统一评估。

---

## 9. 严重度评估矩阵

| 类别                                        | 原审计裁定      | 本报告评估                                 | 理由                                                                       |
| ------------------------------------------- | --------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| i18n 中文硬编码（I1）                       | P3 keep / CR    | **P2**（schema-overridable 默认值，非 P1） | en-US 默认显示中文，但 builder 可覆盖；世界一流产品默认值应 locale-neutral |
| i18n 英文硬编码用户可见文案（I4–I7,I9–I10） | P2 backlog / CR | **P2 must-fix**                            | 用户可见 UI 文案                                                           |
| i18n 英文 a11y 兜底（I2,I3,I8）             | P2/P3 keep      | **P3**                                     | a11y-only 兜底，英文可接受但应走 i18n                                      |
| 搜索框无 aria-label                         | P3 CR keep      | **P2**（纯代码修复）                       | 跨家族系统性 a11y 债务                                                     |
| aria-live 缺失                              | P3 keep         | **P3**                                     | 被动场景可接受                                                             |
| data-slot 重复                              | P3 CR keep      | **P2**（需裁决后修复）                     | 跨家族架构决策，15 文件                                                    |
| design.md 缺失                              | P2 CR backlog   | **P2**                                     | 组件契约文档基线                                                           |
| useCallback 集群                            | P3 keep         | **P3 keep**                                | 合理批量裁决                                                               |
| 推荐句柄未实现                              | P2 CR backlog   | **P3 keep**                                | "recommended" 非契约承诺                                                   |

---

## 10. round-1 审查反馈处置记录

| 反馈                                             | 级别    | 处置                                                        |
| ------------------------------------------------ | ------- | ----------------------------------------------------------- |
| CR "黑洞"论为误判（roadmap:56/178/213 已登记）   | Blocker | §0/§7 全面重写，删除"黑洞/静默丢弃"措辞，改为"已登记待执行" |
| lab 页 CI 校验已存在（route-matrix.test.ts:189） | Blocker | §3 重写为"已达标"，§8.5 删除"新增 CI 校验"建议              |
| data-slot 重复 15 文件非 7-8，行号漂移           | Major   | §5.1 重写为 15 文件表 + 实测行号                            |
| i18n 列表遗漏 key-value Key/Value、diff All tab  | Major   | §2.1 扩展为 I1–I10                                          |
| icon-picker P1 过高（schema-overridable 默认值） | Major   | §9 降为 P2，§2.1 标注 schema-overridable                    |
| i18n 应分用户可见(P2) vs a11y兜底(P3)            | Major   | §2 拆分为 2.1/2.2 两档                                      |
| 中文 literal CI ban 不可行（243 注释命中）       | Major   | §8.5 改为"暂不引入，依赖 CR + 审计"                         |
| i18n 不应单独起 plan（8 行级修复）               | Major   | §8.1 改为"CR 首批工作"                                      |
| 审计卡 88→95、lab 92 实测、carousel:307→311      | Minor   | §1 数据基线 + §2 行号修正                                   |
| C7/C8 范围局限应进 §0                            | Minor   | §0 + §2.4 显式声明                                          |

---

> 本报告基于 2026-08-05 live 仓库状态。C7（mobile）/C8（ai）族尚未审计，本报告结论仅对 C1–C6.5 已审计族成立。
