import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';

// Compile-time schema validation over every complex-page JSON schema, same
// validate-mode contract the docs examples use (unknownBarePropertyPolicy:
// 'error'). Runtime rendering collects diagnostics but nothing surfaces them
// (compile() drops them; continueOnError suppresses the throw), so dead props
// silently no-op'd — the pre-v3 picker loadAction/columns drift shipped for
// months with empty popup dialogs (docs/testing/2026/10-10.md #40). This test
// is the gate that fails the suite instead.
//
// Scoped to the `unknown-property` code (authored props the target renderer
// does not declare — the dead-prop class). Other diagnostic codes
// (invalid-reaction-deps on plain crud loadAction, unvalidated-component-target,
// host-namespace $Arr aliases) need their own calibration before they can gate.
function buildRegistry() {
  const registry = createRendererRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerFormAdvancedRenderers(registry);
  registerDataRenderers(registry);
  registerContentRenderers(registry);
  registerLayoutRenderers(registry);
  registerSchedulingRenderers(registry);
  return registry;
}

// Pre-existing backlog: `rendererType:propKey` pairs authored before this gate
// existed. These props mostly WORK at runtime (fields read via useSchemaProps
// without declaration) — they are renderer `fields` declaration gaps, not dead
// schema, and are registered debt to shrink via renderer-definition fixes. Any
// pair NOT listed here fails the suite.
const UNKNOWN_PROPERTY_BASELINE: Record<string, string[]> = {
  'advanced-query.json': ['select:placeholder', 'input-number:placeholder'],
  'airtable-grid.json': ['select:defaultValue', 'input-number:defaultValue'],
  'antdpro-form-basic.json': ['input-number:min', 'input-number:max', 'input-number:placeholder'],
  'antdpro-form-dialog.json': ['input-number:min', 'input-number:placeholder', 'select:placeholder'],
  'antdpro-form-grouped.json': ['select:placeholder'],
  'antdpro-form-step.json': ['input-number:min', 'input-number:placeholder'],
  'antdpro-list.json': ['input-number:min', 'input-number:placeholder', 'select:placeholder'],
  'approval-tasks.json': ['select:placeholder', 'select:cell'],
  'business-document.json': ['input-number:min', 'input-number:max', 'input-number:placeholder'],
  'cal-confirm.json': ['select:placeholder'],
  'combo-editor.json': [],
  'complex-form.json': ['select:placeholder', 'input-number:min'],
  'crud-views-export.json': ['tabs:mountOnEnter'],
  'form-wizard.json': ['input-number:min'],
  'inline-edit-table.json': ['input-number:min'],
  'linear-issues.json': ['select:defaultValue', 'select:placeholder'],
  'linear-settings.json': ['switch:onValue'],
  'master-detail.json': ['input-number:min', 'input-number:step'],
  'notion-database.json': ['select:defaultValue', 'switch:defaultValue', 'container:text'],
  'standard-crud.json': ['select:placeholder'],
  'stripe-payments.json': ['checkbox:defaultValue', 'select:defaultValue', 'input-number:placeholder'],
  'sundial-detail.json': ['radio-group:horizontal'],
  'sundial-todo-dialog.json': ['radio-group:horizontal'],
  'sundial-workbench.json': ['radio-group:horizontal'],
  'tree-crud.json': ['input-tree:placeholder'],
};

describe('complex-pages page-schemas compile validation', () => {
  const schemaDir = resolve(process.cwd(), 'src/complex-pages/page-schemas');
  const files = readdirSync(schemaDir).filter((f) => f.endsWith('.json'));

  it('discovers the page-schema corpus', () => {
    expect(files.length).toBeGreaterThan(30);
    for (const file of Object.keys(UNKNOWN_PROPERTY_BASELINE)) {
      expect(files, `${file} in baseline must exist`).toContain(file);
    }
  });

  for (const file of files) {
    it(`validates ${file}`, () => {
      const schema = JSON.parse(readFileSync(resolve(schemaDir, file), 'utf8'));
      const diagnostics = validateSchema({
        schema,
        registry: buildRegistry(),
        expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
        options: {
          validation: {
            unknownBarePropertyPolicy: 'error',
          },
        },
      });
      const unknownProps = diagnostics
        .filter((d) => d.code === 'unknown-property')
        .map((d) => {
          const match = /for renderer type "([^"]+)"/.exec(d.message);
          const rendererType = match?.[1] ?? 'unknown';
          const prop = d.path.split('/').pop() ?? d.path;
          return `${rendererType}:${prop}`;
        })
        .sort();
      const allowed = [...(UNKNOWN_PROPERTY_BASELINE[file] ?? [])].sort();
      const unexpected = unknownProps.filter((pair) => !allowed.includes(pair));
      expect(
        unexpected,
        `${file}: dead props not declared by their renderer (new since the ` +
          `validation gate; migrate the schema or declare the field). Baseline ` +
          `covers: ${allowed.join(', ') || 'nothing'}`,
      ).toEqual([]);
    });
  }
});
