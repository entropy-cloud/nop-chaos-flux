import i18next, { type i18n, type InitOptions, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zhCN } from './locales/zh-CN';
import { enUS } from './locales/en-US';

export type SupportedLanguage = 'zh-CN' | 'en-US';

export const FLUX_NAMESPACE = 'flux';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['zh-CN', 'en-US'];

const defaultResources: Resource = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

let fluxI18nInstance: i18n | null = null;

function normalizeTranslationKey(key: string): string {
  return key.startsWith(`${FLUX_NAMESPACE}.`) ? key.slice(FLUX_NAMESPACE.length + 1) : key;
}

export interface FluxI18nOptions {
  lng?: SupportedLanguage;
  fallbackLng?: SupportedLanguage;
  resources?: Resource;
  debug?: boolean;
}

export function initFluxI18n(options: FluxI18nOptions = {}): i18n {
  if (fluxI18nInstance) {
    return fluxI18nInstance;
  }

  const {
    lng = DEFAULT_LANGUAGE,
    fallbackLng = DEFAULT_LANGUAGE,
    resources = defaultResources,
    debug = false,
  } = options;

  const initOptions: InitOptions = {
    lng,
    fallbackLng,
    resources,
    defaultNS: FLUX_NAMESPACE,
    ns: [FLUX_NAMESPACE],
    debug,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  };

  const instance = i18next.createInstance();
  instance.use(initReactI18next).init(initOptions);

  fluxI18nInstance = instance;
  return instance;
}

export function getFluxI18n(): i18n {
  if (!fluxI18nInstance) {
    return initFluxI18n();
  }
  return fluxI18nInstance;
}

export function resetFluxI18n(): void {
  fluxI18nInstance = null;
}

export async function changeLanguage(lng: SupportedLanguage): Promise<void> {
  const instance = getFluxI18n();
  await instance.changeLanguage(lng);
}

export function getCurrentLanguage(): SupportedLanguage {
  const instance = getFluxI18n();
  return (instance.language || DEFAULT_LANGUAGE) as SupportedLanguage;
}

export function t(key: string, options?: Record<string, unknown>): string {
  const instance = getFluxI18n();
  return instance.t(normalizeTranslationKey(key), options);
}

export function addResources(lng: SupportedLanguage, ns: string, resources: Record<string, unknown>): void {
  const instance = getFluxI18n();
  instance.addResourceBundle(lng, ns, resources, true, true);
}
