import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';

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
      <Button size="sm" data-slot="crud-query-search" onClick={props.onSearch}>
        {t('flux.common.search')}
      </Button>
      <Button variant="outline" size="sm" data-slot="crud-query-reset" onClick={props.onReset}>
        {t('flux.common.reset')}
      </Button>
    </div>
  );
}
