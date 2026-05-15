# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] `input.tsx` 持续吸纳多种表单控件实现，形成二次膨胀的职责混合点

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx`
- **证据片段**:
  ```ts
  // 同文件同时承载 text/email/password/select/textarea/checkbox/switch/radio-group/
  // checkbox-group/input-number，并包含选项渲染、a11y、source loading、stepper 等细节
  ```
- **严重程度**: P2
- **现状**: 同一文件同时承载多类独立控件实现、共享校验工厂、各控件可访问性与 source loading 细节，以及 renderer definitions 汇总。
- **风险**: 继续新增或改动某一种控件时，仍会把实现压力回灌到同一文件，放大回归面和阅读成本。
- **建议**: 按控件家族或 shared controller 与 leaf renderer 拆分，保留一个薄聚合层。
- **为什么值得现在做**: 这是典型 re-inflation 点，后续功能迭代还会继续放大成本。
- **误报排除**: 这不是单纯“大文件”；问题在于多个独立控件继续堆进同一文件，而非合理 orchestrator。
- **历史模式对应**: 对应仓库已发生过的大文件二次膨胀模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-02] `variant-field.tsx` 把 UI、值迁移、validation owner 协调和 child contract 注册揉进单文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`
- **证据片段**:
  ```ts
  // 同时包含 variant 匹配、detect action、切换迁移、scope/form/validation projection、
  // hidden child 通知、child contract 注册、selector UI、FieldFrame 包装、renderer definition
  ```
- **严重程度**: P2
- **现状**: UI 展示、值迁移、validation owner 协调被揉在一起，任何一个维度改动都会触发整文件联动。
- **风险**: 维护者必须同时理解渲染、owner 语义、切换策略和 child contract，局部修改容易引入跨职责回归。
- **建议**: 拆出 migration/owner controller 与展示层，renderer 文件只保留装配。
- **为什么值得现在做**: 该文件已经是 advanced field 的高变更热点，继续演进只会加剧耦合。
- **误报排除**: 这不是 widget renderer 合法拥有的局部样式或状态；这里混合的是多层 owner 语义与业务流程。
- **历史模式对应**: 对应复杂字段 renderer 将 UI 与 owner 逻辑混叠的高频重构模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-03] `array-field.tsx` 同时承担数组 owner、scope/form proxy 和列表 UI，边界过厚

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx`
- **证据片段**:
  ```ts
  // 同时处理 item identity、scalar/object 双模式、item scope/form proxy、
  // projected validation、runtime field registration、external error 发布、child contract、列表 UI
  ```
- **严重程度**: P2
- **现状**: 单文件同时处理数组值 owner 语义、validation 代理和列表 UI。
- **风险**: scalar 与 object 双模式进一步放大复杂度，后续只改一侧模式也会波及整个文件。
- **建议**: 把数组 owner/validation 协调与列表渲染分离，降低同文件的语义密度。
- **为什么值得现在做**: 当前文件已经处于高风险维护区，任何局部改动都需要跨层验证。
- **误报排除**: 这不是因为文件超过 500 行本身；是真实的职责混合与边界过厚。
- **历史模式对应**: 对应复合字段 owner 与 UI 壳层未分离的重构模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-04] `detail-view.tsx` 把 draft 生命周期、值适配、父 owner 提交和 surface UI 混在同一文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx`
- **证据片段**:
  ```ts
  // 同时承载 draft form 生命周期、transformIn/validate/transformOut、
  // commit patch/updates 语义、父 owner 校验收敛、surface UI
  ```
- **严重程度**: P2
- **现状**: 编辑流程控制器、值适配器和 UI 壳层三类职责叠加在同一文件。
- **风险**: 后续 detail 行为演进时容易继续回灌到该文件，增加验证和提交语义回归概率。
- **建议**: 拆出 detail commit/value-adaptation controller，renderer 文件保留界面装配。
- **为什么值得现在做**: 这是 detail 主路径核心文件，当前复杂度已直接影响缺陷诊断与局部修改成本。
- **误报排除**: 不是单纯“大组件”，而是多种 owner 生命周期逻辑与 UI 同居。
- **历史模式对应**: 对应 detail/edit flow 控制器与 renderer 壳层未分离的重构模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-05] `crud-renderer.tsx` 已超出“渲染器”职责，吸收了 owner-state 编排与子 schema 合成

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer.tsx`
- **证据片段**:
  ```ts
  // 同时处理 owner paths、query/pagination/sort/filter state bridge、$crud scope publication、
  // refresh action 组装、query form schema 合成、table 子 renderer props 合成、toolbar/footer UI
  ```
- **严重程度**: P2
- **现状**: 文件已不只是 CRUD 页面渲染，还承担子 schema 合成与 owner-state 编排。
- **风险**: 复合 renderer 的任何行为变化都会穿透同一文件多个职责区，维护成本持续抬高。
- **建议**: 把 owner-state / schema composition 提取到独立 controller 或 builder，renderer 保持视图装配。
- **为什么值得现在做**: CRUD 是高频业务壳层，边界越厚越难稳定演进。
- **误报排除**: 这不是合理 orchestrator 的单纯体量大；文件已明显跨出“rendering shell”边界。
- **历史模式对应**: 对应复合数据 renderer 向 owner 编排层膨胀的模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-06] `page-renderer.tsx` 同时管理 report core、spreadsheet bridge、host publication 和 shell UI，跨子系统编排过厚

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\page-renderer.tsx`
- **证据片段**:
  ```ts
  // 同时创建/管理 report core、spreadsheet core、两个 action provider、双向同步、
  // host scope、status publication、workbench shell/panel fallback
  ```
- **严重程度**: P2
- **现状**: 单文件把 report designer host、spreadsheet bridge 和页面 shell 全部吃进来。
- **风险**: 改 bridge、改 shell、改 host publication 都会落到同一文件，导致跨子系统回归联动。
- **建议**: 拆出 core/bridge wiring 与 shell renderer，降低 host page 文件的跨域密度。
- **为什么值得现在做**: 这是报告设计器宿主入口，边界不清会拖慢所有后续演进。
- **误报排除**: 问题不在跨包复用本身，而在单文件承载过多子系统编排责任。
- **历史模式对应**: 对应 designer host 页面同时承担 bridge 与 UI 外壳的边界膨胀模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-07] `flow-designer-renderers/src/index.tsx` 入口文件泄露编译/校验实现细节

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx`
- **证据片段**:
  ```ts
  // package root entry 内含 compileDesignerConfig、validateDesignerConfigToolbar、
  // lazy component wiring、definitions、deprecated alias
  ```
- **严重程度**: P2
- **现状**: package 根入口不是薄 barrel，而是同时承载 schema 编译、校验、lazy wiring 与 definitions。
- **风险**: 稳定导出面与内部实现细节绑死，后续入口演进或 facade 收口都要同时顾及实现逻辑。
- **建议**: 将编译/校验和 lazy wiring 下沉到独立模块，入口仅负责稳定 re-export。
- **为什么值得现在做**: 入口文件一旦变成实现承载点，后续发布面整理成本会持续升高。
- **误报排除**: 不是所有 index.ts 都要绝对零逻辑；本条针对的是根入口已明显承担实现职责。
- **历史模式对应**: 对应 package entry 泄露实现细节的公共面漂移模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 初审排除项

- `packages/flux-runtime/src/runtime-factory.ts`：与 owner doc 一致，属 runtime assembly 主层。
- `packages/flux-runtime/src/form-runtime.ts`：主要是 `FormRuntime` facade/assembly，已大量委托拆分模块。
- `packages/flux-runtime/src/form-runtime-owner.ts`：仍集中在 owner-local validation orchestration。
- `packages/flux-runtime/src/form-runtime-validation.ts`：仍是单一 validation runtime 流程边界。
- `packages/flux-runtime/src/async-data/reaction-runtime.ts`：仍是 reaction engine / registry 一体化实现。
- `packages/flux-runtime/src/import-stack.ts`：仍是 import frame lifecycle 的集中 owner。
- `packages/flux-runtime/src/form-store.ts`：虽大，但 owner 文档已明确当前归属。
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`：宿主型重控件，体量大但职责仍较一致。
- `packages/flow-designer-core/src/core.ts`：主要是 core facade，底层命令与历史/选择已外提。
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`：虽复杂，但仍围绕 action execution orchestration 单一边界。

## 维度复核结论

- [维度02-01]：降级为 P2。偏厚但仍基本落在基础输入家族聚合点边界内。
- [维度02-02]：降级为 P2。高复杂度实现成立，但当前 owner baseline 本就把这些职责放在 `variant-field` 主边界里。
- [维度02-03]：降级为 P2。主要是厚重而不是明确越界。
- [维度02-04]：降级为 P2。仍属 staged owner 流程主边界，现阶段不足以定为明确边界违背。
- [维度02-05]：驳回。与 CRUD 工作流壳层定位一致。
- [维度02-06]：驳回。与 `report-designer-page` 宿主集成边界一致。
- [维度02-07]：保留 (P2)。package root entry 承载实现逻辑，入口泄露成立。

## 最终保留项

| 编号  | 严重程度 | 文件                                             | 一句话摘要                             |
| ----- | -------- | ------------------------------------------------ | -------------------------------------- |
| 02-07 | P2       | `packages/flow-designer-renderers/src/index.tsx` | package 根入口仍内嵌编译和校验实现逻辑 |
