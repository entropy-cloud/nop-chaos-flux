export function errorMessageI18nParam(err: unknown) {
  setError(t('flux.barcode.cameraError', { message: err.message }));
}
