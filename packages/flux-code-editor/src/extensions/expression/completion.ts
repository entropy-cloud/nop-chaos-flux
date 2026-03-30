import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { VariableItem, FuncGroup } from '../../types';

export function resolveVariablePath(
  variables: VariableItem[],
  path: string,
): VariableItem | null {
  const segments = path.split('.');
  let current: VariableItem[] = variables;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const found = current.find(
      (v) => lastSegment(v.value) === segment || v.value === segment,
    );
    if (!found) return null;
    if (i === segments.length - 1) return found;
    current = found.children ?? [];
  }

  return null;
}

export function lastSegment(value: string): string {
  const parts = value.split('.');
  return parts[parts.length - 1];
}

export function flattenVariables(variables: VariableItem[]): VariableItem[] {
  const result: VariableItem[] = [];
  for (const v of variables) {
    result.push(v);
    if (v.children) {
      result.push(...flattenVariables(v.children));
    }
  }
  return result;
}

export function flattenFunctions(groups: FuncGroup[]) {
  const result: { name: string; description?: string; example?: string }[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      result.push({
        name: item.name,
        description: item.description,
        example: item.example,
      });
    }
  }
  return result;
}

export function expressionCompletionSource(
  variables: VariableItem[],
  functions: FuncGroup[],
) {
  return function contextCompletion(
    context: CompletionContext,
  ): CompletionResult | null {
    const textBefore = context.state.doc.sliceString(0, context.pos);

    const dotMatch = textBefore.match(/([\w.]+)\.(\w*)$/);
    if (dotMatch) {
      const path = dotMatch[1];
      const partial = dotMatch[2];
      const resolved = resolveVariablePath(variables, path);
      if (resolved?.children?.length) {
        const options = resolved.children
          .filter((c) =>
            lastSegment(c.value)
              .toLowerCase()
              .startsWith(partial.toLowerCase()),
          )
          .map((c) => ({
            label: lastSegment(c.value),
            detail: c.type,
            apply: lastSegment(c.value),
            type: c.children ? 'class' : 'property',
          }));

        if (options.length === 0) return null;

        return {
          from: context.pos - partial.length,
          options,
        };
      }
    }

    const word = context.matchBefore(/\w+/);
    if (!word) return null;

    const partial = word.text.toLowerCase();

    const varOptions = flattenVariables(variables)
      .filter((v) =>
        lastSegment(v.value).toLowerCase().startsWith(partial),
      )
      .map((v) => ({
        label: lastSegment(v.value),
        detail: v.type,
        apply: lastSegment(v.value),
        type: 'variable' as const,
      }));

    const funcOptions = flattenFunctions(functions)
      .filter((f) => f.name.toLowerCase().startsWith(partial))
      .map((f) => ({
        label: f.name,
        detail: f.description,
        apply: `${f.name}()`,
        type: 'function' as const,
      }));

    const options = [...varOptions, ...funcOptions];
    if (options.length === 0) return null;

    return { from: word.from, options };
  };
}
