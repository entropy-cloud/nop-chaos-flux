import { t } from '@nop-chaos/flux-i18n';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { UserSelectSchema } from '../../schemas-org.js';
import { OrgSelectRendererControl } from './org-select-control.js';

export function UserSelectRenderer(props: RendererComponentProps<UserSelectSchema>) {
  return (
    <OrgSelectRendererControl
      props={props as RendererComponentProps<UserSelectSchema>}
      rendererType="user-select"
      defaultSelectableTypes={['user']}
      fallbackPlaceholder={t('flux.form.userSelectPlaceholder')}
    />
  );
}
