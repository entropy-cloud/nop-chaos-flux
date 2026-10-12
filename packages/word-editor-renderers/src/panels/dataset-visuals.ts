import { t } from '@nop-chaos/flux-i18n';

// Single source for dataset-type badge visuals shared by dataset-panel and
// field-list (WA-wordr-002: the two panels had drifted — the border outline
// only rendered in field-list). Unified on the bordered field-list side; the
// badge call sites carry `border` in their base classes so the outline shows
// consistently.
export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sql: t('flux.wordEditor.typeSql'),
    api: t('flux.wordEditor.typeApi'),
    mongo: t('flux.wordEditor.mongo'),
    static: t('flux.wordEditor.static'),
  };
  return labels[type] || type;
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    sql: 'bg-primary/10 text-primary border-primary/20',
    api: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    mongo: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    static: 'bg-muted text-muted-foreground border-border',
  };
  return colors[type] || 'bg-muted text-muted-foreground border-border';
}
