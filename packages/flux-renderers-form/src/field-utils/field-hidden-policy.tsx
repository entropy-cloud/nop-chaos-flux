import { useEffect } from 'react';
import {
  useCurrentForm,
  useCurrentFormModelGeneration,
  useCurrentValidationScope,
} from '@nop-chaos/flux-react';

export function useHiddenFieldPolicy(name: string, hidden: boolean) {
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const modelGeneration = useCurrentFormModelGeneration();
  const hiddenOwner = currentForm ?? currentValidationScope;

  useEffect(() => {
    if (!hiddenOwner || !name) {
      return;
    }

    hiddenOwner.notifyFieldHidden(name, hidden);

    return () => {
      hiddenOwner.notifyFieldHidden(name, false);
    };
  }, [hiddenOwner, name, hidden, modelGeneration]);
}
