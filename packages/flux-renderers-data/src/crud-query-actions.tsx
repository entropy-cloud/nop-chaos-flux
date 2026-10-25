import { t } from '@nop-chaos/flux-i18n';

/**
 * P1-MA5.4-001 (plan 743): synthesize query submit/reset actions —
 * AMIS-style query form must be reachable (Enter was a no-op and
 * zero-result empty state unreachable without explicit actions).
 */
export function CrudQueryActions(props: {
  hasQueryForm: boolean;
  onSearch(): void;
  onReset(): void;
}) {
  if (!props.hasQueryForm) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-2" data-slot="crud-query-actions">
      <button
        type="button"
        data-slot="crud-query-search"
        className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={props.onSearch}
      >
        {t('flux.common.search')}
      </button>
      <button
        type="button"
        data-slot="crud-query-reset"
        className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium border hover:bg-muted"
        onClick={props.onReset}
      >
        {t('flux.common.reset')}
      </button>
    </div>
  );
}
