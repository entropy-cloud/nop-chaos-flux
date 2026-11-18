#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportToJson, reportToTerminal } from './reporter.js';
import { runSpecs, type RunSummary } from './runner.js';
import { startConsoleServer } from './console-server.js';
import { collectSpecFiles } from './spec-discovery.js';

export interface CliArgs {
  spec?: string;
  dir?: string;
  baseUrl: string;
  timeoutMs: number;
  report?: string;
  expectedFailures: string[];
  noDriver?: boolean;
  open?: boolean;
  watch?: boolean;
  malformed?: boolean;
}

export { collectSpecFiles } from './spec-discovery.js';

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { baseUrl: 'http://127.0.0.1:4175', timeoutMs: 30_000, expectedFailures: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--spec') args.spec = argv[++i];
    else if (arg === '--dir') args.dir = argv[++i];
    else if (arg === '--base-url') args.baseUrl = argv[++i]!;
    else if (arg === '--timeout') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--report') args.report = argv[++i];
    else if (arg === '--open') args.open = true;
    else if (arg === '--watch') args.watch = true;
    else if (arg === '--expected-fail') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) {
        console.error('flux-test: --expected-fail requires a spec basename argument');
        args.malformed = true;
      } else {
        args.expectedFailures.push(value);
      }
    }
    else if (arg === '--no-driver') args.noDriver = true;
  }
  return args;
}

export async function runCli(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.malformed) {
    return 2;
  }
  if (args.open) {
    const console_ = await startConsoleServer({
      specsDir: path.resolve(args.dir ?? 'tests/e2e/flux'),
      baseUrl: args.baseUrl,
      timeoutMs: args.timeoutMs,
      reportPath: args.report ?? 'tests/e2e/artifacts/flux-test-report.json',
      driverEntryPath: args.noDriver ? undefined : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../flux-test-driver/src/index.ts'),
    });
    if (args.watch) {
      await fetch(`http://127.0.0.1:${console_.port}/__flux_test__/api/watch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ on: true }),
      });
      // eslint-disable-next-line no-console -- CLI 本职：Watch 模式提示
      console.log('flux-test watch: spec 变更将自动重跑（500ms debounce）');
    }
    // eslint-disable-next-line no-console -- CLI 本职：Console 入口地址
    console.log(`flux-test console: http://127.0.0.1:${console_.port}/__flux_test__`);
    return await new Promise<number>((resolve) => {
      const shutdown = () => {
        void console_.close().then(() => resolve(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });
  }
  const specs = collectSpecFiles(args);
  if (specs.length === 0) {
    console.error('flux-test: no *.flux-spec.ts found');
    return 2;
  }
  // convention: *-must-fail.flux-spec.ts are deliberate-failure discriminators —
  // auto-registered as expected-failure in dir mode so the suite stays green.
  const conventionFailures = specs
    .filter((specPath) => path.basename(specPath).includes('-must-fail.flux-spec.ts'))
    .map((specPath) => path.basename(specPath).replace(/\.flux-spec\.ts$/, ''));
  // convention: *-perf.flux-spec.ts measure sustained interaction (fps/rAF loops)
  // and legitimately exceed the default spec timeout — 200s like the old
  // Playwright describe-level timeouts.
  const specTimeouts: Record<string, number> = {};
  for (const specPath of specs) {
    const name = path.basename(specPath);
    if (name.endsWith('-perf.flux-spec.ts')) specTimeouts[name] = 200_000;
  }
  const summary: RunSummary = await runSpecs({
    specPaths: specs,
    baseUrl: args.baseUrl,
    timeoutMs: args.timeoutMs,
    specTimeouts,
    expectedFailures: [...new Set([...args.expectedFailures, ...conventionFailures])],
    reportPath: args.report ?? 'tests/e2e/artifacts/flux-test-report.json',
    driverEntryPath: args.noDriver ? undefined : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../flux-test-driver/src/index.ts'),
  });
  // eslint-disable-next-line no-console -- CLI 的本职就是向终端输出报告
  console.log(reportToTerminal(summary));
  if (args.report) {
    // eslint-disable-next-line no-console -- 同上，--report 时输出 JSON 报告
    console.log(reportToJson(summary));
  }
  return summary.exitCode;
}

const isDirectRun = process.argv[1]?.endsWith('cli.js') && !process.env.VITEST;
if (isDirectRun) {
  void runCli(process.argv.slice(2)).then((code) => process.exit(code));
}
