const messages: Record<string, string> = {
  'flux.breadcrumb.more': 'More',
  'flux.carousel.label': 'Carousel',
  'flux.carousel.previous': 'Previous slide',
  'flux.carousel.next': 'Next slide',
  'flux.common.close': 'Close',
  'flux.dialog.close': 'Close dialog',
  'flux.pagination.morePages': 'More pages',
  'flux.sheet.close': 'Close sheet',
  'flux.sidebar.title': 'Sidebar',
  'flux.sidebar.description': 'Sidebar navigation',
  'flux.sidebar.toggle': 'Toggle sidebar',
};

const UI_I18N_BRIDGE_KEY = Symbol.for('nop.ui.i18nBridge');

type UiI18nBridge = {
  getter: ((key: string) => string) | null;
};

function getUiI18nBridge(): UiI18nBridge {
  const globalState = globalThis as typeof globalThis & {
    [UI_I18N_BRIDGE_KEY]?: UiI18nBridge;
  };

  if (!globalState[UI_I18N_BRIDGE_KEY]) {
    globalState[UI_I18N_BRIDGE_KEY] = { getter: null };
  }

  return globalState[UI_I18N_BRIDGE_KEY]!;
}

export function setI18nGetter(getter: ((key: string) => string) | null) {
  getUiI18nBridge().getter = getter;
}

export function t(key: string) {
  const translated = getUiI18nBridge().getter?.(key);
  if (translated && translated !== key) {
    return translated;
  }
  return messages[key] ?? key;
}
