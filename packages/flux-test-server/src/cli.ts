#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportToJson, reportToTerminal } from './reporter.js';
import { runSpecs, type RunSummary } from './runner.js';

export interface CliArgs {
  spec?: string;
  dir?: string;
  baseUrl: string;
  timeoutMs: number;
  report?: string;
  expectedFailures: string[];
  noDriver?: boolean;
  malformed?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { baseUrl: 'http://127.0.0.1:4175', timeoutMs: 30_000, expectedFailures: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--spec') args.spec = argv[++i];
    else if (arg === '--dir') args.dir = argv[++i];
    else if (arg === '--base-url') args.baseUrl = argv[++i]!;
    else if (arg === '--timeout') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--report') args.report = argv[++i];
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

export function collectSpecFiles(args: CliArgs): string[] {
  if (args.spec) return [path.resolve(args.spec)];
  const dir = path.resolve(args.dir ?? 'tests/e2e/flux');
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.flux-spec.ts')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

export async function runCli(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.malformed) {
    return 2;
  }
  const specs = collectSpecFiles(args);
  if (specs.length === 0) {
    console.error('flux-test: no *.flux-spec.ts found');
    return 2;
  }
  const summary: RunSummary = await runSpecs({
    specPaths: specs,
    baseUrl: args.baseUrl,
    timeoutMs: args.timeoutMs,
    expectedFailures: args.expectedFailures,
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
