# main-round-03 — Batch 2 Verification

- 执行者身份：主执行者
- 本轮检查的契约或方向：复核子 agent F-J 的候选问题

## Batch 2 覆盖方向

| 子 agent | 方向                                 | 包                           | 假设数 | 候选数 | 经验证成立                                                 |
| -------- | ------------------------------------ | ---------------------------- | ------ | ------ | ---------------------------------------------------------- |
| F        | runtime scope & ownership 边界       | `flux-runtime`               | 15     | 1      | 1 (isolate get/has 穿透)                                   |
| G        | renderer contracts (basic/form/data) | 多个 renderers 包            | 18     | 0      | 0                                                          |
| H        | async data source & API cache        | `flux-runtime`               | 15     | 3      | 2 (cache key 碰撞 + stableStringify type) → 合并为 ECT-005 |
| I        | validation rules & lifecycle         | `flux-runtime`               | 29     | 0      | 0                                                          |
| J        | i18n & form-runtime-status           | `flux-i18n` + `flux-runtime` | 36     | 0      | 0                                                          |

## 经验证确认的新问题类别

### ECT-004: isolated scope get()/has() 仍穿透父链

- **发现者**: 子 agent F
- **现象**: `isolate: true` 的 scope，`readVisible()` 正确返回 only own data，但 `get('key')` 和 `has('key')` 仍能从 parent 查找
- **契约来源**: `docs/architecture/scope-ownership-and-isolation.md` 明确: "isolate: true → 当前 child scope 不再沿父链查找数据"
- **根因**: `scope.ts:290-338` 的 `resolveScopePath`/`hasScopePath` 无条件沿 parent 链查找

### ECT-005: generateCacheKey falsy data 碰撞 (已修复)

- **发现者**: 子 agent H
- **现象**: `data:0`, `data:false`, `data:""`, `data:null` 均与 `data:undefined` 产生相同缓存键
- **根因**: `api-cache.ts:172` 使用 truthy 检查 `api.data ?` 而非 `api.data !== undefined ?`
- **修复**: 改为 `api.data !== undefined ?`

## 否定的候选

- H-C2: stableStringify(undefined) 返回 undefined — 类型问题但被 generateCacheKey 的 undefined 检查保护，与 ECT-005 同根因
- H-C3: canonicalizeUrlWithParams array handling — design choice
- H-C6: Pre-aborted signal not rejected — contract gap, fetcher 责任
- H-C5: Cache TTL exact boundary — by design ("at least" TTL)

## 本轮覆盖了哪些主方向

5 个新方向全部覆盖：runtime scope ownership, renderer contracts, async data source, validation rules, i18n/form-runtime-status

## 与 Batch 1 的去重

- ECT-005 (cache key) 与 Batch 1 无重叠
- ECT-004 (scope isolation) 与 Batch 1 的 scope/rehook 无重叠 (D 覆盖的是 hook 层，F 覆盖的是 scope 底层)
