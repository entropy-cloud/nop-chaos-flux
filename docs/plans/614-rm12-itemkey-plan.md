# 614 RM-12 数组容器行键统一 `itemKey`（input-table `rowKey` 改名 + 生成物/示例同步）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-12；`docs/analysis/2026-10-15-renderer-vocabulary-consistency-analysis.md` §债三（owner 事实源，含收口 rg 口径）
> Related: roadmap Cross-Cutting 7（单标准零兼容分叉，用户显式指令 2026-10-15）；`docs/references/naming-conventions.md` §4.9（itemKey 唯一字段名已入库）

## Purpose

数组容器族（array-field / combo / input-table）声明行数据键字段的 schema 属性名当前分裂为 `itemKey`（array-field/combo）与 `rowKey`（input-table 唯一孤例）——而 input-table 渲染器内部**早已用 `itemKeyField` 局部命名读取该 prop**。本 plan 将 input-table 的 schema 属性统一为 `itemKey`（无兼容改名），同步渲染器读取路径/警告文案/prop 覆盖声明/生成物/示例/docs。data 族行标识 `rowKey` 的归属另行报人工裁决（见下）。

## 授权链（保护区）

触及 `renderer definition fields`（input-table 的 prop 覆盖声明 `{ key: 'rowKey', kind: 'prop' }` 改名）属 plan-first；公开 schema 属性改名属结构性重构。授权链落字：①**roadmap Header 授权 provenance**——RM-12 增补系 2026-10-15 用户显式指令（"补充新的工作项用于统一 ownership 前缀分裂、**itemKey/rowKey 分叉**、事件类型三态"）并裁定**不考虑兼容性、只采用一个标准方案**（工作项增删属人类职权，guide §Roadmap Role；R6→R7 共识审查 approved）；②**词汇报告 §债三裁决**（数组容器行键字段名 = `itemKey` 唯一；input-table `rowKey` 改名，无兼容）；③**2026-10-16 用户指令**（"执行 renderer-metamodel-roadmap.md 直到彻底完成，每个工作项按照 plan guide 拟制计划完成，每个计划完成后自动提交一次"）= 本 plan 执行授权；④`docs/references/naming-conventions.md` §4.9 已入库（"唯一字段名 `itemKey?`…不引入 `rowKey` schema 字段"）。

## Current Baseline（live 核对 2026-10-16，HEAD da38f5a11）

- **Schema 属性定义（唯一孤例）**：`packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:116` — `InputTableSchema.rowKey?: string;`（同文件 `:21` `ArrayFieldSchema.itemKey?: string`、`:95` `ComboSchema.itemKey?: string` 为既有标准形态）。
- **渲染器读取路径**：`input-table-renderer.tsx:74-76` — `typeof props.props.rowKey === 'string' && props.props.rowKey.trim().length > 0 ? props.props.rowKey.trim() : undefined`（赋给局部变量 `itemKeyField`——**内部早以 item 术语命名**）。
- **警告文案**：`input-table-renderer.tsx:102` — `` `[InputTableRenderer] Duplicate rowKey values detected for "${name}": …` ``。
- **prop 覆盖声明（definition fields）**：`input-table-renderer.tsx:305` — `{ key: 'rowKey', kind: 'prop' }`。
- **注释并列写法**：`composite-field/array-container-controller.ts:68` — `/** Preferred data-derived key field for object-kind items ('itemKey' / 'rowKey'). */`。
- **生成物**：`flux-guide/flux-types/schema.d.ts:1466` `InputTableSchema` 的 `:1474 rowKey?: SchemaValue;`（由 `flux-guide/scripts/generate-types.mjs` 经 registry 再生成，R1 m2 勘误路径；行号为当前快照，regenerate 后以 live 为准）。**同文件 `:1560`（TableSchema）与 `:1804`（CrudSchema）的 `rowKey` 属 data 族**，不在本 plan 改名面。
- **flux-guide 文档/示例（input-table 相关）**：`design-patterns/combo-input-table.md:201`（input-table 属性表 `rowKey` 行——同文件 `:191` 已列 `itemKey`，即同一属性表并存两个名字）、`examples/business-document-formula.md:68`（`type: 'input-table'` 示例 `"rowKey": "name"`）。
- **docs 组件 owner 文档**：`docs/components/input-table/design.md:21`（§4 schema 设计"正式字段为 `name`、`label`、`columns`、**`rowKey`**、…"）与 `:27`（§5 字段分类 "`name`、`columns`、**`rowKey`**、…: `value`"）——**report/plan 前稿未列，live 枚举新发现；属 live owner-doc，改名后不改即形成 owner-doc ↔ live 漂移**。
- **docs 组件示例**：`docs/components/input-table/example.json:5` — `"rowKey": "id"`（**report/plan 前稿未列，live 枚举新发现**）。
- **apps/playground（live 枚举新发现，前稿未列）**：`src/pages/w4c-composite-form-family-demo.tsx:96`（`rowKey: 'sku'`）、`src/complex-pages/page-schemas/business-document.json:94`（`"rowKey": "name"`）、`src/component-lab/renderers/input-table-lab-page.tsx:21`、`:55`（`rowKey: 'sku'`）与 `:116`（描述文案 "rowKey keeps item identity stable"）。
- **data 族行标识 `rowKey`（语义=记录身份，非列字段）**：`data/schemas.ts:136`（TableSchema）+ `crud-schema.ts:260`（CrudSchema）+ definition fields 注册 `data-renderer-definitions.ts:75`（**`:75` 属 `type: 'table'` 定义**——该定义 :29 起、`fields` :64 起、下一 `type: 'data-source'` 定义 :323 起；**`list` 未注册 `rowKey`**）与 `crud-renderer-definition.ts:188`（属 `crud` 定义）+ `crud-schema.ts:342`（默认 `rowKey ?? 'id'`）+ `data-schema-validation.ts:332`（`crud.primaryField` 迁移提示文案）+ `data-renderer-definitions.ts:257`（`valueField` 描述"default rowKey"）+ 内部类型成员 `TableRowEntry.rowKey`（data 包 204 处 `rowKey` 命中（口径三分列，R2 m1：`rg -c "rowKey" packages/flux-renderers-data/src -g '!*.test.*'` 逐文件计数求和 = **204**；`rg -c "rowKey" packages/flux-renderers-data/src` 含测试计数求和 = **489**；`rg -o "rowKey" packages/flux-renderers-data/src | wc -l` 含测试出现次数 = **514**）中绝大多数为该内部字段与派生局部变量，**非 schema 词汇**）+ data 族文档示例（`table.md`/`crud.md`/`list.md`/`master-detail.md`/`inline-quick-edit.md`/`01-quickstart.md`/`picker-transfer.md` 等，词汇报告 §债三显式排除清单已登记）。
- **测试面**：form-advanced 内 2 处 `rowKey` 断言均在 `table`/`crud` fixture（`tag-list.test.tsx:245`、`picker-schema-override.test.tsx:65`）——**属 data 族，不在改名面**；本项 rename 的测试同步以 typecheck+test 全量枚举为准。
- 基线验证：HEAD da38f5a11 = RM-11 收口提交，五门禁全绿（16,555 passed/1,801 文件/0 FAIL）。

## Goals

- **schema 属性改名**：`InputTableSchema.rowKey` → `itemKey`（`composite-schemas.ts:116`），三渲染器 schema 属性名统一为 `itemKey`。
- **读取路径与元数据同步**：`input-table-renderer.tsx:75-76` 读 `props.props.itemKey`（局部变量 `itemKeyField` 命名不变，语义更贴）；`:102` 警告文案改 `Duplicate itemKey values`；`:305` prop 覆盖声明 key 改 `'itemKey'`；`array-container-controller.ts:68` 注释去 `'rowKey'` 并列。
- **生成物与文档示例同步**：`flux-guide/flux-types/schema.d.ts` 再生成（InputTableSchema.rowKey → itemKey，`:1474` 一处外观变化）；`combo-input-table.md:201` 删 `rowKey` 行（`:191` 已列 `itemKey`）；`business-document-formula.md:68`、`docs/components/input-table/example.json:5`、apps/playground 三处 schema 与描述文案同步改名。
- **无兼容分叉**：不留 `rowKey` 别名、不设双读过渡层（Cross-Cutting 7）。
- **收口验证**：按 Closure Gates 的机器可复现口径（**三条应空命令 + 一条定向校验（命中集恰为 data 族两行）**，口径定义见 Closure Gates；不用「input-table 相关命中归零」这类人工判别概括——`flux-guide` 侧 data 族示例必然非空）+ 五门禁全绿。
- **data 族归属报人工裁决**：live 枚举全部 data 族位点（见 Baseline）后形成裁决请求（见下节），**不静默并入、不静默排除**；裁决前维持现状。

## Non-Goals

- **不改 data 族行标识 `rowKey`**（TableSchema/CrudSchema 的 schema 属性[**`ListSchema` 无此字段**，R1 m3 勘误]、definition fields 注册、内部 `TableRowEntry.rowKey` 成员、data 族文档示例）——归属待人工裁决，裁决前维持现状（roadmap 显式要求）。
- 不清理数据行运行时兼容键 `item.__rowKey`（`composite-item-keys.ts:21`；属数据形状兼容层，非 schema 属性命名——词汇报告 §债三显式排除）。
- 不改任何运行时行为（纯 schema 属性改名：属性名变了，读取路径同步，值语义与派生逻辑零变化）。
- 不动历史 docs（`docs/logs/*`、`docs/audits/*` 对旧名的历史记载按 append-only 先例保留）。
- 不动 RM-10/11 范围；不动 `effectiveOwnership` 等其它词汇漂移；e2e 不新增。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`（InputTableSchema）。
- `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx`（读取路径 :75-76 / 警告文案 :102 / prop 覆盖声明 :305）。
- `packages/flux-renderers-form-advanced/src/composite-field/array-container-controller.ts:68`（注释）。
- `flux-guide/flux-types/schema.d.ts`（再生成）+ `flux-guide/design-patterns/combo-input-table.md` + `flux-guide/examples/business-document-formula.md`。
- `docs/components/input-table/example.json` + `docs/components/input-table/design.md`（§4 正式字段清单、§5 字段分类两处）。
- `apps/playground/src/pages/w4c-composite-form-family-demo.tsx`、`apps/playground/src/complex-pages/page-schemas/business-document.json`、`apps/playground/src/component-lab/renderers/input-table-lab-page.tsx`。
- 测试/fixtures 同步（以 `pnpm typecheck` + `pnpm test` 全量枚举为准）。
- roadmap 状态流转 + daily log。

### Out Of Scope

- data 族 `rowKey`（人工裁决后另行处理）；`item.__rowKey` 数据行兼容键；历史 docs 记载；e2e 新增；RM-10/11。

## Failure Paths

不适用：纯 schema 属性改名（零运行时行为变化——读取路径与声明同步改，派生逻辑不变），风险（遗漏站点）由 `pnpm typecheck` + 全量 test + 收口 rg 口径枚举兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——纯属性改名非行为面（roadmap 行为面列表不含 RM-12），零运行时影响。判别承载体：①**收口 rg 口径**（**三条应空命令 + 一条定向校验（命中集恰为 data 族两行）**，口径定义见 Closure Gates）；②**判别钉（R1 M2 勘误：原 `'rowKey' extends keyof InputTableSchema` 写法不可行——`InputTableSchema` 经 `BoundFieldSchemaBase` → `BaseSchema` → `SchemaObject` 带索引签名 `[key: string]: SchemaValue`，`keyof` 含 `string`，该条件改名前后**恒为 true**，零判别力）**，改双钉：

- **落点与导入路径（R2 m2）**：新增钉文件 `packages/flux-renderers-form-advanced/src/__tests__/input-table-itemkey.test.ts`，`InputTableSchema` **经包内相对路径** `../composite-field/composite-schemas.js` 导入（该类型未经 `src/index.tsx` 公开导出，按包名导入必挂；**不新增公开导出**）。
- **类型面**：以剥离索引签名的 `KnownKeys<T> = { [K in keyof T]: string extends K ? never : K }[keyof T]` 判别——`expectTypeOf<'rowKey'>().not.toExtend<KnownKeys<InputTableSchema>>()` 与 `expectTypeOf<'itemKey'>().toExtend<KnownKeys<InputTableSchema>>()`（`expect-type` 的 `.not.toExtend<T>()` 为仓内既有用法）；判别机制=旧实现下 `KnownKeys` 含 `'rowKey'`，首条必挂。
- **元数据面（运行时）**：`registerFormAdvancedRenderers(registry)` 后对 registry 断言 `input-table` 的 `fields` 含 `{ key: 'itemKey', kind: 'prop' }` 且不含 `key: 'rowKey'`（入口与 `input-table-renderer.tsx:305` 同源）——旧实现下 fields 为 `key: 'rowKey'`，断言必挂。
  ③全量 typecheck + 五门禁。既有 input-table 测试族（renderer/controller/keys）须保持全绿以证零行为变化。

## Execution Plan

### Phase 1 - schema 属性与渲染器读取面改名

Status: planned
Targets: `composite-schemas.ts`、`input-table-renderer.tsx`、`array-container-controller.ts`

- Item Types: `Fix`、`Proof`

- [ ] `InputTableSchema.rowKey` → `itemKey`（`composite-schemas.ts:116`）。
- [ ] `input-table-renderer.tsx` 三处同步：`:75-76` 读 `props.props.itemKey`、`:102` 警告文案 `itemKey`、`:305` prop 覆盖声明 `{ key: 'itemKey', kind: 'prop' }`。
- [ ] `array-container-controller.ts:68` 注释去 `'rowKey'` 并列。
- [ ] Proof：`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 绿；`rg -n "rowKey" packages/flux-renderers-form-advanced/src --glob '!*.test.*'` 中 input-table 相关归零（data 族无命中）。

Exit Criteria:

- [ ] 源码面 input-table `rowKey` 归零（`composite-schemas.ts`/`input-table-renderer.tsx`/`array-container-controller.ts`）；form-advanced typecheck 绿。

### Phase 2 - 生成物/文档/示例/apps 同步

Status: planned
Targets: `flux-guide/flux-types/schema.d.ts`、`flux-guide/{design-patterns/combo-input-table.md,examples/business-document-formula.md}`、`docs/components/input-table/{example.json,design.md}`、apps/playground 3 文件

- Item Types: `Fix`、`Proof`

- [ ] 先 `pnpm build` 后经 css-stub loader 再生成 `flux-types/schema.d.ts`（InputTableSchema `rowKey` → `itemKey`；**data 族 `:1560/:1804` 的 `rowKey` 保持**——改名只回落 schema 定义）。
- [ ] `combo-input-table.md:201` 删 `rowKey` 属性表行（`:191` `itemKey` 已存在）；`business-document-formula.md:68` 与 `docs/components/input-table/example.json:5` 改 `itemKey`。
- [ ] apps/playground 三文件：`w4c-composite-form-family-demo.tsx:96`、`business-document.json:94`、`input-table-lab-page.tsx:21/55/116` 改 `itemKey`（含描述文案）。
- [ ] `docs/components/input-table/design.md:21`（§4 正式字段清单）与 `:27`（§5 字段分类）改 `itemKey`。
- [ ] Proof（**机器可复现口径**，R2 修订：只保留确定可为空的定向命令）：
      `rg -n "rowKey" packages/flux-renderers-form-advanced/src --glob '!*.test.*'`（该包无 data 族，应空）
      `rg -n "rowKey" flux-guide/design-patterns/combo-input-table.md flux-guide/examples/business-document-formula.md`（应空）
      `rg -n "rowKey" docs/components/input-table apps/playground/src/pages/w4c-composite-form-family-demo.tsx apps/playground/src/complex-pages/page-schemas/business-document.json apps/playground/src/component-lab/renderers/input-table-lab-page.tsx`（应空）
      `rg -n "rowKey" flux-guide/flux-types/schema.d.ts`（**定向校验，非「应空」**：改名后命中集应恰为 data 族两行 `TableSchema`/`CrudSchema`，`InputTableSchema` 段零命中；宽口径 `flux-guide --glob '*.md'` **预期非空**——data 族 7 个 md 文件保留，不列为「应空」断言）

Exit Criteria:

- [ ] 生成物与 live 一致（data 族 `rowKey` 保留）；文档/示例/apps 无 input-table `rowKey` 残留。

### Phase 3 - data 族人工裁决请求落字 + 收口验证

Status: planned

- Item Types: `Decision`、`Proof`

- [ ] data 族裁决请求落 `## Human Adjudication Request`（live 枚举清单 + 两方案 + 建议），并在 daily log 与会话总结中显式提出；裁决前维持现状（roadmap 要求"不静默并入、不静默排除"）。
- [ ] 判别钉（`KnownKeys` 类型面 + registry 元数据面）+ 收口 rg 口径复跑（**三条应空命令 + 一条定向校验（命中集恰为 data 族两行）**，口径定义见 Closure Gates）。

Exit Criteria:

- [ ] 裁决请求在案且被显式提出（非静默）；判别钉绿；收口 rg 口径满足（**三条应空命令 + 一条定向校验（命中集恰为 data 族两行）**，口径定义见 Closure Gates）（全量五门禁属 Closure Gates，不入本 Phase——Minimum Rule 18）。

## Human Adjudication Request（data 族行标识 `rowKey` 归属）

> roadmap RM-12 显式要求：data 族行标识 `rowKey` 的归属"plan 内 live 枚举全部位点后报人工裁决，不静默并入、不静默排除；裁决前维持现状"。本节即该裁决请求；**本 plan 不自行裁定**。

**裁决问题**：data 族（`TableSchema`/`CrudSchema`——**R1 m3 勘误：`ListSchema` 无 `rowKey` 字段**（live `data/schemas.ts:328-351` 无该成员），roadmap RM-12 原文与词汇报告同误，plan 就地勘误）的 `rowKey`（语义 = 数据**记录身份**字段名，用于行稳定 key 派生/选择集合/子行 key 回退）是否并入数组容器的同一单标准 `itemKey`？

**live 枚举（2026-10-16，全仓）**：

| 类别                          | 位点                                                                                                                                                                                                                                                     | 语义                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| schema 属性声明               | `data/schemas.ts:136`（TableSchema）、`crud-schema.ts:260`（CrudSchema）；`.d.ts` 生成物 `:1560`/`:1804`                                                                                                                                                 | 记录身份字段名（author 声明源数据里哪个字段是记录 id）                     |
| definition fields 注册        | `data-renderer-definitions.ts:75`（**`type: 'table'` 定义内**；`list` 未注册）、`crud-renderer-definition.ts:188`（`crud` 定义内）                                                                                                                       | 编辑器/工具链可见的 prop 元数据                                            |
| 默认与派生                    | `crud-schema.ts:342`（`rowKey: schema.rowKey ?? 'id'`）；`data-schema-validation.ts:332`（`primaryField` 迁移提示）；`data-renderer-definitions.ts:257`（`valueField` 描述"default rowKey"）                                                             | 缺省值与文案                                                               |
| **内部类型成员（非 schema）** | `TableRowEntry.rowKey`（`table-renderer/types.ts`）+ data 包内 204 处 `rowKey` 命中中绝大多数（`use-table-selection.ts` 等派生的行键集合/局部变量/参数名）                                                                                               | **数据结构成员与局部命名，不属 schema 词汇**                               |
| 数据行兼容键（显式排除）      | `composite-item-keys.ts:21` `item.__rowKey`                                                                                                                                                                                                              | 数组元素运行时属性，非 schema 属性（词汇报告 §债三显式排除，单独立项处理） |
| data 族文档示例               | `flux-guide/design-patterns/{table,crud,list,picker-transfer}.md`（R1 m1 勘误：`picker-transfer.md` 在 `design-patterns/`）、`flux-guide/examples/{master-detail,inline-quick-edit}.md`（R1 m1 勘误：二者在 `examples/`）、`flux-guide/01-quickstart.md` | 示例 JSON 与叙述（词汇报告 §债三显式排除清单已登记）                       |

**两方案**：

- **方案 A（维持现状，分族两名）**：数组容器 = `itemKey`（行数据键，供 React key 派生）；data 族 = `rowKey`（记录身份，供选择集合/子行回退）。理由：语义不同族（"行数据键" vs "记录身份字段名"），且 `TableRowEntry.rowKey` 是跨 204 处的内部类型成员，并入需全包机器化改名 + 触及选择/虚拟滚动/子行 key 回退等多条运行时路径，收益（命名统一）与风险（大面积改改名、测试重锚）不成比例。
- **方案 B（并入单标准 `itemKey`）**：data 族 schema 属性与 definition fields 改 `itemKey`，内部类型成员 `TableRowEntry.rowKey` 视裁定一并或分步改。理由：Cross-Cutting 7"只采用一个标准方案"若按最严格解读，"行键"概念在 schema 面应只有一个名字；缺点是 data 族 `rowKey` 的语义确有别于数组容器行数据键，且改动面大（204 处内部命中需逐类判别）。

**建议（供人工参考，非裁定）**：方案 A——词汇报告 §债三自身已将 data 族列入"显式排除清单"（"是否并入同一单标准不默认裁定"），且其语义（记录身份）与数组容器行数据键不同族；但 roadmap 要求人工确认，故请明确裁定 A 或 B（或 A + 内部类型成员单独处理）。

**裁决前行为**：本 plan 维持现状（data 族 `rowKey` 零改动）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_d44e671e（R1~R4，独立 fresh 子 agent，全仓独立扫描 + 行号逐条核对 + 判别钉可行性推演）
- Verdict: `pass`（R4 零 Blocker/零 Major，达成共识 → 升 active）
- Rounds: 4（R1 fail 0B/2M/5m → 修订；R2 fail 0B/1M/4m[修订引入「应空」与「预期保留」自冲突 + m4 静默失配] → 修订；R3 fail 0B/1M/2m[旧概括残句三处 + m4 仍未落字(表格列填充致替换失配)] → 修订；R4 定点 pass，仅 1 条非阻塞 Minor[本记录回填]）
- Findings addressed: M1=input-table owner-doc `docs/components/input-table/design.md:21/:27` 漏枚举（且与 plan 自身 Phase 2 Proof 的 rg 口径矛盾）→ 补入 Baseline/Scope/Phase 2 checklist/Closure Gates；M2=类型面判别钉 `'rowKey' extends keyof InputTableSchema` 因 `SchemaObject` 索引签名恒 true、零判别力 → 改双钉（`KnownKeys<T>` 类型面 + registry fields 元数据面，各写明旧实现下必挂的判别机制）；m1=flux-guide 文档路径归属勘误（`picker-transfer.md` 在 design-patterns、`master-detail.md`/`inline-quick-edit.md` 在 examples）；m2=生成器路径 `scripts/`→`flux-guide/scripts/`；m3=`ListSchema` 实无 `rowKey`（roadmap/词汇报告原文同误）→ 裁决问题与列举就地勘误 + 核实 `data-renderer-definitions.ts:75` 仅 `type:'table'`；m4=补 204 计数口径命令；m5=收口 rg 口径改**四条机器可复现命令**（附预期保留显式排除清单）、Phase 3 Exit 去重复的五门禁（Minimum Rule 18）。

## Closure Gates

- [ ] `InputTableSchema.rowKey` → `itemKey` 且读取路径/警告文案/prop 覆盖声明/注释四处同步
- [ ] 收口 rg 口径（机器可复现，非人工判别）——**三条「应空」命令 + 一条定向校验**（R2 修订：不得把确定非空的命令写成「应空」）：
      应空 ①：`rg -n "rowKey" packages/flux-renderers-form-advanced/src --glob '!*.test.*'`
      应空 ②：`rg -n "rowKey" flux-guide/design-patterns/combo-input-table.md flux-guide/examples/business-document-formula.md`
      应空 ③：`rg -n "rowKey" docs/components/input-table apps/playground/src/pages/w4c-composite-form-family-demo.tsx apps/playground/src/complex-pages/page-schemas/business-document.json apps/playground/src/component-lab/renderers/input-table-lab-page.tsx`
      定向校验 ④：`rg -n "rowKey" flux-guide/flux-types/schema.d.ts` 命中集恰为 `{TableSchema, CrudSchema}` 两行（data 族，预期保留），且 `InputTableSchema` 段（生成物中自其 interface 起至下一 interface 止）零命中
      预期保留（显式排除清单）：data 族 `packages/flux-renderers-data/src`（TableSchema/CrudSchema + `TableRowEntry.rowKey` 内部成员）、`composite-item-keys.ts` 的 `item.__rowKey`、data 族文档示例（`flux-guide/{design-patterns,examples}/*` 中 table/crud/list 示例 + `01-quickstart.md`）、历史 docs（`docs/logs`、`docs/audits`）
- [ ] 生成物 `flux-types/schema.d.ts` 与 live 一致（data 族 `rowKey` 保留）
- [ ] 无兼容分叉（不留 `rowKey` 别名/双读层）
- [ ] 类型面判别钉（`InputTableSchema` 具 `itemKey`、不具 `rowKey`）在案
- [ ] data 族裁决请求已落字并显式提出（非静默）
- [ ] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）
- [ ] roadmap RM-12 状态流转 + daily log 条目
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`
- [ ] e2e 意图声明与披露义务落字

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- `item.__rowKey` 数据行兼容键的清理（词汇报告 §债三显式排除）：如需处理单独立项。
- data 族裁决若选方案 B，其内部类型成员与 204 处引用属独立工作面，单独立项。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立 fresh 子 agent）
- Evidence: （task id / 核对摘要）

Follow-up:

- （收口时填写或写 no remaining plan-owned work）
