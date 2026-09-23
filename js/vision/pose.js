// GEMELO-1 · pose.js — MediaPipe BlazePose on-device.
// PRIVACIDAD (ADR-003): los frames NUNCA salen del dispositivo. Solo landmarks.
const VENDOR = new URL('../../vendor/mediapipe/', import.meta.url);

export class PoseTracker {
  constructor() {
    this.landmarker = null;
    this.lastTs = -1;
  }

  async init({ preferGPU = true } = {}) {
    const { PoseLandmarker, FilesetResolver } = await import(new URL('vision_bundle.mjs', VENDOR).href);
    const fileset = await FilesetResolver.forVisionTasks(new URL('wasm/', VENDOR).href);
    const base = {
      modelAssetPath: new URL('pose_landmarker_lite.task', VENDOR).href,
      delegate: preferGPU ? 'GPU' : 'CPU',
    };
    const opts = {
      baseOptions: base,
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts);
    } catch (e) {
      // GPUs bloqueadas en algunos dispositivos → CPU sin avisar al usuario
      opts.baseOptions.delegate = 'CPU';
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts);
    }
    return this;
  }

  /** Devuelve Pose33 (array de {x,y,z,visibility}) o null si no hay persona. */
  detect(video, tMs) {
    if (!this.landmarker) return null;
    const ts = Math.max(tMs, this.lastTs + 1); // timestamps estrictamente crecientes
    this.lastTs = ts;
    const res = this.landmarker.detectForVideo(video, ts);
    const pose = res?.landmarks?.[0] ?? null;
    return pose ?? null;
  }

  close() {
    this.landmarker?.close?.();
    this.landmarker = null;
  }
}
