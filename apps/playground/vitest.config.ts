import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'jsdom',
  includeWorkspaceAliases: false
});
