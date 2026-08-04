import type { IUI } from 'leafer-ui';
import type {
  ScadaAnimation,
  ScadaBinding,
  ScadaStateDeclaration,
  ScadaSymbolEvent,
  ScadaSymbolNode,
} from '../serialization/config-types.js';

export type LeafNode = IUI;

export type ScadaSymbolCategory = 'shape' | 'device' | 'instrument' | 'sensor-control' | 'pipe';

export type ScadaFillStyle = Record<string, unknown> | string;

export interface ScadaSymbolProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  visible?: boolean;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  dashOffset?: number;
  /** 渐变/纹理参数（I8.1 落地：对象=leafer 渐变/图片 paint，字符串=透传 fill 字符串；透传 leafer 样式系统，取 fill 之前生效）。 */
  fillStyle?: ScadaFillStyle;
  shadow?: { x: number; y: number; blur: number; color: string };
  text?: string;
  textColor?: string;
  textSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  flow?: { enabled: boolean; speed: number; dash?: number[] };
  custom?: Record<string, unknown>;
  states?: ScadaStateDeclaration;
  bindings?: Record<string, ScadaBinding>;
  animations?: ScadaAnimation[];
  events?: ScadaSymbolEvent[];
}

export type ScadaSymbolStylePatch = Partial<
  Pick<
    ScadaSymbolProps,
    'fill' | 'stroke' | 'strokeWidth' | 'opacity' | 'visible' | 'textColor' | 'shadow' | 'strokeDash'
  >
>;

export type ScadaSymbolPropType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'any';

export interface ScadaSymbolPropSchemaEntry {
  type: ScadaSymbolPropType;
}

export type ScadaSymbolPropSchema = Record<string, ScadaSymbolPropSchemaEntry>;

export interface SymbolCreateContext {
  id: string;
  props: ScadaSymbolProps;
  engine: unknown;
  config: { world: { x: number; y: number; scale: number } };
}

export interface ScadaSymbolDefinition {
  type: string;
  name: string;
  props: ScadaSymbolPropSchema;
  defaults?: ScadaSymbolProps;
  create: (ctx: SymbolCreateContext) => LeafNode;
  applyProps?: (node: LeafNode, props: Partial<ScadaSymbolProps>) => void;
  resolveStateStyle?: (props: ScadaSymbolProps, state: string) => ScadaSymbolStylePatch;
  category?: ScadaSymbolCategory;
  /**
   * 默认几何 points 源（plan 2026-08-04-2243-2 D1）：points 几何族（polygon/line/arrow）在节点
   * 无显式 `custom.points` 时，由此 resolver 返回符号定义的默认 points（如 polygon `DEFAULT_TRIANGLE`、
   * line/arrow 由 width/height 派生 `[0,0,w,h]`），使 fit/center 包围盒不退化为 0 尺寸冲到 MAX_SCALE。
   * 返回值与 `custom.points` 同构——`{x,y}[]` 或 flat `[x1,y1,...]`。仅在 `boundsOfNode` 经
   * 显式 custom.points 路径未命中时 consult，不影响 create() 内的渲染几何。
   */
  defaultGeometryPoints?: (node: ScadaSymbolNode) => unknown[] | undefined;
}

/** 引擎图片缓存桥接面（I8.1，INV-1）：URL 经引擎图片缓存归位；桥接层 env.fetcher 由 I10.1 注入。 */
export interface ScadaEngineImageBridge {
  resolveImageUrl?: (url: string) => string;
}
