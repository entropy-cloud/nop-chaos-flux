export { createSchemaCompiler, validateSchema } from './schema-compiler';
export { compileAction, compileActions, type ActionCompilerOptions } from './action-compiler';
export { createCompileSymbolTable, createBaseCompileSymbolTable } from './compile-symbol-table';
export {
  createSchemaCompilerDiagnosticsContext,
  schemaPathToJsonPointer,
  appendJsonPointer,
  type SchemaCompilerDiagnosticsContext,
  type SchemaCompilerDiagnosticsMode
} from './schema-compiler/diagnostics';
export {
  createHostActionValidationContext,
  isInsideCapableRegion,
  parseNamespacedAction,
  validateHostAction,
  type HostActionValidationContext
} from './schema-compiler/host-action-validation';
export {
  collectSchemaValidationRules,
  mergeValidationRules,
  compileValidationRules,
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers
} from './validation-lowering';
