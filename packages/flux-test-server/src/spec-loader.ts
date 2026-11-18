import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FluxTestError } from './errors.js';

export interface BundledSpec {
  code: string;
}

/**
 * Bundle a flux spec file (default-exports `async (ft) => void`) into a
 * self-contained IIFE exposing the handler on `__flux_spec__`.
 */
export async function bundleStandalone(entryPath: string, globalName: string): Promise<BundledSpec> {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    globalName,
    target: 'chrome120',
  });
  const code = result.outputFiles[0]?.text;
  if (!code) {
    throw new FluxTestError('cdp-request-failed', `esbuild produced no output for ${entryPath}`);
  }
  return { code };
}

export async function bundleSpec(specPath: string): Promise<BundledSpec> {
  const entry = readFileSync(specPath, 'utf8');
  const driverEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../flux-test-driver/src/index.ts');
  const result = await build({
    stdin: {
      contents: entry,
      resolveDir: specPath.replace(/[/\\][^/\\]+$/, ''),
      sourcefile: specPath,
      loader: 'ts',
    },
    alias: {
      '@nop-chaos/flux-test-driver': driverEntry,
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    globalName: '__flux_spec__',
    target: 'chrome120',
  });
  const code = result.outputFiles[0]?.text;
  if (!code) {
    throw new FluxTestError('cdp-request-failed', `esbuild produced no output for ${specPath}`);
  }
  return { code };
}

/** Full evaluate expression: expose handler, hand it the in-page `ft` global. */
export function specEvaluateExpression(bundled: BundledSpec): string {
  return `(function () {\n${bundled.code}\n;const __flux_spec_handler__ = __flux_spec__.default ?? __flux_spec__;\nreturn __flux_spec_handler__(window.__FLUX_FT__);\n})();`;
}
