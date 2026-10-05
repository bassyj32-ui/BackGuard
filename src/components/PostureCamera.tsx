import { useEffect, useRef } from 'react';
import type { Frame, Landmark } from '../pose/landmarks';
import { smoothLandmarks } from '../pose/landmarks';
import type { PoseWorkerRequest, PoseWorkerResponse } from '../pose/worker';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error';

interface PostureCameraProps {
  status: CameraStatus;
  onStatus: (status: CameraStatus, detail?: string) => void;
  /** Fired with each smoothed landmark frame while status is 'ready'. */
  onFrame?: (frame: Frame) => void;
  active: boolean;
}

/**
 * Mirrored camera with a skeleton overlay.
 *
 * Privacy: frames are processed in a Web Worker and never stored, uploaded, or
 * recorded. The worker closes every ImageBitmap after inference.
 */
export default function PostureCamera({ status, onStatus, onFrame, active }: PostureCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const smoothedRef = useRef<Landmark[] | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onStatus('unsupported', 'This browser does not expose a camera API.');
        return;
      }

      onStatus('requesting');
      let stream: MediaStream;
      try {
        // Narrow framing keeps the torso landmarks usable.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        onStatus(name === 'NotAllowedError' ? 'denied' : 'error', name || 'Camera unavailable.');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // iOS Safari will not play inline without both of these.
      video.playsInline = true;
      video.muted = true;
      try {
        await video.play();
      } catch {
        // Autoplay rejection: the user gesture path handles retry in Session.
      }

      onStatus('loading-model');
      try {
        const worker = new Worker(new URL('../pose/worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;
        worker.onmessage = (e: MessageEvent<PoseWorkerResponse>) => handleWorkerMessage(e.data);
        worker.onerror = () => onStatus('error', 'Pose worker failed to start.');
        const base = import.meta.env.BASE_URL;
        const init: PoseWorkerRequest = {
          type: 'init',
          modelPath: `${base}model/pose_landmarker_lite.task`,
          wasmPath: `${base}model/wasm`,
        };
        worker.postMessage(init);
      } catch {
        onStatus('error', 'Could not start the pose worker.');
      }
    }

    function handleWorkerMessage(msg: PoseWorkerResponse) {
      if (msg.type === 'ready') {
        onStatus('ready');
        loop();
        return;
      }
      if (msg.type === 'error') {
        onStatus('error', msg.message);
        return;
      }
      if (msg.type === 'result') {
        const landmarks = msg.landmarks as Landmark[];
        const smoothed = smoothLandmarks(smoothedRef.current, landmarks, 0.5);
        smoothedRef.current = smoothed;
        drawSkeleton(smoothed);
        onFrameRef.current?.({ landmarks: smoothed, timestamp: msg.timestamp });
      }
    }

    function loop() {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (!video || !worker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const bitmap = createImageBitmap(video);
      bitmap.then((bmp) => {
        const frame: PoseWorkerRequest = { type: 'frame', bitmap: bmp, timestamp: performance.now() };
        worker.postMessage(frame, [bmp]);
      }).catch(() => undefined);
      rafRef.current = requestAnimationFrame(loop);
    }

    function drawSkeleton(landmarks: Landmark[]) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = Math.max(2, canvas.width / 320);
      ctx.lineCap = 'round';
      for (const [a, b] of SKELETON_EDGES) {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      smoothedRef.current = null;
    };
  }, [active, onStatus]);

  return (
    <div className="camera">
      <video ref={videoRef} className="camera__video" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="camera__overlay" aria-hidden="true" />
      <CameraMessage status={status} />
    </div>
  );
}

const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

function CameraMessage({ status }: { status: CameraStatus }) {
  switch (status) {
    case 'requesting':
      return <p className="camera__message">Waiting for camera permission…</p>;
    case 'loading-model':
      return <p className="camera__message">Loading the on-device pose model (~3 MB, one time)…</p>;
    case 'ready':
      return null;
    case 'denied':
      return (
        <p className="camera__message">
          Camera access was blocked. BackGuard needs the camera to give form feedback. Enable it in
          your browser settings for this site, then try again.
        </p>
      );
    case 'unsupported':
      return <p className="camera__message">This browser does not support camera access.</p>;
    case 'error':
      return <p className="camera__message">The camera or pose model could not start.</p>;
    default:
      return <p className="camera__message">Starting camera…</p>;
  }
}