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
  /**
   * 显式 state-driver 点/属性（plan 2026-08-05-0653-3 B3）：格式 `"pointId"` 或 `"pointId.property"`。
   * 缺省时 `collectStates` 取反向索引 `lookupSymbol(symbolId)[0]`（插入序，key 序敏感）；
   * 声明后以指定 pointId（+ 可选 property）作 state-driver，使 key 重排不翻转 state-driver 语义。
   * 缺省 property 时回落该 pointId 在此图元的首个绑定 property。
   */
  stateSource?: string;
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
  /** 节点原点 x（可选 + 默认 0；plan 2026-08-04-2242-2：三层契约收敛——type/validator/runtime-consumer 同读「可选 + 默认 0」，与同接口 width/height/rotation/scale 一致，bounds consumer 经 `?? 0` 兜底） */
  x?: number;
  /** 节点原点 y（可选 + 默认 0；plan 2026-08-04-2242-2） */
  y?: number;
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
  /** plan 2026-08-09-0121-2 Workstream B 本轮-6：圆角矩形 per-instance 角半径（与 ScadaSymbolProps.cornerRadius 对齐，保证 diff/序列化往返）。 */
  cornerRadius?: number;
  fillStyle?: Record<string, unknown> | string;
  shadow?: { x: number; y: number; blur: number; color: string };
  text?: string;
  textColor?: string;
  textSize?: number;
  // plan 2026-08-08-0748-1 HCA5 Phase 2（P1-1 跨层 drift）：补 fontFamily/fontWeight/align。
  // ScadaSymbolProps（symbol-types.ts:34,36,38）已声明、scada-text create 消费、validate.ts:287 校验
  // fontFamily/fontWeight，但 ScadaSymbolNode 漏声明 → SYMBOL_KEYS（diff.ts）无法含此三键 →
  // diffScadaConfig 对三字段产出空 patch，host live config 改文本对齐/字体被静默丢弃（prior P1-1
  // `flow` 同类，2026-08-05-0653-2 Phase 2）。补声明后 SYMBOL_KEYS 可补键，diff 往返恢复。
  fontFamily?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  /** 管线流动参数（I9.4 管道图元经 applyProps 增量消费；I2.2 §4.4 flow 行）。 */
  flow?: { enabled: boolean; speed: number; dash?: number[] };
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
  /**
   * 顶层 symbols 数组的全新顺序（id 列表）。
   *
   * plan 2026-08-07-1835-1 Phase 3 / open P1-E：z-order 增量 diff。z 序 = 顶层 symbols 数组顺序，
   * 节点内容不变 → 无法用 added/removed/updated 表达。专用 `reordered` 字段持新顺序 id 列表（O(n) strings，
   * 远小于全量节点对象的 O(n) full-replace），forward.reordered = 新顺序，inverse.reordered = 旧顺序。
   * applyDiff 时按 reordered id 列表重排现有节点（节点本身引用复用，无 clone）。
   * 缺省 undefined：常规 diff（add/remove/update）不携带。
   */
  reordered?: string[];
}
