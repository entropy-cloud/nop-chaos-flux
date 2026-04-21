# 04 Owner Validation And Data Model

## 1. Owner substrate

`Owner` 是运行时组织骨架，用来统一：

1. 值生命周期归属
2. validation state 归属
3. submit / confirm / draft / row projection / surface state
4. create-owner / inherit-owner / no-owner 边界

```ts
interface OwnerRuntime {
  ownerId: string;
  ownerType: 'page' | 'form' | 'draft' | 'surface' | 'collection' | 'domain-host';
  parentOwnerId?: string;
  scopeId: string;
  rootPath: string;
  lifecycleState: OwnerLifecycleState;
  validation?: ValidationOwnerRuntime;
  asyncLanes: AsyncLaneRegistry;
  summary: OwnerSummaryState;
}

type OwnerLifecycleState =
  | 'bootstrapping'
  | 'active'
  | 'refreshing'
  | 'suspended'
  | 'disposed';
```

## 2. Owner family

保留六类 owner family：

1. `page owner`
2. `form owner`
3. `draft owner`
4. `surface owner`
5. `collection owner`
6. `domain-host owner`

补充：

1. `object-field`、`variant-field`、`array-field` 默认不是新的 owner family。
2. `table` 默认是 collection owner。
3. `dialog` / `drawer` 是 surface owner 承载边界，不必然是值 owner。

## 3. Participation Matrix

| 状态 | value read | value write | validation | resource | reaction | summary gate |
| --- | --- | --- | --- | --- | --- | --- |
| active | yes | yes | participate | participate | participate | yes |
| hidden | yes | policy-based | skip by default | owner-policy based | semantic-owner based | summary only |
| disabled | yes | no user write | skip submit gating by default | unchanged | unchanged | summary only |
| readonly | yes | no direct user write | may validate existing value | unchanged | unchanged | yes |
| suspended | cached read only | no direct write | no active validation run | no polling by default | no firing by default | last summary |
| disposed | no | no | disposed | disposed | disposed | no |

规则：

1. hidden/disabled/readonly 的默认策略可被 owner family 明确收紧，但不能由 renderer 自行发明。
2. suspended 不是 disposed；它允许保留 cached state，但默认不继续执行高成本活动。

## 4. Validation 总体模型

validation 采用：

**compile-time model first + owner-local runtime state + async governance**

```ts
interface ValidationModelDefinition {
  modelId: string;
  ownerType: string;
  rootPath: string;
  nodes: Record<string, ValidationNodeDefinition>;
  order: string[];
  dependents: Record<string, string[]>;
}

interface ValidationNodeDefinition {
  path: string;
  kind: 'scope-root' | 'field' | 'object' | 'array' | 'variant-root' | 'variant-branch' | 'repeated-template';
  rules: ValidationRuleTemplate[];
  ownerResolution: 'inherit-owner' | 'create-owner' | 'no-owner';
}

interface ValidationOwnerRuntime {
  modelId: string;
  ownerId: string;
  fieldStates: Map<string, FieldValidationState>;
  overlays: Map<string, RuntimeRuleOverlay>;
  asyncRuns: Map<string, AsyncRun>;
  validateAt(path: string, reason: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason: ValidationReason): Promise<ScopeValidationResult>;
  validateAll(reason: ValidationReason): Promise<ScopeValidationResult>;
}
```

## 5. Child Owner Contract

```ts
interface ChildOwnerContract {
  childOwnerId: string;
  mode: 'ignore' | 'summary-gate' | 'recurse-submit';
  active: boolean;
}
```

规则：

1. `summary-gate` 只影响 parent readiness / busy / canSubmit。
2. `recurse-submit` 只在 parent submit/commit entry 触发。
3. child contract snapshot 必须在 parent submit 开始时固定。

## 6. Field State 与 Error Contract

```ts
interface FieldValidationState {
  path: string;
  touched?: true;
  dirty?: true;
  visited?: true;
  submitted?: true;
  validating?: true;
  errors: ValidationError[];
}

interface ValidationError {
  code: string;
  path: string;
  message?: string;
  i18nKey?: string;
  severity: 'error' | 'warning';
  source: 'rule' | 'external' | 'host' | 'runtime-overlay';
}
```

规则：

1. external/server error 只能 owner-local 注入。
2. owner-local write 可按 source 清理相关 external error。
3. array reorder 后 field state 迁移不能简单按旧 index 复制，必须经过 identity + structure mapping。

## 6.1 Validation Edge Cases

### hidden

1. hidden 字段默认跳过 validation participation。
2. hidden 前已有错误默认从 active field presentation 中移除，但可保留在 owner diagnostics 中。
3. hidden 字段默认不参与 submit gate，除非 owner family 显式收紧。

### disabled

1. disabled 字段不接收 direct user write。
2. disabled 字段默认不阻塞 submit gate。
3. 已有 external/server errors 可保留在 diagnostics，但不应继续作为 active blocking error。

### readonly

1. readonly 字段允许读取和展示现值。
2. readonly 字段默认不接收 direct user write。
3. readonly 字段可保留已有 validation summary，但默认不继续触发 change-based async validation。

### suspended owner

1. suspended owner 默认不执行 active validation run。
2. 恢复 active 后，若其值摘要与上次 publish 不一致，必须触发一次 owner-local reconciliation validation。

### variant switch

1. `drop`：inactive branch field state 和错误全部清理。
2. `preserve`：inactive branch field state 进入 inactive bucket；inactive branch 的值继续保留在同一 canonical value path 下，只是不参与 active branch materialization。
3. `project`：按显式 projection 契约把 active branch 值投影到 canonical path，随后立即 revalidate；inactive branch 自身 field state 清理。

### array / table reorder/remove

1. 有 `itemKey` / `rowKey` 时，field state 按 identity 迁移。
2. 无稳定 key 时退化到 index 语义，并必须产出 diagnostics 提示 continuity risk。
3. remove 后被删除项的 async validation run 必须标记为 `stale-dropped` 或 `cancelled`。

### virtualized row

1. 未挂载行默认不创建新的 field runtime registration。
2. 但若该行仍属于 active owner data set，其 aggregate validation 仍可由 owner-local model materialization 参与。

## 7. Composite Value Structures

统一规则：

1. 值读取走 owner-local binding path。
2. 写入走 structural sharing。
3. staged edit 通过 draft owner 隔离。
4. repeated runtime identity 与值地址分离。

### object-field

1. 默认不创建独立 owner。
2. 子字段相对对象根绑定。
3. 提交由父 owner 负责。

### variant-field

```ts
type InactiveBranchPolicy = 'drop' | 'preserve' | 'project';
```

规则：

1. 默认只挂载 active branch。
2. `project` 表示把 active branch 的公共字段投影回 canonical value shape。
3. projection 后立即触发当前 owner subtree revalidation。

### array-field

1. 值地址按 index。
2. runtime identity 优先按 `itemKey`。
3. reorder 不得默认 remount 全部 item subtree。

### detail-view

1. detail-view 是 draft owner。
2. open 时创建 draft scope，优先 patch overlay，不 deep clone 整对象。
3. confirm 时执行 `validate -> transformOut -> commit -> parent revalidate`。

### transformOut 归属与顺序

`transformOut` 不是独立 primitive，也不是 renderer 私有逻辑。它属于 owner commit pipeline 中的 **value adaptation step**。

规则：

1. `transformOut` 的输入是当前 draft owner materialized value。
2. `transformOut` 必须在 child owner `validateAll('commit')` 成功之后执行。
3. `transformOut` 的输出必须 lowering 成 parent owner 可接受的 canonical value，再进入 parent `ScopeWrite`。
4. `transformOut` 可以是同步或异步，但异步版本必须进入当前 owner 的 commit lane，并受统一 `RuntimeFailureKind` 治理。
5. `transformOut` 失败默认映射为 `business-error` 或 `validation-error`，不得绕过 transaction pipeline 直接写 parent scope。

## 8. Structural Sharing

任何值写入都必须使用 path-based structural sharing。

规则：

1. 只复制被改路径上的祖先链。
2. 数组单元素更新只复制数组壳和目标 item 分支。
3. draft overlay 写 patch，confirm 时再 materialize。
4. deep clone 不是允许的默认基线。

## 9. Collection Owner 与 Table

### RowEntry

```ts
interface RowEntry {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, unknown>;
}
```

### 值地址与 runtime identity 分离

1. 值路径：`items.0.qty`
2. runtime identity：`rowKey = order-1001`

规则：

1. collection owner 必须把 parent collection change 翻译为 row-local change。
2. row scope cache 按 `rowKey` 管理。
3. selection、expanded、editing、pagination、sort 属于 row-local 或 table-local UI state，不直接写入业务值。

### table.mode

1. `display`
2. `interactive`
3. `editable-inline`
4. `editable-staged`

语义：

1. `display` 不参与 field validation。
2. `interactive` 有交互态但不写业务值。
3. `editable-inline` 直接写父 owner。
4. `editable-staged` 为行或单元格创建 draft owner。

## 10. Performance-sensitive Validation Rules

大表格下禁止把 `validateAll('change')` 作为默认击键策略。

允许：

1. leaf path + local closure on change
2. broader aggregate validation on blur / commit / submit
3. row-local staged draft owner 分裂

## 11. 后续阅读

继续读：

1. `05-renderer-and-host-protocol.md`
2. `13-field-json-design-examples.md`
