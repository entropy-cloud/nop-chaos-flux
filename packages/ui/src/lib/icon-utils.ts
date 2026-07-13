import { Circle, icons } from 'lucide-react';
import type { ComponentType } from 'react';

export type LucideIconComponent = ComponentType<Record<string, unknown>>;

const ICON_ALIAS_MAP: Record<string, string> = {
  house: 'home',
  language: 'languages',
  'puzzle-piece': 'puzzle',
  gear: 'settings-2',
  cog: 'settings-2',
};

const ANT_DESIGN_VARIANT_SUFFIX = /-(outlined|filled|twotone)$/;

const ANT_DESIGN_LUCIDE_MAP: Record<string, string> = {
  'account-book': 'book-copy',
  aim: 'target',
  'align-center': 'text-align-center',
  'align-left': 'text-align-left',
  'align-right': 'text-align-right',
  apartment: 'building-2',
  api: 'plug',
  appstore: 'layout-grid',
  'appstore-add': 'grid-2x2-plus',
  'area-chart': 'chart-area',
  'arrows-alt': 'move',
  audio: 'volume-2',
  'audio-muted': 'volume-x',
  audit: 'clipboard-check',
  backward: 'rewind',
  bank: 'landmark',
  'bar-chart': 'chart-bar',
  bars: 'menu',
  'bg-colors': 'paintbrush',
  block: 'ban',
  branches: 'git-branch',
  build: 'wrench',
  bulb: 'lightbulb',
  'caret-down': 'chevron-down',
  'caret-left': 'chevron-left',
  'caret-right': 'chevron-right',
  'caret-up': 'chevron-up',
  'carry-out': 'package-check',
  'check-circle': 'circle-check-big',
  'check-square': 'square-check',
  clear: 'eraser',
  'clock-circle': 'clock',
  close: 'x',
  'close-circle': 'circle-x',
  'close-square': 'square-x',
  'cloud-server': 'server',
  cluster: 'network',
  'code-sandbox': 'flask-conical',
  comment: 'message-circle',
  compress: 'minimize',
  'console-sql': 'database',
  contacts: 'contact',
  control: 'sliders-horizontal',
  'customer-service': 'headset',
  dashboard: 'gauge',
  desktop: 'monitor',
  disconnect: 'link-2-off',
  dislike: 'thumbs-down',
  dollar: 'dollar-sign',
  'dot-chart': 'chart-scatter',
  'double-left': 'chevrons-left',
  'double-right': 'chevrons-right',
  down: 'chevron-down',
  'down-circle': 'circle-chevron-down',
  'down-square': 'square-chevron-down',
  drag: 'grip-vertical',
  edit: 'square-pen',
  enter: 'corner-down-left',
  environment: 'map-pin',
  exclamation: 'triangle-alert',
  'exclamation-circle': 'circle-alert',
  'expand-alt': 'maximize',
  experiment: 'flask-conical',
  export: 'upload',
  'eye-invisible': 'eye-off',
  fall: 'trending-down',
  'fast-backward': 'skip-back',
  'field-binary': 'binary',
  'field-number': 'hash',
  'field-string': 'type',
  'field-time': 'clock',
  'file-add': 'file-plus',
  'file-done': 'file-check',
  'file-excel': 'file-spreadsheet',
  'file-exclamation': 'file',
  'file-gif': 'file-image',
  'file-jpg': 'file-image',
  'file-markdown': 'file-text',
  'file-pdf': 'file-text',
  'file-ppt': 'presentation',
  'file-protect': 'shield-check',
  'file-sync': 'file',
  'file-unknown': 'file-question-mark',
  'file-word': 'file-text',
  'file-zip': 'file-archive',
  filter: 'funnel',
  fire: 'flame',
  'folder-add': 'folder-plus',
  'folder-view': 'folder-search',
  'font-colors': 'palette',
  'font-size': 'case-sensitive',
  fork: 'git-fork',
  'format-painter': 'paintbrush',
  'fullscreen-exit': 'minimize',
  function: 'square-function',
  gateway: 'router',
  gif: 'file-image',
  global: 'globe',
  hdd: 'hard-drive',
  'heat-map': 'grid-3x3',
  highlight: 'highlighter',
  home: 'house',
  idcard: 'id-card',
  'info-circle': 'info',
  layout: 'layout-dashboard',
  left: 'chevron-left',
  'left-circle': 'circle-chevron-left',
  'left-square': 'square-chevron-left',
  like: 'thumbs-up',
  line: 'minus',
  'line-chart': 'chart-line',
  loading: 'loader-circle',
  'loading-3-quarters': 'loader-circle',
  login: 'log-in',
  logout: 'log-out',
  'mac-command': 'command',
  man: 'user',
  'medicine-box': 'pill',
  message: 'message-square',
  'minus-circle': 'circle-minus',
  'minus-square': 'square-minus',
  mobile: 'smartphone',
  'money-collect': 'banknote',
  more: 'ellipsis',
  'node-collapse': 'chevrons-down-up',
  'node-expand': 'chevrons-up-down',
  'node-index': 'list-tree',
  notification: 'bell',
  number: 'hash',
  'ordered-list': 'list-ordered',
  'paper-clip': 'paperclip',
  'pause-circle': 'circle-pause',
  'pay-circle': 'credit-card',
  percentage: 'percent',
  'pic-center': 'image',
  picture: 'image',
  'pie-chart': 'chart-pie',
  'play-circle': 'circle-play',
  'play-square': 'square-play',
  'plus-circle': 'circle-plus',
  'plus-square': 'square-plus',
  pound: 'pound-sterling',
  poweroff: 'power',
  profile: 'user-round',
  project: 'folder-kanban',
  'pull-request': 'git-pull-request',
  pushpin: 'pin',
  qrcode: 'qr-code',
  question: 'circle-question-mark',
  'question-circle': 'circle-question-mark',
  'radar-chart': 'radar',
  reload: 'refresh-cw',
  rest: 'armchair',
  retweet: 'repeat',
  right: 'chevron-right',
  'right-circle': 'circle-chevron-right',
  'right-square': 'square-chevron-right',
  rise: 'trending-up',
  robot: 'bot',
  rollback: 'undo-2',
  'rotate-left': 'rotate-ccw',
  'rotate-right': 'rotate-cw',
  safety: 'shield',
  'safety-certificate': 'shield-check',
  schedule: 'calendar-clock',
  scissor: 'scissors',
  'security-scan': 'scan-search',
  select: 'text-cursor',
  setting: 'settings',
  'share-alt': 'share',
  shop: 'store',
  shopping: 'shopping-bag',
  'shopping-cart': 'shopping-cart',
  sliders: 'sliders-horizontal',
  snippets: 'scissors',
  solution: 'puzzle',
  'sort-ascending': 'arrow-up-narrow-wide',
  'sort-descending': 'arrow-down-wide-narrow',
  sound: 'volume-2',
  stop: 'circle-stop',
  subnode: 'git-fork',
  swap: 'arrow-left-right',
  switcher: 'layout-grid',
  sync: 'refresh-cw',
  team: 'users',
  thunderbolt: 'zap',
  'to-top': 'arrow-up-to-line',
  tool: 'wrench',
  transaction: 'receipt',
  translation: 'languages',
  unlock: 'lock-open',
  'unordered-list': 'list',
  up: 'chevron-up',
  'up-circle': 'circle-chevron-up',
  'up-square': 'square-chevron-up',
  'user-add': 'user-plus',
  'user-delete': 'user-minus',
  'user-switch': 'user-cog',
  'usergroup-add': 'users',
  verified: 'badge-check',
  'video-camera': 'video',
  'video-camera-add': 'video',
  warning: 'triangle-alert',
  wifi: 'wifi',
  woman: 'user',
};

export function toIconLookupKey(value: string): string {
  return value
    .trim()
    .replace(/^fa[srlbdt]?\s+/i, '')
    .replace(/^fa-(solid|regular|light|thin|duotone|brands)\s+/i, '')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();
}

function resolveAntdIconName(value: string): string | undefined {
  let name = value;
  if (name.startsWith('ant-design:')) {
    name = name.slice('ant-design:'.length);
  }
  name = name.replace(ANT_DESIGN_VARIANT_SUFFIX, '');
  name = toIconLookupKey(name);
  const mapped = ANT_DESIGN_LUCIDE_MAP[name];
  return mapped ?? undefined;
}

export function normalizeIconName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  let normalized: string;

  if (value.includes('ant-design:') || value.includes('ant-design')) {
    const antdResult = resolveAntdIconName(value);
    if (antdResult) {
      normalized = antdResult;
      return ICON_ALIAS_MAP[normalized] ?? normalized;
    }
    let stripped = value;
    if (stripped.startsWith('ant-design:')) {
      stripped = stripped.slice('ant-design:'.length);
    }
    stripped = stripped.replace(ANT_DESIGN_VARIANT_SUFFIX, '');
    normalized = toIconLookupKey(stripped);
  } else {
    normalized = toIconLookupKey(value);
    const fromAntd = ANT_DESIGN_LUCIDE_MAP[normalized];
    if (fromAntd) {
      return ICON_ALIAS_MAP[fromAntd] ?? fromAntd;
    }
  }

  return ICON_ALIAS_MAP[normalized] ?? normalized;
}

export function toLucideKey(iconName: string): string {
  return iconName
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function resolveLucideIcon(iconName: string | undefined): LucideIconComponent {
  const normalizedIconName = normalizeIconName(iconName);
  if (!normalizedIconName) {
    return Circle;
  }

  const key = toLucideKey(normalizedIconName);
  return (
    (icons as Record<string, LucideIconComponent>)[key] ??
    (Circle as unknown as LucideIconComponent)
  );
}

export function resolveLucideIconStrict(
  iconName: string | undefined,
): LucideIconComponent | null {
  const normalizedIconName = normalizeIconName(iconName);
  if (!normalizedIconName) {
    return null;
  }

  const key = toLucideKey(normalizedIconName);
  return (icons as Record<string, LucideIconComponent>)[key] ?? null;
}
