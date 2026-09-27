/**
 * 命令序列化接口（S4-3 协作命令模型预留，design §11.2「批量树命令」行 +
 * roadmap S4「（可选）协作命令模型预留」）。
 *
 * `DesignerTreeCommand` 是纯数据（无函数/无循环引用），JSON 形态即
 * `{ kind, ...fields }`；本模块只做「命令 ↔ JSON 值」的双向投影与入站校验，
 * **不实现传输**（协作通道、CRDT/OT 合并等均为 Non-Goals）。
 *
 * 校验纪律与命令执行器同源：kind 白名单 + 必填字段形状 + `isSchema`
 * （insertNode.node / importDocument.doc 必须是合法 schema 节点），
 * 非法输入返回 `{ ok: false, error }` 而不是抛异常（协作入站流不可信面）。
 */

import { isSchemaInput } from '@nop-chaos/flux-core';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { isPlainObject } from './round-trip.js';
import type { DesignerTreeCommand } from './types.js';

/** 序列化形态：JSON-able 的 `{ kind, ...fields }` 记录。 */
export type SerializedDesignerCommand = Record<string, unknown> & { kind: string };

export type DeserializedCommand =
  | { ok: true; command: DesignerTreeCommand }
  | { ok: false; error: string };

function isSid(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

/**
 * `serializeCommand`：命令 → JSON-able 值。命令本身是纯数据，这里只做浅展开
 * （node/doc/props 已是 JSON-able；调用方保证文档内无 sid 或有意保留——序列化
 * 面不触碰 sid，剥离是导出投影 `serialize` 的职责，INV-E）。
 */
export function serializeCommand(command: DesignerTreeCommand): SerializedDesignerCommand {
  switch (command.kind) {
    case 'insertNode':
      return { kind: command.kind, parentId: command.parentId, regionKey: command.regionKey, ...(command.index !== undefined ? { index: command.index } : {}), node: command.node };
    case 'removeNode':
      return { kind: command.kind, nodeId: command.nodeId };
    case 'moveNode':
      return { kind: command.kind, nodeId: command.nodeId, targetParentId: command.targetParentId, targetRegionKey: command.targetRegionKey, index: command.index };
    case 'updateProps':
      return { kind: command.kind, nodeId: command.nodeId, props: command.props };
    case 'replaceRegion':
      return { kind: command.kind, nodeId: command.nodeId, regionKey: command.regionKey, node: command.node };
    case 'importDocument':
      return { kind: command.kind, doc: command.doc };
    default: {
      const exhaustive: never = command;
      throw new Error(`unsupported-command:${String(exhaustive)}`);
    }
  }
}

/**
 * `deserializeCommand`：JSON 值 → 命令。严格校验（kind 白名单、必填字段、
 * schema 形状）；任何失败返回 `{ ok: false, error }`，不产部分命令。
 */
export function deserializeCommand(input: unknown): DeserializedCommand {
  if (!isRecord(input)) return { ok: false, error: 'not-an-object' };
  const kind = input.kind;
  switch (kind) {
    case 'insertNode': {
      if (!isSid(input.parentId)) return { ok: false, error: 'invalid-parent-id' };
      if (!isSid(input.regionKey)) return { ok: false, error: 'invalid-region-key' };
      if (input.index !== undefined && (typeof input.index !== 'number' || !Number.isInteger(input.index))) {
        return { ok: false, error: 'invalid-index' };
      }
      if (!isSchemaInput(input.node as SchemaInput)) return { ok: false, error: 'invalid-node' };
      return {
        ok: true,
        command: {
          kind: 'insertNode',
          parentId: input.parentId,
          regionKey: input.regionKey,
          ...(input.index !== undefined ? { index: input.index } : {}),
          node: input.node as SchemaInput,
        },
      };
    }
    case 'removeNode': {
      if (!isSid(input.nodeId)) return { ok: false, error: 'invalid-node-id' };
      return { ok: true, command: { kind: 'removeNode', nodeId: input.nodeId } };
    }
    case 'moveNode': {
      if (!isSid(input.nodeId)) return { ok: false, error: 'invalid-node-id' };
      if (!isSid(input.targetParentId)) return { ok: false, error: 'invalid-parent-id' };
      if (!isSid(input.targetRegionKey)) return { ok: false, error: 'invalid-region-key' };
      if (typeof input.index !== 'number' || !Number.isInteger(input.index)) {
        return { ok: false, error: 'invalid-index' };
      }
      return {
        ok: true,
        command: {
          kind: 'moveNode',
          nodeId: input.nodeId,
          targetParentId: input.targetParentId,
          targetRegionKey: input.targetRegionKey,
          index: input.index,
        },
      };
    }
    case 'updateProps': {
      if (!isSid(input.nodeId)) return { ok: false, error: 'invalid-node-id' };
      if (!isRecord(input.props)) return { ok: false, error: 'invalid-props' };
      return { ok: true, command: { kind: 'updateProps', nodeId: input.nodeId, props: input.props } };
    }
    case 'replaceRegion': {
      if (!isSid(input.nodeId)) return { ok: false, error: 'invalid-node-id' };
      if (!isSid(input.regionKey)) return { ok: false, error: 'invalid-region-key' };
      if (input.node !== null && input.node !== undefined && !isSchemaInput(input.node as SchemaInput)) {
        return { ok: false, error: 'invalid-node' };
      }
      return {
        ok: true,
        command: {
          kind: 'replaceRegion',
          nodeId: input.nodeId,
          regionKey: input.regionKey,
          node: (input.node ?? null) as SchemaInput | null,
        },
      };
    }
    case 'importDocument': {
      if (!isSchemaInput(input.doc as SchemaInput)) return { ok: false, error: 'invalid-doc' };
      return { ok: true, command: { kind: 'importDocument', doc: input.doc as SchemaInput } };
    }
    default:
      return { ok: false, error: 'unknown-kind' };
  }
}
