/**
 * page-designer-core 公共类型层（design: docs/components/page-designer/design-architecture.md）。
 *
 * 编排对象 = 授权态 `SchemaInput`（S1 §3.1，唯一事实源，无第二套文档模型）。
 * 本包零 React / node-only 纯逻辑；React 壳归 page-designer-renderers（S2）。
 */

import type {
  EditorCore,
  EditorCommitPolicy,
  EditorDomainAdapter,
  EditorSessionState,
} from '@nop-chaos/editor-core';
import type { RendererEnv, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { SidRandom } from './round-trip.js';

/** 会话节点标识：`psid-` 前缀 + 随机串，文档态经 `xui:sid` 注入（S1 §6）。 */
export type SessionNodeId = string;

/** 设计器文档 = 授权态 SchemaInput（S1 §3.1）。 */
export type DesignerDocument = SchemaInput;

/**
 * 最小树 patch 集（S1 §7.1）。JSON Pointer 风格 path（`''` 为根，`/body/0` 形式）。
 *
 * patch 在**单条** diff 命令内 forward/inverse 位置对称，回放安全；
 * 跨步的节点稳定性由 `xui:sid` 承担（S1 §6），两层各司其职。
 */
export type JsonTreePatch =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string };

/**
 * 树命令（S1 §7.2）。canvas/inspector/palette/JSON 视图的**唯一**写入口；
 * 命令内部完成「patch 生成 + sid 维护」，经 `session.dispatch` 落 `core.update`。
 *
 * 粒度规则：一次用户意图 = 一条 undo 步；连续手势以事务收口
 * （`core.beginTransaction` / `core.endTransaction`，一拖拽一步语义由 editor-core 内建）。
 */
export type DesignerTreeCommand =
  | {
      kind: 'insertNode';
      parentId: SessionNodeId;
      regionKey: string;
      index?: number;
      node: SchemaInput;
    }
  | { kind: 'removeNode'; nodeId: SessionNodeId }
  | {
      kind: 'moveNode';
      nodeId: SessionNodeId;
      targetParentId: SessionNodeId;
      targetRegionKey: string;
      index: number;
    }
  /** 批量字段合并（S3 动作编排复用）。浅合并：只写声明的键，不触碰其余键（含 sid）。 */
  | { kind: 'updateProps'; nodeId: SessionNodeId; props: Record<string, unknown> }
  | { kind: 'replaceRegion'; nodeId: SessionNodeId; regionKey: string; node: SchemaInput | null }
  | { kind: 'importDocument'; doc: SchemaInput };

/** `session.dispatch` 结果（rt-unknown-type / drop-invalid-target 等失败路径的统一出口）。 */
export interface DesignerCommandResult {
  ok: boolean;
  /** 失败原因码（`unknown-parent` / `invalid-region` / `invalid-target` / `invalid-node` / `unknown-type` / `empty-change`）。 */
  error?: string;
  /** insertNode 成功时返回新落节点根 sid，供画布选中新节点。 */
  nodeId?: SessionNodeId;
}

/**
 * 域适配器（S1 §7.1）。diff/applyDiff 为纯函数，forward/inverse 对称
 * （`applyDiff(applyDiff(doc, forward), inverse)` 深等于 `doc`）。
 *
 * - `load()`：空页脚手架 `{ type: 'page', body: [] }`。
 * - `serialize(doc)`：`stripSessionIds` 后 JSON 文本（S1 §6 导出投影单点，INV-E）。
 * - `validate(doc)`：结构合法 + type 已注册校验（rt-unknown-type：导入含未注册 type 拒绝）。
 */
export interface PageDesignerDomainAdapter
  extends EditorDomainAdapter<DesignerDocument, JsonTreePatch[]> {
  kind: 'flux-page-schema';
}

/** 会话组装选项（S1 §4.2）。registry 为设计器自持实例（S1 §11.1，与宿主零共享）。 */
export interface PageDesignerSessionOptions {
  registry: RendererRegistry;
  /** 编辑态预览 env（host 提供）。 */
  env: RendererEnv;
  /** 缺省 `'manual'`。 */
  commitPolicy?: EditorCommitPolicy;
  /**
   * 可注入 sid PRNG（S1 §6.1：可注入 PRNG，fuzz 用固定种子）。
   * 缺省使用基于时间种子的内部 PRNG。
   */
  sidRandom?: SidRandom;
}

/** 页面设计器会话（S1 §4.2）。undo/redo/双态整层复用 editor-core。 */
export interface PageDesignerSession {
  /** editor-core 内核（含 beginTransaction/endTransaction 事务收口）。 */
  readonly core: EditorCore<DesignerDocument, JsonTreePatch[]>;
  /** 设计器自持 registry（palette/canvas/inspector 契约面）。 */
  readonly registry: RendererRegistry;
  /** 编辑态预览 env。 */
  readonly env: RendererEnv;
  /** 树命令唯一写入口（S1 §7.2）。 */
  dispatch(command: DesignerTreeCommand): DesignerCommandResult;
  getSnapshot(): EditorSessionState<DesignerDocument>;
  subscribe(listener: (s: EditorSessionState<DesignerDocument>) => void): () => void;
}
