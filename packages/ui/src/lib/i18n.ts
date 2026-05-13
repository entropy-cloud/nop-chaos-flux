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

let i18nGetter: ((key: string) => string) | null = null;

export function setI18nGetter(getter: ((key: string) => string) | null) {
  i18nGetter = getter;
}

export function t(key: string) {
  if (i18nGetter) {
    return i18nGetter(key);
  }
  return messages[key] ?? key;
}
