import type { ScopeRef } from '@nop-chaos/flux-core';

/**
 * plan 534 执行期发现：createPrivateEvalScope 为只读求值面
 * （flux-react/src/bindings/flux-eval.ts:38 update: () => undefined），
 * IndustrialAdapter 的 scope.update 写入会被静默丢弃——three 类 demo 需要的
 * 是仅实现 adapter.update + UI.get 契约的最小可写 ScopeRef。
 * merge 桩为已裁定非消费面（plan 534 Non-Goals）；`as ScopeRef` 断言收拢于此单处。
 */
export function createWritableScopeRef(id: string): ScopeRef {
  const data: Record<string, unknown> = { dataSources: {} };
  const getIn = (path: string): unknown => {
    let current: unknown = data;
    for (const segment of path.split('.')) {
      if (current === null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  };
  return {
    id,
    path: '$',
    value: data,
    get: getIn,
    has: (path) => getIn(path) !== undefined,
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: (path, value) => {
      const segments = path.split('.');
      let current = data;
      for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        if (typeof current[key] !== 'object' || current[key] === null) current[key] = {};
        current = current[key] as Record<string, unknown>;
      }
      current[segments[segments.length - 1]] = value;
    },
    merge: () => undefined,
    isolate: true,
  } as ScopeRef;
}
