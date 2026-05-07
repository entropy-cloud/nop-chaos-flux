import { useTranslation } from 'react-i18next';
import { getFluxI18n, FLUX_NAMESPACE } from './i18n.js';

export function useFluxTranslation() {
  const i18n = getFluxI18n();
  return useTranslation(FLUX_NAMESPACE, { i18n });
}

export type { TFunction } from 'i18next';
