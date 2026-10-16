export { xlang, xlangLanguage } from './language.js';
export {
  createXlangLinter,
  mapXlangDiagnostics,
  type XlangCompileService,
  type XlangDiagnostic,
  type CreateXlangLinterOptions,
} from './diagnostics.js';
export { registerXlangLanguage, createXlangExtension } from './register.js';
