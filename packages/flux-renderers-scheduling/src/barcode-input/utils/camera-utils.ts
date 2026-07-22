export interface CameraAvailabilityResult {
  isAvailable: boolean;
  error?: string;
}

let cachedAvailability: CameraAvailabilityResult | null = null;

export function checkCameraAvailability(): Promise<CameraAvailabilityResult> {
  if (cachedAvailability) return Promise.resolve(cachedAvailability);

  if (typeof window === 'undefined' || !window.isSecureContext) {
    cachedAvailability = { isAvailable: false, error: 'Camera requires HTTPS or localhost' };
    return Promise.resolve(cachedAvailability);
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    cachedAvailability = { isAvailable: false, error: 'enumerateDevices not supported' };
    return Promise.resolve(cachedAvailability);
  }

  return navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
      const hasVideoInput = devices.some((d) => d.kind === 'videoinput');
      cachedAvailability = hasVideoInput
        ? { isAvailable: true }
        : { isAvailable: false, error: 'No camera found' };
      return cachedAvailability;
    })
    .catch(() => {
      cachedAvailability = { isAvailable: false, error: 'Camera permission denied' };
      return cachedAvailability;
    });
}

export function clearCameraAvailabilityCache(): void {
  cachedAvailability = null;
}
