// Negative: module-top const containers that are NEVER mutated must not be
// flagged (static fixtures cannot leak state across cases).
const STATIC_LIST = ['a', 'b', 'c'];
const STATIC_MAP = new Map<string, number>([['k', 1]]);
const STATIC_OBJECT = { name: 'fixture' };
const primitiveNumber = 42;
const primitiveString = 'hello';
const frozen = Object.freeze({ value: 1 });
const asConst = { items: [1, 2, 3] } as const;

export function read() {
  return (
    STATIC_LIST.length +
    (STATIC_MAP.get('k') ?? 0) +
    STATIC_OBJECT.name.length +
    primitiveNumber +
    primitiveString.length +
    frozen.value +
    asConst.items.length
  );
}
