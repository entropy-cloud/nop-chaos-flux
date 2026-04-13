import { defineConfig } from 'vitest/config';
import { workspacePackageAliases } from './vite.workspace-alias';

type VitestEnvironment = 'node' | 'jsdom';

interface SharedVitestConfigOptions {
  environment: VitestEnvironment;
  includeWorkspaceAliases?: boolean;
  coverage?: Record<string, unknown>;
}

export function createSharedVitestConfig(options: SharedVitestConfigOptions) {
  return defineConfig({
    ...(options.includeWorkspaceAliases === false
      ? {}
      : {
          resolve: {
            alias: workspacePackageAliases
          }
        }),
    test: {
      environment: options.environment,
      include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
      exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      ...(options.coverage ? { coverage: options.coverage } : {})
    }
  });
}
