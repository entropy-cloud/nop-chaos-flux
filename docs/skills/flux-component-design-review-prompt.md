# Flux 组件设计审查 Skill

> 用途：在实现新组件前，对其 `docs/components/<type>/design.md` 进行标准合规性审查
> 审查对象：新组件设计文档（12 节模板） + `example.json`
> 前置阅读：`docs/components/index.md`、`docs/components/package-splitting-strategy.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/field-binding-and-renderer-contract.md`
> 触发词：设计审查、design review、组件设计检查、合规性审计

---

## ⚠️ 最重要的事：Flux 不是通用 React 组件库

Flux 组件设计与常规 React 组件有三点根本不同，审查时必须始终铭记：

1. **四通道**：组件消费 `props`/`meta`/`regions`/`events` 四个规范化通道，不读原始 JSON。`props` = 业务语义值，`meta` = 节点控制状态（冻结 META_FIELDS），`regions` = 编译后 slot 渲染器，`events` = ActionSchema 入口。不得混用。
2. **状态归属三态**：每个交互轴必须明确 `local`/`controlled`/`scope`，从不"先塞 React state 再说"。`<axis>Ownership` + `<axis>StatePath` 是标准字段对。
3. **请求下沉**：组件级 `api`/`initFetch`/`interval` 字段不存在——数据加载走 `data-source` + `loadAction` + action graph。

**已知高频错误（必须在审查中逐一排除）：**

| #   | 错误做法                                            | 正确做法                                                         | 违反规则          |
| --- | --------------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| E1  | 字段分类用 `value` / `action` 等自创名称            | 用 `props` / `meta` / `region` / `value-or-region` / `event`     | §5 字段分类       |
| E2  | 事件类型用 `SchemaEvent` / `SchemaEventCallback`    | 用 `ActionSchema`                                                | §8 事件           |
| E3  | 句柄命名用 `open` / `close` / `scrollTo`            | 用 `component:open` / `component:close` / `component:scrollTo`   | §8 组件句柄       |
| E4  | 句柄不写 failure paths                              | 每个 handle 记录 `not-mounted`, `not-visible` 等                 | §8 组件句柄       |
| E5  | 用 BEM 类名 (`__element--modifier`)                 | 根用 `.nop-*`，region 用 `data-slot`，状态用 `data-*` / `aria-*` | §10 DOM marker    |
| E6  | 不区分 `readOnly` 和 `disabled`                     | `readOnly` → `props`，`disabled` → `meta`                        | §3 通道合规       |
| E7  | 缺 `<axis>Ownership` 和 `<axis>StatePath`           | 每个交互轴配 `Ownership` + `StatePath` 字段对                    | §7 状态归属       |
| E8  | 缺 `statusPath`（仅限 interaction/data owner）      | interaction owner 必有 `statusPath`                              | §7 状态归属       |
| E9  | 组件级 `api` / `initFetch` / `interval`             | 零组件级请求字段，全走 `data-source`                             | §9 数据源         |
| E10 | `data` 字段语义为"实时绑定"                         | `data` 是初始快照，表达式只评估一次                              | §6.4 数据域 owner |
| E11 | `name` 和 `value` 同时作为表单字段绑定入口          | 只用 `name`，`value` 仅限只读展示                                | §1.3 字段绑定     |
| E12 | 用 React state 管理 scope 级状态                    | 用 `<axis>Ownership: 'scope'` + `<axis>StatePath`                | §7 状态归属       |
| E13 | `items` 不用，用 `itemsSource` / `tabsSource`       | 集合数据用单一 `items`                                           | §1.2 命名         |
| E14 | Options 使用 AMIS 的 `valueField/labelField`        | 用 `{ label, value }` 标准形状                                   | §1.2 命名         |
| E15 | Region 类型使用 `SchemaInput` / `SchemaRegion` 混用 | 统一使用 `RegionSchema`                                          | §6 区域           |

---

## 使用方法

1. 加载本技能，**先完整阅读一次全部 14 个 check 类别和已知高频错误表**
2. 读取待审查组件的 `design.md` 和 `example.json`
3. 逐条对照检查清单，**每条检查都看一眼高频错误表是否有同类案例**
4. 标记 pass/fail/na（不适用）
5. 每条 fail 需给出具体位置（节号+行号范围）和修复建议
6. 汇总严重等级：blocker / high / medium / low
7. **Blocker 和 high 必须在实现前修复**。Medium 可接受明确记录取舍理由，但取舍理由不得引用高频错误表中的已排除做法

---

## 检查清单

### 1. 文档结构完整性

缺少任何一节为 **blocker**。

- [ ] **§1 组件定位**：声明组件是什么、不是什么、owner 类型（instance-renderer / flux-owner-renderer / domain-host-renderer），以及 `propContracts`/`eventContracts`/`componentCapabilityContracts` 声明要求
- [ ] **§2 与 AMIS/既有产品的能力对照**：Flux 决策表，逐项标记采纳/不采纳及理由。**必须有 AMIS → Flux 映射说明**
- [ ] **§3 Flux renderer/type 定义**：`type` 字符串、`category`、`sourcePackage`、`fields` 数量、渲染策略
- [ ] **§4 Schema 设计**：完整 TypeScript 接口，含所有字段类型、默认值、JSDoc
- [ ] **§5 字段分类**：每个字段明确标记为 `props` / `meta` / `region` / `value-or-region` / `events` / `reaction` / `ignored`。**不得使用 `value` / `action` 等非标准名称**（见 E1）
- [ ] **§6 Regions 与 slot 约定**：列出所有 region 名称、slot 参数（`$slot.xxx`）、value-or-region 字段
- [ ] **§7 运行期状态归属**：每个交互轴明确归属 `local` / `controlled` / `scope`，列出 `*StatePath` 字段。**每个交互轴必须对应一对 `Ownership` + `StatePath` 字段**（见 E7）
- [ ] **§8 事件、动作与组件句柄能力**：完整事件表、内置 action 表、component handle 表（**必须包含 failure paths**，见 E4）
- [ ] **§9 数据源、表达式、导入能力接入点**：data-source 集成方式、表达式绑定、能力导入。**零组件级 `api`/`initFetch`/`interval` 字段**（见 E9）
- [ ] **§10 样式与 DOM marker 约定**：根 marker class、data-slot 表、data-\* 状态属性、className/classAliases。**无 BEM 类名**（见 E5）
- [ ] **§11 实现拆分建议**：文件结构、纯函数 helpers、controller hook、domain core 抽离建议
- [ ] **§12 风险、取舍与后续阶段**：性能风险、已知缺口、工程取舍、分阶段规划

### 2. Schema 设计合规

- [ ] **所有字段类型明确**：每个字段标记为 `string` / `number` / `boolean` / `SchemaValue<T>` / `RegionSchema` / `ActionSchema` / 业务枚举
- [ ] **无 `xxxExpr` / `xxxFormula` 并行字段名**（见 E13）
- [ ] **Boolean 字段使用肯定命名**：`clearable`、`searchable`、`disabled` 而非 `notClearable`（反模式）
- [ ] **Enum 字段使用受控词表**：`variant`、`size`、`mode`，文档列出所有可取值
- [ ] **集合数据使用 `items` 单正名字段**（见 E13）
- [ ] **Options 采用 `{ label, value }` 标准形状**：无 `valueField`/`labelField`/`joinValues`/`delimiter`（见 E14）
- [ ] **`name` 是双向绑定的唯一入口**：不接受 `value` + `name` 并存（见 E11）
- [ ] **`value` 仅在只读/owner payloads 等狭窄场景出现**（见 E11）
- [ ] **Icon 名使用 kebab-case**（Lucide 约定）
- [ ] **命名空间扩展字段使用 `namespace:key` 形式**
- [ ] **优先采用 Flux 标准名 > AMIS 遗留名**
- [ ] **布尔字段 authoring 类型为 `boolean | string`**，不接受 `"true"`/`"false"` 字符串字面量
- [ ] **Renderer 直接消费 resolved boolean 值**，不做 `Boolean()` 包裹或 truthiness 强制判断
- [ ] **需要特殊 wrapper root 标签？声明 `frameRootTag`**，不在 NodeRenderer 中硬编码 type
- [ ] **有嵌套 schema 结构的 prop？声明 `deepFields`**
- [ ] **需要默认校验行为？声明 `validationDefaults`**
- [ ] **需要编译时产物附着？声明 `compilation` 元数据**

### 3. Props / Meta / Regions / Events 通道合规

**这是 Flux 的最大特色，也是最容易被忽略的规则。**

- [ ] **`props`** = 业务运行时值：`label`、`variant`、`options`、`placeholder`、`name`、`items`、`readOnly`
- [ ] **`props.readOnly` = 字段编辑语义**（属于 props，见 E6）
- [ ] **`meta`** = 节点控制状态 + 外层框架。冻结 META_FIELDS：`id`、`className`、`frameClassName`、`when`、`visible`、`hidden`、`disabled`、`testid`
- [ ] **`meta.disabled` = 节点控制状态**（属于 meta，见 E6）
- [ ] **`className` 和 `disabled` 不应出现在 renderer 声明的 props 字段中**——它们是 meta 域，由 runtime 自动投影到 props
- [ ] **无 `name` / `label` / `title` 在 meta 中**——它们属于 `props` 或 `regions`（反模式）
- [ ] **布局容器暴露 per-slot `*ClassName`**：`bodyClassName`、`headerClassName`、`footerClassName`、`toolbarClassName`
- [ ] **Region 名使用自然业务名**：`body`、`header`、`footer`、`toolbar`、`empty`、`actions`、`item`（反模式：`xxxRegion`/`renderXxx`）
- [ ] **事件入口使用 `onXxx: ActionSchema`**，无字符串脚本（见 E2）
- [ ] **`value-or-region` 字段在字段分类中明确标注**
- [ ] **无硬编码 type dispatch**：渲染器内部不使用 `if (schema.type === 'xxx')` / `switch(type)` 选择行为——行为通过 `RendererDefinition` 声明式元数据表达
- [ ] **所有直读 raw schema 的字段显式声明为 static structural field**，不通过"先直读再说"的灰区字段

### 4. 数据源集成合规

- [ ] **`loadAction` 是 schema 层数据加载主入口**，走 `runtime.dispatch()` 而非独立 fetch
- [ ] **零组件级 `api` / `initFetch` / `interval` 字段**（见 E9）
- [ ] **`data-source` 是非渲染的命名源声明**，不是可视化组件
- [ ] **`source`-enabled prop 是字段级匿名源入口**
- [ ] **`data-source.name` 和 `statusPath` 在注册时读取，不支持 `${expr}`**
- [ ] **API 请求契约遵循 `ApiSchema` 规范**：url、method、data、params、headers、adaptors
- [ ] **复杂控件的后端数据通过 `@BizQuery` / `@BizMutation` 契约**

### 5. Action 系统合规

- [ ] **事件值一律是 `ActionSchema`**（对象或数组），**绝不用 `SchemaEvent` / `SchemaEventCallback`**（见 E2）
- [ ] **内置 action 使用 camelCase**：`ajax`、`setValue`、`refreshSource`、`openDialog`、`closeSurface`、`showToast`
- [ ] **组件实例能力使用 `component:<method>`**：`component:submit`、`component:setValue`、`component:refresh`（见 E3）
- [ ] **`args` 是唯一 payload 载体**
- [ ] **Control flow 字段完整**：`when`、`then`、`onError`、`onSettled`、`parallel`、`continueOnError`
- [ ] **ActionSchema 支持 `preventDefault` / `stopPropagation` 字段**（如需阻止原生行为）
- [ ] **Component handles 通过 `componentCapabilityContracts` 注册**
- [ ] **每个 handle 记录 failure paths**（见 E4）：至少记录 `not-mounted`、`not-visible`，再加组件特有失败路径
- [ ] **生命周期 action 使用 `onMount` / `onUnmount`**，renderer 不自己适配
- [ ] **DOM/React 事件入口转发 event 到 `props.events.onXxx(event)`**，不丢弃原生事件

### 6. 状态归属合规

- [ ] **每个交互轴有明确的 `local` / `controlled` / `scope` 归属**（见 E12）
- [ ] **`<axis>Ownership` 字段存在**，值域 `'local' | 'controlled' | 'scope'`（见 E7）
- [ ] **`<axis>StatePath` 字段存在**，scope ownership 的持久化路径（见 E7）
- [ ] **`statusPath` 是只读 owner 级摘要 DTO 发布**（见 E8）
- [ ] **不使用 `id` / `name` 作为隐式状态读取路径**
- [ ] **Owner 类型明确**：交互 owner（table/tabs）、数据域 owner（form）、surface owner（dialog/drawer）、shell owner（page）
- [ ] **无 `$parentScope` 逃生口**——使用显式投影 `rowData`、`data`
- [ ] **dispatch-local 临时数据使用 `evaluationBindings` 而非 child scope**
- [ ] **需要持久化读写环境才创建 child scope**
- [ ] **Renderer 拥有的 child scope 在卸载时显式 dispose**

### 7. 数据域 owner 合规（仅表单/数据类组件）

- [ ] **`data` = owner 初始快照，不是实时绑定**——表达式只评估一次（见 E10）
- [ ] **两种发布模式明确**：`live`（即时写穿）和 `staged`（本地暂存，confirm/cancel 后发布）

### 8. DOM Marker 合规

- [ ] **根 marker class 使用 `nop-` 前缀**，仅标识 renderer 类型
- [ ] **根 marker 不编码内部 region 或状态**
- [ ] **内部 region 使用 `data-slot` 属性**，非 BEM 类名（见 E5）
- [ ] **状态使用 `data-*` 或 `aria-*`**，非 BEM modifier（见 E5）
- [ ] **shadcn/ui 原生 marker 直接使用**，不套 BEM 壳
- [ ] **Test anchor 优先顺序**：`getByRole` > `data-slot` > `.nop-*` > `data-testid`

### 9. 样式合规

- [ ] **所有样式最终解析为 TailwindCSS class**
- [ ] **Widget 渲染器自含完整内部样式**，但依然发射根 marker + `data-slot`
- [ ] **`classAliases` 机制说明**：短名→长 Tailwind 串，继承式覆盖
- [ ] **无 BEM**（见 E5）

### 10. 包归属合规

- [ ] **包归属经过 `package-splitting-strategy.md §6` 决策树验证**
- [ ] **与现有包的依赖方向正确**：无同级反向依赖
- [ ] **新包理由充分**：现有类别无法容纳时新建包，并在 `package-splitting-strategy.md` 中补充新分支

### 11. 实现拆分合规

- [ ] **纯逻辑层（store / model / helpers）与 UI 层分离**：非 React 依赖抽离为纯 TS
- [ ] **controller hook 范围窄且局部**
- [ ] **遵循 `RendererComponentProps` 契约**：props/meta/regions/events/helpers，不另造
- [ ] **交互能力通过 action / component handle 暴露**，不通过 undocumented imperative ref
- [ ] **渲染阶段无副作用**：render 中不写 store、不 setState

### 12. 性能合规

- [ ] **大列表使用虚拟滚动**：行数预期超过 200 时采用 `@tanstack/react-virtual`
- [ ] **高频事件（拖拽/滚动/缩放）使用 rAF 节流或 debounce**
- [ ] **拖拽等像素级操作使用命令式 DOM + ref bridge**，不逐像素触发 React 状态更新
- [ ] **固定行高用于虚拟滚动场景**

### 13. Example.json 合规

- [ ] **存在 `example.json`** 与 `design.md` 同目录
- [ ] **example.json 中的字段与 schema 定义一致**
- [ ] **example 演示了典型使用场景**
- [ ] **ActionSchema 使用标准形式**：`{ "action": "showToast", "args": {...} }`
- [ ] **示例已注册或在 `examples.manifest.json` 中标注状态**

### 14. Nop ERP 集成合规（仅 ERP 场景）

- [ ] **数据通过 GraphQL @BizQuery / @BizMutation 契约**
- [ ] **权限通过 `xui:roles` / `xui:permissions` 控制**
- [ ] **数据加载通过 data-source 节点声明式配置**
- [ ] **字典值通过 `@dict:` 前缀加载**
- [ ] **i18n 通过 `@i18n:` 前缀或 i18n 通道**

### 15. RendererDefinition 元数据声明合规

- [ ] **无硬编码 type dispatch**：渲染器行为不依赖 schema.type 硬编码分支（if/switch）——通过 RendererDefinition 声明式元数据表达（`scopePolicy`、`wrap`、`deepFields`、`validationDefaults`、`compilation` 等）
- [ ] **自定义校验行为通过 validationDefaults 声明**，非 schema.type 判断
- [ ] **自定义编译行为通过 compilation 元数据声明**，非 schema.type 判断

---

## 审查报告模板

```markdown
# 设计审查报告：<组件名>

审查日期：<日期>
审查版本：<design.md 行数范围>
审查依据：docs/skills/flux-component-design-review-prompt.md

高频错误触发表（见 Skill 顶部 E1-E15）：

| 错误编号 | 是否命中 | 位置 | 说明 |
| -------- | -------- | ---- | ---- |
| E1       | N/Y      | §X   | ...  |
| E2       | ...      | ...  | ...  |
| ...      | ...      | ...  | ...  |

## 结果汇总

| 类别         | pass | fail | na  |
| ------------ | ---- | ---- | --- |
| 文档结构     | /    | /    | /   |
| Schema 合规  | /    | /    | /   |
| 通道合规     | /    | /    | /   |
| 数据源       | /    | /    | /   |
| Action 系统  | /    | /    | /   |
| 状态归属     | /    | /    | /   |
| DOM Marker   | /    | /    | /   |
| 样式         | /    | /    | /   |
| 包归属       | /    | /    | /   |
| 实现拆分     | /    | /    | /   |
| 性能         | /    | /    | /   |
| Example      | /    | /    | /   |
| 数据域 owner | /    | /    | /   |
| Nop ERP 集成 | /    | /    | /   |

总计：N pass, N fail, N na

## Blocker（实现前必须修复）

1. **§X.Y [E2] 事件类型为 SchemaEvent 而非 ActionSchema**：...

## High（实现前必须修复）

1. **§X.Y [E1] 字段分类使用自创名称 `value`**：...

## Medium（建议修复，可记录取舍理由）

1. **§X.Y [E5] DOM marker 使用了 BEM 类名**：...

## Low（可推迟）

1. **§X.Y 缺 example 演示某种交互**：...
```

---

## 审查完成后的行动

1. 审查报告完成后，所有 **blocker** 和 **high** 必须由另一个代理修复
2. 修复后**必须再次运行本审查**，确认高频错误表全部 cleared
3. 只有当全部 14 个类别的 fail 数归零（或仅有 medium 且记录取舍）时，设计文档才算通过审查

## 与现有技能的关系

- `implementation-contract-review-prompt.md`：审查 plan/design 是否压缩为可测试的实现契约。本 skill 更早介入。
- `code-quality-audit-prompt.md`：审查代码实现质量。本 skill 审查设计文档阶段。
- `deep-audit-prompts.md`：多维深度审计。本 skill 聚焦 Flux 组件设计标准的专项检查。
- `ux-design-pattern-audit-prompt.md`：审查 UX 模式。与本 skill 互补。

使用顺序：

1. [本 skill] 设计文档完成 → 标准合规性审查
2. `ux-design-pattern-audit-prompt.md` → 交互质量审查
3. `implementation-contract-review-prompt.md` → 实现契约可测试性审查
4. 实现完成后 → `code-quality-audit-prompt.md`
