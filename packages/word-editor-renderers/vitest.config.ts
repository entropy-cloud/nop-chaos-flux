import { defineConfig } from 'vitest/config';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  test: {
    environment: 'jsdom',
    include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    setupFiles: ['./src/__tests__/setup.ts']
  }
});
