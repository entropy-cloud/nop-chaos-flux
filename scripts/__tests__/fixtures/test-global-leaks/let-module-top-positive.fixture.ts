// let-var module-top leak fixtures (baseline behavior regression, 2026-08-09).
let moduleCounter = 0;

export function bump() {
  return (moduleCounter += 1);
}
