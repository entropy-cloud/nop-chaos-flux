export {
  initFluxI18n,
  getFluxI18n,
  resetFluxI18n,
  changeLanguage,
  getCurrentLanguage,
  t,
  addResources,
  FLUX_NAMESPACE,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type FluxI18nOptions,
  type SupportedLanguage,
} from './i18n.js';

export { useFluxTranslation, type TFunction } from './hooks.js';

export { zhCN, enUS } from './locales/index.js';
