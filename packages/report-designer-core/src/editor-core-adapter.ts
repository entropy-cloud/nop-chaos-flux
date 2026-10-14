import { registerEditorDomain, type EditorDomainAdapter } from '@nop-chaos/editor-core';
import { deepEqual } from '@nop-chaos/flux-core';
import type { ReportTemplateDocument } from './types.js';
import type { ReportDesignerCommand } from './commands.js';

/**
 * report-designer 域 adapter（roadmap P1.3，plan 548）：把 report 编辑域接入 editor-core 内核契约。
 *
 * - `diff` = 结构化深判等空变更返 null，否则返回 next 文档快照（**快照对即自逆 diff**，
 *   同 P1.2 §6.2 裁定：ReportTemplateDocument 无结构化域 diff）。
 * - `applyDiff` = 返回 diff 快照（纯函数，不修改入参）。
 * - `domainCommands` = `ReportDesignerCommand` 联合的 `type` 成员集（TS 类型面派生，
 *   test 锁定与 commandSamples parity——命令面单一事实源）。
 */
export const REPORT_DESIGNER_DOMAIN_KIND = 'report-designer';

/**
 * 结构化深判等单源 @nop-chaos/flux-core deepEqual（plan 598 G2，ex 15 行私有孪生）。
 * 判别语义 M1 勘误：flux-core（Object.is）严格不弱于原孪生（===）——唯一 delta =
 * ±0-only 文档增量现在判异（预裁定接受，plan 598 Deferred；report 文档为 JSON 形态，
 * NaN/键序/无环等价性已由 cx18-deepequal-pin 钉面承载）。
 */
export function hasReportDocChanges(
  prev: ReportTemplateDocument,
  next: ReportTemplateDocument,
): boolean {
  return !deepEqual(prev, next);
}

/**
 * `ReportDesignerCommand` 联合 type 成员集（域命令面单一事实源）。
 * Record 键穷尽锁定：`ReportDesignerCommand` 增删联合成员而未同步本表时编译报错（closure audit
 * Minor 修正：从手维护数组升级为类型面穷尽映射派生）。注意 commands.ts 另有一个同名运行时
 * unknown-guard `isReportDesignerCommand`（dispatch 未知命令兜底），与本文件的字符串集合守卫
 * 职责不同，故包公共面以 `isReportDesignerDomainCommand` 别名导出。
 */
const COMMAND_TYPE_MAP: Record<ReportDesignerCommand['type'], true> = {
  'report-designer:dropFieldToTarget': true,
  'report-designer:updateMeta': true,
  'report-designer:replaceMeta': true,
  'report-designer:openInspector': true,
  'report-designer:closeInspector': true,
  'report-designer:preview': true,
  'report-designer:stopPreview': true,
  'report-designer:undo': true,
  'report-designer:redo': true,
  'report-designer:save': true,
  'report-designer:importTemplate': true,
  'report-designer:exportTemplate': true,
};

export const REPORT_DESIGNER_COMMAND_TYPES: readonly string[] = Object.keys(COMMAND_TYPE_MAP);

/** 构造 report 编辑域 adapter（editor-core `EditorDomainAdapter` 契约实现）。 */
export function createReportDesignerDomainAdapter(
  initialDocument: ReportTemplateDocument,
): EditorDomainAdapter<ReportTemplateDocument, ReportTemplateDocument> {
  return {
    kind: REPORT_DESIGNER_DOMAIN_KIND,
    load: () => initialDocument,
    serialize: (doc) => JSON.stringify(doc),
    validate: () => ({ ok: true }),
    diff: (prev, next) => (hasReportDocChanges(prev, next) ? next : null),
    applyDiff: (_doc, diff) => structuredClone(diff),
    domainCommands: REPORT_DESIGNER_COMMAND_TYPES,
  };
}

/**
 * 显式注册 report 编辑域到 editor-core 注册表（kind: 'report-designer'；重复注册覆盖，
 * editor-core.md §3 裁定）。由消费侧/测试显式调用（同 plan 546/547 裁定：不用模块加载 effect）。
 */
export function registerReportDesignerDomain(initialDocument: ReportTemplateDocument): void {
  registerEditorDomain(createReportDesignerDomainAdapter(initialDocument));
}

/** 命令类型守卫（adapter test parity 消费；`ReportDesignerCommand` 联合收敛点）。 */
export function isReportDesignerCommand(command: { type: string }): command is ReportDesignerCommand {
  return (REPORT_DESIGNER_COMMAND_TYPES as readonly string[]).includes(command.type);
}
