# 530 flux-renderers-form-advanced 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W3）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）；`docs/plans/2026-10-03-529-dom-structure-form-plan.md`（W2 产出的字段族口径）

## Purpose

把 flux-renderers-form-advanced 全部 renderer type 的 DOM 结构收口到契约 6 维（字段族 D6 全部 n-a）。本包是包装层问题最重的包（upload/editor/array-editor/variant-field 均已点名），逐层归因整改，并冻结包级契约测试。

## Current Baseline

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

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 ~19 张）

- Item Types: `Proof`

- [ ] 逐 type 落卡；array-editor / upload-field / editor / variant-field 四重点逐层归因（每层写明职责或判冗余）
- [ ] variant-field FieldFrame 显式嵌入点对照 W2 口径登记分支矩阵

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全；四重点组件结构图完整

### Phase 2 - 整改

Status: planned
Targets: `upload-field.tsx`、`editor-renderer.tsx`、`array-editor.tsx`/`array-item-shared.tsx`、`variant-field/variant-field-view.tsx` 及卡面其余 fix 项

- Item Types: `Fix | Proof`

- [ ] array-editor 行内两层补 `data-slot`；upload-field ul/li 层按裁定补 slot/归因
- [ ] editor :355 无名边框层按裁定补 slot 或合并
- [ ] 注入链补点（如有断点，依赖 527 Phase 1）
- [ ] 逐项 test-first 落地

Exit Criteria:

- [ ] 每个 fix 项落地且有 focused 断言；既有包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（`src/__tests__/` 多数派；子单元测试随子单元目录）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type D1 三件套 + 四重点组件登记的关键 D3/D4 项（使用 527 helper）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W3 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R2（fresh session）
- Verdict: pass（Round 1 issues → 2 项 Major 已修订：array-editor 基线改为真实行链/无 FieldFrame、upload-field 序号定性改为 data-testid 动态插值并重指 ul/li 真实缺口；Round 2 复核通过）
- Rounds: 2
- Findings addressed: ①array-editor/upload-field/variant-field 基线重写 ②Goals 与 Phase 2 改为真实缺口（:88/:89、:576/:585、:355）③combo→combo-renderer.tsx、Non-Goals 移除 diff-view（属 content 包）

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] 四重点组件整改/豁免全部落地且有 proof
- [ ] `dom-structure` 契约测试冻结
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 同步核对完成
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 待收口

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 见 Non-Blocking Follow-ups
