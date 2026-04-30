# Renderer Package Splitting Strategy

## Purpose

本文档定义 `docs/components/` 下全部 92 个 retained canonical 组件在实现时的 **包归属、拆分边界、依赖方向和渐进迁移路线**。

它回答以下问题：

1. 每个组件实现后应放在哪个 package？
2. 当前三个 renderer 包是否需要继续拆分？
3. 新增 package 的边界判据是什么？
4. 拆分后的依赖拓扑如何保证无环？

本文件不是组件设计契约。组件设计契约仍由 `docs/components/<type>/design.md` 负责。

本文件不是 AMIS 迁移矩阵。迁移矩阵仍由 `docs/components/amis-baseline-matrix.md` 负责。

---

## 1. 设计原则

### 1.1 按职责分包，不按数量均分

分包的核心判据是组件的 **运行期职责**，不是组件个数。具体而言：

| 职责轴                         | 判据                                            | 示例                                         |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------- |
| 是否参与 value/validation 通道 | 参与 → form family；不参与 → basic/content/data | `input-text` vs `text`                       |
| 是否拥有子 scope 或嵌套表单    | 拥有 → form-advanced；不拥有 → form-core        | `combo` vs `input-number`                    |
| 是否以数据驱动为主             | 是 → data family；否 → 其他                     | `table` vs `container`                       |
| 是否有重量级外部依赖           | 有 → 独立或最小化包                             | `echarts` → data, `codemirror` → code-editor |
| 是否是领域宿主集成             | 是 → 独立 domain 包                             | `designer-*`, `report-*`                     |

### 1.2 单包合理上限

| 指标                 | 建议上限        | 说明                                                   |
| -------------------- | --------------- | ------------------------------------------------------ |
| 源码行数（不含测试） | ~5,000 行       | 超过后应考虑拆分                                       |
| 源码行数（含测试）   | ~10,000 行      | 硬上限，超过后必须拆分                                 |
| 注册 renderer 数     | ~20 个          | 超过后应审视职责是否混杂                               |
| 子系统模块数         | ~5 个独立子系统 | 如 condition-builder、variant-field 等各自算一个子系统 |

当前实际数据：

| 包                     | 源码行数（含测试）     | 注册 renderer 数                                                  | 子系统数                                                                                         |
| ---------------------- | ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `flux-renderers-basic` | ~1,800（实际 1,791）   | 16（含 `scope-debug` dev-only 工具 renderer）                     | 1（结构循环）                                                                                    |
| `flux-renderers-form`  | ~15,800（实际 15,847） | 21（含 detail-field、detail-view、variant-field 等注册 renderer） | 6（condition-builder、variant-field、detail-view、array-field、composite-field、projected-form） |
| `flux-renderers-data`  | ~2,400（实际 2,380）   | 4                                                                 | 2（table 子系统、chart）                                                                         |

`flux-renderers-form` 已超过硬上限，是拆分的第一优先级。

说明：`flux-renderers-basic` 中还有 `scope-debug`（69 行），它是 dev-only 工具 renderer，不属于 92 个 canonical 组件，无 design doc。拆分后留在 basic，不在归属表中列出。

### 1.3 依赖方向约束

所有 renderer 包遵循统一的层级依赖方向：

```
flux-core → flux-formula → flux-runtime → flux-react → renderer-*
                                                           ├─ flux-renderers-basic
                                                           ├─ flux-renderers-content
                                                           ├─ flux-renderers-layout
                                                           ├─ flux-renderers-form → flux-renderers-form-advanced
                                                           ├─ flux-renderers-data
                                                           ├─ flux-code-editor
                                                           └─ domain-specific-*
```

**约束规则**：

1. **禁止横向依赖**：renderer 包之间不允许同级依赖（content ↔ layout、layout ↔ data 等）。
2. **允许下游依赖**：高层级 renderer 包可以依赖低层级 renderer 包。当前允许的有：
   - `form` → `basic`（form 渲染器引用 basic 的 schema 定义和类型）
   - `form-advanced` → `form`（复合字段需要 form owner 类型和 field-utils）
   - `data` → `basic`（crud lowering 引用 basic 的 dialog schema）
3. **禁止反向依赖**：低层级包不能 import 高层级包（basic 不能 import form，form 不能 import form-advanced）。
4. **编译期 lowering 例外**：如果组件 A 通过 schema 编译期 lowering 拆解为对组件 B 的组合引用（如 `crud` lowering 为 `form` + `table` + `dialog`），这种引用是 schema 级别的，不等于运行时 import，不构成依赖。

如果运行时逻辑需要跨包共享，正确做法是：

1. 把共享逻辑下沉到 `flux-runtime` 或 `flux-react`（优先）。
2. 或在 form 中暴露类型和工具函数供 form-advanced import（当前做法，见 §4 依赖矩阵）。
3. 不要为了规避依赖方向而复制代码。

### 1.4 领域包保持独立

已有的领域包不并入通用 renderer 体系：

| 领域包                                               | 职责                                 |
| ---------------------------------------------------- | ------------------------------------ |
| `flow-designer-core` + `flow-designer-renderers`     | 流程设计器                           |
| `report-designer-core` + `report-designer-renderers` | 报表设计器                           |
| `spreadsheet-core` + `spreadsheet-renderers`         | 电子表格                             |
| `word-editor-core` + `word-editor-renderers`         | 文档编辑器                           |
| `nop-debugger`                                       | 调试面板                             |
| `flux-code-editor`                                   | 代码编辑器（重量级 CodeMirror 依赖） |

---

## 2. 最终包结构

### 2.1 总览

```
packages/
├── flux-renderers-basic/          # 结构节点 + 表面 owner + 基础动作/展示
├── flux-renderers-content/        # 纯内容展示与反馈（新包）
├── flux-renderers-layout/         # 高级布局与流程容器（新包）
├── flux-renderers-form/           # 表单 owner + 核心表单字段
├── flux-renderers-form-advanced/  # 复合/高级表单字段（新包，从 form 拆出）
├── flux-renderers-data/           # 数据展示与复合数据工作流
├── flux-code-editor/              # 代码编辑器（不变）
├── flow-designer-*/               # 不变
├── report-designer-*/             # 不变
├── spreadsheet-*/                 # 不变
├── word-editor-*/                 # 不变
└── nop-debugger/                  # 不变
```

### 2.2 `@nop-chaos/flux-renderers-basic` — 结构与基础

**职责**：无 UI 结构节点、页面级 owner、表面 owner（dialog/drawer）、基础动作触发器、最基础的展示单元。

**不变原则**：这个包不再膨胀。新组件如果属于"内容展示"或"高级布局"，应放入对应新包。

| 组件               | 类型       | 状态    | 说明           |
| ------------------ | ---------- | ------- | -------------- |
| `fragment`         | 结构节点   | runtime | 无 UI 分组     |
| `loop`             | 结构节点   | runtime | 重复结构       |
| `recurse`          | 结构节点   | runtime | 递归结构       |
| `page`             | 页面 owner | runtime | 页面壳         |
| `container`        | 容器       | runtime | 通用容器       |
| `flex`             | 容器       | runtime | 弹性布局       |
| `tabs`             | 交互容器   | runtime | 选项卡         |
| `dialog`           | 表面 owner | runtime | 模态对话框     |
| `drawer`           | 表面 owner | runtime | 侧抽屉         |
| `dynamic-renderer` | 逻辑节点   | runtime | 动态渲染切换   |
| `reaction`         | 逻辑节点   | runtime | 声明式副作用   |
| `text`             | 展示       | runtime | 纯文本         |
| `button`           | 动作       | runtime | 通用动作触发器 |
| `icon`             | 展示       | runtime | 图标           |
| `badge`            | 展示       | runtime | 徽标           |

**预估规模**：~1,800 行（保持不变）。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `ui`, `lucide-react`。

### 2.3 `@nop-chaos/flux-renderers-content` — 内容展示与反馈（新包）

**职责**：只读展示组件、反馈组件、媒体组件。这些组件 **不参与表单 value/validation 通道**，不含子 scope，不含重量级交互状态机。

**包名**：`@nop-chaos/flux-renderers-content`

**分包判据**：组件是纯展示（只读渲染）或轻量反馈（alert），且与 basic 中的结构节点/表面 owner 职责不同。

| 组件        | 类型      | 状态           | wave | 说明          |
| ----------- | --------- | -------------- | ---- | ------------- |
| `separator` | 展示      | targetContract | 1    | 分隔线        |
| `card`      | 容器      | targetContract | 1    | 单卡片        |
| `link`      | 动作/展示 | targetContract | 1    | 链接          |
| `image`     | 展示      | targetContract | 1    | 图片          |
| `progress`  | 展示      | targetContract | 1    | 进度条        |
| `spinner`   | 展示      | targetContract | 1    | 加载指示      |
| `empty`     | 展示      | targetContract | 1    | 空态          |
| `json-view` | 展示      | targetContract | 1    | JSON 展示     |
| `markdown`  | 展示      | targetContract | 1    | Markdown 渲染 |
| `html`      | 展示      | targetContract | 1    | HTML 渲染     |
| `alert`     | 反馈      | targetContract | 2    | 内联提示      |
| `cards`     | 集合展示  | targetContract | 2    | 卡片集合      |
| `mapping`   | 展示      | targetContract | 3    | 值映射展示    |
| `status`    | 展示      | targetContract | 3    | 业务状态展示  |
| `audio`     | 媒体      | targetContract | 4    | 音频          |
| `video`     | 媒体      | targetContract | 4    | 视频          |
| `carousel`  | 媒体      | targetContract | 4    | 轮播          |
| `qrcode`    | 展示      | targetContract | 4    | 二维码        |

**预估规模**：~4,000–6,000 行。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `ui`, `lucide-react`。可选依赖：`qrcode` 库（仅 `qrcode` 渲染器需要）。

**内部结构建议**：

```
src/
├── index.tsx
├── schemas.ts
├── separator.tsx
├── card.tsx
├── cards.tsx
├── link.tsx
├── image.tsx
├── progress.tsx
├── spinner.tsx
├── empty.tsx
├── json-view.tsx
├── markdown.tsx
├── html.tsx
├── alert.tsx
├── mapping.tsx
├── status.tsx
├── media/
│   ├── audio.tsx
│   ├── video.tsx
│   └── carousel.tsx
├── qrcode.tsx
└── __tests__/
```

### 2.4 `@nop-chaos/flux-renderers-layout` — 高级布局与流程容器（新包）

**职责**：需要特定布局逻辑（grid、折叠、步骤编排、多步工作流）的容器组件，以及动作组合类组件。

**包名**：`@nop-chaos/flux-renderers-layout`

**分包判据**：组件的核心职责是 **布局编排或流程控制**，而非纯展示或表单字段。

| 组件              | 类型     | 状态           | wave | 说明          |
| ----------------- | -------- | -------------- | ---- | ------------- |
| `grid`            | 布局容器 | targetContract | 3    | CSS Grid 布局 |
| `collapse`        | 交互容器 | targetContract | 3    | 折叠面板      |
| `steps`           | 流程展示 | targetContract | 4    | 步骤条        |
| `timeline`        | 流程展示 | targetContract | 4    | 时间线        |
| `wizard`          | 流程容器 | targetContract | 2    | 多步向导      |
| `button-group`    | 动作组合 | targetContract | 3    | 按钮组        |
| `dropdown-button` | 动作组合 | targetContract | 3    | 下拉按钮      |

**预估规模**：~2,000–3,000 行。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `ui`, `lucide-react`。不依赖 `flux-renderers-basic`（layout 组件的 schema 独立定义，不需要 lowering 到 basic 组件）。

**设计说明**：

- `wizard` 的多步流程编排本质是布局 + 状态控制（步骤索引管理、前进/后退导航），不是表单能力本身。Wizard 内部的每一步通过 `body` region 承接任意 schema（包括 `form`），但它自身不参与 value/validation 通道。这种"编排容器"语义与 `tabs`（也管理子面板切换）属于同一族，放在 layout/basic 的交互容器族中是合理的。
- `button-group` 和 `dropdown-button` 是 `button` 的组合变体，放在 layout 比 basic 更合适（basic 只保留原子级组件）。
- `steps` 和 `timeline` 虽然外观偏展示，但核心是"流程状态编排"，与 layout 的交互容器族更近。
- `cards` 归入 content 而非 data，因为 `cards` 是纯模板渲染（从外部 scope 获取数据，逐项渲染卡片），不管理数据获取/分页/排序。相比之下，`list` 归 data 是因为它是有内置分页/排序的数据集合 owner。

### 2.5 `@nop-chaos/flux-renderers-form` — 表单核心字段（拆分后）

**职责**：表单 owner（`form`）+ 参与 value/validation 通道的 **原子级** 字段组件。原子级字段指：直接映射到一个 `@nop-chaos/ui` primitive、无嵌套子 scope、无内部复杂状态机的字段。

**拆分后保留的组件**：

| 组件             | 类型  | 状态           | 说明       |
| ---------------- | ----- | -------------- | ---------- |
| `form`           | owner | runtime        | 表单 owner |
| `input-text`     | 字段  | runtime        | 文本输入   |
| `input-email`    | 字段  | runtime        | 邮箱输入   |
| `input-password` | 字段  | runtime        | 密码输入   |
| `textarea`       | 字段  | runtime        | 多行文本   |
| `input-number`   | 字段  | targetContract | 数字输入   |
| `select`         | 字段  | runtime        | 下拉选择   |
| `checkbox`       | 字段  | runtime        | 复选框     |
| `radio-group`    | 字段  | runtime        | 单选组     |
| `checkbox-group` | 字段  | runtime        | 复选组     |
| `switch`         | 字段  | runtime        | 开关       |
| `input-date`     | 字段  | targetContract | 日期       |
| `input-datetime` | 字段  | targetContract | 日期时间   |
| `input-time`     | 字段  | targetContract | 时间       |
| `date-range`     | 字段  | targetContract | 日期范围   |
| `input-month`    | 字段  | targetContract | 月份       |
| `input-quarter`  | 字段  | targetContract | 季度       |
| `input-year`     | 字段  | targetContract | 年份       |

**拆分后保留的内部模块**：

| 模块                  | 职责                                              | 实际行数 | 说明                                                                         |
| --------------------- | ------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `field-utils.tsx`     | 字段渲染工具函数                                  | ~320     | 留在 form，也供 form-advanced 引用                                           |
| `renderers/form.tsx`  | form owner 渲染器                                 | ~354     |                                                                              |
| `renderers/input.tsx` | 通用 input 基础渲染器                             | ~357     |                                                                              |
| `renderers/shared/`   | 字段共享 UI（label, error, help）                 | ~85      | **必须留在 form**：基础字段渲染依赖此模块，迁到 form-advanced 会造成反向依赖 |
| `schemas.ts`          | schema 定义                                       | ~100     |                                                                              |
| 日期字段族            | input-date/datetime/time/range/month/quarter/year | ~600     | 新实现                                                                       |
| 测试文件              | form 核心测试                                     | ~1,500   | 保留与 form owner 和原子字段相关的测试                                       |

**预估总规模**：~3,500–4,500 行（含测试），远在合理上限内。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `flux-renderers-basic`, `ui`, `lucide-react`。可选：日期库（如 `date-fns`，仅日期字段族需要）。

**关于 detail-field / projected-form 的归属决策**：

detail-field、detail-surface、projected-form-runtime、projected-scope、value-adaptation-helper 这些模块 **整体迁入 form-advanced**，因为它们是 detail-view 子系统的一部分。detail-view 是完整子系统（~1,970 行），如果只迁 detail-view.tsx 而把 detail-field 留在 form，会破坏子系统的内聚性。因此 §2.6 列出的迁移清单包含这些模块。

### 2.6 `@nop-chaos/flux-renderers-form-advanced` — 高级复合字段（新包，从 form 拆出）

**职责**：参与 value/validation 通道 **且** 拥有嵌套子 scope、内部复杂状态机、或重量级交互逻辑的复合字段组件。

**包名**：`@nop-chaos/flux-renderers-form-advanced`

**分包判据**：组件满足以下至少一项：

- 内部有独立子系统（如 condition-builder 有完整的 operators/i18n/types 体系）
- 管理嵌套子 scope（如 array-field 管理数组项 scope）
- 有复杂的字段类型判定和运行时分派逻辑（如 variant-field）
- 需要外部依赖（如 `@dnd-kit` 用于拖拽排序）

**从 `flux-renderers-form` 迁出的组件和模块**：

| 组件/模块                                          | 类型   | 实际行数 | 说明                                |
| -------------------------------------------------- | ------ | -------- | ----------------------------------- |
| `condition-builder/`                               | 子系统 | ~2,590   | 条件编辑器完整子系统                |
| `variant-field*`                                   | 子系统 | ~1,400   | 变体字段检测/匹配/运行时/变换       |
| `detail-view*`, `detail-field*`, `detail-surface*` | 子系统 | ~1,970   | 详情视图 owner、detail 字段和展示面 |
| `projected-form-runtime.ts`, `projected-scope.ts`  | 子系统 | ~200     | 投影表单运行时（detail-view 依赖）  |
| `array-field*`                                     | 子系统 | ~1,000   | 数组字段运行时和渲染                |
| `object-field*`                                    | 子系统 | ~500     | 对象字段                            |
| `composite-item-id.ts`, `composite-schemas.ts`     | 工具   | ~120     | 复合字段 schemas 和 item-id 工具    |
| `value-adaptation-helper.ts`                       | 工具   | ~170     | 值适配工具（detail-view 依赖）      |
| `array-editor`                                     | 组件   | ~320     | 数组编辑器（含拖拽）                |
| `tag-list`                                         | 组件   | ~120     | 标签列表字段                        |
| `key-value`                                        | 组件   | ~430     | 键值对编辑器                        |
| `input-tree`                                       | 组件   | ~100     | 树形字段                            |
| `tree-select`                                      | 组件   | ~100     | 弹出树选择                          |
| `tree-controls.tsx` + `tree-options.ts`            | 工具   | ~390     | 树控件共享逻辑和选项工具            |

说明：`renderers/shared/`（label, error, help-text, field-hint）**不迁出**，留在 form 中。因为基础字段（input.tsx 等）依赖此模块，如果迁到 form-advanced 会造成 form → form-advanced 的反向依赖。form-advanced 通过 import form 的公开 export 获取 shared 模块。

**从 `targetContract` 新增的组件**：

| 组件          | 类型     | wave | 说明                       |
| ------------- | -------- | ---- | -------------------------- |
| `combo`       | 复合字段 | 4    | 组合字段容器               |
| `picker`      | 复合字段 | 4    | 弹出选择器                 |
| `transfer`    | 复合字段 | 4    | 穿梭选择器                 |
| `input-table` | 复合字段 | 4    | 表格式数组编辑             |
| `input-file`  | 复合字段 | 3    | 文件上传                   |
| `input-image` | 复合字段 | 3    | 图片上传                   |
| `editor`      | 复合字段 | 3    | 富文本编辑器（见下方说明） |

**预估总规模**：~7,000–9,000 行（含测试）。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `flux-renderers-basic`, `flux-renderers-form`（用于共享 field-utils、form owner 类型和 shared/ 模块）, `ui`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/sortable`。

**关于 `editor`（富文本）的分包说明**：

`editor` 放在 form-advanced 而非独立成包，原因如下：

1. `code-editor` 独立是因为 CodeMirror 是重量级依赖（~2MB），且有独立的 plugin 体系和配置系统。
2. `editor`（富文本）如果使用轻量实现（如 `contentEditable` + 基础格式化工具栏），不需要独立包。
3. 如果后续确认 `editor` 需要重量级富文本库（如 TipTap、Slate），应在此文档中追加决策：将 `editor` 提升为独立包 `flux-rich-text-editor`，遵循 `flux-code-editor` 的模式。
4. 当前默认假设为轻量实现，归入 form-advanced。

**内部结构建议**：

```
src/
├── index.tsx
├── schemas.ts
├── tree-options.ts
├── condition-builder/
│   ├── ConditionBuilder.tsx
│   ├── ConditionGroup.tsx
│   ├── ConditionItem.tsx
│   ├── FieldSelect.tsx
│   ├── OperatorSelect.tsx
│   ├── ValueInput.tsx
│   ├── operators.ts
│   ├── types.ts
│   ├── i18n.ts
│   ├── id-utils.ts
│   ├── utils.ts
│   └── *.test.*
├── variant-field/
│   ├── variant-field.tsx
│   ├── variant-field-runtime.ts
│   ├── variant-field-matching.ts
│   └── *.test.*
├── detail-view/
│   ├── detail-view.tsx
│   ├── detail-field.tsx
│   ├── detail-surface.tsx
│   ├── projected-form-runtime.ts
│   ├── projected-scope.ts
│   ├── value-adaptation-helper.ts
│   └── *.test.*
├── composite-field/
│   ├── object-field.tsx
│   ├── array-field.tsx
│   ├── array-field-runtime.ts
│   ├── composite-item-id.ts
│   ├── composite-schemas.ts
│   └── *.test.*
├── array-editor.tsx
├── tag-list.tsx
├── key-value.tsx
├── tree-controls.tsx
├── input-tree.tsx
├── tree-select.tsx
├── combo.tsx
├── picker.tsx
├── transfer.tsx
├── input-table.tsx
├── input-file.tsx
├── input-image.tsx
├── editor.tsx
└── __tests__/
    ├── composite-form-detail-and-loop.test.tsx
    ├── composite-form-integration.test.tsx
    ├── composite-form-object-array.test.tsx
    ├── composite-form-support.tsx
    ├── composite-form.test.tsx
    ├── composite-item-id.test.tsx
    ├── form-array-validation.test.tsx
    └── (其他从 form 迁出的测试)
```

说明：`shared/`（label, error, help-text, field-hint）不在此包中。form-advanced 通过 `import { ... } from '@nop-chaos/flux-renderers-form'` 引用 shared 模块。

### 2.7 `@nop-chaos/flux-renderers-data` — 数据展示与复合数据工作流（扩展）

**职责**：以数据驱动为主的展示组件和复合数据工作流组件。

**新增组件**：

| 组件          | 类型       | 状态           | wave | 说明                   |
| ------------- | ---------- | -------------- | ---- | ---------------------- |
| `table`       | 数据展示   | runtime        | —    | 已有                   |
| `tree`        | 数据展示   | runtime        | —    | 已有                   |
| `chart`       | 数据展示   | runtime        | —    | 已有                   |
| `data-source` | 数据源     | runtime        | —    | 已有                   |
| `crud`        | 复合工作流 | targetContract | 1    | 通过 lowering 组合实现 |
| `list`        | 集合展示   | targetContract | 1    | 有序列表               |
| `pagination`  | 交互 owner | targetContract | 2    | 分页                   |
| `service`     | 数据容器   | targetContract | 2    | 可视化数据装配容器     |

**预估总规模**：~4,000–6,000 行。

**依赖**：`flux-react`, `flux-runtime`, `flux-formula`, `flux-core`, `flux-renderers-basic`, `ui`, `lucide-react`, `echarts`。

**`crud` 实现方式说明**：

`crud` 不实现为独立巨型 JSX 组件。它通过 **schema 编译期 lowering** 拆解为 `form` + `table` + `dialog` + `data-source` 的组合。运行时不需要 import 其他 renderer 包。

---

## 3. 组件归属速查表

下面是所有 92 个 retained canonical 组件的完整包归属映射。

### 3.1 `flux-renderers-basic`（15 个，不变）

| 组件               | 状态    |
| ------------------ | ------- |
| `fragment`         | runtime |
| `loop`             | runtime |
| `recurse`          | runtime |
| `page`             | runtime |
| `container`        | runtime |
| `flex`             | runtime |
| `tabs`             | runtime |
| `dialog`           | runtime |
| `drawer`           | runtime |
| `dynamic-renderer` | runtime |
| `reaction`         | runtime |
| `text`             | runtime |
| `button`           | runtime |
| `icon`             | runtime |
| `badge`            | runtime |

### 3.2 `flux-renderers-content`（18 个，新包）

| 组件        | 状态           | wave |
| ----------- | -------------- | ---- |
| `separator` | targetContract | 1    |
| `card`      | targetContract | 1    |
| `link`      | targetContract | 1    |
| `image`     | targetContract | 1    |
| `progress`  | targetContract | 1    |
| `spinner`   | targetContract | 1    |
| `empty`     | targetContract | 1    |
| `json-view` | targetContract | 1    |
| `markdown`  | targetContract | 1    |
| `html`      | targetContract | 1    |
| `alert`     | targetContract | 2    |
| `cards`     | targetContract | 2    |
| `mapping`   | targetContract | 3    |
| `status`    | targetContract | 3    |
| `audio`     | targetContract | 4    |
| `video`     | targetContract | 4    |
| `carousel`  | targetContract | 4    |
| `qrcode`    | targetContract | 4    |

### 3.3 `flux-renderers-layout`（7 个，新包）

| 组件              | 状态           | wave |
| ----------------- | -------------- | ---- |
| `grid`            | targetContract | 3    |
| `collapse`        | targetContract | 3    |
| `button-group`    | targetContract | 3    |
| `dropdown-button` | targetContract | 3    |
| `steps`           | targetContract | 4    |
| `timeline`        | targetContract | 4    |
| `wizard`          | targetContract | 2    |

### 3.4 `flux-renderers-form`（18 个，拆分后）

| 组件             | 状态           | wave |
| ---------------- | -------------- | ---- |
| `form`           | runtime        | —    |
| `input-text`     | runtime        | —    |
| `input-email`    | runtime        | —    |
| `input-password` | runtime        | —    |
| `textarea`       | runtime        | —    |
| `input-number`   | targetContract | 2    |
| `select`         | runtime        | —    |
| `checkbox`       | runtime        | —    |
| `radio-group`    | runtime        | —    |
| `checkbox-group` | runtime        | —    |
| `switch`         | runtime        | —    |
| `input-date`     | targetContract | 2    |
| `input-datetime` | targetContract | 2    |
| `input-time`     | targetContract | 2    |
| `date-range`     | targetContract | 2    |
| `input-month`    | targetContract | 3    |
| `input-quarter`  | targetContract | 3    |
| `input-year`     | targetContract | 3    |

### 3.5 `flux-renderers-form-advanced`（新包，从 form 拆出）

**注册 renderer 组件**（13 个）：

| 组件                | 状态           | 来源         |
| ------------------- | -------------- | ------------ |
| `condition-builder` | runtime        | 从 form 迁出 |
| `array-editor`      | runtime        | 从 form 迁出 |
| `tag-list`          | runtime        | 从 form 迁出 |
| `key-value`         | runtime        | 从 form 迁出 |
| `input-tree`        | runtime        | 从 form 迁出 |
| `tree-select`       | runtime        | 从 form 迁出 |
| `combo`             | targetContract | 新实现       |
| `picker`            | targetContract | 新实现       |
| `transfer`          | targetContract | 新实现       |
| `input-table`       | targetContract | 新实现       |
| `input-file`        | targetContract | 新实现       |
| `input-image`       | targetContract | 新实现       |
| `editor`            | targetContract | 新实现       |

**内部子系统模块**（非注册 renderer，是实现细节）：

| 子系统                         | 来源         | 说明                                       |
| ------------------------------ | ------------ | ------------------------------------------ |
| `detail-view` + `detail-field` | 从 form 迁出 | 详情视图 owner 和字段渲染                  |
| `variant-field`                | 从 form 迁出 | 变体字段检测/匹配/运行时                   |
| `object-field`                 | 从 form 迁出 | 对象字段（composite-field 的一部分）       |
| `array-field`                  | 从 form 迁出 | 数组字段运行时（composite-field 的一部分） |
| `composite-field`              | 从 form 迁出 | 复合字段 schemas、item-id、组合测试        |
| `projected-form`               | 从 form 迁出 | 投影表单运行时（detail-view 依赖）         |

注意：

- `code-editor` 不在 form-advanced 中，它已有独立包 `flux-code-editor`。
- 内部子系统不是 92 个 canonical 组件的一部分。它们是实现 detail-view/variant-field/composite-field 复杂字段行为的内部模块。

### 3.6 `flux-renderers-data`（8 个，扩展）

| 组件          | 状态           | wave |
| ------------- | -------------- | ---- |
| `table`       | runtime        | —    |
| `tree`        | runtime        | —    |
| `chart`       | runtime        | —    |
| `data-source` | runtime        | —    |
| `crud`        | targetContract | 1    |
| `list`        | targetContract | 1    |
| `pagination`  | targetContract | 2    |
| `service`     | targetContract | 2    |

### 3.7 领域包（不变）

| 组件                     | 包                                                   |
| ------------------------ | ---------------------------------------------------- |
| `designer-page`          | `flow-designer-renderers`                            |
| `designer-field`         | `flow-designer-renderers`                            |
| `designer-canvas`        | `flow-designer-renderers`                            |
| `designer-palette`       | `flow-designer-renderers`                            |
| `designer-node-card`     | `flow-designer-renderers`（declaredButUnregistered） |
| `designer-edge-row`      | `flow-designer-renderers`（declaredButUnregistered） |
| `report-inspector-shell` | `report-designer-renderers`                          |
| `report-inspector`       | `report-designer-renderers`                          |
| `report-field-panel`     | `report-designer-renderers`                          |
| `report-toolbar`         | `report-designer-renderers`                          |
| `report-designer-page`   | `report-designer-renderers`                          |
| `spreadsheet-page`       | `spreadsheet-renderers`                              |
| `code-editor`            | `flux-code-editor`                                   |

---

## 4. 依赖拓扑

### 4.1 Renderer 包依赖矩阵

| 包依赖 →      | flux-core | flux-formula | flux-runtime | flux-react | flux-renderers-basic | flux-renderers-form | ui  | echarts | @dnd-kit |
| ------------- | :-------: | :----------: | :----------: | :--------: | :------------------: | :-----------------: | :-: | :-----: | :------: |
| basic         |     x     |      x       |      x       |     x      |                      |                     |  x  |         |          |
| content       |     x     |      x       |      x       |     x      |                      |                     |  x  |         |          |
| layout        |     x     |      x       |      x       |     x      |                      |                     |  x  |         |          |
| form          |     x     |      x       |      x       |     x      |          x           |                     |  x  |         |          |
| form-advanced |     x     |      x       |      x       |     x      |          x           |          x          |  x  |         |    x     |
| data          |     x     |      x       |      x       |     x      |         x\*          |                     |  x  |    x    |          |
| code-editor   |     x     |      x       |      x       |     x      |                      |                     |  x  |         |          |

说明：

- `x` = 有直接运行时 import 依赖。
- `x*` = 当前无此依赖，`crud` 实现后因 lowering 引入。
- 空白 = 不依赖。
- `flux-renderers-form` 依赖 `flux-renderers-basic` 是因为 form 渲染器引用 basic 的 schema 定义和类型（如 `dialog` 作为 form 的提交确认面）。
- `flux-renderers-form-advanced` 依赖 `flux-renderers-form` 是因为复合字段需要 form owner 类型、field-utils 和 shared/ 模块。这是一个**暂时性的层级依赖**：如果后续 shared/ 和 field-utils 中的通用逻辑下沉到 `flux-react`，此依赖可以消除。
- `flux-renderers-layout` 不依赖 `flux-renderers-basic`：layout 组件的 schema 独立定义，不需要 lowering 到 basic 组件。
- renderer 包之间 **不存在横向依赖**（content 不依赖 layout，layout 不依赖 content 等）。

### 4.2 无环证明

依赖链是严格单向的：

```
core → formula → runtime → react → basic
                                  → content
                                  → layout
                                  → form → form-advanced
                                  → data
                                  → code-editor
```

不存在反向或循环依赖。层级方向：basic < form < form-advanced（< 表示"被下游依赖"）。data 对 basic 的条件依赖（crud 实现后引入）未在简化图中体现，详见 §4.1 矩阵。

---

## 5. 渐进迁移路线

不建议一次性完成所有拆分。按以下阶段逐步推进，每个阶段独立可验证。

### Phase 0：现状巩固

**目标**：不拆分，只做代码整理。

- [ ] 巩固现有 36 个 `runtime` 组件的 schema、field metadata、example.json。
- [ ] 确保 `docs/components/<type>/design.md` 与实际 renderer definition 一致。
- [ ] 修复 `flux-renderers-form` 内部的模块边界问题（如有）。

### Phase 1：创建 `flux-renderers-content`

**目标**：新包落地，实现 wave 1 展示组件。

- [ ] 创建 `packages/flux-renderers-content/`（package.json、tsconfig、vitest.config）。
- [ ] 实现 wave 1 组件：`separator`, `card`, `link`, `image`, `progress`, `spinner`, `empty`, `json-view`, `markdown`, `html`。
- [ ] 注册到 playground registry。
- [ ] 更新 `docs/components/examples.manifest.json` 状态。
- [ ] 运行 `pnpm typecheck && pnpm build && pnpm test && pnpm lint`。

**预估工作量**：~2,000–3,000 行新代码。

### Phase 2：创建 `flux-renderers-layout`

**目标**：布局容器包落地。

- [ ] 创建 `packages/flux-renderers-layout/`。
- [ ] 实现 `wizard`（wave 2）、`grid`, `collapse`, `button-group`, `dropdown-button`（wave 3）、`steps`, `timeline`（wave 4）。
- [ ] 注册到 playground registry。
- [ ] 更新 manifest。

**预估工作量**：~2,000–3,000 行新代码。

### Phase 3：从 `flux-renderers-form` 拆出 `flux-renderers-form-advanced`

**目标**：将 `flux-renderers-form` 从 ~16K 行精简到 ~4K 行。

**迁移步骤**（遵循 AGENTS.md 的文件重构方法论）：

1. **创建新包**：`packages/flux-renderers-form-advanced/`（package.json、tsconfig、vitest.config）。

2. **复制模块**：先把以下模块复制到新包（保持原位不动）：
   - `renderers/condition-builder/` → `src/condition-builder/`
   - `renderers/variant-field*` → `src/variant-field/`
   - `renderers/detail-view*`, `renderers/detail-field*`, `renderers/detail-surface*` → `src/detail-view/`
   - `renderers/projected-*` → `src/detail-view/`
   - `renderers/value-adaptation-helper.ts` → `src/detail-view/`
   - `renderers/object-field*` → `src/composite-field/`
   - `renderers/array-field*`, `renderers/array-field-runtime*` → `src/composite-field/`
   - `renderers/composite-item-id.ts`, `renderers/composite-schemas.ts` → `src/composite-field/`
   - `renderers/array-editor.tsx` → `src/array-editor.tsx`
   - `renderers/tag-list.tsx` → `src/tag-list.tsx`
   - `renderers/key-value.tsx` → `src/key-value.tsx`
   - `renderers/input-tree.tsx`, `renderers/tree-select.tsx`, `renderers/tree-controls.tsx` → `src/`
   - `tree-options.ts` → `src/tree-options.ts`
   - `renderers/test-support.tsx` → `src/test-support.tsx`
   - **不迁移** `renderers/shared/`（留在 form，避免循环依赖）

3. **复制测试文件**：
   - `__tests__/composite-form-*.test.tsx`（5 个 + support） → `src/__tests__/`
   - `__tests__/composite-item-id.test.tsx` → `src/__tests__/`
   - `__tests__/form-array-validation.test.tsx` → `src/__tests__/`
   - `__tests__/form-double-edit-regression.test.tsx` → `src/__tests__/`
   - `__tests__/form-source-options.test.tsx` → `src/__tests__/`
   - `__tests__/form-tree-checkbox-fields.test.tsx` → `src/__tests__/`
   - 其他与迁移模块相关的测试文件

4. **更新 import 路径**：
   - 所有迁移模块内部的相对 import 路径需要根据新目录结构调整。
   - 对 `@nop-chaos/flux-renderers-form` 的引用改为 `import { ... } from '@nop-chaos/flux-renderers-form'`（workspace 依赖）。
   - 特别是：`shared/` 模块（label, error, help-text）的引用从相对路径改为通过 `@nop-chaos/flux-renderers-form` 的公开 export。

5. **验证新包**：`typecheck && build && test` 通过。

6. **替换原包**：
   - 从 `flux-renderers-form/src/` 删除已迁移的文件。
   - 更新 `flux-renderers-form/src/index.tsx`：保留核心字段和 form owner 的 export，移除已迁移的 renderer export。
   - 确保 `shared/` 模块作为公开 export 暴露，供 form-advanced 引用。
   - 更新 `flux-renderers-form/package.json` 移除 `@dnd-kit` 依赖。

7. **全量验证**：`pnpm typecheck && pnpm build && pnpm test && pnpm lint`。

8. **更新 playground**：更新 registry 装配，同时注册 form 和 form-advanced 的 renderer。

**预估工作量**：主要是文件移动和 import 更新，新增代码少。重点在于 import 路径变更和测试文件迁移。

### Phase 4：扩展 `flux-renderers-data`

**目标**：加入 `crud`, `list`, `pagination`, `service`。

- [ ] 实现 `list` 和 `crud`（wave 1，`crud` 通过 lowering）。
- [ ] 实现 `pagination` 和 `service`（wave 2）。
- [ ] 更新 manifest。

**预估工作量**：~2,000–3,000 行新代码。

### Phase 5：实现表单字段族

**目标**：补齐 `flux-renderers-form` 和 `flux-renderers-form-advanced` 的 `targetContract` 组件。

- [ ] `input-number`, 日期时间族（wave 2）。
- [ ] `input-file`, `input-image`, `editor`（wave 3）。
- [ ] `combo`, `picker`, `transfer`, `input-table`（wave 4）。

### Phase 6：长尾组件

**目标**：实现 `flux-renderers-content` 的 wave 4 组件。

- [ ] `audio`, `video`, `carousel`, `qrcode`。
- [ ] `flux-renderers-layout` 的 `steps`, `timeline`。

---

## 6. 判据速查：新组件应放在哪个包？

当需要决定一个新组件的包归属时，按以下决策树判断：

```
是否是领域宿主集成（designer/report/spreadsheet/word）？
  → 是：对应领域包

是否有重量级外部依赖（CodeMirror, ECharts, 地图 SDK）？
  → 是：独立包或对应重依赖包（code-editor / data）

是否参与 form value/validation 通道？
  → 否：
      是否以数据驱动为主（内置数据获取/分页/排序）？
        → 是：flux-renderers-data（如 table, list, crud）
      否则是否是布局编排或流程控制？
        → 是：flux-renderers-layout（如 grid, wizard）
      否则：flux-renderers-content（纯展示/反馈，如 card, cards, badge）
  → 是：
      是否有嵌套子 scope、内部复杂状态机、或重量级交互？
        → 是：flux-renderers-form-advanced
      否则：flux-renderers-form
```

边界案例说明：

- `cards` 归 content，`list` 归 data。区分关键：`cards` 是纯模板渲染（从外部 scope 获取数据），`list` 是有内置分页/排序能力的数据集合 owner。
- `wizard` 归 layout。虽然常与 form 配合使用，但它自身是步骤编排容器（管理步骤索引、前进/后退），不参与 value/validation 通道。内部步骤通过 `body` region 承接 form。
- `input-number` 归 form 而非 form-advanced。虽然有数字精度/格式化逻辑，但不管理子 scope，是原子级字段。

---

## 7. 维护规则

1. **新增组件时**：先更新 `docs/components/<type>/design.md`，再根据本文件第 6 节决策树确定包归属，最后实现。
2. **包归属争议时**：以职责轴判断（第 1.1 节），不以"哪个包小就放哪里"为准。
3. **单包超限时**：当任何包超过第 1.2 节的上限时，应启动拆分评审。拆分方向应遵循本文件的原则，不要每次临时决定。
4. **本文件更新时**：同步更新 `docs/components/index.md` 和 `docs/components/roadmap.md` 中的包归属引用。
5. **依赖方向变更时**：任何 renderer 包之间的新增依赖必须在此文件第 4 节矩阵中显式记录，并确保无环。
6. **form-advanced 二次拆分触发条件**：如果 `flux-renderers-form-advanced` 超过 12,000 行（含测试），应启动评审。可能的拆分方向包括：将 `condition-builder` 提升为独立包（它已是一个自包含的 ~2,600 行子系统），或将重量级编辑器（`editor` 富文本）独立。
7. **layout 包合并条件**：如果 `flux-renderers-layout` 长期维持在 7 个组件以下且不增长，可考虑合并回 `flux-renderers-basic`。合并前需确认 basic 不会因此超过合理上限。
8. **editor 分包升级**：如果 `editor`（富文本）确认需要重量级外部库，应从 form-advanced 提升为独立包 `flux-rich-text-editor`，遵循 `flux-code-editor` 的模式。此决策应在此文件中更新。

---

## 8. 与其他文档的关系

| 文档                                                  | 关系                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/components/amis-baseline-matrix.md`             | AMIS → Flux 组件的 retained/notRetained 决策；本文件决定 retained 组件的包归属 |
| `docs/components/index.md`                            | 组件目录索引和命名约定；本文件补充包归属信息                                   |
| `docs/components/roadmap.md`                          | 实现优先级和 wave 排序；本文件将 wave 映射到具体的包和迁移阶段                 |
| `docs/architecture/flux-runtime-module-boundaries.md` | 运行时模块边界；本文件关注 renderer 层分包，不涉及 runtime 内部                |
| `docs/architecture/styling-system.md`                 | 样式约定；所有 renderer 包统一遵守，不因分包而改变                             |
