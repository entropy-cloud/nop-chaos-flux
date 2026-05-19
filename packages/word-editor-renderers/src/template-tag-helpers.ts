import { BUILTIN_TEMPLATE_TAGS, findTagDefinition } from '@nop-chaos/word-editor-core';

export function findInsertableTagDefinition(name: string) {
  return (
    findTagDefinition(name, 'tag-open') ??
    BUILTIN_TEMPLATE_TAGS.find((tag) => tag.name === name && tag.kind === 'tag-selfclose')
  );
}
