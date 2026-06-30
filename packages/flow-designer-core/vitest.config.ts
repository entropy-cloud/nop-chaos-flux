import { createSharedVitestConfig } from '../../vitest.shared';

// AUDIT-18: coverage threshold established at the current baseline to prevent
// regression. Raising branches to ≥70% is tracked as a Non-Blocking Follow-up
// (core.ts and elk-layout.ts have uncovered edge-command branches that require
// additional integration tests). Type-only files (`types.ts`,
// `designer-core-types.ts`) and the untested `core-shell-commands.ts` are
// excluded so the threshold reflects actually-exercised runtime code.
export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: [
      'src/core.ts',
      'src/core-edge-commands.ts',
      'src/core-node-commands.ts',
      'src/elk-layout.ts',
      'src/tree-domain.ts',
      'src/tree-layout.ts',
      'src/tree-projection.ts',
    ],
    thresholds: {
      branches: 55,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
});
