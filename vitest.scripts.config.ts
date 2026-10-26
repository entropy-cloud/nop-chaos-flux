import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    // Script-gate tests exec the real gates against fixtures staged in the
    // real repo tree; parallel files would race those fixtures (a gate in one
    // file could collect a fixture another file is deleting mid-run → ENOENT).
    fileParallelism: false,
    // `.optional.`-suffixed test files (e.g. ai-debugger-local-qwen.optional.test.ts)
    // are matched by the include glob but MUST self-guard with describe.skipIf
    // on an env flag so the default `pnpm test:scripts` run skips them —
    // convention enforced by review, not by this config (plan 767 D8).
    // Script-gate tests exec the real gates against the full repo tree; the
    // git-scaffolding cases in check-workspace-manifest-deps measure ~5s on a
    // loaded machine, above vitest's 5s default — DV 2026-08-09 adjudication.
    testTimeout: 30_000,
    include: ['scripts/__tests__/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.stryker-tmp/**'],
  },
});
