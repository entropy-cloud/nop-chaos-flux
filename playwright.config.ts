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
  timeout: 30_000,
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
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
  webServer: {
    command: isWin
      ? `cmd /c pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port ${port} --strictPort`
      : `pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
