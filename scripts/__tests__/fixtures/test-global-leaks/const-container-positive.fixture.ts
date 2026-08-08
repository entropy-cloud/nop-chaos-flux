// const-var module-top leak fixtures (2026-08-09 tool-governance round).
// Positive: mutable containers at module top that ARE mutated in the file.
const mutableList = [];
const mutableMap = new Map<string, number>();
const mutableObject = { count: 0 };

export function mutate() {
  mutableList.push(1);
  mutableMap.set('k', 1);
  mutableObject.count += 1;
}
