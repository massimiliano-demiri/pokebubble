export interface Tilt {
  beta: number;
  gamma: number;
}

const MAX_ANGLE = 18;
const SMOOTHING = 0.15;

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function clamp(value: number, max: number) {
  return Math.max(-max, Math.min(max, value));
}

/**
 * Singleton (un solo listener `deviceorientation` per l'intera app) che espone il tilt del
 * giroscopio a più componenti (canvas parallax + shine olografico sulla carta) senza dover
 * richiedere il permesso iOS più volte.
 */
class DeviceTiltStore {
  tilt: Tilt = { beta: 0, gamma: 0 };
  enabled = false;
  needsPermission = false;
  readonly supported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;

  private baseline: Tilt | null = null;
  private listenerAttached = false;
  private initialized = false;
  private readonly statusListeners = new Set<() => void>();
  private readonly tiltListeners = new Set<() => void>();

  init() {
    if (this.initialized || !this.supported || typeof window === "undefined") return;
    this.initialized = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const iosEvent = window.DeviceOrientationEvent as IOSDeviceOrientationEvent;
    if (typeof iosEvent.requestPermission === "function") {
      this.needsPermission = true;
      this.emitStatus();
      return;
    }
    this.attach();
  }

  async requestPermission() {
    if (typeof window === "undefined") return;
    const iosEvent = window.DeviceOrientationEvent as IOSDeviceOrientationEvent;
    if (typeof iosEvent.requestPermission !== "function") return;
    try {
      const result = await iosEvent.requestPermission();
      if (result === "granted") {
        this.needsPermission = false;
        this.attach();
        this.emitStatus();
      }
    } catch {
      // permesso negato — l'app resta semplicemente in modalità 2D
    }
  }

  subscribeStatus(fn: () => void) {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  subscribeTilt(fn: () => void) {
    this.tiltListeners.add(fn);
    return () => {
      this.tiltListeners.delete(fn);
    };
  }

  private attach() {
    if (this.listenerAttached || typeof window === "undefined") return;
    this.listenerAttached = true;
    window.addEventListener("deviceorientation", this.handleEvent);
  }

  private handleEvent = (event: DeviceOrientationEvent) => {
    if (event.beta == null || event.gamma == null) return;
    if (!this.baseline) this.baseline = { beta: event.beta, gamma: event.gamma };

    const rawBeta = event.beta - this.baseline.beta;
    const rawGamma = event.gamma - this.baseline.gamma;
    this.tilt = {
      beta: clamp(this.tilt.beta + (rawBeta - this.tilt.beta) * SMOOTHING, MAX_ANGLE),
      gamma: clamp(this.tilt.gamma + (rawGamma - this.tilt.gamma) * SMOOTHING, MAX_ANGLE),
    };
    if (!this.enabled) {
      this.enabled = true;
      this.emitStatus();
    }
    this.tiltListeners.forEach((fn) => fn());
  };

  private emitStatus() {
    this.statusListeners.forEach((fn) => fn());
  }
}

export const deviceTiltStore = new DeviceTiltStore();
