import { createStore } from 'zustand/vanilla';
import type { FormStoreApi, FormStoreState, PageStoreApi, PageStoreState, ValidationError } from '@nop-chaos/amis-schema';
import { setIn } from '@nop-chaos/amis-schema';

export function createFormStore(initialValues: Record<string, any>): FormStoreApi {
  const store = createStore<FormStoreState>(() => ({
    values: initialValues,
    errors: {},
    validating: {},
    touched: {},
    dirty: {},
    visited: {},
    submitting: false
  }));

  function setBooleanState<K extends 'touched' | 'dirty' | 'visited'>(key: K, path: string, nextValue: boolean) {
    const current = store.getState()[key];

    if (nextValue) {
      if (current[path]) {
        return;
      }

      store.setState({ [key]: { ...current, [path]: true } } as Pick<FormStoreState, K>);
      return;
    }

    if (!current[path]) {
      return;
    }

    const next = { ...current };
    delete next[path];
    store.setState({ [key]: next } as Pick<FormStoreState, K>);
  }

  function setPathErrors(path: string, errors?: ValidationError[]) {
    const current = store.getState().errors;
    const existing = current[path];

    if (!errors || errors.length === 0) {
      if (!existing) {
        return;
      }

      const next = { ...current };
      delete next[path];
      store.setState({ errors: next });
      return;
    }

    if (existing === errors) {
      return;
    }

    store.setState({ errors: { ...current, [path]: errors } });
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setValues(values) {
      store.setState({ values });
    },
    setValue(path, value) {
      const current = store.getState().values;
      store.setState({ values: setIn(current, path, value) });
    },
    setErrors(errors) {
      store.setState({ errors });
    },
    setPathErrors(path, errors) {
      setPathErrors(path, errors);
    },
    setValidating(path, validating) {
      const current = store.getState().validating;

      if (validating) {
        store.setState({ validating: { ...current, [path]: true } });
        return;
      }

      if (!current[path]) {
        return;
      }

      const next = { ...current };
      delete next[path];
      store.setState({ validating: next });
    },
    setValidatingState(validating) {
      store.setState({ validating });
    },
    setTouched(path, touched) {
      setBooleanState('touched', path, touched);
    },
    setTouchedState(touched) {
      store.setState({ touched });
    },
    setDirty(path, dirty) {
      setBooleanState('dirty', path, dirty);
    },
    setDirtyState(dirty) {
      store.setState({ dirty });
    },
    setVisited(path, visited) {
      setBooleanState('visited', path, visited);
    },
    setVisitedState(visited) {
      store.setState({ visited });
    },
    setSubmitting(submitting) {
      store.setState({ submitting });
    }
  };
}

export function createPageStore(initialData: Record<string, any>): PageStoreApi {
  const store = createStore<PageStoreState>(() => ({
    data: initialData,
    dialogs: [],
    refreshTick: 0
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setData(data) {
      store.setState({ data });
    },
    updateData(path, value) {
      const state = store.getState();
      store.setState({ data: setIn(state.data, path, value) });
    },
    openDialog(dialog) {
      const state = store.getState();
      store.setState({ dialogs: [...state.dialogs, dialog] });
    },
    closeDialog(dialogId) {
      const state = store.getState();

      if (!dialogId) {
        if (state.dialogs.length === 0) {
          return;
        }

        store.setState({ dialogs: state.dialogs.slice(0, -1) });
        return;
      }

      store.setState({ dialogs: state.dialogs.filter((dialog) => dialog.id !== dialogId) });
    },
    refresh() {
      const state = store.getState();
      store.setState({ refreshTick: state.refreshTick + 1 });
    }
  };
}
