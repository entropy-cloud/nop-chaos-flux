import { useEffect, useMemo, useRef } from 'react';
import type { ActionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  createNormalizedActionEvent,
  keySequenceSignature,
  parseKeySequence,
  useKeyboardBindings,
  type KeyboardBindingSpec,
} from '@nop-chaos/flux-react';
import type { KeyboardSchema } from './schemas.js';

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

interface ParsedBinding extends KeyboardBindingSpec {
  keys: string;
  when?: string;
  action?: ActionSchema | ActionSchema[];
}

export function KeyboardRenderer(props: RendererComponentProps<KeyboardSchema>) {
  const { node, props: resolvedProps, events, helpers } = props;
  const scope = node.scope;
  const resolved = resolvedProps as Record<string, unknown>;
  const warnedRef = useRef(new Set<string>());

  const parsed = useMemo(() => {
    const rawBindings = Array.isArray(resolved.bindings) ? resolved.bindings : [];
    const seenSignatures = new Set<string>();
    const bindings: ParsedBinding[] = [];
    const warnings: string[] = [];
    for (let index = 0; index < rawBindings.length; index += 1) {
      const raw = rawBindings[index];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        warnings.push(`[keyboard] node "${props.id}" ignored a non-object binding at index ${index}.`);
        continue;
      }
      const entry = raw as Record<string, unknown>;
      const keys = typeof entry.keys === 'string' ? entry.keys : '';
      const tokens = keys.trim().length > 0 ? parseKeySequence(keys) : undefined;
      if (!tokens) {
        warnings.push(
          `[keyboard] node "${props.id}" ignored binding at index ${index} — invalid keys "${keys}". Expected a single key combo (e.g. "mod+shift+s") or a space-separated chord sequence (e.g. "g o").`,
        );
        continue;
      }
      const signature = keySequenceSignature(tokens);
      if (seenSignatures.has(signature)) {
        warnings.push(
          `[keyboard] node "${props.id}" has duplicate binding "${keys}" — the earlier declaration (registration order) wins.`,
        );
        continue;
      }
      seenSignatures.add(signature);
      const allowInInput = entry.allowInInput === true || entry.allowInInput === 'true';
      const preventDefault = entry.preventDefault !== false && entry.preventDefault !== 'false';
      const when = typeof entry.when === 'string' && entry.when.trim().length > 0 ? entry.when : undefined;
      const action = entry.action as ActionSchema | ActionSchema[] | undefined;
      bindings.push({ id: index, keys, tokens, allowInInput, preventDefault, when, action });
    }
    return { bindings, warnings };
  }, [resolved.bindings, props.id]);

  useEffect(() => {
    if (!isDevRuntime()) {
      return;
    }
    for (const message of parsed.warnings) {
      if (warnedRef.current.has(message)) {
        continue;
      }
      warnedRef.current.add(message);
      console.warn(message);
    }
  }, [parsed]);

  const warnOnce = (message: string) => {
    if (!isDevRuntime() || warnedRef.current.has(message)) {
      return;
    }
    warnedRef.current.add(message);
    console.warn(message);
  };

  const specs = useMemo<KeyboardBindingSpec[]>(
    () =>
      parsed.bindings.map((binding) => ({
        id: binding.id,
        tokens: binding.tokens,
        allowInInput: binding.allowInInput,
        preventDefault: binding.preventDefault,
        isAllowed: binding.when
          ? () => {
              try {
                return Boolean(helpers.evaluate(`\${${binding.when}}`, scope));
              } catch {
                return false;
              }
            }
          : undefined,
      })),
    [parsed, helpers, scope],
  );

  const handleMatch = (id: number, nativeEvent: KeyboardEvent | null) => {
    const binding = parsed.bindings.find((candidate) => candidate.id === id);
    if (!binding) {
      return;
    }
    const payload = { keys: binding.keys, index: id, nativeEvent: nativeEvent ?? undefined };
    if (binding.action && (!Array.isArray(binding.action) || binding.action.length > 0)) {
      try {
        const result = helpers.dispatch(binding.action, {
          event: createNormalizedActionEvent(payload),
          evaluationBindings: payload,
          scope,
          nodeInstance: node,
        });
        void Promise.resolve(result).catch((error) => {
          warnOnce(`[keyboard] node "${props.id}" action dispatch failed for binding "${binding.keys}".`);
          if (isDevRuntime()) {
            console.warn(error);
          }
        });
      } catch (error) {
        warnOnce(`[keyboard] node "${props.id}" action dispatch failed for binding "${binding.keys}".`);
        if (isDevRuntime()) {
          console.warn(error);
        }
      }
    }
    void events.onTrigger?.(payload, {
      event: { ...payload, type: 'custom' },
      evaluationBindings: payload,
      scope,
    });
  };

  const chordTimeoutRaw = resolved.chordTimeout;
  const chordTimeout =
    typeof chordTimeoutRaw === 'number'
      ? chordTimeoutRaw
      : typeof chordTimeoutRaw === 'string' && chordTimeoutRaw.trim().length > 0
        ? Number(chordTimeoutRaw)
        : undefined;

  useKeyboardBindings({
    scope,
    bindings: specs,
    chordTimeout: Number.isFinite(chordTimeout) ? chordTimeout : undefined,
    onMatch: handleMatch,
  });

  return null;
}
