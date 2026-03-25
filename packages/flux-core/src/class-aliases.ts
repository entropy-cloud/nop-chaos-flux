export function resolveClassAliases(
  className: string | undefined,
  aliases: Record<string, string> | undefined,
  visited: Set<string> = new Set()
): string {
  if (!className) return '';
  if (!aliases || Object.keys(aliases).length === 0) return className;

  const tokens = className.split(/\s+/).filter(Boolean);
  const resolved: string[] = [];

  for (const token of tokens) {
    if (visited.has(token)) {
      resolved.push(token);
      continue;
    }

    const aliasValue = aliases[token];
    if (!aliasValue) {
      resolved.push(token);
      continue;
    }

    visited.add(token);
    const expanded = resolveClassAliases(aliasValue, aliases, visited);
    visited.delete(token);

    resolved.push(...expanded.split(/\s+/).filter(Boolean));
  }

  return resolved.join(' ');
}

export function mergeClassAliases(
  parent: Record<string, string> | undefined,
  child: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!parent && !child) return undefined;
  if (!parent) return child;
  if (!child) return parent;
  return { ...parent, ...child };
}
