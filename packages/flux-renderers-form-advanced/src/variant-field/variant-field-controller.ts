import React from 'react';
import type {
  AdapterDispatch,
  FormRuntime,
  RendererComponentProps,
  RendererEnv,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { actionAdapter, isAbortError } from '@nop-chaos/flux-core';
import type { VariantFieldSchema } from '../composite-field/composite-schemas.js';
import {
  detectMatchedVariant,
  extractDetectedVariant,
  resolveInitialVariant,
} from './variant-field-matching.js';
import {
  getAuthoredActionSchema,
  getAuthoredVariantOption,
  injectDetectVariantArgs,
  reportVariantFieldFailure,
  type BaseNodeInstance,
  type VariantResolvedOption,
} from './variant-field-helpers.js';

interface UseVariantFieldControllerInput {
  currentValue: unknown;
  defaultVariant: string | undefined;
  name: string;
  parentForm: FormRuntime | undefined;
  parentScope: ScopeRef;
  props: RendererComponentProps<VariantFieldSchema>;
  readOnly: boolean;
  runtimeNotify: RendererEnv['notify'] | undefined;
  variants: VariantResolvedOption[];
}

export function useVariantFieldController({
  currentValue,
  defaultVariant,
  name,
  parentForm,
  parentScope,
  props,
  readOnly,
  runtimeNotify,
  variants,
}: UseVariantFieldControllerInput) {
  const authoredSchema = props.templateNode.schema as VariantFieldSchema | undefined;
  const detectVariantPlan = (props.templateNode as { eventPlans?: Record<string, unknown> } | undefined)
    ?.eventPlans?.detectVariantAction;
  const detectVariantAction = React.useMemo(
    () => getAuthoredActionSchema(detectVariantPlan),
    [detectVariantPlan],
  );
  const matchedKey = detectMatchedVariant(
    variants,
    currentValue,
    props.helpers.evaluate,
    parentScope,
    props.helpers.createScope,
  );
  const initialKey = resolveInitialVariant(
    variants,
    currentValue,
    defaultVariant,
    props.helpers.evaluate,
    parentScope,
    props.helpers.createScope,
  );
  const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
  const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);
  const detectRequestIdRef = React.useRef(0);
  const switchRequestIdRef = React.useRef(0);
  const detectAbortControllerRef = React.useRef<AbortController | null>(null);
  const switchAbortControllerRef = React.useRef<AbortController | null>(null);
  const mountedRef = React.useRef(true);

  const activeKey = React.useMemo(() => {
    if (matchedKey) return matchedKey;
    if (detectedKey) return detectedKey;
    if (userSelectedKey) return userSelectedKey;
    return initialKey;
  }, [matchedKey, detectedKey, userSelectedKey, initialKey]);

  React.useEffect(() => {
    if (userSelectedKey && matchedKey && matchedKey !== userSelectedKey) {
      setUserSelectedKey(undefined);
      return;
    }

    if (userSelectedKey && matchedKey === userSelectedKey) {
      setUserSelectedKey(undefined);
    }
  }, [matchedKey, userSelectedKey]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      detectAbortControllerRef.current?.abort();
      switchAbortControllerRef.current?.abort();
      mountedRef.current = false;
    };
  }, []);

  const runDetectVariantAction = React.useCallback(async () => {
    const requestId = ++detectRequestIdRef.current;
    detectAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    detectAbortControllerRef.current = abortController;

    if (!detectVariantAction || matchedKey) {
      if (mountedRef.current && requestId === detectRequestIdRef.current) {
        setDetectedKey(undefined);
      }
      return;
    }

    try {
      const result = await props.helpers.dispatch(
        injectDetectVariantArgs(detectVariantAction, {
          value: currentValue,
          variants: variants.map((variant) => variant.key),
        }),
        {
          scope: parentScope,
          form: parentForm ?? undefined,
          page: undefined,
          nodeInstance: props.node as BaseNodeInstance,
          signal: abortController.signal,
        },
      );

      if (detectAbortControllerRef.current === abortController) {
        detectAbortControllerRef.current = null;
      }

      if (!mountedRef.current || requestId !== detectRequestIdRef.current) {
        return;
      }

      if (!result.ok) {
        setDetectedKey(undefined);
        reportVariantFieldFailure(runtimeNotify, result.error);
        return;
      }

      const nextKey = extractDetectedVariant(result.data);
      setDetectedKey(nextKey && variants.some((variant) => variant.key === nextKey) ? nextKey : undefined);
    } catch (error: unknown) {
      if (detectAbortControllerRef.current === abortController) {
        detectAbortControllerRef.current = null;
      }

      if (abortController.signal.aborted || isAbortError(error)) {
        return;
      }

      if (!mountedRef.current || requestId !== detectRequestIdRef.current) {
        return;
      }

      setDetectedKey(undefined);
      console.warn('[variant-field] detectVariantAction failed', error);
      reportVariantFieldFailure(runtimeNotify, error);
    }
  }, [currentValue, detectVariantAction, matchedKey, parentForm, parentScope, props.helpers, props.node, runtimeNotify, variants]);

  React.useEffect(() => {
    runDetectVariantAction().catch((error: unknown) => {
      console.warn('[variant-field] unexpected detectVariantAction failure', error);
    });
  }, [runDetectVariantAction]);

  const handleVariantSwitch = React.useCallback(
    async (key: string) => {
      if (key === activeKey) {
        return;
      }

      const requestId = ++switchRequestIdRef.current;
      switchAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      switchAbortControllerRef.current = abortController;

      if (parentForm) {
        parentForm.clearErrors(name);
      }

      const nextOptionIndex = variants.findIndex((variant) => variant.key === key);
      const nextOption = nextOptionIndex >= 0 ? variants[nextOptionIndex] : undefined;
      const authoredNextOption =
        nextOptionIndex >= 0 ? getAuthoredVariantOption(authoredSchema, key, nextOptionIndex) : undefined;

      if (nextOption && parentForm && name) {
        let nextValue = nextOption.initialValue !== undefined ? nextOption.initialValue : null;

        if (authoredNextOption?.transformInAction) {
          const dispatchAction: AdapterDispatch = (action, ctx) =>
            props.helpers.dispatch(action, {
              scope: ctx?.scope ?? parentScope,
              form: ctx?.form ?? parentForm,
              page: undefined,
              nodeInstance: props.node as BaseNodeInstance,
              signal: abortController.signal,
            });
          const adapter = actionAdapter(
            authoredNextOption.transformInAction,
            undefined,
            undefined,
            dispatchAction,
          );

          const migratedValue = await adapter.in(currentValue, {
            name: key,
            readOnly,
            scope: parentScope,
            form: parentForm,
          });

          if (switchAbortControllerRef.current === abortController) {
            switchAbortControllerRef.current = null;
          }

          if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
            return;
          }

          nextValue = (migratedValue as VariantResolvedOption['initialValue']) ?? null;
        }

        if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
          return;
        }

        parentForm.setValue(name, nextValue);
        parentForm.touchField(name);
      } else if (name) {
        const nextValue = nextOption?.initialValue !== undefined ? nextOption.initialValue : null;
        parentScope.update(name, nextValue);
      }

      if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
        return;
      }

      if (switchAbortControllerRef.current === abortController) {
        switchAbortControllerRef.current = null;
      }

      setUserSelectedKey(key);
    },
    [activeKey, authoredSchema, currentValue, name, parentForm, parentScope, props.helpers, props.node, readOnly, variants],
  );

  const triggerVariantSwitch = React.useCallback(
    (key: string) => {
      handleVariantSwitch(key).catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.warn('[variant-field] variant switch failed', error);
        reportVariantFieldFailure(runtimeNotify, error);
      });
    },
    [handleVariantSwitch, runtimeNotify],
  );

  const activeOption = variants.find((variant) => variant.key === activeKey) ?? variants[0];
  const activeContentRegion =
    typeof activeOption?.contentRegionKey === 'string'
      ? props.regions[activeOption.contentRegionKey]
      : undefined;
  const activeViewerRegion =
    typeof activeOption?.viewerRegionKey === 'string'
      ? props.regions[activeOption.viewerRegionKey]
      : undefined;

  return {
    activeContentRegion,
    activeKey,
    activeViewerRegion,
    triggerVariantSwitch,
  };
}
