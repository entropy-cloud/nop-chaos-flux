export {
  createTemplateRegion,
  extractNestedSchemaRegions,
  visitNestedSchemaRegions,
  validateRegionParams,
} from '@nop-chaos/flux-core';
export type { NestedRegionFieldRule } from '@nop-chaos/flux-core';

export { DEEP_FIELD_NORMALIZERS } from './tables.js';
export type { DeepFieldNormalizer } from './tables.js';

export {
  classifyField,
  buildMetaProgram,
  buildCompiledMeta,
  DEFAULT_FIELD_RULES,
  isCompiledStatic,
} from './fields.js';

export { collectValidationModel } from './validation-collection.js';
export { compileRuntimeValueTree } from './runtime-value-compilation.js';
