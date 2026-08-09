import { getScadaSymbolDefinition } from './symbol-registry.js';
import { deepMergeInstanceProps } from './compound.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps, SymbolCreateContext } from './symbol-types.js';

export function createSymbolNode(definition: ScadaSymbolDefinition, ctx: SymbolCreateContext): LeafNode {
  return definition.create(ctx);
}

export function instantiateSymbol(type: string, ctx: SymbolCreateContext): LeafNode {
  const definition = getScadaSymbolDefinition(type);
  if (!definition) {
    throw new Error(`unknown scada symbol type: ${type}`);
  }
  // 实例属性覆盖深合并（I8.3，design-symbols.md §4.3 优先级链：defaults ← 实例 JSON 属性 ← 声明层）
  const props = deepMergeInstanceProps(definition.defaults, ctx.props);
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
    } else if (key === 'fillStyle') {
      out.fill = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * `toNodePatch` 的逆映射（plan 2026-08-06-0900-2 P2-10）：把 leafer 节点属性面的键名反向映射回
 * `ScadaSymbolProps` schema 名，使 `getSymbolProps` 读返回与 `setSymbolProps`/`toNodePatch` 写期望键名对称
 * ——host `getSymbol(id)` → `setSymbolProps(id, roundtrip)` 往返不再喂错键。
 *
 * 映射对偶：`scaleX`+`scaleY`→`scale`（统一缩放，写侧恒等写两者）、`fontSize`→`textSize`、
 * `textAlign`→`align`、`dashPattern`→`strokeDash`；`fill` 多对一歧义按 `node.tag` 区分——
 * Text 节点 `fill`→`textColor`（写侧 `textColor`→`fill`），非 Text 节点 `fill`→`fill` 透传。
 * 仅发射 schema 键，非 schema 键（mock 内部 `tag`/`children`/声明层字段）跳过，避免往返写回污染节点。
 */
const NODE_BACKED_PASSTHROUGH_KEYS = new Set([
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'visible',
  'opacity',
  'fill',
  'stroke',
  'strokeWidth',
  'shadow',
  'text',
  'dashOffset',
  // 文本/声明层 schema 字段：仅当 create 显式写入节点时透传（复合图元 applyProps 不写节点 → 这些键缺省即跳过）
  'fontFamily',
  'fontWeight',
  'custom',
  'states',
  'bindings',
  'animations',
  'events',
  'flow',
]);

export function fromNodeAttrs(node: LeafNode, raw: Record<string, unknown>): Partial<ScadaSymbolProps> {
  const out: Record<string, unknown> = {};
  const isText = (node as { tag?: string }).tag === 'Text';
  let scaleEmitted = false;
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (key === 'scaleX' || key === 'scaleY') {
      // 统一缩放写侧恒 scaleX===scaleY；发射一次 scale（取首遇值），不重复
      if (!scaleEmitted) {
        out.scale = value;
        scaleEmitted = true;
      }
    } else if (key === 'fontSize') {
      out.textSize = value;
    } else if (key === 'textAlign') {
      out.align = value;
    } else if (key === 'dashPattern') {
      out.strokeDash = value;
    } else if (key === 'fill') {
      if (isText) out.textColor = value;
      else out.fill = value;
    } else if (NODE_BACKED_PASSTHROUGH_KEYS.has(key)) {
      out[key] = value;
    }
    // 其余键（mock 内部 tag/children/parent/listeners、声明层字段）跳过——非 schema 键不参与往返
  }
  return out as Partial<ScadaSymbolProps>;
}
