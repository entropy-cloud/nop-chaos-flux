export const STRICT_VALIDATION_KEY = '__FLUX_STRICT_VALIDATION__' as const;
export const FAIL_ON_SCHEMA_DIAGNOSTICS_KEY = '__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__' as const;

function readGlobalFlag(): boolean | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  const globalRecord = globalThis as Record<string, unknown>;

  if (STRICT_VALIDATION_KEY in globalRecord) {
    return globalRecord[STRICT_VALIDATION_KEY] === true;
  }

  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;

  if (processEnv?.[STRICT_VALIDATION_KEY] === 'true') {
    return true;
  }

  if (processEnv?.[STRICT_VALIDATION_KEY] === 'false') {
    return false;
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

export function shouldFailOnSchemaDiagnostics(): boolean {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;

  if (processEnv?.[FAIL_ON_SCHEMA_DIAGNOSTICS_KEY] === 'true') {
    return true;
  }

  if (typeof globalThis !== 'undefined') {
    const globalRecord = globalThis as Record<string, unknown>;
    if (globalRecord[FAIL_ON_SCHEMA_DIAGNOSTICS_KEY] === true) {
      return true;
    }
  }

  return processEnv?.VITEST === 'true' || processEnv?.PLAYWRIGHT === 'true';
}

export function setStrictValidationGlobal(enabled: boolean): void {
  if (typeof globalThis === 'undefined') {
    return;
  }

  (globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY] = enabled;
}

export function setFailOnSchemaDiagnosticsGlobal(enabled: boolean): void {
  if (typeof globalThis === 'undefined') {
    return;
  }

  (globalThis as Record<string, unknown>)[FAIL_ON_SCHEMA_DIAGNOSTICS_KEY] = enabled;
}
