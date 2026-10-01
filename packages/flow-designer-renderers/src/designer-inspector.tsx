import React, { useEffect, useRef, useState } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { useNodeTypeConfig } from './designer-context.js';
import { Badge, Button, Input, Label, Textarea, cn } from '@nop-chaos/ui';
import { useDesignerContext, useDesignerSnapshotSelector } from './designer-context.js';
import { DesignerIcon } from './designer-icon.js';
import { resolveNodeTypeAccent, resolveNodeTypeMeta } from './designer-node-appearance.js';

interface BranchItemData {
  id: string;
  data: Record<string, unknown>;
  childId?: string;
  childType?: string;
  childLabel?: string;
}

export interface DefaultInspectorProps {
  renderSchema?: (schema: SchemaInput) => React.ReactNode;
}

export function DefaultInspector(props: DefaultInspectorProps = {}) {
  const { dispatch } = useDesignerContext();
  const activeNode = useDesignerSnapshotSelector((snapshot) => snapshot.activeNode);
  const activeEdge = useDesignerSnapshotSelector((snapshot) => snapshot.activeEdge);
  const docName = useDesignerSnapshotSelector((snapshot) => snapshot.doc.name);
  const nodeCount = useDesignerSnapshotSelector((snapshot) => snapshot.doc.nodes.length);
  const edgeCount = useDesignerSnapshotSelector((snapshot) => snapshot.doc.edges.length);
  const activeBranch = useDesignerSnapshotSelector((snapshot) => snapshot.activeBranch);

  // Per-keystroke updateNodeData used to run full-tree projection + layout +
  // history clone per character (plan 2026-09-29-4 R2-P14). Field edits now
  // coalesce into a local draft and dispatch on a short window; blur/unmount/
  // node-switch flush immediately. History granularity coarsens from
  // per-keystroke to per-window — recorded accepted consequence (plan
  // Workstream 3 equivalence scope: document content after undo/redo).
  const [draft, setDraft] = useState<{
    kind: 'node' | 'edge' | 'branch';
    /** node id / edge id / `${nodeId}::${branchId}` per kind. */
    targetId: string;
    key: string;
    value: string;
  } | null>(null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const fieldCommitTimerRef = useRef<number | undefined>(undefined);
  const flushDraft = React.useCallback(() => {
    const pending = draftRef.current;
    if (!pending) return;
    draftRef.current = null;
    setDraft(null);
    if (pending.kind === 'node') {
      dispatch({
        type: 'updateNodeData',
        nodeId: pending.targetId,
        data: { [pending.key]: pending.value },
      });
    } else if (pending.kind === 'branch') {
      const [nodeId, branchId] = pending.targetId.split('::');
      dispatch({
        type: 'updateBranchData',
        nodeId: nodeId!,
        branchId: branchId!,
        data: { [pending.key]: pending.value },
      });
    } else {
      dispatch({
        type: 'updateEdgeData',
        edgeId: pending.targetId,
        data: { [pending.key]: pending.value },
      });
    }
  }, [dispatch]);
  React.useEffect(() => {
    return () => {
      const pending = draftRef.current;
      if (!pending) return;
      draftRef.current = null;
      if (pending.kind === 'node') {
        dispatch({
          type: 'updateNodeData',
          nodeId: pending.targetId,
          data: { [pending.key]: pending.value },
        });
      } else if (pending.kind === 'branch') {
        const [nodeId, branchId] = pending.targetId.split('::');
        dispatch({
          type: 'updateBranchData',
          nodeId: nodeId!,
          branchId: branchId!,
          data: { [pending.key]: pending.value },
        });
      } else {
        dispatch({
          type: 'updateEdgeData',
          edgeId: pending.targetId,
          data: { [pending.key]: pending.value },
        });
      }
    };
  }, [dispatch]);
  const draftFor = (kind: 'node' | 'edge' | 'branch', targetId: string, key: string, current: string) =>
    draft && draft.kind === kind && draft.targetId === targetId && draft.key === key
      ? draft.value
      : current;
  const editField = (
    kind: 'node' | 'edge' | 'branch',
    targetId: string,
    key: string,
    value: string,
  ) => {
    setDraft({ kind, targetId, key, value });
    window.clearTimeout(fieldCommitTimerRef.current);
    fieldCommitTimerRef.current = window.setTimeout(flushDraft, 300);
  };

  // Branch-name edits target (nodeId, branchId) — targetId packs both so the
  // selection-switch flush guard stays a single-string comparison.
  const editBranchField = (nodeId: string, branchId: string, key: string, value: string) => {
    editField('branch', `${nodeId}::${branchId}`, key, value);
  };

  const activeNodeId = activeNode?.id;
  React.useEffect(() => {
    // Selection switch — including to nothing (deselect) or to an edge —
    // flushes any pending edit for the previous target before the inspector
    // rebinds (the stale draft stops matching the new selection).
    if (draftRef.current && draftRef.current.targetId !== (activeNodeId ?? '')) {
      flushDraft();
    }
  }, [activeNodeId, flushDraft]);

  const activeNodeTypeConfig = useNodeTypeConfig(activeNode?.type ?? '');
  const activeInspectorSchema = activeNodeTypeConfig?.inspector?.body;
  // ux-r7 FD-6/TF-2 名称身份去重：nodeType inspector 已含名称身份字段（name==='label' 或
  // 以 '.name' 结尾）时跳过内建"名称"字段——否则 workflow 出现双"名称"、taskflow 出现
  // 恒空内建"名称"+schema Name/Display Name 并存。
  const schemaHasNameField = (() => {
    if (!activeInspectorSchema || typeof activeInspectorSchema !== 'object') return false;
    const visit = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.some((item) => visit(item));
      if (value === null || typeof value !== 'object') return false;
      const record = value as Record<string, unknown>;
      const name = typeof record['name'] === 'string' ? record['name'] : '';
      if (name === 'label' || name.endsWith('.name')) return true;
      return Object.values(record).some((child) => visit(child));
    };
    return visit(activeInspectorSchema);
  })();
  const branchItems = React.useMemo(
    () =>
      Array.isArray(activeNode?.data.branches)
        ? (activeNode.data.branches as BranchItemData[])
        : [],
    [activeNode],
  );
  const focusedBranch =
    activeBranch && branchItems.some((branch) => branch.id === activeBranch.id)
      ? activeBranch
      : (branchItems[0] ?? null);

  const renderNodeTypeHeader = () => {
    if (!activeNode) return null;
    const typeInfo = resolveNodeTypeMeta(activeNode.type, activeNodeTypeConfig);
    const accentColor = resolveNodeTypeAccent(activeNode.type, activeNodeTypeConfig);
    const displayLabel = typeInfo.label;

    return (
      <div className="flex items-center gap-3">
        {typeInfo.icon && accentColor && (
          <div className="rounded-full p-2" style={{ backgroundColor: `${accentColor}20` }}>
            <span style={{ color: accentColor }}>
              <DesignerIcon icon={typeInfo.icon} size={20} />
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-foreground text-base">
            {String(activeNode.data.label ?? activeNode.id)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {accentColor && (
              <Badge
                style={{
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
                className="text-xs font-medium"
              >
                {displayLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGenericFields = () => {
    if (!activeNode) return null;
    const data = activeNode.data;
    return Object.entries(data).map(([key, value]) => {
      if (key === 'label' || key === 'description') return null;
      if (typeof value === 'object' && value !== null) return null;
      return (
        <div key={key} className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{key}</Label>
          <Input
            type="text"
            value={draftFor('node', activeNode.id, key, String(value ?? ''))}
            onChange={(e) => editField('node', activeNode.id, key, e.target.value)}
            onBlur={() => {
              window.clearTimeout(fieldCommitTimerRef.current);
              flushDraft();
            }}
          />
        </div>
      );
    });
  };

  const renderBranchInspector = () => {
    if (!activeNode || branchItems.length === 0) {
      return null;
    }

    return (
      <div className="fd-panel-card rounded-lg border border-border p-4 mt-4">
        <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">
          {t('flux.flowDesigner.inspector.branchGroup')}
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {branchItems.map((branch, index) => {
            const canMoveLeft = index > 0;
            const canMoveRight = index < branchItems.length - 1;
            const isFocused = focusedBranch?.id === branch.id;
            return (
              <div
                key={branch.id}
                className={cn(
                  'rounded-lg border p-3',
                  isFocused ? 'border-primary bg-primary/5' : 'border-border/70',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto flex-1 justify-start px-0 py-0 text-left hover:bg-transparent"
                    aria-pressed={isFocused}
                    onClick={() =>
                      dispatch({ type: 'selectBranch', nodeId: activeNode.id, branchId: branch.id })
                    }
                  >
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {t('flux.flowDesigner.inspector.branchLabel', { index: index + 1 })}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{branch.id}</span>
                    </span>
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('flux.flowDesigner.inspector.moveBranchLeft', { index: index + 1 })}
                      disabled={!canMoveLeft}
                      onClick={() =>
                        dispatch({
                          type: 'moveBranch',
                          nodeId: activeNode.id,
                          branchId: branch.id,
                          direction: 'left',
                        })
                      }
                    >
                      <DesignerIcon icon="chevron-left" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('flux.flowDesigner.inspector.moveBranchRight', { index: index + 1 })}
                      disabled={!canMoveRight}
                      onClick={() =>
                        dispatch({
                          type: 'moveBranch',
                          nodeId: activeNode.id,
                          branchId: branch.id,
                          direction: 'right',
                        })
                      }
                    >
                      <DesignerIcon icon="chevron-right" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('flux.flowDesigner.inspector.deleteBranch', { index: index + 1 })}
                      className="hover:bg-destructive/15 hover:text-destructive"
                      disabled={branchItems.length <= 2}
                      onClick={() =>
                        dispatch({
                          type: 'deleteBranch',
                          nodeId: activeNode.id,
                          branchId: branch.id,
                        })
                      }
                    >
                      <DesignerIcon icon="trash-2" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    {t('flux.flowDesigner.inspector.branchName')}
                  </Label>
                  <Input
                    type="text"
                    value={draftFor('branch', `${activeNode.id}::${branch.id}`, 'label', String(branch.data.label ?? ''))}
                    onChange={(e) => editBranchField(activeNode.id, branch.id, 'label', e.target.value)}
                    onBlur={flushDraft}
                  />
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              dispatch({
                type: 'addBranch',
                nodeId: activeNode.id,
                branchData: {
                  label: t('flux.flowDesigner.inspector.branchLabel', {
                    index: branchItems.length + 1,
                  }),
                },
                childType: activeNode.type,
                childData: {
                  label: t('flux.flowDesigner.inspector.newBranch', {
                    index: branchItems.length + 1,
                  }),
                },
              })
            }
          >
            {t('flux.flowDesigner.inspector.addBranch')}
          </Button>
          {focusedBranch && (
            <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
              <div className="text-sm font-medium text-foreground">
                {t('flux.flowDesigner.inspector.currentBranch')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {String(focusedBranch.data.label ?? focusedBranch.id)}
              </div>
              {focusedBranch.childId ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t('flux.flowDesigner.inspector.firstNode')}
                    </div>
                    <div className="text-sm text-foreground">
                      {focusedBranch.childLabel ?? focusedBranch.childId}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      dispatch({ type: 'selectNode', nodeId: focusedBranch.childId ?? null })
                    }
                  >
                    {t('flux.flowDesigner.inspector.locateNode')}
                  </Button>
                </div>
              ) : (
                <div className="mt-3 text-xs text-muted-foreground">
                  {t('flux.flowDesigner.inspector.emptyBranch')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('nop-inspector flex flex-col h-full text-foreground')}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="shrink-0 self-start">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => dispatch({ type: 'toggleInspector' })}
            aria-label={t('flux.flowDesigner.collapseInspector')}
            data-testid="collapse-inspector"
          >
            <DesignerIcon icon="chevron-right" />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {t('flux.flowDesigner.inspector.propertyPanel')}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('flux.flowDesigner.inspector.editNodeOrEdge')}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
          <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">
            {t('flux.flowDesigner.inspector.flowInfo')}
          </div>
          <div className="mt-2 font-medium text-foreground">{docName}</div>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Badge variant="success">{t('flux.flowDesigner.inspector.enabled')}</Badge>
            <span>{t('flux.flowDesigner.inspector.nodeCount', { count: nodeCount })}</span>
            <span>{t('flux.flowDesigner.inspector.edgeCount', { count: edgeCount })}</span>
          </div>
        </div>

        {activeNode ? (
          <>
            <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
              <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">
                {t('flux.flowDesigner.inspector.currentSelection')}
              </div>
              <div className="mt-3">
                {renderNodeTypeHeader()}
                {activeNode.data.description ? (
                  <p className="text-sm text-muted-foreground mt-3">
                    {String(activeNode.data.description)}
                  </p>
                ) : null}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground font-mono">{activeNode.id}</div>
                </div>
              </div>
            </div>
            <div className="fd-panel-card rounded-lg border border-border p-4">
              <div className="flex flex-col gap-4">
                {!schemaHasNameField ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    {t('flux.flowDesigner.inspector.name')}
                  </Label>
                  <Input
                    type="text"
                    value={draftFor('node', activeNode.id, 'label', String(activeNode.data.label ?? ''))}
                    onChange={(e) => editField('node', activeNode.id, 'label', e.target.value)}
                    onBlur={flushDraft}
                  />
                </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    {t('flux.flowDesigner.inspector.description')}
                  </Label>
                  <Textarea
                    className="min-h-[80px] resize-y"
                    value={draftFor('node', activeNode.id, 'description', String(activeNode.data.description ?? ''))}
                    onChange={(e) => editField('node', activeNode.id, 'description', e.target.value)}
                    onBlur={flushDraft}
                  />
                </div>
                {activeInspectorSchema && props.renderSchema
                  ? props.renderSchema(activeInspectorSchema)
                  : renderGenericFields()}
              </div>
            </div>
            {renderBranchInspector()}
          </>
        ) : activeEdge ? (
          <>
            <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
              <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">
                {t('flux.flowDesigner.inspector.currentSelection')}
              </div>
              <div className="mt-3">
                <div className="font-medium text-foreground">
                  {t('flux.flowDesigner.inspector.connection')}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {activeEdge.source} → {activeEdge.target}
                </div>
              </div>
            </div>
            <div className="fd-panel-card rounded-lg border border-border p-4">
              <div className="flex flex-col gap-4">
                {Object.entries(activeEdge.data).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) return null;
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">{key}</Label>
                      <Input
                        type="text"
                        value={draftFor('edge', activeEdge.id, key, String(value ?? ''))}
                        onChange={(e) => editField('edge', activeEdge.id, key, e.target.value)}
                        onBlur={flushDraft}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="fd-panel-card rounded-lg border border-border p-4">
            <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">
              {t('flux.flowDesigner.inspector.shortcuts')}
            </div>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <div>
                <strong>{t('flux.flowDesigner.shortcutUndo')}</strong> {t('flux.flowDesigner.undo')}
              </div>
              <div>
                <strong>{t('flux.flowDesigner.shortcutRedo')}</strong> {t('flux.flowDesigner.redo')}
              </div>
              <div>
                <strong>{t('flux.flowDesigner.shortcutDelete')}</strong>{' '}
                {t('flux.flowDesigner.deleteSelected')}
              </div>
              <div>
                <strong>{t('flux.flowDesigner.shortcutSave')}</strong> {t('flux.flowDesigner.save')}
              </div>
            </div>
          </div>
        )}

        {activeNode && (
          <div className="mt-4">
            <Button
              className="w-full min-h-8"
              variant="destructive"
              size="sm"
              onClick={() => dispatch({ type: 'deleteNode', nodeId: activeNode.id })}
            >
              {t('flux.flowDesigner.inspector.deleteNode')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
