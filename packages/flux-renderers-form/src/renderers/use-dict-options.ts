import { useEffect, useRef, useState } from 'react';
import type { ChoiceOption } from './input-choice-renderers.js';
import { useRendererEnv } from '@nop-chaos/flux-react';

export interface DictOptionsState {
  options: ChoiceOption[];
  loading: boolean;
}

export function useDictOptions(dictName: string | undefined): DictOptionsState {
  const { loadDict } = useRendererEnv();
  const [state, setState] = useState<DictOptionsState>({ options: [], loading: false });
  const genRef = useRef(0);

  const [prevDictName, setPrevDictName] = useState(dictName);
  if (prevDictName !== dictName) {
    setPrevDictName(dictName);
    setState({ options: [], loading: !!dictName });
  }

  useEffect(() => {
    if (!dictName || !loadDict) return;

    const controller = new AbortController();
    const gen = ++genRef.current;

    void loadDict(dictName)
      .then((bean) => {
        if (genRef.current !== gen) return;
        setState({
          options: (bean.options ?? []).map((opt) => ({
            label: opt.label,
            value: opt.value,
            disabled: false,
          })),
          loading: false,
        });
      })
      .catch((error) => {
        if (genRef.current !== gen) return;
        console.warn(`[flux-select] Failed to load dict "${dictName}":`, error);
        setState({ options: [], loading: false });
      });

    return () => {
      controller.abort();
    };
  }, [dictName, loadDict]);

  if (!dictName) return { options: [], loading: false };

  if (!loadDict) {
    console.warn(
      `[flux-select] dict "${dictName}" requested but env.loadDict is not configured.`,
    );
    return { options: [], loading: false };
  }

  return state;
}
