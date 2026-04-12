# 78 AMIS Component Doc Coverage And Baseline Matrix Plan

> Plan Status: planned
> Last Reviewed: 2026-04-12
> Source: `docs/amis-types/`, `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/components-audit.md`, `docs/logs/2026/04-12.md`
> Related: `docs/components/amis-baseline-matrix.md`, `docs/components/crud/design.md`

## Purpose

这份计划用于把 AMIS 组件能力基线和 `docs/components/` 的 Flux 组件 owner 文档体系真正接起来。

这是一份单一 owner 计划，目标是一次性把“需要迁移到 Flux 文档体系的 AMIS 组件”收口成完整可导航的 `docs/components/` 文档集合，而不是只补几个高优先级样例后再把剩余范围留成隐含 debt。

目标不是复制 AMIS 全量 React 实现细节，而是先做清晰筛选：

- 去掉重复、废弃、低价值、依赖过重、或已被 Flux 既有组件/架构吸收的 AMIS type
- 明确保留并继续演进的 Flux 正式组件清单
- 为保留组件全部建立 `docs/components/<type>/design.md` + `example.json`
- 形成一份长期维护的 AMIS -> Flux 基线映射矩阵，避免再出现 `crud` 这种核心组件因为流程缺口而缺席文档体系
- 计划执行完成后的目标结果是：
- `docs/components/` 下拥有一组对 retained 组件完整覆盖的 owner 文档目录
- `docs/components/amis-baseline-matrix.md` 作为额外的总对齐文档，按分组解释全部组件的定位、AMIS 对应关系、保留/废弃决策与实现波次

## Current Baseline

- `docs/components/` 当前已经拥有一批高质量单组件 owner 文档，但它是围绕“已实现 renderer + 部分 target contract + Flux 领域组件”逐步沉淀出来的，不是从 `docs/amis-types/` 做过完整差集后的结果。
- `docs/components/components-audit.md` 直到 2026-04-12 才补充了这条关键结论：此前审计只能检查“已有目录是否完整”，不能发现“某个重要组件根本没建目录”的问题。
- `crud` 已在 2026-04-12 补齐首个 dedicated component doc，但 `cards`、`pagination`、`service`、`alert`、`input-number`、日期时间族、上传族、rich-text、部分 advanced form/data 组件仍然没有进入正式 owner 文档体系。
- 当前仓库还缺一份稳定的“AMIS 原 type -> Flux 是否保留 -> 若不保留由谁承接 -> 对应 owner doc 路径 -> 当前状态”的总矩阵。

## Goals

- 建立一份可长期维护的 AMIS 组件基线矩阵，作为 `docs/components/` 的覆盖面总表。
- 明确哪些 AMIS 组件会被保留为 Flux 正式组件，哪些只做语义承接不保留同名 type，哪些明确废弃或不进入当前文档任务。
- 将保留组件全部纳入 `docs/components/` owner 文档体系，并补齐 `design.md` / `example.json`。
- 让 `docs/components/index.md`、`roadmap.md`、`examples.manifest.json` 和相关审计文档都能反映这份基线，而不是继续依赖隐式记忆。
- 计划关闭时，`docs/components/` 必须已经形成“retained AMIS component families 全覆盖 + grouped alignment doc 全覆盖”的完备文档集。

## Non-Goals

- 不要求在本计划中实现全部 retained 组件的 runtime 代码。
- 不要求保留 AMIS 的全部旧命名、旧字段或历史兼容 type。
- 不要求把重依赖、宿主强耦合、低价值的 AMIS 长尾组件强行塞进 Flux 正式 renderer 列表。
- 不把 `docs/components/` 变成 AMIS 属性表翻译仓库。
- 不允许把仍属于 retained 范围的组件文档缺口留给“未命名的未来工作”；如果 retained 范围过大，只能在本计划中显式列完并持续执行，直到 owner docs 齐备。

## Scope

### In Scope

- 新增并维护 `docs/components/amis-baseline-matrix.md`
- 给 retained AMIS component family 建立或补齐 `docs/components/<type>/design.md` 与 `example.json`
- 明确 dropped / merged / renamed / code-editor-replaced 组件清单
- 更新 `docs/components/index.md`、`roadmap.md`、`examples.manifest.json`、`docs/index.md` 的路由与说明
- 在 daily log 中持续记录文档编写任务的推进
- 按 family 分组，给全部 retained 组件建立可导航 owner 文档，不遗漏任何一个 retained 项

### Out Of Scope

- renderer runtime 实现代码，除非某个文档任务顺手补最小 schema/export 对齐
- playground 示例大规模补齐
- AMIS 所有细枝末节属性的一次性字段级兼容整理
- 被 `amis-baseline-matrix.md` 明确标记为 `notRetained` 的组件目录创建工作

## Execution Plan

### Phase 1 - Baseline Matrix And Retention Policy

Status: planned
Targets: `docs/components/amis-baseline-matrix.md`, `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/components-audit.md`

- [ ] 从 `docs/amis-types/` 抽取当前 AMIS component/type 基线，并去重整理出“正式考虑对象”
- [ ] 明确 retained / renamed / merged / dropped / deferred 分类规则
- [ ] 在 `docs/components/amis-baseline-matrix.md` 中分组列出每个 retained Flux 组件的定位、AMIS 对应关系、当前状态与建议实现波次
- [ ] 单独列出 dropped AMIS 组件及其废弃原因，包括 duplicate alias、low-value、heavy-dependency、code-editor-replaced、composition-replaced 等分类

Exit Criteria:

- [ ] 仓库里存在一个可直接阅读的 AMIS -> Flux 基线矩阵 owner 文档
- [ ] 文档中已明确写清哪些 AMIS type 不进入当前正式组件文档任务，以及为什么

### Phase 2 - High-Value Missing Common Component Docs

Status: planned
Targets: `docs/components/cards/`, `docs/components/pagination/`, `docs/components/service/`, `docs/components/alert/`, `docs/components/input-number/`, `docs/components/date*/`, `docs/components/time*/`

- [ ] 为当前高频缺口组件建立目录、`design.md` 与 `example.json`
- [ ] 优先补齐 `cards`、`pagination`、`service`、`alert`、`input-number`
- [ ] 为日期时间 family 决定正式 Flux type 命名和拆分边界，再补首轮 owner 文档
- [ ] 更新 `docs/components/index.md` 与 `examples.manifest.json`

Exit Criteria:

- [ ] 高价值基础缺口已全部进入 `docs/components/` owner 体系
- [ ] 每个新目录至少包含 `design.md` 与 `example.json`

### Phase 3 - Remaining Retained Common Component Docs

Status: planned
Targets: `docs/components/collapse/`, `docs/components/grid/`, `docs/components/mapping/`, `docs/components/status/`, `docs/components/button-group/`, `docs/components/dropdown-button/`, `docs/components/input-month/`, `docs/components/input-quarter/`, `docs/components/input-year/`, `docs/components/input-file/`, `docs/components/input-image/`, `docs/components/editor/`

- [ ] 为 Wave 3 retained common components 建立目录、`design.md` 与 `example.json`
- [ ] 明确 rich-text `editor` 与 `code-editor` 的边界，避免重复文档面
- [ ] 让 `docs/components/index.md` 与 `examples.manifest.json` 能导航到全部新增目录

Exit Criteria:

- [ ] 所有 Wave 3 retained common components 均已进入 owner 文档体系
- [ ] 上传族、rich-text、布局/反馈补充族已完成 owner contract 文档化

### Phase 4 - Advanced Form And Media Families

Status: planned
Targets: `docs/components/input-file/`, `docs/components/input-image/`, `docs/components/editor/`, `docs/components/button-group/`, `docs/components/dropdown-button/`, `docs/components/collapse/`, `docs/components/grid/`, `docs/components/mapping/`, `docs/components/status/`, `docs/components/audio/`, `docs/components/video/`, `docs/components/carousel/`, `docs/components/qrcode/`, `docs/components/transfer/`, `docs/components/picker/`, `docs/components/input-table/`, `docs/components/combo/`

- [ ] 为剩余 retained advanced/media components 建立目录、`design.md` 与 `example.json`
- [ ] 对 advanced form family 先确定 Flux 边界和命名，再补文档，避免直接照搬 AMIS 历史字段面
- [ ] 对 rich-text family 明确与 `code-editor` 的边界，不把两者混为一类

Exit Criteria:

- [ ] 所有剩余 retained advanced/media components 均已进入 owner 文档体系
- [ ] `code-editor` 替代范围与 non-code-editor rich-text range 已清楚区分

### Phase 5 - Closure Audit And Index Convergence

Status: planned
Targets: `docs/components/index.md`, `docs/components/roadmap.md`, `docs/components/examples.manifest.json`, `docs/index.md`, `docs/logs/`

- [ ] 重新核对 retained matrix 与实际组件目录是否一致
- [ ] 确认 `roadmap.md`、`index.md`、`manifest`、daily log 均已同步
- [ ] 由独立审阅 pass 检查是否还存在“重要 retained component 未建目录”的漏项
- [ ] 核对 `docs/components/amis-baseline-matrix.md` 是否已经覆盖全部 retained 与 notRetained 决策

Exit Criteria:

- [ ] retained component 清单与实际组件目录一致
- [ ] 不再存在像 `crud` 这样因流程缺口而漏掉 owner doc 的高价值组件
- [ ] `docs/components/` 已形成 retained 范围内完备的 owner 文档集合
- [ ] `docs/components/amis-baseline-matrix.md` 已形成 grouped alignment doc，能解释全部组件的定位、来源、分组、波次与废弃清单

## Validation Checklist

- [ ] `docs/components/amis-baseline-matrix.md` 已落地并成为长期入口
- [ ] retained / dropped / renamed / merged 分类规则已写清
- [ ] retained components 均有 `design.md` 与 `example.json`
- [ ] `docs/components/index.md`、`roadmap.md`、`examples.manifest.json`、`docs/index.md` 已同步
- [ ] `docs/components/amis-baseline-matrix.md` 已覆盖所有 retained components 和所有 notRetained components 的去向说明
- [ ] `docs/components/` 已达到 retained 范围内的完备覆盖，而不是只有部分高优先级样例
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Documentation Follow-Up

- 在 Phase 1 完成后，后续所有新增组件文档都应先更新基线矩阵，再补单组件 owner 文档，防止再次只补目录不补总表。

## Closure

Status Note: 未开始执行。计划关闭前，必须确认 retained 组件目录已经全部齐备，`docs/components/amis-baseline-matrix.md` 已完整覆盖全部组件分组与废弃决策，并完成一次独立 closure audit。

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- no remaining plan-owned work once retained component docs and grouped alignment doc are complete
