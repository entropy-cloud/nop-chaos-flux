import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    include: ['scripts/__tests__/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.stryker-tmp/**'],
  },
});
