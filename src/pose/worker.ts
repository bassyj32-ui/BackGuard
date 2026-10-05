/**
 * Pose worker. Owns the MediaPipe dependency so neither the WASM runtime nor
 * the model file enters the main bundle, and so inference never blocks the
 * render loop.
 *
 * Model and WASM are served from /public, not a CDN, so a first load on a poor
 * connection fails gracefully instead of hard-failing.
 */

export interface PoseInitMessage {
  type: 'init';
  modelPath: string;
  wasmPath: string;
}

export interface PoseFrameMessage {
  type: 'frame';
  /** Video frame to transfer. */
  bitmap: ImageBitmap;
  timestamp: number;
}

export interface PoseResetMessage {
  type: 'reset';
}

export type PoseWorkerRequest = PoseInitMessage | PoseFrameMessage | PoseResetMessage;

export interface PoseReadyMessage {
  type: 'ready';
}

export interface PoseResultMessage {
  type: 'result';
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  timestamp: number;
}

export interface PoseErrorMessage {
  type: 'error';
  message: string;
  fatal: boolean;
}

export type PoseWorkerResponse = PoseReadyMessage | PoseResultMessage | PoseErrorMessage;

let landmarker: unknown = null;
let running = false;

function post(msg: PoseWorkerResponse) {
  self.postMessage(msg);
}

async function init({ modelPath, wasmPath }: PoseInitMessage) {
  try {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath);
    const created = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    landmarker = created;
    running = true;
    post({ type: 'ready' });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to load pose model',
      fatal: true,
    });
  }
}

async function processFrame({ bitmap, timestamp }: PoseFrameMessage) {
  if (!running || !landmarker) {
    bitmap.close();
    return;
  }
  try {
    const detector = landmarker as {
      detectForVideo: (src: ImageBitmap, ts: number) => {
        landmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
      };
    };
    const result = detector.detectForVideo(bitmap, timestamp);
    const first = result.landmarks?.[0] ?? [];
    post({
      type: 'result',
      landmarks: first.map((l) =>
        l.visibility === undefined
          ? { x: l.x, y: l.y, z: l.z }
          : { x: l.x, y: l.y, z: l.z, visibility: l.visibility },
      ),
      timestamp,
    });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : 'Pose inference failed',
      fatal: false,
    });
  } finally {
    bitmap.close();
  }
}

self.onmessage = (event: MessageEvent<PoseWorkerRequest>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      void init(msg);
      break;
    case 'frame':
      void processFrame(msg);
      break;
    case 'reset':
      break;
  }
};