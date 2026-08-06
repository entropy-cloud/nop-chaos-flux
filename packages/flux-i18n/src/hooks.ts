import { useTranslation } from 'react-i18next';
import { getFluxI18n, FLUX_NAMESPACE, normalizeTranslationKey } from './i18n.js';
import type { TFunction } from 'i18next';

/**
 * React hook form of the flux translation function.
 *
 * The returned `t` normalizes `flux.`-prefixed keys the same way as the
 * module-level `t` and the UI bridge (see `normalizeTranslationKey`), so both
 * namespace-relative keys (`t('barcode.required')`) and fully-qualified keys
 * (`t('flux.barcode.required')`) resolve. Without this, i18next's
 * namespace-bound `t` treats `flux.barcode.required` as a nested path inside
 * the `flux` namespace and returns the raw key (CX-7 latent trap).
 */
export function useFluxTranslation() {
  const i18n = getFluxI18n();
  const { t, ...rest } = useTranslation(FLUX_NAMESPACE, { i18n });
  const translate = ((key: string, options?: Record<string, unknown>) =>
    t(normalizeTranslationKey(key), options)) as TFunction;
  return { ...rest, t: translate };
}

export type { TFunction } from 'i18next';
