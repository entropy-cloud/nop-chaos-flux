export const STRICT_VALIDATION_KEY = '__FLUX_STRICT_VALIDATION__' as const;

function readGlobalFlag(): boolean | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  const globalRecord = globalThis as Record<string, unknown>;

  if (STRICT_VALIDATION_KEY in globalRecord) {
    return globalRecord[STRICT_VALIDATION_KEY] === true;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STRICT_VALIDATION_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // localStorage may be unavailable
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const param = params.get('strictValidation');
      if (param === 'true') return true;
      if (param === 'false') return false;
    } catch {
      // URL parsing may fail
    }
  }

  return undefined;
}

function readDevMode(): boolean | undefined {
  try {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      return true;
    }
  } catch {
    // import.meta may be unavailable
  }

  return undefined;
}

export function isStrictValidationEnabled(explicitOverride?: boolean): boolean {
  if (explicitOverride === true || explicitOverride === false) {
    return explicitOverride;
  }

  const globalFlag = readGlobalFlag();
  if (globalFlag !== undefined) {
    return globalFlag;
  }

  const devMode = readDevMode();
  if (devMode !== undefined) {
    return devMode;
  }

  return false;
}

export function setStrictValidationGlobal(enabled: boolean): void {
  if (typeof globalThis === 'undefined') {
    return;
  }

  (globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY] = enabled;
}
