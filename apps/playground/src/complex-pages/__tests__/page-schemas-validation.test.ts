import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler } from '@nop-chaos/flux-formula';
import { showcaseRegistry, showcaseFormulaCompiler } from '../shared/render-host';

// Full-code compile validation over every complex-page JSON schema, using the
// same canonical registry + strict options the render path uses (plan 595):
// `showcaseRegistry` is what actually renders these pages, and
// `validation.strictMode` mirrors the render-path strict options so error
// severities match render-path fail-fast semantics.
//
// The gate asserts ZERO diagnostics of any severity (error/warning/info) per
// page — the plan-595 transitional baseline was removed once the corpus
// reached zero (Phase 2); there is no whitelist.
function buildFormulaCompiler() {
  return createExpressionCompiler(showcaseFormulaCompiler);
}

const schemaDir = resolve(process.cwd(), 'src/complex-pages/page-schemas');
const files = readdirSync(schemaDir).filter((f) => f.endsWith('.json'));

describe('complex-pages page-schemas compile validation (full code, plan 595)', () => {
  it('discovers the page-schema corpus', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  for (const file of files) {
    it(`validates ${file}`, () => {
      const schema = JSON.parse(readFileSync(resolve(schemaDir, file), 'utf8'));
      const diagnostics = validateSchema({
        schema,
        registry: showcaseRegistry,
        expressionCompiler: buildFormulaCompiler(),
        options: {
          validation: {
            strictMode: true,
            unknownBarePropertyPolicy: 'error',
          },
        },
      });
      expect(
        diagnostics.map((d) => `${d.severity} ${d.code} ${d.path} ${d.message}`),
        `${file}: schema diagnostics must be empty (plan 595 full-code gate — ` +
          `fix the schema or, for renderer-declaration gaps, declare the field)`,
      ).toEqual([]);
    });
  }
});
