import { defineConfig } from 'vitest/config';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  test: {
    environment: 'jsdom'
  }
});
