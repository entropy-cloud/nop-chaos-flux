import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findAiBoundaryViolations } from './ai-boundary.js';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
// The guard itself must name the markers to detect them; exempt the guard
// files from the live scan so the carve-out stays explicit and one-file wide.
const GUARD_FILES = new Set(['src/ai-boundary.ts', 'src/ai-boundary.test.ts']);

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
    } else if (SOURCE_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      out.push(full);
    }
  }
  return out;
}

function scanLivePackage() {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const sourceFiles = collectSourceFiles(join(PACKAGE_ROOT, 'src')).filter(
    (file) => !GUARD_FILES.has(relative(PACKAGE_ROOT, file)),
  );
  return findAiBoundaryViolations({
    dependencyEntries: {
      ...(pkg.dependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    },
    fileContents: Object.fromEntries(
      sourceFiles.map((file) => [relative(PACKAGE_ROOT, file), readFileSync(file, 'utf8')]),
    ),
  });
}

describe('nop-debugger zero-AI-package boundary', () => {
  it('detects a dependency declaration of an AI package (synthetic red proof)', () => {
    const violations = findAiBoundaryViolations({
      dependencyEntries: { '@nop-chaos/flux-renderers-ai': 'workspace:*' },
      fileContents: {},
    });
    expect(violations).toEqual([
      { location: 'package.json dependencies', marker: '@nop-chaos/flux-renderers-ai' },
    ]);
  });

  it('detects a source import of an AI package (synthetic red proof)', () => {
    // Fixture built by concatenation: the guard must keep the marker substring
    // (the scanner is substring-based) without itself containing a literal
    // import statement that `check:workspace-manifest-deps` would flag.
    const leakContent = [
      'import { createMessageEngine } from',
      `'@nop-chaos/flux-renderers-ai';`,
    ].join(' ');
    const violations = findAiBoundaryViolations({
      dependencyEntries: {},
      fileContents: {
        'src/leak.ts': leakContent,
        'src/clean.ts': `import { redactData } from './redaction.js';\n`,
      },
    });
    expect(violations).toEqual([
      { location: 'src/leak.ts', marker: '@nop-chaos/flux-renderers-ai' },
    ]);
  });

  it('detects the sibling ai package marker (synthetic red proof)', () => {
    const leakContent = ['import { x } from', `'@nop-chaos/nop-debugger-ai';`].join(' ');
    const violations = findAiBoundaryViolations({
      dependencyEntries: {},
      fileContents: { 'src/leak.ts': leakContent },
    });
    expect(violations).toEqual([{ location: 'src/leak.ts', marker: '@nop-chaos/nop-debugger-ai' }]);
  });

  it('live package declares and imports zero AI packages', () => {
    expect(scanLivePackage()).toEqual([]);
  });
});
