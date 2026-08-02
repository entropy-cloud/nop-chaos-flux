export const META_FIELDS = new Set([
  'id',
  'className',
  'frameClassName',
  'when',
  'visible',
  'hidden',
  'disabled',
  'testid',
  'frameWrap',
]);

export interface BuiltInActionDescriptor {
  canonicalName: string;
  compatibilityAliases?: readonly string[];
}

export const BUILT_IN_ACTION_REGISTRY = {
  setValue: { canonicalName: 'setValue' },
  setValues: { canonicalName: 'setValues' },
  ajax: { canonicalName: 'ajax' },
  openDialog: { canonicalName: 'openDialog' },
  openDrawer: { canonicalName: 'openDrawer' },
  closeDrawer: { canonicalName: 'closeDrawer' },
  showToast: { canonicalName: 'showToast' },
  closeDialog: { canonicalName: 'closeDialog' },
  closeSurface: { canonicalName: 'closeSurface' },
  refreshTable: { canonicalName: 'refreshTable' },
  refreshSource: { canonicalName: 'refreshSource' },
  refreshNearest: { canonicalName: 'refreshNearest' },
  submitForm: { canonicalName: 'submitForm', compatibilityAliases: ['submit'] },
  navigate: { canonicalName: 'navigate' },
  confirm: { canonicalName: 'confirm' },
  alert: { canonicalName: 'alert' },
} as const satisfies Readonly<Record<string, BuiltInActionDescriptor>>;

const builtInActionDescriptors = Object.values(BUILT_IN_ACTION_REGISTRY) as readonly BuiltInActionDescriptor[];

const BUILT_IN_ACTION_DESCRIPTOR_BY_NAME = new Map<string, BuiltInActionDescriptor & { isAlias: boolean }>();

for (const descriptor of builtInActionDescriptors) {
  BUILT_IN_ACTION_DESCRIPTOR_BY_NAME.set(descriptor.canonicalName, {
    ...descriptor,
    isAlias: false,
  });

  for (const alias of descriptor.compatibilityAliases ?? []) {
    BUILT_IN_ACTION_DESCRIPTOR_BY_NAME.set(alias, {
      ...descriptor,
      isAlias: true,
    });
  }
}

export const CANONICAL_BUILT_IN_ACTION_NAMES = new Set(
  builtInActionDescriptors.map((descriptor) => descriptor.canonicalName),
);

export const BUILT_IN_ACTION_NAMES = new Set(BUILT_IN_ACTION_DESCRIPTOR_BY_NAME.keys());

export function getBuiltInActionDescriptor(name: string):
  | (BuiltInActionDescriptor & { isAlias: boolean })
  | undefined {
  return BUILT_IN_ACTION_DESCRIPTOR_BY_NAME.get(name);
}

export function isCanonicalBuiltInActionName(name: string): boolean {
  return CANONICAL_BUILT_IN_ACTION_NAMES.has(name);
}

export interface BuiltInActionDefinition {
  /** args 必填（'ajax actions require args payload'）。Plan 3 迁移后由校验器消费。 */
  argsRequired?: boolean;
  /**
   * Args field classification. Applied to the action's `args` object:
   * `schema`/`schema-array` args are validated recursively as schema input,
   * `action` args (e.g. onClose/onSubmitSuccess) are preserved raw at dispatch
   * scope evaluation, `value` args are expression-evaluated.
   */
  fieldRules: Readonly<Record<string, import('./schema-diagnostics/manifest.js').SchemaDefinitionFieldSpec>>;
}

/**
 * Built-in action definition table — one fieldRules per canonical action type.
 * Anchored on `BUILT_IN_ACTION_REGISTRY` ∪ `runBuiltInAction` switch
 * (flux-action-core). Unknown args keys pass through (host passthrough).
 *
 * @see docs/architecture/nested-schema-field-classification.md §3.7
 */
export const BUILT_IN_ACTION_DEFINITIONS: Readonly<Record<string, BuiltInActionDefinition>> = {
  setValue: {
    fieldRules: {
      path: 'value',
      value: 'value',
    },
  },
  setValues: {
    fieldRules: {
      path: 'value',
      values: 'value',
    },
  },
  ajax: {
    argsRequired: true,
    fieldRules: {
      url: { kind: 'value', required: true, valueType: 'string', nonEmpty: true },
      method: { kind: 'value', valueType: 'string' },
      data: { kind: 'value', valueType: 'object' },
      params: { kind: 'value', valueType: 'object' },
    },
  },
  openDialog: {
    fieldRules: {
      body: 'schema',
      actions: 'schema-array',
      data: 'value',
      isolate: 'value',
      onClose: 'action',
      onSubmitSuccess: 'action',
      onSubmitError: 'action',
    },
  },
  openDrawer: {
    fieldRules: {
      body: 'schema',
      actions: 'schema-array',
      data: 'value',
      isolate: 'value',
      onClose: 'action',
      onSubmitSuccess: 'action',
      onSubmitError: 'action',
    },
  },
  closeDialog: { fieldRules: {} },
  closeDrawer: { fieldRules: {} },
  closeSurface: { fieldRules: {} },
  refreshTable: { fieldRules: {} },
  refreshSource: { fieldRules: {} },
  refreshNearest: { fieldRules: {} },
  submitForm: { fieldRules: {} },
  navigate: {
    fieldRules: {
      url: 'value',
      back: 'value',
      replace: 'value',
    },
  },
  confirm: {
    fieldRules: {
      message: 'value',
      title: 'value',
    },
  },
  alert: {
    fieldRules: {
      message: 'value',
      title: 'value',
    },
  },
  showToast: {
    fieldRules: {
      level: 'value',
      message: 'value',
    },
  },
};

export function getBuiltInActionDefinition(name: string): BuiltInActionDefinition | undefined {
  const descriptor = getBuiltInActionDescriptor(name);
  if (!descriptor) {
    return undefined;
  }
  return BUILT_IN_ACTION_DEFINITIONS[descriptor.canonicalName];
}

export const XUI_ACTIONS_NAMESPACE = '__xui_actions__';
