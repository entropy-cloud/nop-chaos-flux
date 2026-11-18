interface VideoRecording {
  mode: 'media-recorder' | 'keyframes';
  mime: string;
  bytesBase64: string;
  frameCount: number;
  keyframes?: Array<{ bytesBase64: string; at: number }>;
}

interface VideoRecorder {
  addFrame(bytesBase64: string): void;
  stop(): Promise<VideoRecording>;
  mode(): 'media-recorder' | 'keyframes';
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

export function createVideoRecorder(fps = 10): VideoRecorder {
  if (!isMediaRecorderSupported()) {
    const keyframes: Array<{ bytesBase64: string; at: number }> = [];
    const startedAt = Date.now();
    return {
      addFrame(bytesBase64) {
        keyframes.push({ bytesBase64, at: Date.now() - startedAt });
      },
      async stop() {
        return { mode: 'keyframes', mime: 'image/webp+timestamps', bytesBase64: '', frameCount: keyframes.length, keyframes };
      },
      mode: () => 'keyframes',
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const context = canvas.getContext('2d');
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  let framesDrawn = 0;
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  const drawFrame = (bytesBase64: string): Promise<void> =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        context?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = `data:image/webp;base64,${bytesBase64}`;
    });

  return {
    addFrame(bytesBase64) {
      framesDrawn += 1;
      void drawFrame(bytesBase64);
    },
    async stop() {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      const blob = new Blob(chunks, { type: 'video/webm' });
      const bytesBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.readAsDataURL(blob);
      });
      return { mode: 'media-recorder', mime: 'video/webm', bytesBase64, frameCount: framesDrawn };
    },
    mode: () => 'media-recorder',
  };
}
