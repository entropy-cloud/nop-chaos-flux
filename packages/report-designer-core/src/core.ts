import { createStore } from 'zustand/vanilla';
import type {
  ReportDesignerConfig,
  ReportTemplateDocument,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  MetadataBag,
  FieldDragState,
  FieldDragPayload,
  FieldSourceSnapshot,
  InspectorRuntimeState,
} from './types.js';
import {
  getTargetMeta,
  getDefaultSelectionTarget,
} from './types.js';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
} from './commands.js';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerAdapterContext,
  InspectorProvider,
  InspectorPanelDescriptor,
  FieldDropAdapter,
  ReportDesignerProfile,
} from './adapters.js';
import { createEmptyAdapterRegistry } from './adapters.js';

export interface ReportDesignerCore {
  getSnapshot(): ReportDesignerRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
  getMetadata(target: ReportSelectionTarget): MetadataBag | undefined;
  setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void;
  setSelectionTarget(target?: ReportSelectionTarget): Promise<void>;
  getInspectorPanels(): InspectorPanelDescriptor[];
  refreshFieldSources(): Promise<FieldSourceSnapshot[]>;
  exportDocument(): ReportTemplateDocument;
  getAdapterRegistry(): ReportDesignerAdapterRegistry;
  registerFieldSource(provider: import('./adapters.js').FieldSourceProvider): void;
  registerInspector(provider: InspectorProvider): void;
  registerFieldDrop(adapter: FieldDropAdapter): void;
  registerPreview(adapter: import('./adapters.js').PreviewAdapter): void;
  registerCodec(adapter: import('./adapters.js').TemplateCodecAdapter): void;
}

export interface CreateReportDesignerCoreOptions {
  document: ReportTemplateDocument;
  config: ReportDesignerConfig;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  profile?: ReportDesignerProfile;
}

interface ReportDesignerInternalState {
  document: ReportTemplateDocument;
  selectionTarget: ReportSelectionTarget | undefined;
  inspector: InspectorRuntimeState;
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  preview: {
    running: boolean;
    mode?: string;
    lastResult?: unknown;
  };
}

function cloneDocument(document: ReportTemplateDocument): ReportTemplateDocument {
  return JSON.parse(JSON.stringify(document)) as ReportTemplateDocument;
}

function cloneMetadataBag(input: MetadataBag | undefined): MetadataBag | undefined {
  return input ? { ...input } : undefined;
}

function shallowEqualMetadata(left: MetadataBag | undefined, right: MetadataBag | undefined): boolean {
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

function normalizeMetadataBag(value: MetadataBag | undefined): MetadataBag | undefined {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function buildSnapshot(state: ReportDesignerInternalState): ReportDesignerRuntimeSnapshot {
  const meta = state.selectionTarget
    ? getTargetMeta(state.document.semantic, state.selectionTarget)
    : undefined;

  return {
    document: state.document,
    selectionTarget: state.selectionTarget,
    activeMeta: meta,
    inspector: state.inspector,
    fieldSources: state.fieldSources,
    fieldDrag: state.fieldDrag,
    preview: state.preview,
  };
}

function getMetaContainer(document: ReportTemplateDocument, sheetId: string, kind: 'cell' | 'row' | 'column'): Record<string, MetadataBag> {
  const semantic = (document.semantic ??= {});
  switch (kind) {
    case 'cell': {
      const cellMeta = (semantic.cellMeta ??= {});
      return (cellMeta[sheetId] ??= {});
    }
    case 'row': {
      const rowMeta = (semantic.rowMeta ??= {});
      return (rowMeta[sheetId] ??= {});
    }
    case 'column': {
      const columnMeta = (semantic.columnMeta ??= {});
      return (columnMeta[sheetId] ??= {});
    }
  }
}

function writeMetadata(
  document: ReportTemplateDocument,
  target: ReportSelectionTarget,
  nextMeta: MetadataBag | undefined,
): boolean {
  const normalized = normalizeMetadataBag(nextMeta);

  switch (target.kind) {
    case 'workbook': {
      const semantic = (document.semantic ??= {});
      const changed = !shallowEqualMetadata(semantic.workbookMeta, normalized);
      semantic.workbookMeta = normalized;
      return changed;
    }
    case 'sheet': {
      const semantic = (document.semantic ??= {});
      const sheetMeta = (semantic.sheetMeta ??= {});
      const currentMeta = sheetMeta[target.sheetId];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      if (normalized) {
        sheetMeta[target.sheetId] = normalized;
      } else {
        delete sheetMeta[target.sheetId];
      }
      return changed;
    }
    case 'row': {
      const container = getMetaContainer(document, target.sheetId, 'row');
      const key = String(target.row);
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'column': {
      const container = getMetaContainer(document, target.sheetId, 'column');
      const key = String(target.col);
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'cell': {
      const container = getMetaContainer(document, target.cell.sheetId, 'cell');
      const key = target.cell.address;
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'range': {
      const semantic = (document.semantic ??= {});
      const rangeMeta = (semantic.rangeMeta ??= {});
      const sheetRanges = (rangeMeta[target.range.sheetId] ??= []);
      const range = target.range;
      const id = `${range.sheetId}:${range.startRow}:${range.startCol}:${range.endRow}:${range.endCol}`;
      const index = sheetRanges.findIndex((item) => item.id === id);
      const previous = index >= 0 ? sheetRanges[index].meta : undefined;
      const changed = !shallowEqualMetadata(previous, normalized);

      if (!normalized) {
        if (index >= 0) {
          sheetRanges.splice(index, 1);
        }
        return changed;
      }

      const nextEntry = { id, range: { ...range }, meta: normalized };
      if (index >= 0) {
        sheetRanges[index] = nextEntry;
      } else {
        sheetRanges.push(nextEntry);
      }
      return changed;
    }
  }
}

function mergeMetadata(base: MetadataBag | undefined, patch: MetadataBag): MetadataBag {
  return { ...(base ?? {}), ...patch };
}

function applyFieldDrop(
  document: ReportTemplateDocument,
  field: FieldDragPayload,
  target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>,
): ReportTemplateDocument {
  const patch: MetadataBag = {
    [field.type]: {
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      data: field.data,
    },
  };

  if (target.kind === 'cell') {
    writeMetadata(document, target, mergeMetadata(
      getTargetMeta(document.semantic, target),
      patch,
    ));
    return document;
  }

  const range = target.range;
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const cellTarget: ReportSelectionTarget = {
        kind: 'cell',
        cell: {
          sheetId: range.sheetId,
          address: `${String.fromCharCode(65 + c)}${r + 1}`,
          row: r,
          col: c,
        },
      };
      writeMetadata(document, cellTarget, mergeMetadata(
        getTargetMeta(document.semantic, cellTarget),
        patch,
      ));
    }
  }
  return document;
}

function dedupePanels(panels: InspectorPanelDescriptor[]): InspectorPanelDescriptor[] {
  const seen = new Set<string>();
  const deduped: InspectorPanelDescriptor[] = [];
  for (const panel of panels) {
    if (!seen.has(panel.id)) {
      seen.add(panel.id);
      deduped.push(panel);
    }
  }
  return deduped;
}

function sortPanels(left: InspectorPanelDescriptor, right: InspectorPanelDescriptor): number {
  const orderDelta = (left.order ?? 0) - (right.order ?? 0);
  if (orderDelta !== 0) return orderDelta;
  return left.title.localeCompare(right.title);
}

function createAdapterRegistrySnapshot(input?: Partial<ReportDesignerAdapterRegistry>): ReportDesignerAdapterRegistry {
  return {
    fieldSources: new Map(input?.fieldSources ?? []),
    inspectors: new Map(input?.inspectors ?? []),
    fieldDrops: new Map(input?.fieldDrops ?? []),
    previews: new Map(input?.previews ?? []),
    codecs: new Map(input?.codecs ?? []),
    expressions: new Map(input?.expressions ?? []),
    references: new Map(input?.references ?? []),
    inspectorValues: new Map(input?.inspectorValues ?? []),
  };
}

function getProfileFieldSourceIds(config: ReportDesignerConfig, profile?: ReportDesignerProfile): string[] {
  if (profile?.fieldSourceIds?.length) return profile.fieldSourceIds;
  return config.fieldSources?.map((fs) => fs.id) ?? [];
}

function getProfileInspectorIds(config: ReportDesignerConfig, profile?: ReportDesignerProfile): string[] {
  if (profile?.inspectorIds?.length) return profile.inspectorIds;
  return config.inspector?.providers.map((p) => p.id) ?? [];
}

function getProfileFieldDropIds(profile?: ReportDesignerProfile): Set<string> | undefined {
  if (!profile?.fieldDropIds?.length) {
    return undefined;
  }

  return new Set(profile.fieldDropIds);
}

function getPreviewProviderId(config: ReportDesignerConfig, profile?: ReportDesignerProfile): string | undefined {
  return profile?.previewId ?? config.preview?.provider;
}

function cloneFieldSourceSnapshot(source: FieldSourceSnapshot): FieldSourceSnapshot {
  return {
    id: source.id,
    label: source.label,
    groups: source.groups.map((group) => ({
      id: group.id,
      label: group.label,
      expanded: group.expanded ?? true,
      fields: group.fields.map((field) => ({ ...field })),
    })),
  };
}

type ConfiguredInspectorProvider = NonNullable<ReportDesignerConfig['inspector']>['providers'][number];

function buildInspectorProvidersByKind(providers: ConfiguredInspectorProvider[]): Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]> {
  const providersByKind = new Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]>();

  for (const provider of providers) {
    for (const kind of provider.match.kinds) {
      const existing = providersByKind.get(kind);
      if (existing) {
        existing.push(provider);
      } else {
        providersByKind.set(kind, [provider]);
      }
    }
  }

  return providersByKind;
}

function createAdapterContext(input: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
}): ReportDesignerAdapterContext {
  return {
    config: input.config,
    document: cloneDocument(input.document),
    designer: {
      ...input.designer,
      document: cloneDocument(input.designer.document),
      activeMeta: cloneMetadataBag(input.designer.activeMeta),
      fieldSources: input.designer.fieldSources.map((source) => ({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          fields: group.fields.map((field) => ({ ...field })),
        })),
      })),
      fieldDrag: input.designer.fieldDrag.payload
        ? {
            ...input.designer.fieldDrag,
            payload: { ...input.designer.fieldDrag.payload, data: { ...input.designer.fieldDrag.payload.data } },
          }
        : { ...input.designer.fieldDrag },
    },
    profile: input.profile,
  };
}

async function loadFieldSources(args: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
  selectedFieldSourceIds: Set<string>;
  staticFieldSourceTemplates: FieldSourceSnapshot[];
  getSnapshot(): ReportDesignerRuntimeSnapshot;
}): Promise<FieldSourceSnapshot[]> {
  const staticSources = args.staticFieldSourceTemplates.map(cloneFieldSourceSnapshot);

  const dynamicSources: FieldSourceSnapshot[] = [];
  const adapterContext = createAdapterContext({
    config: args.config,
    document: args.document,
    designer: args.getSnapshot(),
    profile: args.profile,
  });

  for (const fieldSource of args.config.fieldSources ?? []) {
    if (!fieldSource.provider || !args.selectedFieldSourceIds.has(fieldSource.id)) continue;
    const provider = args.adapters.fieldSources.get(fieldSource.provider);
    if (!provider) continue;
    const loaded = await provider.load(adapterContext);
    dynamicSources.push(...loaded);
  }

  return [...staticSources, ...dynamicSources];
}

async function resolveInspectorPanelsForTarget(args: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  adapters: ReportDesignerAdapterRegistry;
  target: ReportSelectionTarget | undefined;
  profile?: ReportDesignerProfile;
  providersByKind: Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]>;
  designer: ReportDesignerRuntimeSnapshot;
}): Promise<InspectorPanelDescriptor[]> {
  if (!args.target) return [];

  const metadata = getTargetMeta(args.document.semantic, args.target);
  const adapterContext = createAdapterContext({
    config: args.config,
    document: args.document,
    designer: args.designer,
    profile: args.profile,
  });
  const panelContext = {
    target: args.target,
    metadata: cloneMetadataBag(metadata),
    designer: adapterContext.designer,
    adapterContext,
  };

  const configuredProviders = args.providersByKind.get(args.target.kind) ?? [];
  const matchedPanels: InspectorPanelDescriptor[] = [];

  for (const providerConfig of configuredProviders) {
    if (providerConfig.body) {
      matchedPanels.push({
        id: providerConfig.id,
        title: providerConfig.label ?? providerConfig.id,
        targetKind: args.target.kind,
        group: providerConfig.group,
        order: providerConfig.order,
        mode: providerConfig.mode,
        body: providerConfig.body,
        submitAction: providerConfig.submitAction,
        readonly: providerConfig.readonly,
        badge: providerConfig.badge,
      });
    }

    if (!providerConfig.provider) continue;
    const provider = args.adapters.inspectors.get(providerConfig.provider);
    if (!provider || !provider.match(args.target, adapterContext)) continue;
    const panels = await provider.getPanels(panelContext);
    matchedPanels.push(...panels.map((panel) => ({ ...panel, targetKind: panel.targetKind ?? args.target!.kind })));
  }

  return dedupePanels(matchedPanels).sort(sortPanels);
}

export function createReportDesignerCore(
  options: CreateReportDesignerCoreOptions,
): ReportDesignerCore {
  const { document, config, adapters: providedAdapters, profile } = options;
  const registry = providedAdapters
    ? createAdapterRegistrySnapshot(providedAdapters)
    : createEmptyAdapterRegistry();

  const initialDocument = cloneDocument(document);
  const selectedFieldSourceIds = new Set(getProfileFieldSourceIds(config, profile));
  const selectedInspectorIds = new Set(getProfileInspectorIds(config, profile));
  const allowedFieldDropIds = getProfileFieldDropIds(profile);
  const staticFieldSourceTemplates: FieldSourceSnapshot[] = (config.fieldSources ?? [])
    .filter((fieldSource) => !fieldSource.provider && selectedFieldSourceIds.has(fieldSource.id))
    .map((fieldSource) => ({
      id: fieldSource.id,
      label: fieldSource.label,
      groups: (fieldSource.groups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        expanded: group.expanded ?? true,
        fields: group.fields.map((field) => ({ ...field })),
      })),
    }));
  const configuredInspectorProviders = (config.inspector?.providers ?? []).filter((provider) => selectedInspectorIds.has(provider.id));
  const inspectorProvidersByKind = buildInspectorProvidersByKind(configuredInspectorProviders);
  const initialSelectionTarget = getDefaultSelectionTarget(initialDocument);
  let inspectorPanelsCache: InspectorPanelDescriptor[] = [];

  const store = createStore<ReportDesignerInternalState>(() => ({
    document: initialDocument,
    selectionTarget: initialSelectionTarget,
    inspector: {
      open: false,
      providerIds: [],
      panelIds: [],
      loading: false,
    },
    fieldSources: [],
    fieldDrag: { active: false },
    preview: { running: false },
  }));

  async function refreshDerivedState() {
    const snapshot = store.getState();

    const fieldSources = await loadFieldSources({
      config,
      document: snapshot.document,
      adapters: registry,
      profile,
      selectedFieldSourceIds,
      staticFieldSourceTemplates,
      getSnapshot: () => store.getState(),
    });

    const panels = await resolveInspectorPanelsForTarget({
      config,
      document: snapshot.document,
      adapters: registry,
      target: snapshot.selectionTarget,
      profile,
      providersByKind: inspectorProvidersByKind,
      designer: store.getState(),
    });

    const providerIds = panels.map((panel) => panel.id);
    inspectorPanelsCache = panels.map((panel) => ({ ...panel }));

    store.setState((current) => ({
      ...current,
      fieldSources,
      inspector: {
        ...current.inspector,
        providerIds,
        panelIds: panels.map((panel) => panel.id),
        activePanelId: current.inspector.activePanelId && panels.some((panel) => panel.id === current.inspector.activePanelId)
          ? current.inspector.activePanelId
          : panels[0]?.id,
        loading: false,
        error: undefined,
      },
    }));

    return panels;
  }

  async function withDerivedRefresh<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = await fn();
    await refreshDerivedState();
    return result;
  }

  async function setSelectionTarget(target?: ReportSelectionTarget) {
    store.setState((current) => ({
      ...current,
      selectionTarget: target,
      inspector: {
        ...current.inspector,
        loading: true,
        error: undefined,
      },
    }));
    await refreshDerivedState();
  }

  async function dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult> {
    try {
      switch (command.type) {
        case 'report-designer:dropFieldToTarget': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            const adapter = Array.from(registry.fieldDrops.values()).find((candidate) =>
              (!allowedFieldDropIds || allowedFieldDropIds.has(candidate.id)) && candidate.canHandle(command.field, command.target),
            );

            if (!adapter) {
              applyFieldDrop(current.document, command.field, command.target);
              store.setState({ fieldDrag: { active: false } });
              return { ok: true, changed: true };
            }

            const adapterContext = createAdapterContext({
              config,
              document: current.document,
              designer: current,
              profile,
            });
            const currentMeta = getTargetMeta(current.document.semantic, command.target);
            const patch = adapter.mapDropToMetaPatch({
              field: command.field,
              target: command.target,
              currentMeta,
              context: adapterContext,
            });
            const nextMeta = mergeMetadata(currentMeta, patch);
            writeMetadata(current.document, command.target, nextMeta);

            store.setState({
              selectionTarget: command.target,
              fieldDrag: {
                active: false,
                sourceId: command.field.sourceId,
                fieldId: command.field.fieldId,
                payload: { ...command.field, data: { ...command.field.data } },
                hoverTarget: command.target,
              },
            });

            return { ok: true, changed: true };
          });
        }

        case 'report-designer:updateMeta': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            const currentMeta = getTargetMeta(current.document.semantic, command.target);
            const nextMeta = mergeMetadata(currentMeta, command.patch);
            const changed = writeMetadata(current.document, command.target, nextMeta);

            return { ok: true, changed };
          });
        }

        case 'report-designer:replaceMeta': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            const changed = writeMetadata(current.document, command.target, command.nextMeta);

            return { ok: true, changed };
          });
        }

        case 'report-designer:openInspector': {
          await setSelectionTarget(command.target ?? store.getState().selectionTarget);
          store.setState((current) => ({
            ...current,
            inspector: { ...current.inspector, open: true },
          }));
          return { ok: true, changed: true };
        }

        case 'report-designer:closeInspector': {
          const wasOpen = store.getState().inspector.open;
          store.setState((current) => ({
            ...current,
            inspector: { ...current.inspector, open: false },
          }));
          return { ok: true, changed: wasOpen };
        }

        case 'report-designer:preview': {
          store.setState((current) => ({
            ...current,
            preview: { ...current.preview, running: true, mode: command.mode },
          }));

          const previewProviderId = getPreviewProviderId(config, profile);
          if (!previewProviderId) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: new Error('No preview provider configured') };
          }

          const previewAdapter = registry.previews.get(previewProviderId);
          if (!previewAdapter) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: new Error(`Preview adapter not found: ${previewProviderId}`) };
          }

          try {
            const result = await previewAdapter.preview({
              document: cloneDocument(store.getState().document),
              mode: command.mode,
              params: command.args,
              context: createAdapterContext({
                config,
                document: store.getState().document,
                designer: store.getState(),
                profile,
              }),
            });

            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode, lastResult: result },
            }));

            return { ok: result.ok, changed: false, data: result.data, error: result.error };
          } catch (err) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: err };
          }
        }

        case 'report-designer:importTemplate':
        case 'report-designer:exportTemplate':
          return {
            ok: false,
            changed: false,
            error: new Error(`${command.type} is not implemented by the core package`),
          };

        default:
          return { ok: false, changed: false, error: `Unknown command: ${(command as any).type}` };
      }
    } catch (err) {
      return { ok: false, changed: false, error: err };
    }
  }

  async function refreshFieldSources(): Promise<FieldSourceSnapshot[]> {
    const fieldSources = await loadFieldSources({
      config,
      document: store.getState().document,
      adapters: registry,
      profile,
      selectedFieldSourceIds,
      staticFieldSourceTemplates,
      getSnapshot: () => store.getState(),
    });

    store.setState((current) => ({ ...current, fieldSources }));
    return fieldSources;
  }

  void refreshDerivedState();

  return {
    getSnapshot() {
      return buildSnapshot(store.getState());
    },

    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },

    dispatch,

    getMetadata(target: ReportSelectionTarget): MetadataBag | undefined {
      return cloneMetadataBag(getTargetMeta(store.getState().document.semantic, target));
    },

    setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void {
      const current = store.getState();
      writeMetadata(current.document, target, nextMeta);
    },

    setSelectionTarget,

    getInspectorPanels() {
      return inspectorPanelsCache.map((panel) => ({ ...panel }));
    },

    refreshFieldSources,

    exportDocument() {
      return cloneDocument(store.getState().document);
    },

    getAdapterRegistry() {
      return registry;
    },

    registerFieldSource(provider) {
      registry.fieldSources.set(provider.id, provider);
    },

    registerInspector(provider) {
      registry.inspectors.set(provider.id, provider);
    },

    registerFieldDrop(adapter) {
      registry.fieldDrops.set(adapter.id, adapter);
    },

    registerPreview(adapter) {
      registry.previews.set(adapter.id, adapter);
    },

    registerCodec(adapter) {
      registry.codecs.set(adapter.id, adapter);
    },
  };
}
