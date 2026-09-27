/**
 * 会话组装（design: docs/components/page-designer/design-architecture.md §4.2/§7）。
 *
 * editor-core 整层复用，不写新命令栈（裁决 4）：working/committed 双态、
 * forward/inverse 对称 diff 栈（`EditorDiffEntry`）、事务（`beginTransaction/endTransaction`
 * 一拖拽一步语义内建）与提交策略全部来自 `createEditorCore`；本包只补
 * flux 授权态树的 patch 实现与 sid 维护（领域层职责）。
 *
 * registry 为设计器自持实例（S1 §11.1），与宿主应用零共享；
 * `flux-core`/`editor-core`/`flux-bundle` 不得反向依赖本包（S1 §4.1 铁律）。
 */

import { createEditorCore } from '@nop-chaos/editor-core';
import type { EditorCore } from '@nop-chaos/editor-core';
import { isSchema } from '@nop-chaos/flux-core';
import { applyDesignerCommand } from './commands.js';
import { collectSessionIds, createSeededRandom, injectSessionIds, stripSessionIds, walkSchemaNodes } from './round-trip.js';
import type { SidRandom } from './round-trip.js';
import { applyTreePatches, diffSchemaInput } from './tree-patch.js';
import type { JsonTreePatch } from './types.js';
import type {
  DesignerCommandResult,
  DesignerDocument,
  DesignerTreeCommand,
  PageDesignerDomainAdapter,
  PageDesignerSession,
  PageDesignerSessionOptions,
} from './types.js';

/** 空页脚手架（S1 §7.1 `load()`）。 */
export function createEmptyPageDocument(): DesignerDocument {
  return { type: 'page', body: [] };
}

let sessionSeedCounter = 0;

function createDefaultSidRandom(): SidRandom {
  sessionSeedCounter = (sessionSeedCounter + 1) % 0x7fffffff;
  return createSeededRandom((Date.now() ^ (sessionSeedCounter * 0x9e3779b9)) >>> 0);
}

/**
 * 域适配器工厂（S1 §7.1）：
 * - `load()`：空页脚手架；
 * - `serialize(doc)`：`stripSessionIds` 后 JSON 文本（导出投影单点，INV-E）；
 * - `validate(doc)`：结构合法 + type 已注册（rt-unknown-type：未注册 type 拒绝导入）；
 * - `diff`/`applyDiff`：patch 生成与回放（纯函数，forward/inverse 对称）；
 * - `getDocumentIds`：全树 sid 投影（文档变更时修剪 selection 到仍存在的节点）。
 */
export function createPageDesignerDomainAdapter(registry: PageDesignerSessionOptions['registry']): PageDesignerDomainAdapter {
  const knownTypes = new Set(registry.list().map((definition) => definition.type));
  return {
    kind: 'flux-page-schema',
    load: () => createEmptyPageDocument(),
    serialize: (doc) => JSON.stringify(stripSessionIds(doc), null, 2),
    validate: (doc) => {
      if (!isSchema(doc) && !(Array.isArray(doc) && doc.every((item) => isSchema(item)))) {
        return { ok: false, errors: ['document is not a SchemaInput'] };
      }
      const errors: string[] = [];
      for (const { node, path } of walkSchemaNodes(doc)) {
        if (!knownTypes.has(node.type)) {
          errors.push(`unknown renderer type "${node.type}" at ${path || '/'}`);
        }
      }
      return errors.length > 0 ? { ok: false, errors } : { ok: true };
    },
    diff: (prev, next) => diffSchemaInput(prev, next),
    applyDiff: (doc, patches) => applyTreePatches(doc, patches),
    getDocumentIds: (doc) => collectSessionIds(doc),
  };
}

/**
 * `createPageDesignerSession` —— 页面设计器会话工厂（S1 §4.2）。
 *
 * commitPolicy 缺省 `'manual'`；undo 栈深沿用 editor-core 缺省 100；
 * sid PRNG 可注入（固定种子），缺省内部时间种子。
 * 载入单点（S1 §6）：初始文档（`adapter.load()` 空页脚手架）经 `injectSessionIds`
 * 全树注入后再入核——新建会话的画布锚点/命令寻址与导入路径同构，且不占 undo 步。
 */
export function createPageDesignerSession(options: PageDesignerSessionOptions): PageDesignerSession {
  const adapter = createPageDesignerDomainAdapter(options.registry);
  const rng = options.sidRandom ?? createDefaultSidRandom();
  const core: EditorCore<DesignerDocument, JsonTreePatch[]> = createEditorCore<DesignerDocument, JsonTreePatch[]>(
    adapter,
    {
      policy: options.commitPolicy ?? 'manual',
      initialDocument: injectSessionIds(adapter.load(), rng),
    },
  );
  const ctx = { core, registry: options.registry, rng };
  return {
    core,
    registry: options.registry,
    env: options.env,
    dispatch: (command: DesignerTreeCommand): DesignerCommandResult => applyDesignerCommand(ctx, command),
    getSnapshot: () => core.getState(),
    subscribe: (listener) => core.subscribe(listener),
  };
}
