import { defineConfig, devices } from '@playwright/test';

const isWin = process.platform === 'win32';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: isWin
      ? 'cmd /c pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port 4173 --strictPort'
      : 'pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
