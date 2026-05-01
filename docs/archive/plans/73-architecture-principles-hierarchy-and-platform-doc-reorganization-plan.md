# 73 Architecture Principles Hierarchy And Platform Doc Reorganization Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/index.md`, `docs/architecture/README.md`, `docs/references/architecture-doc-status-matrix.md`, `docs/components/index.md`, `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`, plus live audit of current docs paths and independent structure reviews
> Related: `docs/plans/57-architecture-docs-grouping-and-gradual-migration-plan.md`, `docs/plans/10-docs-accuracy-and-structure-correction-plan.md`

## Purpose

本计划是 `docs/architecture/` 文档体系的 owner plan。

它的目标不是继续停留在“逻辑 hierarchy 已经写清楚”，而是把 architecture / components / references 三类文档的**长期 owner 边界、物理路径、redirect 策略和默认阅读路径**彻底收口成稳定基线。

这次计划的关键结论经过最后一轮三路独立评估后已经收敛：

- 应该彻底重组 owner 边界
- 但**不应该**为了表达 hierarchy 而把大多数 architecture 文档整体搬进 `principles/`、`normative/`、`subsystems/` 这类 role-bucket 目录
- 更稳定的终局是：
  - 保持 `docs/architecture/` 顶层 canonical path 尽量稳定
  - 保留真正有长期 family 语义的子目录，如 `flow-designer/`、`report-designer/`
  - 只对真正 misplaced 的 owner 文档做 physical move / merge / redirect
  - 让 hierarchy 主要由 `docs/architecture/README.md` 和 `docs/references/architecture-doc-status-matrix.md` 承载，而不是让目录名频繁承载 editorial precedence

换句话说，这次“彻底重构”的重点不是移动越多越好，而是把**真正会影响未来 10 年概念稳定性**的 owner 冲突、重复 baseline、错误 family 归属和默认阅读路径彻底修正。

## Current Baseline

- 早先版本的 Plan 73 已完成第一阶段收口：
  - `docs/architecture/README.md` 已建立四层 hierarchy
  - `docs/references/architecture-doc-status-matrix.md` 已建立 role/status/owner 判断基线
  - `flux-design-principles.md` 与 `frontend-programming-model.md` 的关系已明确
  - `flow-designer` / `report-designer` / `complex-control-host-protocol.md` 已明确为 platform-extension architecture
- 上述成果现在是本计划的 baseline，不是终点。
- 当前 repo 仍有几个实质性结构问题没有落地解决：
  - `docs/architecture/condition-builder.md` 与 `docs/components/condition-builder/design.md` 双 owner 并存
  - `docs/architecture/code-editor.md` 仍停留在 architecture 顶层 owner 位置，但内容语义更接近组件/复合控件设计
  - `docs/architecture/` 虽然逻辑 hierarchy 已清楚，但默认物理路径仍让部分读者把“根目录平铺”误读为“同层级同角色”
  - `docs/components/designer-page/design.md`、`docs/components/report-designer-page/design.md`、`docs/components/spreadsheet-page/design.md` 与 architecture platform family 之间仍需进一步收口 owner 边界和 cross-links
  - `docs/references/architecture-doc-status-matrix.md` 里已有多个 owner decision，但尚未全部变成 live path 事实

## Final Structure Decision

经过三路独立评估，最终结构决策如下：

### 1. 保留 `docs/architecture/` 的浅层 canonical root

保留多数 architecture owner 文档在 `docs/architecture/` 顶层的 canonical path，不引入大规模 `normative/`、`subsystems/`、`platform/` 目录迁移。

理由：

- `normative` / `focused subsystem` 更适合作为 role metadata，而不是稳定的物理路径语义
- 如果把 role 当目录名，未来 precedence 变化会导致 path churn
- 大规模路径迁移会制造过多 redirect、cross-link rewrite 和 AI 搜索噪音

### 2. 只保留真正稳定的 architecture family 子目录

保留并强化：

- `docs/architecture/flow-designer/`
- `docs/architecture/report-designer/`

这两个 family 已经具备长期稳定的概念边界，适合作为 architecture 子树。

### 3. 用 README + Status Matrix 表达 hierarchy，而不是靠目录名硬编码 role

- `docs/architecture/README.md` 继续承担 hierarchy、reading order、role legend
- `docs/references/architecture-doc-status-matrix.md` 继续承担 role/status/owner/redirect/merge decision

### 4. 物理 move 只针对真正 misplaced 的 owner 文档

当前明确需要真实迁移/合并的只有：

- `docs/architecture/condition-builder.md` -> 合并到 `docs/components/condition-builder/design.md`
- `docs/architecture/code-editor.md` -> 迁移到 `docs/components/code-editor/design.md`

### 5. Platform family 与 component docs 保持双层结构

- `flow-designer/`、`report-designer/` 继续留在 architecture，负责平台扩展架构
- `designer-page`、`report-designer-page`、`spreadsheet-page` 继续留在 components，负责单 renderer / host-shell 组件设计

## Independent Review Evidence

Final structure decision was checked by three fresh-session subagents:

- Long-term information architecture review: `ses_280255aa4ffeH4qX5Cr3ShjjrV`
- AI/reader navigation review: `ses_2802559c4ffe9hWA72njeZhKqL`
- Migration-risk / link-rewrite review: `ses_28025589dffeLvvIkrqZtYoBa0`

Consensus summary:

- Keep `flow-designer/` and `report-designer/` as real architecture families.
- Move truly misplaced docs (`condition-builder`, `code-editor`) into `docs/components/`.
- Do not do a repo-wide role-bucket path migration for most `docs/architecture/*.md` files.
- Let hierarchy live primarily in `README` + status matrix rather than a deep directory taxonomy.

## Goals

- 完成 architecture/components/references 的 owner 收口，不再长期容忍双 owner 或 misplaced baseline。
- 保持 `docs/architecture/` 的 canonical root 稳定，同时清楚表达 hierarchy、precedence 和 family 边界。
- 对真正 misplaced 的 owner 文档执行 physical move / merge / redirect，而不是只停留在状态矩阵。
- 让 `flow-designer` / `report-designer` 在物理路径、family README、routing、cross-links 上都稳定呈现为 platform-extension architecture。
- 让 `designer-page` / `report-designer-page` / `spreadsheet-page` 等组件文档与 platform family 的 owner 分工清楚。
- 修正关键 cross-links，使新结构成为默认阅读路径。
- 继续冻结 architecture writing rule：只写 final-state/current-baseline design 与 current-design rationale，不写执行叙事。

## Non-Goals

- 不做非文档源码改动。
- 不为了“看起来更分层”而把大多数 architecture 文档整体搬入 `principles/`、`normative/`、`subsystems/` 等 role-bucket 目录。
- 不把 `flow-designer` / `report-designer` 降级为 component docs 或 specialized appendix。
- 不把 `docs/components/` 扩成第二套 architecture tree。
- 不对所有历史日志、分析、讨论文档做全量 cross-link rewrite。
- 不对每篇 architecture 文档做与 owner 重构无关的全面技术重写。

## Scope

### In Scope

- `docs/architecture/README.md`
- 全部顶层 `docs/architecture/*.md`
- `docs/architecture/flow-designer/`
- `docs/architecture/report-designer/`
- `docs/components/index.md`
- `docs/components/condition-builder/design.md`
- `docs/components/designer-page/design.md`
- `docs/components/report-designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- new `docs/components/code-editor/design.md`
- `docs/references/architecture-doc-status-matrix.md`
- `docs/index.md`
- `docs/standardization.md`
- 与上述 move/merge/redirect 直接相关的关键 cross-links
- `docs/logs/2026/04-12.md`

### Out Of Scope

- 非文档源码改动
- 对所有历史文档做全量路径修补
- 对 `flow-designer/` 或 `report-designer/` family 中每篇专题文档做全面技术重写
- 为表达 hierarchy 而进行大规模 taxonomy-only 文件移动

## Target Structure

### Architecture Canonical Paths

```text
docs/architecture/
  README.md
  flux-design-principles.md
  frontend-programming-model.md
  flux-core.md
  flux-runtime-module-boundaries.md
  renderer-runtime.md
  action-algebra-formal-spec.md
  action-scope-and-imports.md
  action-graph-authoring.md
  action-interaction-state.md
  api-data-source.md
  form-validation.md
  field-binding-and-renderer-contract.md
  field-metadata-slot-modeling.md
  scoped-render-slots.md
  scope-ownership-and-isolation.md
  styling-system.md
  template-instantiation-and-node-identity.md
  complex-control-host-protocol.md
  flux-dsl-vm-extensibility.md
  ... other active top-level architecture docs
  flow-designer/
  report-designer/
```

### Component Owner Corrections

```text
docs/components/
  condition-builder/
    design.md                # owner after merge
  code-editor/
    design.md                # new owner doc
```

### Structural Rules

- `docs/architecture/` 保持 shallow canonical root；不要把大多数文件搬进 role-bucket 目录。
- `flow-designer/` 与 `report-designer/` 是 architecture family，而不是 component family。
- `condition-builder` 与 `code-editor` 作为 component-level owner，长期不再保留在 architecture 顶层。
- hierarchy 继续由 `docs/architecture/README.md` 和 `docs/references/architecture-doc-status-matrix.md` 表达。
- 若将来出现新的 architecture family，只有在满足“稳定 subject boundary + 多文档 family + 长期独立导航价值”时才新增目录。

## Execution Plan

### Phase 1 - Freeze Final End-State Structure

Status: completed
Targets: this plan, `docs/references/architecture-doc-status-matrix.md`

- [x] 用三路独立审阅重新评估 target tree，而不是沿用单一路径直觉。
- [x] 冻结“浅层 canonical root + stable family dirs + targeted owner moves”的终局结构。
- [x] 明确不采用 `normative/` / `subsystems/` 等大规模 role-bucket 迁移方案。
- [x] 明确 `condition-builder` 与 `code-editor` 是当前 plan-owned physical migration work。

Exit Criteria:

- [x] Plan 73 中已经写清最终结构决策，而不是留作开放问题。
- [x] 三路独立评估 evidence 已记录在计划中。
- [x] 终局结构不再依赖“大规模 taxonomy-only path migration”。

### Phase 2 - Merge And Relocate Misplaced Owner Docs

Status: completed
Targets: `docs/architecture/condition-builder.md`, `docs/components/condition-builder/design.md`, `docs/architecture/code-editor.md`, new `docs/components/code-editor/design.md`

- [x] 将 `docs/architecture/condition-builder.md` 的 owner 内容合并到 `docs/components/condition-builder/design.md`。
- [x] 为 `code-editor` 建立组件级 owner 文档 `docs/components/code-editor/design.md`。
- [x] 将 `docs/architecture/code-editor.md` 的组件级 owner 内容迁移到新的组件文档。
- [x] 对迁移后的旧路径补充 redirect note，或在确认无保留价值后删除。

Exit Criteria:

- [x] `condition-builder` 不再存在 architecture/components 双 owner。
- [x] `code-editor` 不再停留在 architecture 顶层作为长期 owner。
- [x] 若旧路径仍存在，它们只能作为 redirect/compatibility 层。

### Phase 3 - Reconcile Platform Families With Component Docs

Status: completed
Targets: `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`, `docs/components/designer-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/components/index.md`

- [x] 明确 platform family 文档与 host-renderer 组件文档的 owner 分工。
- [x] 清理重复叙述，使 architecture family 负责平台扩展架构，component docs 负责单 renderer 设计。
- [x] 更新 family README、component docs、`docs/components/index.md` 之间的双向 cross-links。

Exit Criteria:

- [x] `flow-designer` / `report-designer` family 与相关 component docs 不再角色重叠。
- [x] 读者可以通过路径直接分辨“平台扩展架构”与“组件设计”。

### Phase 4 - Rewrite Routing And Critical Cross-Links

Status: completed
Targets: `docs/index.md`, `docs/architecture/README.md`, `docs/references/architecture-doc-status-matrix.md`, `docs/standardization.md`, moved docs, family READMEs

- [x] 更新全局 routing，使其指向最终 owner 路径。
- [x] 修正关键 architecture/components/reference 文档中对旧 owner 路径的引用。
- [x] 把 redirect 策略写清楚，避免 silent drift。

Exit Criteria:

- [x] 新 owner 路径已成为默认阅读路径。
- [x] 关键索引与 owner 文档之间不再互相引用旧 owner 路径。
- [x] 仍保留的旧路径都明确写出 redirect 落点。

### Phase 5 - Cleanup Historical Noise And Finalize Stable Baseline

Status: completed
Targets: docs marked `active-with-cleanup`, this plan, `docs/logs/2026/04-12.md`

- [x] 对高价值 architecture owner 文档做 history-noise cleanup。
- [x] 补足 current-design rationale，避免只剩结论没有边界解释。
- [x] 更新 status matrix，反映最终 live path 与 owner 状态。
- [x] 做独立 closure audit，确认没有剩余 plan-owned structural reorganization work。

Exit Criteria:

- [x] architecture owner 文档不再混入显著执行叙事。
- [x] 新 owner 路径、family 边界、redirect 策略和阅读路径已稳定。
- [x] closure audit 明确说明无剩余 plan-owned 重组工作。

## Validation Checklist

- [x] `docs/architecture/` 继续作为稳定的 shallow canonical root，而不是 role-bucket taxonomy 根目录
- [x] `flow-designer` / `report-designer` 在物理路径和 routing 上稳定体现为 platform-extension architecture family
- [x] `condition-builder` 不再存在 architecture/components 双 owner
- [x] `code-editor` 已迁出 architecture 顶层 owner 位置
- [x] `docs/architecture/README.md` 与 `docs/references/architecture-doc-status-matrix.md` 已承担最终 hierarchy + owner baseline
- [x] `docs/index.md` / `docs/components/index.md` / `docs/standardization.md` 已与最终路径对齐
- [x] 旧路径如仍保留，均已降为 redirect/compatibility 层，而不是权威 owner
- [x] architecture 文档体系继续只承载 final-state/current-baseline design 与 rationale
- [x] `docs/logs/2026/04-12.md` 已记录本轮最终结构决策
- [x] 独立子 agent closure audit 已记录并确认无剩余 plan-owned 重组工作

## Risks And Rollback

- 最大风险是为了“彻底重组”而做大量 taxonomy-only 文件移动，结果只增加路径 churn，却没有减少 owner 冲突。
- 第二风险是把 platform-extension architecture 误拆进 component docs，导致核心平台概念再次下沉。
- 第三风险是只移动文件、不重写关键 routing/cross-links，导致新结构名义成立、默认阅读路径仍依赖旧链接。

Rollback guidance:

- 优先执行真正的 owner move/merge，再做次级清理。
- 对每个被迁移的旧路径，优先保留清晰 redirect note，再决定是否删除。
- 如果执行中发现某个 family 的文档正文需要局部深修，可拆出窄清理 slice，但不得回退为“只做矩阵不做迁移”。

## Closure

Status Note: Completed after owner-path migration, platform-family/component-boundary reconciliation, critical routing rewrite, selected history-noise cleanup, and closure audits confirmed that no plan-owned structural reorganization work remains.

Closure Audit Evidence:

- Reviewer / Agent: independent subagents `ses_28006aa1affeofVLK5uld3JFjv`, `ses_28006aa0fffeUPLauSUXi3jMBm`, `ses_28006a9bdffeRWwritA7814kC5`
- Evidence: structure audit confirmed no remaining high-priority structural gaps; quality audit confirmed no high-priority wording contradictions and only medium/low cleanup opportunities; routing audit confirmed no high-priority stale-owner routing issues remain. Supporting execution notes are recorded in `docs/logs/2026/04-12.md`.

Follow-up:

- Only create successor plans for narrow family-level cleanup after this owner plan finishes the core structure/owner reorganization.
