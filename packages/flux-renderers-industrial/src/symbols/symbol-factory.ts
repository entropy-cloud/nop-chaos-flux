import { getScadaSymbolDefinition } from './symbol-registry.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps, SymbolCreateContext } from './symbol-types.js';

export function createSymbolNode(definition: ScadaSymbolDefinition, ctx: SymbolCreateContext): LeafNode {
  return definition.create(ctx);
}

export function instantiateSymbol(type: string, ctx: SymbolCreateContext): LeafNode {
  const definition = getScadaSymbolDefinition(type);
  if (!definition) {
    throw new Error(`unknown scada symbol type: ${type}`);
  }
  const props: ScadaSymbolProps = { ...definition.defaults, ...ctx.props };
  return createSymbolNode(definition, { ...ctx, props });
}

export function toNodePatch(node: LeafNode, patch: Partial<ScadaSymbolProps>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === 'scale') {
      out.scaleX = value;
      out.scaleY = value;
    } else if (key === 'textSize') {
      out.fontSize = value;
    } else if (key === 'textColor') {
      if (node.tag === 'Text') out.fill = value;
      else out[key] = value;
    } else if (key === 'align') {
      out.textAlign = value;
    } else if (key === 'strokeDash') {
      out.dashPattern = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}
