import { cleanup, render } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

afterEach(() => cleanup());

const packageDir = join(import.meta.dirname, '..', '..');
const playgroundStylesPath = join(
  packageDir,
  '..',
  '..',
  'apps',
  'playground',
  'src',
  'styles.css',
);

function renderSchema(schema: unknown) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://page-slot-styling-contract"
      schema={schema as any}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// 10-01 (ui-review audit group B): page is an explicit layout renderer — the
// marker-only styling contract bans code-side layout utility classes. The three
// branch-new slot layout class sites (breadcrumb item truncation, page-heading
// row, page-extra right cluster) must live in the package-level @layer base CSS
// behind slot selectors, theme-tunable, not in component JSX.

const MIGRATED_LAYOUT_UTILITIES = [
  'min-w-0',
  'max-w-40',
  'truncate',
  'flex',
  'flex-wrap',
  'items-center',
  'gap-2',
  'ml-auto',
];

function expectMarkerOnly(element: Element | null, label: string) {
  expect(element, label).not.toBeNull();
  const className = element!.getAttribute('class') ?? '';
  for (const utility of MIGRATED_LAYOUT_UTILITIES) {
    expect(className, `${label} must not carry ${utility}`).not.toContain(utility);
  }
}

describe('page slot styling contract: marker-only output (10-01)', () => {
  it('page-heading and page-extra slots carry zero layout utility classes', () => {
    const { container } = renderSchema({
      type: 'page',
      title: 'Contract Page',
      subTitle: 'Sub',
      breadcrumb: [{ label: 'Home', href: '/home' }],
      extra: [{ type: 'button', label: 'New' }],
    });
    expectMarkerOnly(container.querySelector('[data-slot="page-heading"]'), 'page-heading');
    expectMarkerOnly(container.querySelector('[data-slot="page-extra"]'), 'page-extra');
  });

  it('breadcrumb entries carry no code-side truncation classes (title hint kept)', () => {
    const { container } = renderSchema({
      type: 'page',
      title: 'Crumb Page',
      breadcrumb: [
        { label: 'A very long breadcrumb level label', href: '/long' },
        { label: 'Tail' },
      ],
    });
    expectMarkerOnly(
      container.querySelector('[data-slot="page-breadcrumb"] a[data-slot="breadcrumb-link"]'),
      'breadcrumb-link',
    );
    expectMarkerOnly(
      container.querySelector('[data-slot="page-breadcrumb"] [data-slot="breadcrumb-page"]'),
      'breadcrumb-page',
    );
  });
});

describe('page slot baseline lives in package CSS (10-01)', () => {
  const cssPath = join(packageDir, 'src', 'styles.css');

  it('package styles.css exists with slot-selector baseline rules', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('@layer base');
    // heading row: flex/wrap/align/min-width/gap baseline
    expect(css).toMatch(/\[data-slot='page-heading'\]/);
    expect(css).toMatch(/display:\s*flex/);
    expect(css).toMatch(/flex-wrap:\s*wrap/);
    expect(css).toMatch(/align-items:\s*center/);
    expect(css).toMatch(/min-width:\s*0/);
    // extra cluster: right-aligned via margin-left auto
    expect(css).toMatch(/\[data-slot='page-extra'\]/);
    expect(css).toMatch(/margin-left:\s*auto/);
    // breadcrumb item truncation baseline
    expect(css).toMatch(/\[data-slot='breadcrumb-link'\]/);
    expect(css).toMatch(/\[data-slot='breadcrumb-page'\]/);
    expect(css).toMatch(/text-overflow:\s*ellipsis/);
    expect(css).toMatch(/white-space:\s*nowrap/);
    // max-w-40 parity, theme-tunable via the CSS variable channel
    expect(css).toMatch(/max-width:\s*var\(--space-page-breadcrumb-max,\s*10rem\)/);
  });

  it('wiring: css export subpath + sideEffects are declared and a host load path exists', () => {
    const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    expect(packageJson.exports['./styles.css']).toEqual({
      default: './dist/styles.css',
    });
    expect(packageJson.sideEffects).toContain('*.css');
    // consumption visibility: at least one host load path must reference the
    // export — the playground imports it alongside the other renderer packages
    const playgroundStyles = readFileSync(playgroundStylesPath, 'utf8');
    expect(playgroundStyles).toContain("@import '@nop-chaos/flux-renderers-basic/styles.css'");
  });
});
