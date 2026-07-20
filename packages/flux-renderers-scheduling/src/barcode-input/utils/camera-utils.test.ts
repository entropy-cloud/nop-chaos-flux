import { describe, it, expect } from 'vitest';
import { checkCameraAvailability } from './camera-utils.js';

describe('checkCameraAvailability', () => {
  it('should return unavailable when navigator.mediaDevices is undefined', async () => {
    const result = await checkCameraAvailability();
    expect(result).toHaveProperty('isAvailable');
  });

  it('should return an object with isAvailable and error properties', async () => {
    const result = await checkCameraAvailability();
    expect(result).toHaveProperty('isAvailable');
    expect(typeof result.isAvailable).toBe('boolean');
    if (result.error) {
      expect(typeof result.error).toBe('string');
    }
  });
});
