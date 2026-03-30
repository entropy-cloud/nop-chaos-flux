type I18nTextMap = {
  and: string;
  or: string;
  not: string;
  notActive: string;
  addCondition: string;
  addGroup: string;
  removeGroup: string;
  placeholder: string;
  pickerPlaceholder: string;
  selectField: string;
  searchField: string;
  conditionCount: (n: number) => string;
  requiredMessage: (label: string) => string;
  selectPlaceholder: string;
  numberPlaceholder: string;
  valuePlaceholder: string;
  addOption: string;
  boolTrue: string;
  boolFalse: string;
  satisfyFollowing: string;
};

const DEFAULT_I18N: I18nTextMap = {
  and: '并且',
  or: '或者',
  not: '取反',
  notActive: '取反 ✓',
  addCondition: '添加条件',
  addGroup: '添加分组',
  removeGroup: '删除分组',
  placeholder: '暂无条件，请点击下方按钮添加',
  pickerPlaceholder: '点击配置条件',
  selectField: '选择字段',
  searchField: '搜索字段...',
  conditionCount: (n: number) => `${n} 个条件`,
  requiredMessage: (label: string) => `${label}不能为空`,
  selectPlaceholder: '请选择',
  numberPlaceholder: '数值',
  valuePlaceholder: '值',
  addOption: '添加选项',
  boolTrue: '是',
  boolFalse: '否',
  satisfyFollowing: '满足以下',
};

let _textOverrides: Partial<I18nTextMap> = {};

export function setI18nOverrides(overrides: Partial<I18nTextMap>): void {
  _textOverrides = overrides;
}

export function t<K extends keyof I18nTextMap>(key: K): I18nTextMap[K] {
  const override = _textOverrides[key];
  if (override !== undefined) return override;
  return DEFAULT_I18N[key];
}

export function tf(key: 'conditionCount', n: number): string;
export function tf(key: 'requiredMessage', label: string): string;
export function tf(key: string, ...args: unknown[]): string {
  const override = _textOverrides[key as keyof I18nTextMap];
  const base = DEFAULT_I18N[key as keyof I18nTextMap];
  const fn = (typeof override === 'function' ? override : base) as (...a: unknown[]) => string;
  return fn(...args);
}
