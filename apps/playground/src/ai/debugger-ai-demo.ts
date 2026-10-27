import type { NopDebuggerController, NopSchemaPatch, NopSchemaPatchApplier } from '@nop-chaos/nop-debugger';
import type { AiConnector } from '@nop-chaos/flux-renderers-ai';

/**
 * Host-side demo backing for the debugger AI copilot (AD-6 reference
 * integration). Everything here lives in the HOST: the scripted connector
 * stands in for a real model, and the applier owns the demo schema truth —
 * `@nop-chaos/nop-debugger-ai` stays zero-credential, zero-network.
 *
 * DEMO SCOPE: the connector sources its patch target from a host-side tree
 * scan (not the tool face — real models learn cid via inspect context), and
 * the applier is a minimal single-field reference, not a production shape.
 */

export type DemoFormField = {
  type: 'input-text';
  name: string;
  label: string;
  value: string;
}

export type DemoFormSchema = {
  type: 'form';
  title: string;
  body: [DemoFormField];
};

export const DEMO_FIELD_LABEL_ORIGINAL = 'Project name';
export const DEMO_FIELD_LABEL_PATCHED = 'Archived project';

export function createDemoFormSchema(): DemoFormSchema {
  return {
    type: 'form',
    title: 'AI patch demo target',
    body: [
      { type: 'input-text', name: 'project', label: DEMO_FIELD_LABEL_ORIGINAL, value: 'Demo value' },
    ],
  };
}

export interface DemoSchemaPatchApplierInput {
  getSchema: () => DemoFormSchema;
  setSchema: (schema: DemoFormSchema) => void;
}

/**
 * Reference applier: snapshot-based atomic apply/revert over the demo schema.
 * Only `set-prop` on `label` is supported — anything else throws BEFORE the
 * schema state is touched (AD-3 atomicity: the host guarantees no half state).
 */
export function createDemoSchemaPatchApplier(
  input: DemoSchemaPatchApplierInput,
): NopSchemaPatchApplier {
  let revertSnapshot: DemoFormSchema | null = null;

  return {
    async apply(patch: NopSchemaPatch) {
      const schema = input.getSchema();
      for (const op of patch.ops) {
        if (op.type !== 'set-prop' || op.field !== 'label') {
          throw new Error(`demo applier supports set-prop/label only (got ${op.type}/${String(op.field)})`);
        }
      }
      revertSnapshot = structuredClone(schema);
      const next = structuredClone(schema);
      for (const op of patch.ops) {
        if (op.type === 'set-prop') {
          next.body[0].label = String(op.value);
        }
      }
      input.setSchema(next);
      return { revertToken: 'demo-revert-1' };
    },
    async revert() {
      if (!revertSnapshot) {
        throw new Error('no demo revert snapshot');
      }
      input.setSchema(revertSnapshot);
      revertSnapshot = null;
    },
    async preview(patch: NopSchemaPatch) {
      const labelOp = patch.ops.find((op) => op.type === 'set-prop' && op.field === 'label');
      if (!labelOp || labelOp.type !== 'set-prop') {
        return { kind: 'unsupported' as const };
      }
      return { kind: 'rendered' as const, summary: `sandbox preview: label → ${String(labelOp.value)}` };
    },
  };
}

/**
 * Deterministic scripted stand-in for a real model. First exchange proposes a
 * label patch targeting the live tree's first `input-text` node (host-side
 * scan — the tool face has no tree enumeration); the second turn confirms
 * staging; later turns answer in text.
 */
export function createDemoConnector(controller: NopDebuggerController): AiConnector {
  let calls = 0;
  const buildProposalArguments = (): string => {
    const target = controller
      .getComponentTree()
      .find((item) => item.rendererType === 'input-text' && item.mounted);
    return JSON.stringify({
      target: target ? { cid: target.cid } : {},
      ops: [{ type: 'set-prop', field: 'label', value: DEMO_FIELD_LABEL_PATCHED }],
      reason: 'Demo proposal: rename the demo field label.',
    });
  };
  return {
    async *stream() {
      calls += 1;
      if (calls === 1) {
        yield {
          delta: {
            role: 'assistant',
            tool_calls: [
              {
                index: 0,
                id: 'demo-call-propose',
                type: 'function',
                function: { name: 'propose_schema_patch', arguments: buildProposalArguments() },
              },
            ],
          },
        };
        yield { finishReason: 'tool_calls' };
      } else {
        yield {
          delta: {
            role: 'assistant',
            content: 'Demo proposal staged. Review the candidate card and adopt to apply it.',
          },
        };
        yield { finishReason: 'stop' };
      }
    },
  };
}
