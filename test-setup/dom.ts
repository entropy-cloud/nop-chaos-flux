import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Shared happy-dom test setup (cq-1): auto-cleanup between tests and jest-dom
// matchers. Packages previously had to call cleanup() manually in every file;
// new happy-dom packages get this for free via createSharedVitestConfig.
afterEach(() => {
  cleanup();
});
