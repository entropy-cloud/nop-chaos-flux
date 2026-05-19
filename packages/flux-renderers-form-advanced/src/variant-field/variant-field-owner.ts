import React from 'react';
import type {
  FormRuntime,
  RendererComponentProps,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import type { VariantFieldSchema } from '../composite-field/composite-schemas.js';
import { createProjectedValidationRuntime } from '../detail-view/projected-validation-runtime.js';
import {
  collectNamedChildPaths,
  collectNamedChildPathsFromTemplateNode,
  type VariantResolvedOption,
} from './variant-field-helpers.js';
import { createVariantFormProxy, createVariantScope } from './variant-field-runtime.js';

interface UseVariantFieldOwnersInput {
  name: string;
  activeKey: string | undefined;
  readOnly: boolean;
  parentForm: FormRuntime | undefined;
  parentScope: ScopeRef;
  parentValidationOwner: ValidationScopeRuntime | undefined;
  regions: RendererComponentProps<VariantFieldSchema>['regions'];
  validationOwnerPlan:
    | RendererComponentProps<VariantFieldSchema>['templateNode']['validationOwnerPlan']
    | undefined;
  variants: VariantResolvedOption[];
}

export function useVariantFieldOwners({
  name,
  activeKey,
  readOnly,
  parentForm,
  parentScope,
  parentValidationOwner,
  regions,
  validationOwnerPlan,
  variants,
}: UseVariantFieldOwnersInput) {
  const variantScope = React.useMemo(
    () => createVariantScope(parentScope, name, activeKey, readOnly),
    [activeKey, name, parentScope, readOnly],
  );
  const variantForm = React.useMemo(
    () => (parentForm ? createVariantFormProxy(parentForm, name) : undefined),
    [parentForm, name],
  );
  const variantValidationOwner = React.useMemo(() => {
    if (parentForm || !parentValidationOwner || !name) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: name,
      scalarValueAlias: 'value',
      prefixPath(path) {
        if (!path || path === 'value') {
          return name;
        }

        return path.startsWith('value.') ? `${name}.${path.slice('value.'.length)}` : `${name}.${path}`;
      },
    });
  }, [name, parentForm, parentValidationOwner]);

  const hiddenVariantChildPaths = React.useMemo(
    () =>
      variants
        .filter((variant) => variant.key !== activeKey)
        .flatMap((variant) => {
          const region =
            typeof variant.contentRegionKey === 'string' ? regions[variant.contentRegionKey] : undefined;
          const templateNames = collectNamedChildPathsFromTemplateNode(region?.templateNode);
          return templateNames.length > 0 ? templateNames : collectNamedChildPaths(variant.content);
        }),
    [activeKey, regions, variants],
  );

  React.useLayoutEffect(() => {
    const owner = parentForm ?? parentValidationOwner;

    if (!owner || !name) {
      return;
    }

    for (const hiddenPath of hiddenVariantChildPaths) {
      owner.notifyFieldHidden(`${name}.${hiddenPath}`, true);
    }

    return () => {
      for (const hiddenPath of hiddenVariantChildPaths) {
        owner.notifyFieldHidden(`${name}.${hiddenPath}`, false);
      }
    };
  }, [hiddenVariantChildPaths, name, parentForm, parentValidationOwner]);

  React.useEffect(() => {
    const owner = parentForm ?? parentValidationOwner;
    const childOwner = parentForm ? variantForm : variantValidationOwner;
    const hasIndependentChildOwner =
      validationOwnerPlan?.boundary === 'create-owner' &&
      validationOwnerPlan.childContractMode === 'recurse-submit';

    if (!owner || !childOwner || !name || !hasIndependentChildOwner) {
      return;
    }

    const childOwnerId = `${owner.scopeId}:${name}:variant-field`;

    owner.registerChildContract({
      childOwnerId,
      mode: 'recurse-submit',
      active: true,
      unregister() {
        owner.unregisterChildContract(childOwnerId);
      },
      getState() {
        const state = childOwner.getScopeState();
        return {
          ready: state.ready,
          validating: state.validating,
          valid: state.valid,
          hasErrors: state.hasErrors,
        };
      },
      async triggerValidation() {
        const result = await childOwner.validateAll('submit');
        return {
          ok: result.ok,
          errors: result.errors,
        };
      },
    });

    return () => {
      owner.unregisterChildContract(childOwnerId);
    };
  }, [name, parentForm, parentValidationOwner, validationOwnerPlan, variantForm, variantValidationOwner]);

  return {
    variantForm,
    variantScope,
    variantValidationOwner,
  };
}
