import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('nop-debugger-ai root entry stays framework-free', () => {
  it('root index has no react import and no panel-side runtime import', () => {
    const entry = readFileSync(join(ROOT, 'src/index.ts'), 'utf8');
    expect(entry).not.toMatch(/from\s+['"]react['"]/);
    expect(entry).not.toMatch(/from\s+['"]react-dom/);
    // The React session surface ships only through the ./panel subpath.
    expect(entry).not.toMatch(/from\s+['"]\.\/panel\//);
  });

  it('panel subpath entry is the only react-facing surface', () => {
    const panelEntry = readFileSync(join(ROOT, 'src/panel/index.ts'), 'utf8');
    expect(panelEntry).toMatch(/extension\.js/);
    const extension = readFileSync(join(ROOT, 'src/panel/extension.tsx'), 'utf8');
    expect(extension).toMatch(/from 'react'|<AiSessionTab/);
  });
});
