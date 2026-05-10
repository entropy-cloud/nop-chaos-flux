import { defineConfig } from 'vitest/config';
import { workspacePackageAliases } from './vite.workspace-alias';

type VitestEnvironment = 'node' | 'happy-dom';

interface SharedVitestConfigOptions {
  environment: VitestEnvironment;
  includeWorkspaceAliases?: boolean;
  coverage?: Record<string, unknown>;
}

export function createSharedVitestConfig(options: SharedVitestConfigOptions) {
  const isHappyDOM = options.environment === 'happy-dom';

  return defineConfig({
    ...(options.includeWorkspaceAliases === false
      ? {}
      : {
          resolve: {
            alias: workspacePackageAliases,
          },
        }),
    test: {
      environment: options.environment,
      pool: 'forks',
      maxWorkers: isHappyDOM ? 2 : 4,
      include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
      exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      ...(options.coverage ? { coverage: options.coverage } : {}),
    },
  });
}
