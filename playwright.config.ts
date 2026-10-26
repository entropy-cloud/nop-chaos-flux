import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const isWin = process.platform === 'win32';

function resolveChromiumExecutablePath() {
  const candidates = isWin
    ? [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      ]
    : [];

  return candidates.find((candidate) => existsSync(candidate));
}

function resolveChromiumChannel() {
  if (!isWin) {
    return undefined;
  }

  if (
    existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ||
    existsSync('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe')
  ) {
    return 'chrome' as const;
  }

  if (
    existsSync('C:/Program Files/Microsoft/Edge/Application/msedge.exe') ||
    existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
  ) {
    return 'msedge' as const;
  }

  return undefined;
}

const chromiumExecutablePath = resolveChromiumExecutablePath();
const chromiumChannel = resolveChromiumChannel();
const port = parseInt(process.env.PLAYWRIGHT_PORT || '4175', 10);
const baseUrl = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 2,
  reporter: 'list',
  // plan 623: opt-in clean runs — E2E_EXCLUDE_WATCH_ONLY=1 drops the adjudicated
  // watch-only perf-threshold tests (title-suffix ` @watch-only`, registry:
  // docs/context/project-context.md). Default (unset) keeps every test, so the
  // DV full-run protocol still sees the known reds transparently.
  grepInvert: process.env.E2E_EXCLUDE_WATCH_ONLY ? [/@watch-only/] : undefined,
  use: {
    baseURL: baseUrl,
    // Keep trace capture honest under the retries: 1 baseline (one retry absorbs env flakes).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // 2026-07-25-2 Phase 3: one retry absorbs environment-level flakes
  // (dev-server HMR reloads mid-suite) without masking real failures.
  retries: 1,
  projects: [
    {
      // The supported workspace gate currently targets Chromium only.
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumChannel
          ? {
              channel: chromiumChannel,
            }
          : chromiumExecutablePath
            ? {
                launchOptions: {
                  executablePath: chromiumExecutablePath,
                },
              }
            : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'node tests/e2e/xlang-debug-mock-server.mjs',
      port: 4180,
      reuseExistingServer: !process.env.CI,
    },
    {
    command: isWin
      ? `cmd /c set __FLUX_STRICT_VALIDATION__=true && set __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true && set PLAYWRIGHT=true && pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port ${port} --strictPort`
      : `__FLUX_STRICT_VALIDATION__=true __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true PLAYWRIGHT=true pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    },
  ],
});
