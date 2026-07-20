export interface CameraAvailabilityResult {
  isAvailable: boolean;
  error?: string;
}

export function checkCameraAvailability(): Promise<CameraAvailabilityResult> {
  const isSecureContext = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  if (!isSecureContext) {
    return Promise.resolve({
      isAvailable: false,
      error: 'Camera requires HTTPS or localhost',
    });
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve({
      isAvailable: false,
      error: 'getUserMedia not supported',
    });
  }

  return navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      return { isAvailable: true };
    })
    .catch((err: DOMException) => {
      const message = err.name === 'NotAllowedError'
        ? 'Camera permission denied'
        : err.name === 'NotFoundError'
          ? 'No camera found'
          : `Camera error: ${err.message}`;
      return { isAvailable: false, error: message };
    });
}
