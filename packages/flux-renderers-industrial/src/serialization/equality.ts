/**
 * 共享 key-order-insensitive deep-equal（plan 2026-08-05-0653-4 C2，open-audit P2-6）。
 *
 * 单一事实源：消除 `compound.deepEquals`（旧 `JSON.stringify` key 序敏感实现）与 `diff.valuesEqual`
 * （W5 own-keys 递归 stable 实现）的判等分歧——前者在第三方 `registerScadaSymbol` 带 object-typed
 * defaults 时把「内容等值仅 key 序不同」的 object 当作不等，使 `diffInstanceProps` 产出冗余 override
 * （序列化输出非最小覆盖集）；与 `diff.valuesEqual` 共享同一实现后，两处判等口径对齐，序列化输出
 * 收敛到稳定最小覆盖集。
 *
 * 实现等价于原 `diff.valuesEqual`（plan 2026-08-04-2243-2 W5 修复）：
 * - `a === b` 短路（含 `NaN` 处理：`NaN !== NaN` 但 `JSON.stringify(NaN) === 'null'` 不安全）；
 * - 非 object（含 null）按 `===` 比较；
 * - 数组按 index 顺序比较（数组序本身是语义，与 object key 序不同）；
 * - object 按 own-keys 递归比较：keys 数量先核对，再按 a 的 own keys 在 b 中查表 + 递归——
 *   key 插入序不再影响判等（与 `JSON.stringify` 行为相反）。
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRecord, key)) return false;
    if (!deepEqual(aRecord[key], bRecord[key])) return false;
  }
  return true;
}
