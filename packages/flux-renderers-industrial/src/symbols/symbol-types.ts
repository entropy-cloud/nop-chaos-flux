import type { IUI } from 'leafer-ui';
import type {
  ScadaAnimation,
  ScadaBinding,
  ScadaStateDeclaration,
  ScadaSymbolEvent,
} from '../serialization/config-types.js';

export type LeafNode = IUI;

export type ScadaSymbolCategory = 'shape' | 'device' | 'instrument' | 'sensor-control' | 'pipe';

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
  fillStyle?: Record<string, unknown>;
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
}
