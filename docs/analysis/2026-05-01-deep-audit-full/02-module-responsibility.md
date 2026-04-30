# 02 模块职责与文件边界

## 复核结论

- 保留: 2
- 降级: 1
- 驳回: 0

## 保留

### `schema-compiler-registry.test.ts` 必拆

- 文件: `packages/flux-compiler/src/schema-compiler-registry.test.ts`
- 结论: 保留，P1
- 依据: 命令基线显示 735 行；同时混合 registry、event/lifecycle、component targeting、table deep region、CRUD alias 等多类断言。

### `schema-compiler-prop-coverage.test.ts` 横跨过多 renderer family

- 文件: `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`
- 结论: 保留，P2
- 依据: 686 行，`dialog`/`drawer`/`form`/`table`/`crud`/`tree`/`chart`/`tabs` 等集中在一个 contract matrix 中。

## 已降级

### `schema-compiler.ts` 处于二次膨胀观察期

- 文件: `packages/flux-compiler/src/schema-compiler.ts`
- 结论: 已降级为观察项
- 依据: 507 行，略超 500 阈值，但仍明显依赖已拆出的 `fields`、`regions`、`validation-collection`、`diagnostics` 等子模块，当前更像 orchestrator 偏重而非明确越界。

## 复核备注

- `flux-runtime/src` 与 `flux-react/src` 顶层文件较多，但本轮不足以构成职责越界结论。
- 复核阶段额外发现 `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts` 也已演化成 mega test，建议后续拆分。
