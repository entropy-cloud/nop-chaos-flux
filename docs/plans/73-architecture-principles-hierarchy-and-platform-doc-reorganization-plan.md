# 73 Architecture Principles Hierarchy And Platform Doc Reorganization Plan

> Plan Status: partially completed
> Last Reviewed: 2026-04-12
> Source: `docs/index.md`, `docs/architecture/README.md`, `docs/references/architecture-doc-status-matrix.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`, `docs/components/`, `docs/standardization.md`, plus live audit of current architecture/components/routing docs
> Related: `docs/plans/57-architecture-docs-grouping-and-gradual-migration-plan.md`, `docs/plans/10-docs-accuracy-and-structure-correction-plan.md`

## Purpose

本计划现在不再只是“建立 hierarchy baseline 和状态矩阵”。

它被提升为 `docs/architecture/` 文档体系的 owner plan，用于完成一次**彻底的文档重构**，把当前已经收口出来的 hierarchy、owner decision 和 platform-extension 定位，继续推进为一个可长期稳定维护的物理目录结构、概念边界和 owner baseline。

目标不是做一次 cosmetically tidy 的目录整理，而是建立未来 10 年仍然稳定的概念基础定义，使读者和 AI 在进入仓库时可以清楚区分：

- 哪些文档是纲领层
- 哪些文档是总规范层 / 高优先级 normative owner
- 哪些文档是 Flux 平台扩展架构
- 哪些文档是专题规则、组件设计、引用资料、历史材料
- 哪些路径只是 redirect/兼容过渡层，哪些路径才是长期 owner location

本计划现在明确承担以下结果面：

- 建立长期稳定的 architecture 物理目录结构
- 把 misplaced 文档真正迁移到正确 family，而不是只做矩阵标记
- 合并重复 owner 文档，消除双份 baseline
- 更新全仓关键 cross-links，使新的结构可以直接长期使用
- 为必要的 redirect/兼容层提供明确策略，但不让旧路径继续作为权威 owner 漫游存在

## Current Baseline

- 早先版本的 Plan 73 已经完成了第一阶段收口：
  - 重写了 `docs/architecture/README.md`，建立四层 hierarchy
  - 建立了 `docs/references/architecture-doc-status-matrix.md`
  - 明确了 `flux-design-principles.md` 与 `frontend-programming-model.md` 的层级关系
  - 明确了 `flow-designer` / `report-designer` / `complex-control-host-protocol.md` 的 platform-extension 地位
- 上述工作现在应被视为**当前 baseline**，而不是这份 owner plan 的终点。
- 当前 repo 仍然存在物理结构与 owner 结构不一致的问题：
  - `docs/architecture/condition-builder.md` 与 `docs/components/condition-builder/design.md` 双份并存
  - `docs/architecture/code-editor.md` 仍留在 architecture 顶层，但语义上更接近组件/复合控件设计
  - 大量 top-level `docs/architecture/*.md` 仍然是平铺结构，尚未按稳定概念树重组
  - `docs/components/` 下已经存在 `designer-page` / `report-designer-page` / `spreadsheet-page` 等组件设计文档，与 architecture family 的边界需要通过物理路径和 cross-link 一并定型
- 当前 `docs/references/architecture-doc-status-matrix.md` 已给出 role/owner 决策，但大部分决策还没有 physical move、merge、redirect、cross-link rewrite 落地。
- 如果现在停止，只会得到“逻辑上清楚、物理上仍然混杂”的中间状态，这不足以成为未来 10 年稳定的概念基础。

## Goals

- 将 Plan 73 从“hierarchy/index/matrix 计划”升级为 architecture 文档体系彻底重组的 master plan。
- 建立一个长期稳定的 architecture 物理目录结构，并把 active owner 文档放到与其概念层级一致的位置。
- 完成 `docs/architecture/`、`docs/components/`、`docs/references/` 之间的 owner 收口，不再长期容忍双份 owner 或 misplaced baseline。
- 对 `condition-builder.md`、`code-editor.md` 以及其他边界不清文档做真实迁移/合并，而不是仅停留在矩阵结论。
- 让 `flow-designer` / `report-designer` 文档族在物理结构、family README、cross-links 和 routing 上都稳定呈现为 platform-extension architecture。
- 对 architecture 文档按“纲领层 / 总规范层 / 平台扩展架构层 / 专题层”建立稳定的 reading path 与目录锚点。
- 为旧路径提供必要但最小化的 redirect 策略，避免一次性断链，同时避免旧位置继续被误当作 active owner。
- 完成关键 cross-link rewrite，使新结构成为仓库默认阅读路径，而不是附加说明层。
- 继续冻结 writing rule：architecture 只写 final-state/current-baseline design + current-design rationale，不写历史执行叙事。

## Non-Goals

- 不做非文档源码改动。
- 不为了“看起来整齐”而拆出没有稳定概念价值的新目录。
- 不重写每一篇 architecture 文档的全部技术内容；优先做 owner 收口、路径重组、重复合并、历史噪音清理和关键 cross-link rewrite。
- 不为了保留兼容而让旧路径长期与新路径并存为双权威 owner。
- 不把 platform-extension architecture 降级为普通组件文档或 specialized domain appendix。
- 不把组件目录扩成第二套 architecture 树；组件目录仍只承载组件/renderer 设计 owner。
- 不在本计划内对每个 family 做无限制风格润色；只做支撑长期结构稳定所必需的重写和迁移。

## Scope

### In Scope

- `docs/architecture/README.md`
- 全部顶层 `docs/architecture/*.md`
- `docs/architecture/flow-designer/`
- `docs/architecture/report-designer/`
- `docs/components/index.md`
- 与 architecture owner 冲突或重复的组件设计文档
- `docs/references/architecture-doc-status-matrix.md`
- `docs/index.md`
- `docs/standardization.md`
- 与本次 physical migration 直接相关的全仓关键 cross-links
- redirect notes / compatibility notes / migration breadcrumbs
- `docs/logs/2026/04-12.md`

### Out Of Scope

- 非文档源码改动
- 对所有历史日志、分析、讨论文档做全量 cross-link 修复
- 对 platform-extension family 内每一篇专题文档做全面技术重写
- 为了这次重组去发明新的概念层级，而不是收口已有概念

## Target Structure

目标不是机械地把所有文档各塞一个目录，而是建立稳定的长期路径语义。

当前建议目标树：

```text
docs/architecture/
  README.md                         # architecture hierarchy entry
  principles/
    flux-design-principles.md
  normative/
    frontend-programming-model.md
    flux-core.md
    flux-runtime-module-boundaries.md
    renderer-runtime.md
    action-algebra-formal-spec.md
    action-scope-and-imports.md
    api-data-source.md
    form-validation.md
    field-binding-and-renderer-contract.md
    field-metadata-slot-modeling.md
    scope-ownership-and-isolation.md
    styling-system.md
    template-instantiation-and-node-identity.md
  platform/
    complex-control-host-protocol.md
    flux-dsl-vm-extensibility.md
    flow-designer/
    report-designer/
  subsystems/
    action-graph-authoring.md
    action-interaction-state.md
    array-field.md
    component-resolution.md
    debugger-runtime.md
    dependency-tracking.md
    field-frame.md
    frontend-baseline.md
    object-field.md
    performance-design-requirements.md
    playground-experience.md
    renderer-markers-and-selectors.md
    schema-file-validator.md
    scoped-render-slots.md
    security-design-requirements.md
    surface-owner.md
    table-row-identity-and-scope-performance.md
    theme-compatibility.md
    value-adaptation-and-detail-field.md
    variant-field.md
```

组件 owner 方向：

- `docs/architecture/condition-builder.md` -> 合并到 `docs/components/condition-builder/design.md`
- `docs/architecture/code-editor.md` -> 新建或迁移到 `docs/components/code-editor/design.md`

约束：

- `flow-designer/` 与 `report-designer/` 保留为 architecture family，不迁入 `docs/components/`
- `designer-page` / `report-designer-page` / `spreadsheet-page` 继续保留组件设计文档，但 architecture family 仍拥有平台扩展层规则
- `docs/references/architecture-doc-status-matrix.md` 继续作为迁移与 owner 决策表，不替代 architecture 正文

## Execution Plan

### Phase 1 - Reopen Plan And Freeze The End-State Tree

Status: planned
Targets: `docs/plans/73-architecture-principles-hierarchy-and-platform-doc-reorganization-plan.md`, `docs/references/architecture-doc-status-matrix.md`

- [ ] 将既有“已完成的 hierarchy/index 收口”重写为本计划的 current baseline，而不是 closure 终点。
- [ ] 明确 physical reorganization 是 plan-owned work，而不是 successor debt。
- [ ] 冻结长期目标目录树与 owner family 边界。
- [ ] 在状态矩阵中补充 destination path / merge strategy / redirect strategy 字段或等价信息。

Exit Criteria:

- [ ] 本计划不再把自己描述为已完成的旧版收口计划。
- [ ] 目标目录树和 owner family 边界在文件中写清楚。
- [ ] `condition-builder.md` 和 `code-editor.md` 的 destination strategy 从“以后再说”提升为当前 plan-owned step。

### Phase 2 - Restructure Core Architecture Paths

Status: planned
Targets: top-level `docs/architecture/*.md`, `docs/architecture/README.md`, `docs/index.md`

- [ ] 在 `docs/architecture/` 下建立长期稳定的物理子目录。
- [ ] 把纲领层、总规范层、平台扩展架构层、专题层文档迁移到目标路径。
- [ ] 更新 `docs/architecture/README.md` 以匹配新的物理结构和阅读路径。
- [ ] 更新 `docs/index.md`，使全局 routing 指向新路径。
- [ ] 为需要保留短期兼容的旧路径写 redirect note 或等价过渡策略。

Exit Criteria:

- [ ] `docs/architecture/` 已形成清晰的长期物理结构，而不是继续以顶层平铺为主。
- [ ] 核心阅读路径全部指向新 owner 路径。
- [ ] 旧路径不再伪装成 active owner baseline。

### Phase 3 - Merge Or Relocate Misplaced Component-Level Docs

Status: planned
Targets: `docs/architecture/condition-builder.md`, `docs/components/condition-builder/design.md`, `docs/architecture/code-editor.md`, new/target component docs

- [ ] 将 `docs/architecture/condition-builder.md` 中仍需保留的 owner 内容并入 `docs/components/condition-builder/design.md`。
- [ ] 将原 `docs/architecture/condition-builder.md` 改为 redirect note，或在确认无保留价值后删除。
- [ ] 为 `code-editor` 建立组件级 owner 文档路径。
- [ ] 将 `docs/architecture/code-editor.md` 的组件级 owner 内容迁移到组件文档。
- [ ] 将原 `docs/architecture/code-editor.md` 改为 redirect note，或在确认无保留价值后删除。

Exit Criteria:

- [ ] `condition-builder` 不再存在 architecture/components 双 owner。
- [ ] `code-editor` 不再停留在 architecture 顶层作为长期 owner。
- [ ] 所有 redirect note 都明确指向新 owner 文档。

### Phase 4 - Reconcile Platform Architecture Versus Component Docs

Status: planned
Targets: `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`, `docs/components/designer-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`

- [ ] 明确 platform family 文档与 host-renderer 组件文档的 owner 边界。
- [ ] 清理重复描述，确保 platform family 负责平台扩展架构，component docs 负责单 renderer 设计。
- [ ] 更新 family README 和组件文档之间的 cross-links，形成稳定双向导航。

Exit Criteria:

- [ ] `flow-designer` / `report-designer` family 与 `designer-page` / `report-designer-page` / `spreadsheet-page` 组件文档不再角色重叠。
- [ ] 读者可通过路径直接判断“平台架构”与“组件设计”的区别。

### Phase 5 - Rewrite Cross-Links And Compatibility Notes

Status: planned
Targets: moved docs, owner indexes, key inbound references under `docs/`

- [ ] 修正 `docs/index.md`、`docs/architecture/README.md`、`docs/components/index.md`、`docs/standardization.md`、状态矩阵和相关 family README 的 cross-links。
- [ ] 修正关键 architecture/reference/components 文档中对旧路径的直接引用。
- [ ] 为无法立刻全量修正的旧引用提供明确 redirect note 策略。

Exit Criteria:

- [ ] 新路径已成为仓库主阅读路径。
- [ ] 关键 owner 文档之间不再互相引用旧 owner 路径。
- [ ] 未修复的旧链接如果仍存在，必须有明确 redirect 落点，不是 silent drift。

### Phase 6 - Cleanup Historical Noise And Finalize Stable Baseline

Status: planned
Targets: docs marked `active-with-cleanup`, this plan, `docs/logs/2026/04-12.md`

- [ ] 对高价值 architecture owner 文档做 history-noise cleanup，删掉不应继续留在 architecture 主文档中的执行叙事。
- [ ] 保留 current-design rationale，补足仍显得“只有结论、缺少边界解释”的 owner 文档。
- [ ] 更新状态矩阵，使其反映 reorganization 完成后的真实路径和角色。
- [ ] 做独立 closure audit，确认新的物理结构、owner path 和阅读路径已经真正收口。

Exit Criteria:

- [ ] architecture 主文档不再混入显著历史执行叙事。
- [ ] 新路径、新 owner、新 cross-links 和 redirect 策略已经稳定。
- [ ] closure audit 证明没有剩余 plan-owned structural reorganization work。

## Validation Checklist

- [ ] `docs/architecture/` 已从平铺主导结构转为稳定的概念型物理结构
- [ ] 纲领层、总规范层、平台扩展架构层、专题层拥有可长期使用的稳定路径
- [ ] `flow-designer` / `report-designer` family 在物理路径和 routing 上都稳定体现为 platform-extension architecture
- [ ] `condition-builder` 不再存在 architecture/components 双 owner
- [ ] `code-editor` 已迁出 architecture 顶层 owner 位置
- [ ] `docs/index.md` / `docs/architecture/README.md` / `docs/components/index.md` 已与新路径对齐
- [ ] `docs/references/architecture-doc-status-matrix.md` 已反映最终重构结果，而不是过渡期判断
- [ ] 旧路径如仍保留，均已降为 redirect/compatibility 层，而不是权威 owner
- [ ] architecture 文档体系继续只承载 final-state/current-baseline design 与 rationale
- [ ] `docs/logs/2026/04-12.md` 已记录本计划重开与新 scope
- [ ] 独立子 agent closure audit 已记录并确认无剩余 plan-owned 重组工作

## Risks And Rollback

- 最大风险是重构过程中只做路径移动，却没有真正消灭双 owner 和概念重叠。
- 第二风险是把 platform architecture 过度拆进 component docs，导致核心平台概念再次下沉。
- 第三风险是 cross-link rewrite 做得不彻底，使新结构表面成立、实际阅读路径仍靠旧链接维持。

Rollback guidance:

- 先完成 destination/merge 策略，再做物理迁移。
- 对每个 move 先保留明确 redirect note，再考虑彻底删除旧路径。
- 如果某个 family 在执行中发现 scope 过宽，可拆分执行 slice，但不得回退为“只做矩阵不做迁移”。

## Closure

Status Note: fill after the full reorganization lands and an independent closure audit confirms there is no remaining plan-owned structure/owner migration work.

Closure Audit Evidence:

- Reviewer / Agent: fill after independent closure audit.
- Evidence: fill with task ids, path-level verification, merge decisions, and daily-log references before marking the plan `completed`.

Follow-up:

- No successor plan should be created for core physical reorganization unless this owner plan becomes too wide to stay executable.
- If a specific family later needs purely local polish after the structure is stable, create a narrow cleanup plan owned by that family rather than reopening directory-wide structure debates.
