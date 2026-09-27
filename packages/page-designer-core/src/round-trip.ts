/**
 * xui:sid round-trip（design: docs/components/page-designer/design-architecture.md §6）。
 *
 * 会话节点标识 `xui:sid` 以文档态注入：载入/导入单点全树注入（`injectSessionIds`），
 * 导出投影单点剥离（`stripSessionIds`）。sid 是设计器私有保留键，与用户 `id`、
 * 用户 `xui:*` 键正交。
 *
 * 不变式清单（QA.6 round-trip 验收的判定基准，S1 §6.1）：
 *
 * - **INV-A 导出恒等式**：`stripSessionIds(injectSessionIds(doc))` 与 `doc` 深相等且键序一致；
 *   fuzz 直接断言本式（含 `JSON.stringify` 逐字节相等）。
 * - **INV-B 逐字保留**：未知键与用户 `xui:*` 键原样保留（值、键序、嵌套结构）。
 *   设计器只经结构化命令触碰文档，禁止任何「归一化重写」。注入只在 schema 节点
 *   （含 string `type` 的 plain object，`isSchema` 判定）上追加 `xui:sid` 一个键（追加在键序末尾），
 *   其余一切键不动。
 * - **INV-C 键序保留**：树编辑采用结构共享（只重建被触碰节点及其祖先链），未触碰子树
 *   保持引用与键序；`JSON.stringify` 按插入序输出（结构共享断言落 commands 域测试）。
 * - **INV-D sid 稳定性**：sid 树内唯一；节点 move/父级变更/undo/redo 后不变（patch 回放
 *   逐字恢复文档，sid 随之恢复）；复制/替换节点重新注入生成新 sid；删除即失效。
 * - **INV-E 运行时零感知**：导出产物（serialize 输出）不含 `xui:sid`；预览态渲染剥离后
 *   文档；`xui:sid` 不出现在任何运行时消费路径。
 * - **INV-F 授权态单向**：serialize/diff/applyDiff 全部作用于授权态 `SchemaInput`；
 *   编译工件（TemplateNode 等）只读，永不作为编辑载体回写。
 *
 * schema 节点识别规则（与 registry 无关的纯函数判定）：plain object 且含 string `type`
 * 键（复用 flux-core `isSchema`）。全树深走注入/剥离，保证 region 子树、嵌套
 * schema-array、深层嵌套构造一视同仁；非 schema 的纯数据对象（无 `type`）永不注入。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';

/** 设计器私有保留键（S1 §6，`xui:*` 保留命名空间）。 */
export const SESSION_ID_KEY = 'xui:sid';

/** 会话节点标识（`psid-` 前缀 + 随机串）。 */
export type SessionNodeId = string;

/** 可注入 PRNG（S1 §6.1）。返回 [0, 1) 随机数；fuzz 用固定种子实现。 */
export type SidRandom = () => number;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * mulberry32 固定种子 PRNG（[0, 1)）。测试注入固定种子；运行时缺省 PRNG 亦由此构造。
 */
export function createSeededRandom(seed: number): SidRandom {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSuffix(rng: SidRandom): string {
  // 6 个 base36 字符（~36^6 ≈ 2.2e9 空间），配合树内唯一性重试足够。
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += Math.floor(rng() * 36).toString(36);
  }
  return out;
}

/** 生成一个不在 `exclude` 集合内的新 sid（INV-D 树内唯一）。 */
export function createSessionNodeId(rng: SidRandom, exclude?: ReadonlySet<string>): SessionNodeId {
  const taken = exclude;
  for (;;) {
    const id = `psid-${randomSuffix(rng)}`;
    if (!taken || !taken.has(id)) return id;
  }
}

function readSid(node: unknown): string | undefined {
  if (!isPlainObject(node)) return undefined;
  const sid = node[SESSION_ID_KEY];
  return typeof sid === 'string' ? sid : undefined;
}

/** 读取节点上的会话 sid（非 schema 节点或缺失返回 undefined）。 */
export function getSessionId(node: unknown): SessionNodeId | undefined {
  return isSchema(node) ? readSid(node) : undefined;
}

function injectInto(value: unknown, rng: SidRandom, used: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => injectInto(item, rng, used));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    next[key] = injectInto(value[key], rng, used);
  }
  if (isSchema(value)) {
    next[SESSION_ID_KEY] = createSessionNodeId(rng, used);
  }
  return next;
}

/**
 * 载入/导入单点全树注入（S1 §6）。深拷贝返回；对已有 `xui:sid` 一律重新分配
 * （sid-collision 失败路径：导入文档 sid 与现文档冲突 → 重新分配）。
 * 键序：除新增 `xui:sid`（键序末尾）外逐字保留（INV-B）。
 */
export function injectSessionIds(doc: SchemaInput, rng: SidRandom): SchemaInput {
  return injectInto(doc, rng, new Set<string>()) as SchemaInput;
}

function stripFrom(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripFrom);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (key === SESSION_ID_KEY) continue;
    next[key] = stripFrom(value[key]);
  }
  return next;
}

/**
 * 导出投影单点剥离（S1 §6，adapter.serialize 内部调用）。
 * 深拷贝返回；只移除各层 `xui:sid` 键，其余键值与键序逐字保留（INV-A/INV-B）。
 */
export function stripSessionIds(doc: SchemaInput): SchemaInput {
  return stripFrom(doc) as SchemaInput;
}

function collectFrom(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectFrom(item, out);
    return;
  }
  if (!isPlainObject(value)) return;
  const sid = readSid(value);
  if (sid !== undefined) out.add(sid);
  for (const key of Object.keys(value)) {
    collectFrom(value[key], out);
  }
}

/** 收集文档内全部 sid（adapter.getDocumentIds 投影，供选区修剪）。 */
export function collectSessionIds(doc: SchemaInput): SessionNodeId[] {
  const out = new Set<string>();
  collectFrom(doc, out);
  return [...out];
}

export interface SchemaNodeEntry {
  node: BaseSchema;
  /** JSON Pointer 风格路径（`''` 为根）。 */
  path: string;
}

/** 前序遍历全部 schema 节点（含根；诊断/调试用）。 */
export function walkSchemaNodes(doc: SchemaInput): SchemaNodeEntry[] {
  const out: SchemaNodeEntry[] = [];
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}/${index}`));
      return;
    }
    if (!isPlainObject(value)) return;
    if (isSchema(value)) {
      out.push({ node: value, path });
    }
    for (const key of Object.keys(value)) {
      visit(value[key], `${path}/${escapeJsonPointerToken(key)}`);
    }
  };
  visit(doc, '');
  return out;
}

export function escapeJsonPointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapeJsonPointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function formatJsonPointer(path: string, token: string | number): string {
  return `${path}/${escapeJsonPointerToken(String(token))}`;
}
