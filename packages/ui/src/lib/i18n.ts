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

export function t(key: string) {
  return messages[key] ?? key;
}
