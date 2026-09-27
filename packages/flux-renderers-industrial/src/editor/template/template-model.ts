import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import { buildClipboardCopy, buildClipboardPaste, PASTE_OFFSET } from '../toolbox/clipboard.js';

/**
 * 模板库域核心（plan 522 / L5.4，design-template-station.md §2.1/§3）。
 *
 * 模板 = 可实例化片段：片段体是顶层 `ScadaSymbolNode[]`（serialization 原样结构，格式零新增）。
 * 持久化归宿主（storage 回调注入）；包内附带内存 store 供 demo/测试。
 */

export interface ScadaTemplate {
  id: string;
  name: string;
  createdAt: number;
  /** 片段体 = 顶层图元数组（含 group 子树），deep clone 语义（design-template-station.md §2.1 不变式）。 */
  symbols: ScadaSymbolNode[];
}

/** 宿主持久化回调契约（包内无 IO，design-template-station.md §1/§5）。 */
export interface ScadaTemplateStorage {
  listTemplates(): Promise<ScadaTemplate[]>;
  saveTemplate(template: ScadaTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
}

/**
 * 选区 → 模板体（design-template-station.md §3.1）：
 * 对 selection 中每个 id 取最顶层被选祖先（父 + 子并存只收父），输出 deep clone。
 * 未命中任何节点返回 []。
 */
export function collectTemplateSource(
  symbols: ScadaSymbolNode[],
  selection: string[],
): ScadaSymbolNode[] {
  const selected = new Set(selection);
  if (selected.size === 0) return [];
  const matched: ScadaSymbolNode[] = [];
  const walk = (nodes: ScadaSymbolNode[], ancestorSelected: boolean): void => {
    for (const node of nodes) {
      const selfSelected = selected.has(node.id);
      if (selfSelected && !ancestorSelected) {
        matched.push(node);
        continue;
      }
      if (node.children) walk(node.children, ancestorSelected || selfSelected);
    }
  };
  walk(symbols, false);
  // buildClipboardCopy 经 cloneNodeDeep 深拷贝（与 clipboard 同源 clone 实现，零重复）。
  return buildClipboardCopy(matched).symbols;
}

export interface InstantiateTemplateResult {
  nodes: ScadaSymbolNode[];
  newIds: string[];
  counterConsumed: number;
}

/**
 * 模板体 → 可插入画布的节点（design-template-station.md §3.2）：
 * 复用 clipboard 管线（buildClipboardPaste：deep clone + id 碰撞自增 + connection target/id 重写）。
 * offset 缺省 PASTE_OFFSET（+20/+20）；原位插入传 `{ x: 0, y: 0 }`。
 */
export function instantiateTemplateNodes(
  nodes: ScadaSymbolNode[],
  existingIds: Iterable<string>,
  startCounter = 0,
  offset: { x: number; y: number } = PASTE_OFFSET,
): InstantiateTemplateResult {
  if (nodes.length === 0) return { nodes: [], newIds: [], counterConsumed: 0 };
  const clipboard = buildClipboardCopy(nodes);
  const result = buildClipboardPaste(clipboard, startCounter, offset, new Set(existingIds));
  return {
    nodes: result.forward.added,
    newIds: result.newIds,
    counterConsumed: result.counterConsumed,
  };
}

/**
 * 模板信封工厂（id/createdAt 生成收敛到域核心模块——react-hooks/purity 禁止组件体内
 * Date.now/Math.random，design-template-station.md §2.1 信封字段）。
 */
export function createTemplate(name: string, symbols: ScadaSymbolNode[]): ScadaTemplate {
  return {
    id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name,
    createdAt: Date.now(),
    symbols,
  };
}

/**
 * 内存模板 store（design-template-station.md §3.3）：Map 承载 + Promise 化回调。
 * 非持久化（demo / 单测 / e2e 用），不替代宿主存储。
 */
export function createInMemoryTemplateStorage(): ScadaTemplateStorage & {
  clear(): void;
} {
  const templates = new Map<string, ScadaTemplate>();
  let nextId = 1;
  return {
    async listTemplates() {
      return [...templates.values()].map((tpl) => ({ ...tpl, symbols: [...tpl.symbols] }));
    },
    async saveTemplate(template) {
      templates.set(template.id, { ...template, symbols: [...template.symbols] });
    },
    async deleteTemplate(id) {
      templates.delete(id);
    },
    clear() {
      templates.clear();
      nextId = 1;
    },
    // id 生成辅助（宿主也可自行生成；内存 store 供 demo 时经此保持唯一）。
    get nextTemplateId() {
      return `tpl-${nextId++}`;
    },
  } as ScadaTemplateStorage & { clear(): void; nextTemplateId: string };
}
