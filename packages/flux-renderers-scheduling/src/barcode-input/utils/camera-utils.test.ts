import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCameraAvailability, clearCameraAvailabilityCache } from './camera-utils.js';

describe('checkCameraAvailability', () => {
  beforeEach(() => {
    clearCameraAvailabilityCache();
  });

  it('should return unavailable when navigator.mediaDevices is undefined', async () => {
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
    clearCameraAvailabilityCache();
    const result = await checkCameraAvailability();
    expect(result.isAvailable).toBe(false);
    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true, writable: true });
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return an object with isAvailable and error properties', async () => {
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    clearCameraAvailabilityCache();
    const result = await checkCameraAvailability();
    expect(result).toHaveProperty('isAvailable');
    expect(typeof result.isAvailable).toBe('boolean');
    if (result.error) {
      expect(typeof result.error).toBe('string');
    }
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should cache the result and return same value on second call', async () => {
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    clearCameraAvailabilityCache();
    const result1 = await checkCameraAvailability();
    const result2 = await checkCameraAvailability();
    expect(result1).toEqual(result2);
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return unavailable when enumerateDevices throws', async () => {
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      configurable: true,
      writable: true,
    });
    clearCameraAvailabilityCache();
    const result = await checkCameraAvailability();
    expect(result.isAvailable).toBe(false);
    expect(result.error).toBe('Camera permission denied');
    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true, writable: true });
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });

  it('should return unavailable in non-secure context', async () => {
    const origIsSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true, writable: true });
    const result = await checkCameraAvailability();
    expect(result.isAvailable).toBe(false);
    expect(result.error).toContain('HTTPS');
    Object.defineProperty(window, 'isSecureContext', { value: origIsSecureContext, configurable: true, writable: true });
  });

  it('should clear cache when clearCameraAvailabilityCache is called', async () => {
    const origSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
    clearCameraAvailabilityCache();
    await checkCameraAvailability();
    clearCameraAvailabilityCache();
    const result = await checkCameraAvailability();
    expect(result).toBeDefined();
    Object.defineProperty(window, 'isSecureContext', { value: origSecureContext, configurable: true, writable: true });
  });
});
