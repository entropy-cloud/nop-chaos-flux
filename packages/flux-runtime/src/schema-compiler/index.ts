export { createTemplateRegion as createCompiledRegion, extractNestedSchemaRegions } from './regions';
export type { NestedRegionFieldRule } from './regions';

export { DEEP_FIELD_NORMALIZERS } from './tables';
export type { DeepFieldNormalizer } from './tables';

export {
  classifyField,
  buildMetaProgram,
  buildCompiledMeta,
  DEFAULT_FIELD_RULES,
  isCompiledStatic
} from './fields';

export { collectValidationModel } from './validation-collection';
