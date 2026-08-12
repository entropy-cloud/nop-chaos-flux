import { describe, it, expect, vi, beforeEach } from 'vitest';

// P2-17: `clearCameraAvailabilityCache` dead export removed — module-level
// cache isolation is provided by vi.resetModules() + dynamic import so each
// test starts from a fresh module instance.
describe('checkCameraAvailability', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function freshCheck() {
    const mod = await import('./camera-utils.js');
    return mod.checkCameraAvailability;
  }

  it('should return unavailable when navigator.mediaDevices is undefined', async () => {
    const check = await freshCheck();
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
    const result = await check();
    expect(result.isAvailable).toBe(false);
    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true, writable: true });
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return an object with isAvailable and error properties', async () => {
    const check = await freshCheck();
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const result = await check();
    expect(result).toHaveProperty('isAvailable');
    expect(typeof result.isAvailable).toBe('boolean');
    if (result.error) {
      expect(typeof result.error).toBe('string');
    }
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should cache the result and return same value on second call', async () => {
    const check = await freshCheck();
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const result1 = await check();
    const result2 = await check();
    expect(result1).toEqual(result2);
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return unavailable when enumerateDevices throws', async () => {
    const check = await freshCheck();
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      configurable: true,
      writable: true,
    });
    const result = await check();
    expect(result.isAvailable).toBe(false);
    expect(result.error).toBe('Camera permission denied');
    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true, writable: true });
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return unavailable in non-secure context', async () => {
    const check = await freshCheck();
    const origIsSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true, writable: true });
    const result = await check();
    expect(result.isAvailable).toBe(false);
    expect(result.error).toContain('HTTPS');
    Object.defineProperty(window, 'isSecureContext', { value: origIsSecureContext, configurable: true, writable: true });
  });
});
