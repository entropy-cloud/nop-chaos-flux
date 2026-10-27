import { describe, expect, it, vi } from 'vitest';
import type { NopDebuggerController, NopSchemaPatchApplier } from '@nop-chaos/nop-debugger';
import {
  createDemoConnector,
  createDemoFormSchema,
  createDemoSchemaPatchApplier,
  DEMO_FIELD_LABEL_ORIGINAL,
  DEMO_FIELD_LABEL_PATCHED,
} from './debugger-ai-demo.js';

function setupApplier() {
  let schema = createDemoFormSchema();
  const setSchema = vi.fn((next: typeof schema) => {
    schema = next;
  });
  const applier: NopSchemaPatchApplier = createDemoSchemaPatchApplier({
    getSchema: () => schema,
    setSchema,
  });
  return { applier, getSchema: () => schema, setSchema };
}

const LABEL_PATCH = {
  id: 'demo-patch-1',
  createdAt: 1_700_000_000_000,
  scope: { controllerId: 'demo', target: { cid: 1 } },
  ops: [{ type: 'set-prop' as const, field: 'label', value: DEMO_FIELD_LABEL_PATCHED }],
};

describe('demo schema patch applier (reference host applier)', () => {
  it('apply patches the demo label; revert restores the snapshot', async () => {
    const { applier, getSchema } = setupApplier();
    const { revertToken } = await applier.apply(LABEL_PATCH);
    expect(revertToken).toBeTruthy();
    expect(getSchema().body[0].label).toBe(DEMO_FIELD_LABEL_PATCHED);
    await applier.revert(revertToken);
    expect(getSchema().body[0].label).toBe(DEMO_FIELD_LABEL_ORIGINAL);
  });

  it('atomicity: a non-label op rejects before any schema mutation', async () => {
    const { applier, getSchema, setSchema } = setupApplier();
    await expect(
      applier.apply({
        ...LABEL_PATCH,
        ops: [{ type: 'set-prop', field: 'value', value: 'x' }],
      }),
    ).rejects.toThrow(/set-prop\/label only/);
    expect(setSchema).not.toHaveBeenCalled();
    expect(getSchema().body[0].label).toBe(DEMO_FIELD_LABEL_ORIGINAL);
  });

  it('revert without a prior apply throws; snapshots are independent per apply', async () => {
    const { applier, getSchema } = setupApplier();
    await expect(applier.revert('demo-revert-1')).rejects.toThrow(/no demo revert snapshot/);
    await applier.apply(LABEL_PATCH);
    // A second apply re-snapshots: revert returns to the LATEST pre-apply state.
    await applier.apply({
      ...LABEL_PATCH,
      ops: [{ type: 'set-prop', field: 'label', value: 'Second rename' }],
    });
    expect(getSchema().body[0].label).toBe('Second rename');
    await applier.revert('demo-revert-1');
    expect(getSchema().body[0].label).toBe(DEMO_FIELD_LABEL_PATCHED);
  });

  it('preview returns a text summary for label ops and unsupported otherwise', async () => {
    const { applier } = setupApplier();
    const rendered = await applier.preview!(LABEL_PATCH);
    expect(rendered).toEqual({ kind: 'rendered', summary: `sandbox preview: label → ${DEMO_FIELD_LABEL_PATCHED}` });
    const unsupported = await applier.preview!({
      ...LABEL_PATCH,
      ops: [{ type: 'set-expression', field: 'visible', expression: 'false' }],
    });
    expect(unsupported).toEqual({ kind: 'unsupported' });
  });
});

describe('demo connector (scripted model stand-in)', () => {
  function fakeController(tree: Array<{ cid: number; rendererType?: string; mounted?: boolean }>) {
    return {
      id: 'demo-ctl',
      getComponentTree: () =>
        tree.map((item) => ({
          cid: item.cid,
          type: item.rendererType ?? 'unknown',
          label: `node-${item.cid}`,
          depth: 0,
          mounted: item.mounted ?? true,
          rendererType: item.rendererType,
        })),
    } as unknown as NopDebuggerController;
  }

  it('first turn proposes a label patch targeting the first live input-text node', async () => {
    const controller = fakeController([
      { cid: 1, rendererType: 'form' },
      { cid: 2, rendererType: 'input-text' },
      { cid: 3, rendererType: 'input-text' },
    ]);
    const connector = createDemoConnector(controller);
    const stream = await connector.stream({ messages: [], signal: new AbortController().signal });
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const toolCall = chunks[0]?.delta?.tool_calls?.[0];
    expect(toolCall?.function?.name).toBe('propose_schema_patch');
    const args = JSON.parse(toolCall!.function!.arguments as string);
    // Filters to input-text: the form container never wins the target.
    expect(args.target.cid).toBe(2);
    expect(args.ops[0]).toEqual({ type: 'set-prop', field: 'label', value: DEMO_FIELD_LABEL_PATCHED });
  });

  it('second turn answers in text (staging confirmation)', async () => {
    const connector = createDemoConnector(fakeController([{ cid: 2, rendererType: 'input-text' }]));
    const signal = new AbortController().signal;
    const chunks = [];
    for await (const chunk of await connector.stream({ messages: [], signal })) {
      chunks.push(chunk);
    }
    for await (const chunk of await connector.stream({ messages: [], signal })) {
      chunks.push(chunk);
    }
    expect(chunks.some((chunk) => chunk.delta?.content?.includes('staged'))).toBe(true);
  });
});
