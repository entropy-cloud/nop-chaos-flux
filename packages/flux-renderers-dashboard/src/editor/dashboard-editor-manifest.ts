import type { HostCapabilityProjectionManifest, RendererHostContract } from '@nop-chaos/flux-core';

/**
 * Dashboard Editor Host Capability Projection Manifest（P3.1，plan 552）。
 *
 * projection 逐字段来源（EditorSessionState，editor-core）：layout ← working（布局文档）、
 * selection ← .selection、mode ← .mode、runtime ← canUndo/canRedo/dirty。
 *
 * **空 methods 裁定**：dashboard 编辑器当前无家族 namespaced action 注册（能力面经
 * component handles——use-dashboard-editor-handles），家族命名空间在此保留；未来引入
 * namespaced actions 时随 manifest version 扩展。capabilityPublication 省略（可选字段）：
 * 编辑器未向任何 schema region 传 actionScope，不存在可声明的 publication 边界。
 */
export const DASHBOARD_EDITOR_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'dashboard-editor',
  version: '1.0',
  projection: {
    fields: {
      layout: {
        schema: { kind: 'unknown' },
        description: 'Working layout document (EditorSessionState.working).',
      },
      selection: {
        schema: { kind: 'array', item: { kind: 'string' } },
        description: 'Selected panel ids.',
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
            dirty: { kind: 'boolean' },
          },
        },
        description: 'Session runtime flags.',
      },
    },
  },
  capabilities: {
    namespace: 'dashboard-editor',
    methods: {},
  },
  metadata: {
    title: 'Dashboard Editor',
    description:
      'Dashboard editor host contract. Capability surface lives on component handles (no family namespaced actions yet) — methods reserved empty.',
    docsPath: 'docs/architecture/editor-designer-standard.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', DASHBOARD_EDITOR_MANIFEST_V1],
  ['1', DASHBOARD_EDITOR_MANIFEST_V1],
  ['latest', DASHBOARD_EDITOR_MANIFEST_V1],
]);

export function resolveDashboardEditorManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

/** 家族命令类型集（与 capabilities.methods 键集一致；当前为空——parity by construction）。 */
export const DASHBOARD_EDITOR_COMMAND_TYPES: readonly string[] = Object.keys(
  DASHBOARD_EDITOR_MANIFEST_V1.capabilities.methods,
);

export const dashboardEditorHostContract: RendererHostContract = {
  family: 'dashboard-editor',
  defaultVersion: '1.0',
  resolveManifest: resolveDashboardEditorManifest,
};
