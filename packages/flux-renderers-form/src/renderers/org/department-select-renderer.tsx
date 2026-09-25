import { t } from '@nop-chaos/flux-i18n';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DepartmentSelectSchema } from '../../schemas-org.js';
import { OrgSelectRendererControl } from './org-select-control.js';

export function DepartmentSelectRenderer(props: RendererComponentProps<DepartmentSelectSchema>) {
  return (
    <OrgSelectRendererControl
      props={props as RendererComponentProps<DepartmentSelectSchema>}
      rendererType="department-select"
      defaultSelectableTypes={['department']}
      fallbackPlaceholder={t('flux.form.departmentSelectPlaceholder')}
    />
  );
}
