import type { FormRuntime, FormStoreApi, FormStoreState } from '@nop-chaos/flux-core';
import {
  createProjectedFormRuntime,
  createProjectedFormStore,
} from '../detail-view/projected-form-runtime.js';

interface CreateProjectedInlineFormOptions {
  parentForm: FormRuntime;
  ownerRootPath: string;
  prefixPath: (path: string) => string;
  scalarValueAlias?: string;
  projectValues?: (state: FormStoreState) => FormStoreState['values'];
  supportsArrayMutations?: boolean;
  setValue?: (path: string, value: unknown) => void;
  setValues?: (values: Record<string, unknown>) => void;
}

export function createProjectedInlineForm(options: CreateProjectedInlineFormOptions): FormRuntime {
  const {
    parentForm,
    ownerRootPath,
    prefixPath,
    scalarValueAlias,
    projectValues,
    supportsArrayMutations,
    setValue,
    setValues,
  } = options;

  return createProjectedFormRuntime(parentForm, {
    ownerRootPath,
    prefixPath,
    scalarValueAlias,
    store: createProjectedFormStore(parentForm.store, {
      ownerRootPath,
      scalarValueAlias,
      projectValues,
    }),
    supportsArrayMutations,
    setValue,
    setValues,
  });
}

export type { FormStoreApi };
