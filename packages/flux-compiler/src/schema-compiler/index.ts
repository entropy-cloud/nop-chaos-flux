export { createTemplateRegion, validateRegionParams } from '@nop-chaos/flux-core';
export type { RegionCompileSchema } from '@nop-chaos/flux-core';

export {
  classifyField,
  buildMetaProgram,
  buildCompiledMeta,
  DEFAULT_FIELD_RULES,
  isCompiledStatic,
} from './fields.js';

export { collectValidationModel } from './validation-collection.js';
export { compileRuntimeValueTree } from './runtime-value-compilation.js';
