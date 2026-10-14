/**
 * Host-namespace setup for `pnpm flux:validate-pages --setup` over the
 * playground page-schema corpus (plan 595). The complex-pages schemas use the
 * showcase formula namespaces registered at runtime in
 * `src/complex-pages/shared/render-host.tsx`; validation needs the same names
 * so `$Arr.*` references resolve instead of emitting unknown-import-alias.
 * Member keys must stay in sync with render-host's `$Arr` implementation.
 */
export default function registerPlaygroundFormulaNamespaces({ formulaRegistry }) {
  formulaRegistry.registerNamespace('$Arr', {
    sum: () => 0,
    sumField: () => 0,
    sumProducts: () => 0,
    count: () => 0,
  });
}
