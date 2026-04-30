# 08. 中间表示 IR

## 目标

IR 是作者语言与运行时之间的稳定接口。

要求：

1. 去掉作者语法糖
2. 保留审计、类型、边界信息
3. 足够稳定，供运行时、调试器、AI、验证器共享

## IR 分层

### 1. Fact IR

```ts
interface AuthorityCellIR {
  id: string;
  valueType: string;
  keyType: string;
  retention: 'memory' | 'persisted';
  conflictPolicy: 'reject-stale' | 'reload-and-rerun' | 'domain-merge';
}

interface ReplicaCellIR {
  id: string;
  authorityId: string;
  valueType: string;
  keyType: string;
  syncMode: 'draft' | 'cache' | 'mirror' | 'fork';
  reconcilePolicy: string;
}
```

### 2. Surface IR

```ts
interface ReadSelectorIR {
  cellId: string;
  selector: {
    kind: 'key' | 'path' | 'collection';
    expr: string;
  };
  cardinality: 'one' | 'many';
}

interface ProjectionIR {
  id: string;
  params: Array<{ name: string; type: string }>;
  reads: ReadSelectorIR[];
  renderer: string;
}
```

### 3. Intent/Goal IR

```ts
interface IntentIR {
  id: string;
  payloadType: string;
}

interface BinderIR {
  intentId: string;
  goalId: string;
  guard?: string;
  payloadMapping: string;
}

interface GoalIR {
  id: string;
  payloadType: string;
  portability: Array<'pure' | 'durable' | 'interactive' | 'navigational' | 'local-only'>;
  requiredPortability: string[];
  optionalPortability: string[];
  outcomes: string[];
  requiredEffects: string[];
  optionalEffects: string[];
  requiredProofs: string[];
  optionalProofs: string[];
  satisfactionPredicate: string;
  satisfactionSurface: ReadSelectorIR[];
  versionSurface: ReadSelectorIR[];
  recipeId: string;
}
```

### 4. Recipe IR

```ts
interface EffectSlotIR {
  id: string;
  when?: string;
  portabilityClass: string;
  effectClass: string;
  proofClass?: string;
  requiredScope?: string;
  payloadBuilder: string;
  receiptReducer: string;
  patchTargets: string[];
  dependsOn: string[];
  onRejected: 'rejected' | 'deferred' | 'partially-satisfied';
}

interface GoalRecipeIR {
  id: string;
  goalId: string;
  slots: EffectSlotIR[];
  maxEffectCount: number;
  maxBusinessEffectCount: number;
  maxProofEffectCount: number;
}
```

### 5. Proof IR

```ts
interface ProofPolicyIR {
  proofClass: string;
  source: 'derived' | 'requested';
  verifier?: string;
  issuer?: string;
  requestEffectClass?: string;
  requestPayloadBuilder?: string;
  proofReceiptSchema?: string;
  revocationChannel: string;
  scopeTemplate: string;
}

interface BootstrapAttestationIR {
  issuer: string;
  proofClasses: string[];
  principalTemplate: string;
  tenantTemplate: string;
  resourceScopeTemplate: string;
  freshnessWindowSec: number;
}
```

### 6. Host IR

```ts
interface EffectManifestIR {
  effectClass: string;
  adapter: string;
  receiptSchema: string;
  portability: string[];
  support: 'available' | 'unavailable';
}
```

## 运行时状态 IR

```ts
interface GoalInstanceIR {
  instanceId: string;
  goalId: string;
  payload: unknown;
  epochId: string;
  recipeId: string;
  outcome: 'pending' | 'satisfied' | 'partially-satisfied' | 'deferred' | 'rejected';
  outcomeByClass: Record<
    string,
    'pending' | 'satisfied' | 'partially-satisfied' | 'deferred' | 'rejected'
  >;
}

interface EffectRequestRecordIR {
  id: string;
  goalInstanceId: string;
  slotId: string;
  effectClass: string;
  payload: unknown;
  proofRefs: string[];
  idempotencyKey: string;
  status: 'pending' | 'sent' | 'completed' | 'rejected';
}

interface FactPatchIR {
  targetCell: string;
  key: string;
  op: 'upsert' | 'delete' | 'merge';
  value?: unknown;
  expectedTargetVersion: number;
}
```

## 编译校验

IR 层必须能独立完成以下校验：

1. authority/replica 图无歧义
2. projection 读面静态有界
3. binder 唯一
4. binder payload mapping 类型可检查
5. recipe 为 DAG
6. recipe 所有 slot 的 effect/proof/reducer 都可解析；其中 optional portability 对应的 effect 可在目标宿主缺失，但必须在 manifest 中显式标记为 unavailable
7. requested proof 总能落到 `proof/*` effect class
8. bootstrap attestation 只覆盖 proof class，且 scope 不放大
9. slot requiredScope 可由 goal payload 实例化
10. reducer patch targets 与 slot.patchTargets 一致
11. required/optional portability 不冲突
12. requested proof 的 payload builder 与 receipt schema 可解析
13. required/optional effects 与 proofs 必须和 portability/slot 归属一致

## 为什么 IR 必须显式化

如果没有显式 IR，系统就会把关键复杂度藏进：

1. runtime 临场推理
2. 插件魔法
3. schema 解释器分支
4. AI 猜测性重构

IR 的目的就是让这些事情都无处可藏。
