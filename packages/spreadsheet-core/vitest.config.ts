import { createSharedVitestConfig } from '../../vitest.shared';

// AUDIT-18: coverage threshold established at the current baseline to prevent
// regression. Raising to ≥70% is tracked as a Non-Blocking Follow-up (the
// command-factory modules `commands.ts`/`commands-base.ts`/`commands-style.ts`
// are exercised through integration dispatch, not direct unit tests, so they
// are excluded from the include set; `types.ts` is mostly runtime shape code
// whose uncovered branches need dedicated tests). The threshold reflects
// actually-exercised runtime code.
export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/core.ts', 'src/core-dispatch.ts', 'src/types.ts'],
    thresholds: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
});
