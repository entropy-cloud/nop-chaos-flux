import type { RendererPlugin } from '@nop-chaos/flux-core';

export function sortRendererPlugins(plugins: readonly RendererPlugin[] | undefined): RendererPlugin[] {
  return [...(plugins ?? [])]
    .map((plugin, index) => ({ plugin, index }))
    .sort((left, right) => {
      const leftPriority = left.plugin.priority ?? 0;
      const rightPriority = right.plugin.priority ?? 0;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.plugin);
}
