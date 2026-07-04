export const META_FIELDS = new Set([
  'id',
  'className',
  'frameClassName',
  'when',
  'visible',
  'hidden',
  'disabled',
  'testid',
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

export const XUI_ACTIONS_NAMESPACE = '__xui_actions__';
