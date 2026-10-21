/**
 * One-time feature detection for the `passive` addEventListener option
 * (antd-mobile `supports-passive` pattern, M6a). Listeners that must call
 * preventDefault (scroll locks, click suppression) need `{ passive: false }`
 * where supported; this probe lets utilities avoid relying on the legacy
 * `capture: boolean` overload shape.
 */

let cached: boolean | null = null;

export function supportsPassiveEvents(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') {
    cached = false;
    return cached;
  }
  let supported = false;
  try {
    const options: Partial<AddEventListenerOptions> = {};
    Object.defineProperty(options, 'passive', {
      get() {
        supported = true;
        return true;
      },
    });
    const probe = () => {};
    window.addEventListener('flux-passive-probe', probe, options);
    window.removeEventListener('flux-passive-probe', probe, options);
  } catch {
    supported = false;
  }
  cached = supported;
  return cached;
}
