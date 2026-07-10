# Analysis: flux-guide 结构评估与完善方案

## 1. 现状

### 1.1 目录结构

````
flux-guide/                          (项目根目录，非 docs/ 子目录)
  README.md                          (98行) 入口索引 + 核心架构一句话
  01-quickstart.md                   (347行) 17 个最常用代码段速查
  02-reference.md                    (578行) 跨组件核心机制参考 —— 分析焦点
  flux-types/                        类型定义（AI 编写 JSON 的知识源）
    common.d.ts                      (265行) 基础类型（手工维护，从 packages 提取）
    schema.d.ts                      (864行) 所有组件 Schema（自动生成）
    index.ts                         (385行) 联合类型 + type→interface 映射（自动生成）
  design-patterns/                   常见业务场景 cookbook
    README.md + 9 个 .md             (9 个模式)
  mobile/                            移动端组件专题
    README.md + 5 个 .md             (5 个组件)
  scripts/                           工具脚本
    validate.mjs                     (313行) 校验所有 markdown 中的 ```json 块
    generate-types.mjs               (293行) 从源码定义自动生成 schema.d.ts
    shared.mjs                       (618行) 公共工具（JSONC 解析、类型生成辅助）
    css-stub.mjs                     (13行)  CSS import 的 ESM loader stub
  tsconfig.json                      仅引用 flux-types/
````

### 1.2 内容覆盖

| 层        | 文件                  | 覆盖范围                                                                                                          |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 快速入门  | `01-quickstart.md`    | page/data-source/CRUD/form/dialog/combo/visible/action/wizard/tabs/select/loop/reaction/file-upload/confirm/alert |
| 表达式    | `02-reference.md §1`  | `${}` 模板 + 过滤器 + 命名空间                                                                                    |
| API 配置  | `02-reference.md §2`  | ApiSchema，响应格式，适配器                                                                                       |
| 事件/动作 | `02-reference.md §3`  | Action Algebra 链，动作类型表                                                                                     |
| 数据流    | `02-reference.md §4`  | ScopeRef 层级，数据源模式，组件通信                                                                               |
| 表单校验  | `02-reference.md §5`  | 字段级/跨字段/异步校验                                                                                            |
| 结构节点  | `02-reference.md §6`  | fragment/loop/recurse/reaction                                                                                    |
| Tabs 管理 | `02-reference.md §7`  | 受控/非受控/scope ownership                                                                                       |
| 组件方法  | `02-reference.md §8`  | component:submit/refresh/setValue 等                                                                              |
| AMIS 差异 | `02-reference.md §9`  | 10 项差异对比表                                                                                                   |
| 布局选型  | `02-reference.md §10` | container/flex/grid + className 路由                                                                              |
| 设计模式  | `design-patterns/`    | CRUD/form/data-source/conditional/custom/tabs/cascading-select/file-upload/cards                                  |
| 移动端    | `mobile/`             | pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar                                                      |
| 类型定义  | `flux-types/`         | 98+ 组件接口                                                                                                      |

### 1.3 工具链状态

验证工具可用，需 `node --experimental-loader ./flux-guide/scripts/css-stub.mjs flux-guide/scripts/validate.mjs` 执行（前提：先 `pnpm build`）。

2026-07-10 执行结果：

```
Registry: 93 renderer types
  ERR: flux-guide/design-patterns/crud.md:145 /loadAction/dependsOn
    kind: "reaction" fields require a non-empty dependsOn array
    → 简单 CRUD loadAction 缺少 dependsOn 字段
  WARN: docs/components/crud/crud-comparative-analysis.md:300
    Unknown property "form" for renderer type "form"
    → 外部 doc 的验证边界问题（非 flux-guide）

Results: blocks=223  nodes=213  errors=1  warnings=1
```

已知问题：

- `--experimental-loader` 在 Node 25 中标记为 deprecation，应改为 `--import 'data:text/javascript,...register(...)'`
- `flux-guide/` 没有 `package.json`，脚本无正式依赖声明
- 变量注册机制依赖 dist 构建产物

---

## 2. 问题分析

### 2.1 `02-reference.md` 文件过载（核心问题）

578 行涵盖 10 个独立主题，密度极高：

| §   | 主题              | 行数 | 性质        | 与设计模式重叠                               |
| --- | ----------------- | ---- | ----------- | -------------------------------------------- |
| 1   | 模板/表达式语法   | ~30  | 语法参考    | 无                                           |
| 2   | API 配置          | ~30  | JSON 配置   | 无                                           |
| 3   | 事件与动作系统    | ~90  | 架构 + 参考 | 设计模式中无单独动作文档                     |
| 4   | 数据流            | ~110 | 架构 + 用法 | 与 `design-patterns/data-source.md` 部分重叠 |
| 5   | 表单校验          | ~80  | 用法 + 参考 | 与 `design-patterns/form.md` 部分重叠        |
| 6   | 结构节点          | ~55  | 用法        | 无独立设计模式                               |
| 7   | Tabs 状态管理     | ~35  | 用法        | 与 `design-patterns/tabs.md` 重叠            |
| 8   | 组件实例方法      | ~25  | API 参考    | 无                                           |
| 9   | AMIS vs Flux 差异 | ~15  | 迁移参考    | 无                                           |
| 10  | 布局容器选型      | ~50  | 用法        | 无独立设计模式                               |

**问题**：

1. **10 个主题挤在一个文件**，AI 或人类读者难以快速定位
2. **混合不同类型的内容**：语法参考（§1）、架构说明（§3/§4）、用法指南（§5/§6/§7/§10）、API 参考（§8）、迁移差异（§9）
3. **与 design-patterns/ 重叠**：§4 数据流与 data-source.md、§5 校验与 form.md、§7 tabs 与 tabs.md 有内容重复
4. **发现路径不清晰**：新读者不知道想去哪一节找答案

### 2.2 文件命名模糊

- `02-reference.md` — "reference" 过于通用，无法反映内容（是 JSON 作者参考，不是 renderer 开发者参考）
- `01-quickstart.md` — "quickstart" 也偏笼统

对比：`docs/references/quick-reference.md` 是 renderer 开发者参考，命名与 `flux-guide/02-reference.md` 极易混淆。

### 2.3 缺乏包管理

- `flux-guide/` 没有 `package.json`
- 脚本依赖 `packages/*/dist/`（需 `pnpm build`），但没有文档写明前提条件
- Node 25 的 `--experimental-loader` 已 deprecate，新 API 是 `register()`，但脚本未适配
- 没有 `pnpm` script 封装 `validate`/`generate-types` 命令

### 2.4 未与 `docs/` 集成

- `docs/index.md` 未收录 `flux-guide/` 的入口
- `AGENTS.md` 的文档路由表未包含 `flux-guide/` 引用
- 用户找不到 "AI 编写 JSON" 的文档入口

### 2.5 内容缺口

当前 `flux-guide/` 缺失以下常见场景的文档：

| 缺失主题                                    | 涉及的 renderer              | 复杂页面的覆盖情况                  |
| ------------------------------------------- | ---------------------------- | ----------------------------------- |
| 容器布局（container/flex/grid 完整 schema） | container, flex, grid        | 已新增 §10，但无独立设计模式        |
| 自定义渲染器/表单域/动作完整流程            | custom                       | 已有 `design-patterns/custom.md` ✅ |
| Chart 图表                                  | chart                        | 仅 playground 演示                  |
| Tree 树形组件                               | tree, tree-select            | 仅 complex-pages tree-crud          |
| DynamicRenderer 动态加载                    | dynamic-renderer             | 仅 complex-pages dynamic-tabs       |
| Servic 数据容器                             | service                      | 无                                  |
| CRUD cards 模式                             | crud `listMode: 'cards'`     | 已有 `design-patterns/cards.md` ✅  |
| Collapse 折叠面板                           | collapse                     | 无                                  |
| Wizard 向导                                 | wizard                       | 仅 01-quickstart 有简短示例         |
| Combo + InputTable 完整模式                 | combo, input-table           | 仅 quickstart 有 combo 片段         |
| input-tree / tree-select                    | input-tree, tree-select      | 无                                  |
| condition-builder                           | condition-builder            | 仅 playground 演示                  |
| transfer / picker                           | transfer, picker             | 无                                  |
| 内容组件（card/alert/status/mapping...）    | card, alert, status, mapping | 无                                  |

### 2.6 验证工具发现的问题

验证工具执行发现 1 个 ERROR 和 1 个 WARNING：

**ERROR: `flux-guide/design-patterns/crud.md:145`** — 简单 CRUD 的 `loadAction` 缺少 `dependsOn` 字段，违反 CRUD schema 契约（dependsOn kind 要求非空数组）。这是一个真实的文档 bug：示例 JSON 不合法。

**WARNING: `docs/components/crud/crud-comparative-analysis.md:300`** — 非 `flux-guide` 文档，不在本次分析范围内。

---

## 3. 推荐方案

### 3.1 核心原则

1. **面向 AI 读者**：文件标题和结构应让 AI 能快速定位到正确文件
2. **每个文件一个焦点**：不混装不同层面的内容
3. **文件命名自描述**：不依赖 README 解释文件内容
4. **工具可验证**：所有 JSON 示例必须通过 `validate.mjs` 校验

### 3.2 `02-reference.md` 拆分建议

将 578 行的 `02-reference.md` 拆分为 6 个独立文件：

| 新文件                    | 源 §  | 行数 | 聚焦                                                       |
| ------------------------- | ----- | ---- | ---------------------------------------------------------- |
| `02-expression-syntax.md` | §1    | ~30  | `${}` 模板 + 过滤器 + 命名空间                             |
| `03-api-config.md`        | §2    | ~30  | API 配置 + 响应格式 + 适配器                               |
| `04-action-system.md`     | §3    | ~90  | Action Algebra DAG + 动作类型完整参考                      |
| `05-data-flow.md`         | §4    | ~110 | ScopeRef + data-source + 组件通信                          |
| `06-form-validation.md`   | §5    | ~80  | 校验机制 + 规则 + 回调                                     |
| `07-structural-nodes.md`  | §6+§8 | ~80  | fragment/loop/recurse/reaction + component:methods         |
| `08-tabs-state.md`        | §7    | ~35  | Tabs 受控/非受控/scope ownership                           |
| `09-amis-migration.md`    | §9    | ~15  | AMIS 差异对比表                                            |
| (已实现)                  | §10   | ~50  | 布局选型 → 保留在 §10 或移入新 `design-patterns/layout.md` |

拆分后：

- `01-quickstart.md` — 17 个片段（保持不变）
- `02-expression-syntax.md` — 表达式参考
- `03-api-config.md` — API 配置参考
- `04-action-system.md` — 动作系统
- `05-data-flow.md` — 数据流
- `06-form-validation.md` — 表单校验
- `07-structural-nodes.md` — 结构节点 + 组件方法
- `08-tabs-state.md` — Tabs 状态管理
- `09-amis-migration.md` — AMIS 差异
- `design-patterns/layout.md`（新增）— 布局容器选型

### 3.3 整体结构优化建议

```
flux-guide/
  README.md                           ← 入口 + 核心架构 + 文件索引（更新索引）
  01-quickstart.md                    ← 17 个代码段（不变）
  02-expression-syntax.md             ← 表达式语法（新拆分）
  03-api-config.md                    ← API 配置（新拆分）
  04-action-system.md                 ← 动作系统（新拆分）
  05-data-flow.md                     ← 数据流（新拆分）
  06-form-validation.md               ← 表单校验（新拆分）
  07-structural-nodes.md              ← 结构节点 + 组件方法（新拆分）
  08-tabs-state.md                    ← Tabs 管理（新拆分）
  09-amis-migration.md                ← AMIS 差异（新拆分）
  flux-types/                         ← 不变
  design-patterns/                    ← 不变 + 扩展
    README.md
    layout.md                         ← 新增：布局选型完整指南
    crud.md / form.md / ...           ← 已有 9 个模式
  mobile/                             ← 不变
  scripts/                            ← 不变 + package.json 补充
    package.json                      ← 新增
    validate.mjs / generate-types.mjs / shared.mjs / css-stub.mjs
```

### 3.4 新增 design-patterns/layout.md 内容建议

当前布局选型已作为 `02-reference.md §10` 存在，但放入 `design-patterns/` 更合适（属于"常见场景的完整解法 cookbook"）。建议内容：

1. Container 完整 schema（direction/wrap/align/gap/bodyClassName/responsiveDirection）
2. Flex 完整 schema（direction/justify/align/alignContent/wrap/gap）
3. Grid 完整 schema（columns/colSpan/rowSpan/responsiveColumns）
4. 选型决策树（流程图或表格）
5. Per-breakpoint 响应式布局示例
6. Container 双层 DOM 结构 + className 路由图
7. bodyClassName 实现 CSS Grid 的示例
8. 自适应换行（flex wrap: true）的 dashboard stat 卡示例
9. layout renderer + data-source 组合场景

### 3.5 新增 design-patterns 补全计划

按优先级排列：

1. **`layout.md`** — 布局容器（当前已实现 §10）
2. **`wizard.md`** — Wizard 多步骤（quickstart §10 只有片段）
3. **`chart.md`** — Chart 图表（完全空缺）
4. **`dynamic-renderer.md`** — DynamicRenderer 动态加载
5. **`tree.md`** — Tree / TreeSelect
6. **`collapse.md`** — Collapse 折叠面板
7. **`content-display.md`** — Card/Alert/Status/Mapping 等内容组件
8. **`combo-input-table.md`** — Combo + InputTable 编辑集合

### 3.6 工具链完善

**补充 `flux-guide/package.json`**：

```json
{
  "name": "@nop-chaos/flux-guide-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "validate": "pnpm build && node --import 'data:text/javascript,...' scripts/validate.mjs",
    "generate-types": "node scripts/generate-types.mjs"
  }
}
```

**修复 loader 注册**：将 `--experimental-loader` 改为 `register()` 模式（适配 Node 25+）。

**集成到根 `package.json`**：在根目录的 `scripts` 或 `pnpm` workspace 中注册 `flux-guide:validate` 和 `flux-guide:generate-types` 命令。

**CI 集成**：

- `flux-guide:validate` 应作为 CI PR 检查的一步
- `flux-guide:generate-types` 应在源码渲染器定义变更后自动运行

### 3.7 与 `docs/` 集成

- `docs/index.md` 添加 `flux-guide/` 入口引用
- `AGENTS.md` 文档路由表补充：编写 JSON schema → 读 `flux-guide/README.md`
- 明确分层：
  - **`flux-guide/`** — "我该怎么写 JSON？"（AI/人类 JSON 作者）
  - **`docs/references/quick-reference.md`** — "我该怎么写 renderer？"（TypeScript renderer 开发者）
  - **`docs/architecture/`** — "为什么这样设计？"（架构决策文档）

---

## 4. 具体执行计划

### Phase 1：拆分 `02-reference.md`

1. 创建 `02-expression-syntax.md`（提取 §1）
2. 创建 `03-api-config.md`（提取 §2）
3. 创建 `04-action-system.md`（提取 §3）
4. 创建 `05-data-flow.md`（提取 §4，协调与 design-patterns/data-source.md 的重复）
5. 创建 `06-form-validation.md`（提取 §5，协调与 design-patterns/form.md 的重复）
6. 创建 `07-structural-nodes.md`（提取 §6+§8）
7. 创建 `08-tabs-state.md`（提取 §7，协调与 design-patterns/tabs.md 的重复）
8. 创建 `09-amis-migration.md`（提取 §9）
9. 删除 `02-reference.md`
10. 将所有 §10（布局选型）内容移至 `design-patterns/layout.md`
11. 更新 `README.md` 文件索引

### Phase 2：工具链完善

1. 创建 `flux-guide/package.json`
2. 将 `--experimental-loader` 替换为 `register()` 模式
3. 在根 `package.json` 添加 `flux-guide:validate` 脚本
4. 修复 `crud.md:145` 的 ERROR（loadAction 加 `dependsOn`）

### Phase 3：补全设计模式

按 3.5 节优先级补充缺失的设计模式文档。

### Phase 4：集成

1. `docs/index.md` 添加 `flux-guide/` 入口
2. `AGENTS.md` 文档路由表更新

---

## 5. 调用 `validate.mjs` 结果（2026-07-10）

```
Registry: 93 renderer types
  ERR: flux-guide/design-patterns/crud.md:145 /loadAction/dependsOn
    kind: "reaction" fields require a non-empty dependsOn array
  WARN: docs/components/crud/crud-comparative-analysis.md:300
    Unknown property "form" for renderer type "form"

Results: blocks=223  nodes=213  errors=1  warnings=1
```

`crud.md:145` 的 loadAction 示例缺少 `dependsOn` 字段。修复：在 `loadAction` 中添加 `dependsOn: []` 或提供真实依赖路径。

执行命令（Node 25+）：

```
node --experimental-loader ./flux-guide/scripts/css-stub.mjs flux-guide/scripts/validate.mjs
```

注意：需先 `pnpm build` 生成 dist 产物。

---

## 6. 附录：文件大小对比

| 当前文件                    | 当前行数 | 拆分后行数 | 评估                                   |
| --------------------------- | -------- | ---------- | -------------------------------------- |
| `01-quickstart.md`          | 347      | 347        | ✅ 适度                                |
| `02-reference.md`           | 578      | 0          | ❌ 过载，拆为 8 个文件                 |
| `02-expression-syntax.md`   | —        | ~30        | ✅                                     |
| `03-api-config.md`          | —        | ~30        | ✅                                     |
| `04-action-system.md`       | —        | ~90        | ✅                                     |
| `05-data-flow.md`           | —        | ~110       | ⚠️ 偏大，可再拆 data-source 到设计模式 |
| `06-form-validation.md`     | —        | ~80        | ✅                                     |
| `07-structural-nodes.md`    | —        | ~80        | ✅                                     |
| `08-tabs-state.md`          | —        | ~35        | ✅                                     |
| `09-amis-migration.md`      | —        | ~15        | ✅                                     |
| `design-patterns/layout.md` | —        | ~80        | ✅ 新增                                |

**合计**：拆分后 16 个文件（含 design-patterns 9 + mobile 5 + 入口 1 + 新增 1），平均每文件 ~80-100 行，便于 AI 精确定位。

---

## 7. 覆盖率评估（2026-07-10 全量清查）

### 7.1 代码库所有 renderer type 清单（去重后 100 个）

来自 `packages/*/src/*-definition.ts` 的注册清单：

| 包                             | type 数量 | type 列表                                                                                                                                                                                                                                           |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flux-renderers-basic`         | 16        | page, container, fragment, flex, text, button, icon, badge, tabs, dialog, drawer, loop, recurse, scope-debug, dynamic-renderer, reaction                                                                                                            |
| `flux-renderers-layout`        | 7         | wizard, grid, collapse, button-group, dropdown-button, steps, timeline                                                                                                                                                                              |
| `flux-renderers-form`          | 20        | form, fieldset, input-text, input-email, input-password, select, textarea, checkbox, switch, radio-group, checkbox-group, input-number, input-date, input-datetime, input-time, date-range, input-month, input-quarter, input-year, markdown-editor |
| `flux-renderers-form-advanced` | 18        | combo, array-editor, array-field, condition-builder, detail-field, detail-view, editor, input-file, input-image, input-table, key-value, object-field, picker, tag-list, transfer, input-tree, tree-select, variant-field                           |
| `flux-renderers-data`          | 9         | table, crud, data-source, chart, tree, list, service, pagination, statistics                                                                                                                                                                        |
| `flux-renderers-content`       | 18        | separator, spinner, progress, empty, card, link, image, json-view, markdown, html, cards, alert, mapping, status, audio, video, carousel, qrcode                                                                                                    |
| `flux-renderers-mobile`        | 5         | pull-refresh, infinite-scroll, swipe-cell, countdown, notice-bar                                                                                                                                                                                    |
| domain-host (合计)             | 13        | designer-page, designer-canvas, designer-palette, designer-field, designer-node-card, designer-edge-row, report-designer-page, report-inspector-shell, report-inspector, report-field-panel, report-toolbar, word-editor-page, spreadsheet-page     |

### 7.2 覆盖率矩阵

| 覆盖层级                    | 文件                      | 覆盖的 type                                                                                                                                                                                        | 覆盖数/总数 |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 语法参考                    | `02-expression-syntax.md` | (不针对特定 renderer)                                                                                                                                                                              | —           |
| API 配置                    | `03-api-config.md`        | (不针对特定 renderer)                                                                                                                                                                              | —           |
| 动作系统                    | `04-action-system.md`     | (不针对特定 renderer)                                                                                                                                                                              | —           |
| 数据流                      | `05-data-flow.md`         | data-source, service                                                                                                                                                                               | 2/9 data    |
| 表单校验                    | `06-form-validation.md`   | form (校验系统)                                                                                                                                                                                    | 1/20 form   |
| 结构节点                    | `07-structural-nodes.md`  | fragment, loop, recurse, reaction                                                                                                                                                                  | 4/16 basic  |
| Tabs                        | `08-tabs-state.md`        | tabs                                                                                                                                                                                               | 1/16 basic  |
| AMIS 差异                   | `09-amis-migration.md`    | (对比表)                                                                                                                                                                                           | —           |
| 快速入门                    | `01-quickstart.md`        | page, data-source, crud, form, dialog, combo, select, wizard, tabs, loop, reaction, input-file, input-text, input-email, input-password, input-number, button, text, chart, empty, spinner (20 个) | 20/100      |
| **设计模式 (原有)**         |                           |                                                                                                                                                                                                    |             |
|                             | `crud.md`                 | crud, table, data-source, pagination, statistics, dialog, form (完整 CRUD)                                                                                                                         | 7           |
|                             | `form.md`                 | form                                                                                                                                                                                               | 1           |
|                             | `data-source.md`          | data-source                                                                                                                                                                                        | 1           |
|                             | `conditional.md`          | fragment, loop, reaction                                                                                                                                                                           | 3           |
|                             | `custom.md`               | (自定义 renderer 流程)                                                                                                                                                                             | —           |
|                             | `tabs.md`                 | tabs                                                                                                                                                                                               | 1           |
|                             | `cascading-select.md`     | data-source, select                                                                                                                                                                                | 2           |
|                             | `file-upload.md`          | input-file, input-image                                                                                                                                                                            | 2           |
|                             | `cards.md`                | cards, card                                                                                                                                                                                        | 2           |
|                             | `layout.md`               | container, flex, grid                                                                                                                                                                              | 3           |
| **设计模式 (Phase 3 新增)** |                           |                                                                                                                                                                                                    |             |
|                             | `wizard.md`               | wizard                                                                                                                                                                                             | 1           |
|                             | `chart.md`                | chart                                                                                                                                                                                              | 1           |
|                             | `dynamic-renderer.md`     | dynamic-renderer                                                                                                                                                                                   | 1           |
|                             | `tree.md`                 | tree, tree-select, input-tree                                                                                                                                                                      | 3           |
|                             | `collapse.md`             | collapse                                                                                                                                                                                           | 1           |
|                             | `content-display.md`      | card, alert, mapping, status                                                                                                                                                                       | 4           |
|                             | `combo-input-table.md`    | combo, input-table                                                                                                                                                                                 | 2           |
| **移动端**                  | `mobile/` (5 个)          | pull-refresh, infinite-scroll, swipe-cell, countdown, notice-bar                                                                                                                                   | 5/5         |

### 7.3 仍无覆盖的 renderer type（按重要性排序）

以下 type 在 flux-guide **任何文件**中均无示例或专属说明：

| 优先级 | type                                                                                                                     | 包            | 说明                           | 建议                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------ | --------------------------------------------- |
| **高** | `service`                                                                                                                | data          | 数据容器，组合多个 data-source | 新增设计模式                                  |
| **高** | `picker`                                                                                                                 | form-advanced | 弹出选择器（选用户/选对象）    | 新增设计模式                                  |
| **高** | `transfer`                                                                                                               | form-advanced | 穿梭框（左右列表转移）         | 新增设计模式                                  |
| **高** | `condition-builder`                                                                                                      | form-advanced | 查询条件构建器                 | 新增设计模式                                  |
| **高** | `button-group`                                                                                                           | layout        | 按钮组合                       | 新增设计模式                                  |
| **高** | `dropdown-button`                                                                                                        | layout        | 下拉动作按钮                   | 新增设计模式                                  |
| **高** | `steps`                                                                                                                  | layout        | 步骤指示器                     | 新增设计模式                                  |
| **高** | `timeline`                                                                                                               | layout        | 时间线                         | 新增设计模式                                  |
| **中** | `list`                                                                                                                   | data          | 列表展示                       | 可合并到 content-display 或新增               |
| **中** | `icon`                                                                                                                   | basic         | 图标                           | 在 button/卡片中顺带说明即可                  |
| **低** | `link`                                                                                                                   | content       | 超链接                         | 基础用法，无需独立设计模式                    |
| **低** | `image`                                                                                                                  | content       | 图片                           | 基础用法                                      |
| **低** | `spinner`                                                                                                                | content       | 加载中                         | 已在 quickstart 和 design patterns 中顺带使用 |
| **低** | `empty`                                                                                                                  | content       | 空状态                         | 已在 quickstart 和 loop 中使用                |
| **低** | `separator`                                                                                                              | content       | 分割线                         | 基础用法                                      |
| **低** | `progress`                                                                                                               | content       | 进度条                         | 基础用法                                      |
| **低** | `badge`                                                                                                                  | basic         | 徽标                           | 基础用法                                      |
| **低** | `markdown-editor`                                                                                                        | form          | Markdown 编辑器                | 可新增设计模式（低优先级）                    |
| **低** | `audio`/`video`                                                                                                          | content       | 音视频                         | 较少使用                                      |
| **低** | `carousel`/`qrcode`                                                                                                      | content       | 轮播/二维码                    | 较少使用                                      |
| **低** | `array-editor`/`array-field`/`object-field`/`variant-field`/`detail-field`/`detail-view`/`key-value`/`tag-list`/`editor` | form-advanced | 复合字段                       | flux-guide 应顺带说明，但不需要独立设计模式   |

### 7.4 现有文档准确性问题

代码库快照校验发现的潜在不准确点：

1. **`01-quickstart.md` 标题**：标题写"15 个最常用代码段"，实际有 17 节。
2. **`01-quickstart.md §9 chart`**：使用了 `"source": "${dashboard.chartData}"`。Chart 的 `source` 是 `SchemaValue`，示例正确。
3. **`01-quickstart.md §3 CRUD`**：使用 `onRefresh` + `refreshSource` 模式。已验证 CRUD schema 支持 `onRefresh`。
4. **`content-display.md` 的 `Card`**：`card` 的 `title` 字段是 `SchemaInput` (value-or-region)，不是 `SchemaValue`。文档已正确使用 `[{ "type": "text", ... }]` 形式。
5. **`dynamic-renderer.md`**：`component:refresh` 触发 compile-time type hint warning。这不是错误，是静态分析的限制。
6. **`tree.md` `Tree`**：使用了 `source` 字段，但 Tree 的 schema 接口实际定义的是 `data` 字段 — 这是一个潜在的漂移。需核查。

### 7.5 补充建议

基于完整清查，建议 Phase 3 补充完成后，额外新增以下设计模式文件（按优先级）：

1. **`button-group.md`** — ButtonGroup + DropdownButton（同一设计模式，都是按钮组合）
2. **`service.md`** — Service 数据组合容器（补齐 data 包）
3. **`steps-timeline.md`** — Steps + Timeline（过程展示，可合并）
4. **`picker-transfer.md`** — Picker + Transfer（选择类控件，可合并）
5. **`condition-builder.md`** — ConditionBuilder 查询条件（最低优先级，复杂度高但使用场景较少）

或将这些内容以"章节"形式追加到现有设计模式中（如 button-group + dropdown-button 追加到 `layout.md`）。
