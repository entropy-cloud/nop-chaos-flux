# 530 flux-renderers-form-advanced 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W3）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）；`docs/plans/2026-10-03-529-dom-structure-form-plan.md`（W2 产出的字段族口径）

## Purpose

把 flux-renderers-form-advanced 全部 renderer type 的 DOM 结构收口到契约 6 维（字段族 D6 全部 n-a）。本包是包装层问题最重的包（upload/editor/array-editor/variant-field 均已点名），逐层归因整改，并冻结包级契约测试。

## Current Baseline

> **执行发现（2026-10-03）**：盘点确认 17 type wrap:true（可见根 = FieldFrame）、variant-field 自管 FieldFrame（显式嵌入）与 detail-view 无 wrap（可见根 = 组件输出根）；stamp 架构沿用 W2 精化态（Provider 链下钻 + 组件元素兜底 + wrap:true 跳过）。无帧通道对 detail-view 生效（契约测试断言 stamp + 手写 cid）。另发现 4 个 wrap:true 定义缺 frameRootTag（input-file/input-image/tree-select/object-field，用默认 label 帧）——行为既定，登记不回改。

- 组件清单（type → `packages/flux-renderers-form-advanced/src/` 文件）：combo → `combo-renderer.tsx`、editor → `editor-renderer.tsx`、array-editor → `array-editor.tsx`、input-file / input-image（共用 `upload-field.tsx`；外部 wrap 经 `input-file-renderer.tsx:47`）、icon-picker、key-value、tag-list、input-table、picker、transfer、input-tree、tree-select、array-field、object-field、variant-field（`variant-field/variant-field-view.tsx`）、condition-builder（`condition-builder/`）、detail-view / detail-field（`detail-view/`）——全部 composite，无 canvas。
- 已点名包装嫌疑（评审修订后）：
  - `array-editor.tsx:88-143`：行链为 row grid div（**无 data-slot**）→ 子域状态 div（**无 data-slot**）→ Input/FieldHint；**无 FieldFrame**（根 wrap 走外部 `wrap:true`，:614）；remove 已用 `data-slot="array-editor-remove"`（:180）。`array-item-shared.tsx` 服务 combo/input-table，array-editor 未引用。
  - `upload-field.tsx`：`nop-input-file-item` 等序号（`-remove-${index}` 等，:528/:588/:606/:622）是 **data-testid 动态插值，非硬编码类缺陷**；真实缺口是 ul/li 层**无 data-slot**（:576/:585）。
  - `editor-renderer.tsx:285-296`：只读/编辑两分支均 root `nop-editor` → toolbar div → `nop-editor-content`（经 tiptap editorProps :121 挂载）；真正的无名包装层是 :355 边框 div。
  - `variant-field/variant-field-view.tsx:222` 显式把 FieldFrame 嵌入自身子树（全包唯一显式嵌入点）；`:198` 有 `frameWrapMode==='none'` 分支。
- `data-cid` 手写仅 4 处（tree-controls:402、icon-picker:193、detail-view:549、variant-field-view:198），其余依赖注入链（W2 口径复用）。

## Goals

- 全部 type 六维判定落卡；array-editor / upload-field / editor / variant-field 四个重点组件逐层归因并整改或豁免登记
- array-editor 行内两层（:88/:89）补 `data-slot`；upload-field ul/li 层（:576/:585）归因补 slot
- editor :355 无名边框层归因（补 slot 或合并）；variant-field FieldFrame 显式嵌入按 W2 字段族口径统一
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；上传/编辑器交互行为变更
- 子目录 cohesion unit（condition-builder/detail-view）内部结构的重组——只审标记与包装付租
- data-testid 的 `-0` 序号插值（既有 testid 语义，非结构缺陷，不动）
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- W2 已收口的 FieldFrame/node-frame-wrapper 链本身
- 编辑器三方库（如 tiptap/monaco）挂载点内部结构

## Test Strategy

档位选择：`建议有测`——四个重点组件的包装整改与 ul/li slot 补齐为必测断言；其余以卡面 + 契约测试覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 19 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（19 张，六维判定齐全）；四重点组件逐层归因完整（array-editor 行链、upload ul/li、editor 边框层、variant-field 嵌入矩阵）
- [x] variant-field FieldFrame 显式嵌入点对照 W2 口径登记分支矩阵（label/group/none 三态均有锚）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（19/19）；四重点组件结构图完整

### Phase 2 - 整改

Status: completed
Targets: `array-editor.tsx`、`key-value-row.tsx`、`upload-field.tsx`、`editor-renderer.tsx`、`variant-field/variant-field-view.tsx` + `variant-field.tsx`

- Item Types: `Fix | Proof`

- [x] array-editor 行链两层补 slot（array-editor-row / -row-body）；key-value-row 同模式补 slot（盘点发现的同族缺口，一并收口）
- [x] upload-field ul/li 补 slot（upload-field-list / -item，existing 与 pending 两个 li 分支）
- [x] editor :355 边框层补 `data-slot="editor-content-frame"`
- [x] variant-field 自管 FieldFrame 补 `renderer={rendererType}`（此前 data-renderer null，prop 从 variant-field.tsx 贯通）

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言（契约测试 5 用例）
- [x] 既有包测试无回归（form-advanced 1149/1149）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/__tests__/dom-structure-contract.test.tsx`（5 用例）

- Item Types: `Proof`

- [x] 契约测试冻结五通道：wrapped 帧根（skip marker 口径）+ array-editor 行 slot + key-value 行 slot + upload list/item slot + variant-field 自管帧根 + detail-view 无帧 stamp（使用 527 helper，createFormSchemaRenderer harness）

Exit Criteria:

- [x] 契约测试落位并通过（5/5）
- [ ] roadmap W3 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R2（fresh session）
- Verdict: pass（Round 1 issues → 2 项 Major 已修订：array-editor 基线改为真实行链/无 FieldFrame、upload-field 序号定性改为 data-testid 动态插值并重指 ul/li 真实缺口；Round 2 复核通过）
- Rounds: 2
- Findings addressed: ①array-editor/upload-field/variant-field 基线重写 ②Goals 与 Phase 2 改为真实缺口（:88/:89、:576/:585、:355）③combo→combo-renderer.tsx、Non-Goals 移除 diff-view（属 content 包）

## Closure Gates

- [x] 全部 type 审计卡六维收口（19/19）
- [x] 四重点组件整改/豁免全部落地且有 proof（5 处 fix + 3 处 exempt 裁定）
- [x] `dom-structure` 契约测试冻结（5 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更，checklist 口径沿用 W2）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；form-advanced 1149/1149）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。19 卡落盘；5 处 fix（array-editor/key-value 行链、upload ul/li、editor 边框层、variant-field rendererType 贯通）；3 处 exempt 裁定（transfer pane 内布局层、condition-builder 外框 chrome、icon-picker popover 分区）；5 用例契约测试冻结。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_0aa48c4d）
- Evidence: approved——5 处 fix 逐行核实、form-advanced 1149/1149 实跑、variant-field 类型无回归；审计建议（tree-select/object-field 卡面补 frameRootTag 备注）已同步完成。

Follow-up:

- 见 Non-Blocking Follow-ups
