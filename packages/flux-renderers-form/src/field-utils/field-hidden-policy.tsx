import { useEffect } from 'react';
import { useCurrentForm, useCurrentValidationScope } from '@nop-chaos/flux-react';

export function useHiddenFieldPolicy(name: string, hidden: boolean) {
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const hiddenOwner = currentForm ?? currentValidationScope;

  useEffect(() => {
    if (!hiddenOwner || !name) {
      return;
    }

    hiddenOwner.notifyFieldHidden(name, hidden);

    return () => {
      hiddenOwner.notifyFieldHidden(name, false);
    };
  }, [hiddenOwner, name, hidden]);
}
