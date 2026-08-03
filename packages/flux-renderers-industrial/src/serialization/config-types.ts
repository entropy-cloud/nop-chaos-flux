import type { ScadaSymbolStylePatch } from '../symbols/symbol-types.js';

export type ScadaPrimitive = number | boolean | string;

export interface ScadaPointDeclaration {
  id: string;
  source: 'static' | 'expression' | 'flux';
  value?: ScadaPrimitive;
  expression?: string;
  flux?: string;
  scale?: { k?: number; b?: number } | { expression: string };
  deadband?: number;
  unit?: string;
  format?: string;
  init?: ScadaPrimitive;
}

export interface ScadaBinding {
  point?: string;
  expression?: string;
  map?: Record<string, string | number | boolean>;
  scale?: ScadaPointDeclaration['scale'];
  format?: string;
}

export type ScadaAnimationKind = 'rotate' | 'blink' | 'flow' | 'move';

export interface ScadaAnimation {
  kind: ScadaAnimationKind;
  period?: number;
  from?: number | { x: number; y: number };
  to?: number | { x: number; y: number };
  when?: 'always' | { state: string };
  loop?: number;
}

export interface ScadaStateDeclaration {
  states: Record<string, ScadaStateDefinition>;
  ranges?: Array<{ min?: number; max?: number; state: string }>;
  booleanMap?: { true: string; false: string };
  valueMap?: Record<string, string>;
}

export interface ScadaStateDefinition {
  style?: ScadaSymbolStylePatch;
  animations?: ScadaAnimation[];
}

export interface ScadaSymbolEvent {
  on: 'click' | 'dblclick' | 'hover';
  action: unknown;
}

export interface ScadaSymbolNode {
  id: string;
  type: string;
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
  fillStyle?: Record<string, unknown> | string;
  shadow?: { x: number; y: number; blur: number; color: string };
  text?: string;
  textColor?: string;
  textSize?: number;
  custom?: Record<string, unknown>;
  bindings?: Record<string, ScadaBinding>;
  states?: ScadaStateDeclaration;
  animations?: ScadaAnimation[];
  events?: ScadaSymbolEvent[];
  children?: ScadaSymbolNode[];
}

export interface ScadaConfig {
  version: 1;
  viewport?: { x: number; y: number; scale: number };
  background?: { color?: string; grid?: { size: number; color: string } };
  variables?: ScadaPointDeclaration[];
  symbols: ScadaSymbolNode[];
}

export interface ScadaVariablesDiff {
  added: ScadaPointDeclaration[];
  removed: string[];
  updated: Array<{ id: string; patch: Partial<ScadaPointDeclaration> }>;
}

export interface ScadaConfigDiff {
  added: ScadaSymbolNode[];
  removed: string[];
  updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }>;
  variables?: ScadaVariablesDiff;
}
