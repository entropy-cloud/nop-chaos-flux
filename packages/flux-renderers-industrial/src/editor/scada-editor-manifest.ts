import type { HostCapabilityProjectionManifest, RendererHostContract } from '@nop-chaos/flux-core';

/**
 * SCADA Editor Host Capability Projection Manifest（P3.1，plan 552）。
 *
 * projection 逐字段来源：config ← `ScadaEditorSession.workingConfig`（组态文档）、
 * selection/mode ← session（`ScadaEditorSessionChangePayload` 同源）、
 * runtime ← undoStack 派生（canUndo/canRedo，projectSessionChange 同源）。
 *
 * **空 methods 裁定**：SCADA 编辑器当前无家族 namespaced action 注册（20 能力句柄经
 * component handles——`use-editor-handles`），家族命名空间在此保留。capabilityPublication
 * 省略（可选字段）：编辑器 region.render 仅传 bindings，无 actionScope publication 边界。
 */
export const SCADA_EDITOR_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'scada-editor',
  version: '1.0',
  projection: {
    fields: {
      config: {
        schema: { kind: 'unknown' },
        description: 'Working scene config (ScadaEditorSession.workingConfig).',
      },
      selection: {
        schema: { kind: 'array', item: { kind: 'string' } },
        description: 'Selected symbol node ids.',
      },
      mode: {
        schema: { kind: 'string' },
        description: 'Editor mode (edit | preview).',
      },
      runtime: {
        schema: {
          kind: 'object',
          fields: {
            canUndo: { kind: 'boolean' },
            canRedo: { kind: 'boolean' },
          },
        },
        description: 'Undo/redo availability (stack-derived).',
      },
    },
  },
  capabilities: {
    namespace: 'scada-editor',
    methods: {},
  },
  metadata: {
    title: 'SCADA Editor',
    description:
      'SCADA editor host contract. Capability surface lives on component handles (20 methods; no family namespaced actions yet) — methods reserved empty.',
    docsPath: 'docs/architecture/editor-designer-standard.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', SCADA_EDITOR_MANIFEST_V1],
  ['1', SCADA_EDITOR_MANIFEST_V1],
  ['latest', SCADA_EDITOR_MANIFEST_V1],
]);

export function resolveScadaEditorManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

/** 家族命令类型集（与 capabilities.methods 键集一致；当前为空——parity by construction）。 */
export const SCADA_EDITOR_MANIFEST_COMMAND_TYPES: readonly string[] = Object.keys(
  SCADA_EDITOR_MANIFEST_V1.capabilities.methods,
);

export const scadaEditorHostContract: RendererHostContract = {
  family: 'scada-editor',
  defaultVersion: '1.0',
  resolveManifest: resolveScadaEditorManifest,
};
