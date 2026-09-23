"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deviceTiltStore, type Tilt } from "./device-tilt";

/** Stato reattivo a bassa frequenza: supporto/permesso giroscopio + azione per richiederlo (iOS). */
export function useDeviceTiltStatus() {
  const [, setTick] = useState(0);
  useEffect(() => {
    deviceTiltStore.init();
    return deviceTiltStore.subscribeStatus(() => setTick((n) => n + 1));
  }, []);
  const requestPermission = useCallback(() => deviceTiltStore.requestPermission(), []);
  return {
    supported: deviceTiltStore.supported,
    needsPermission: deviceTiltStore.needsPermission,
    enabled: deviceTiltStore.enabled,
    requestPermission,
  };
}

/** Ref sempre aggiornata (nessun re-render) per usi imperativi ad alta frequenza, es. transform canvas. */
export function useDeviceTiltRef() {
  const ref = useRef<Tilt>(deviceTiltStore.tilt);
  useEffect(() => {
    deviceTiltStore.init();
    return deviceTiltStore.subscribeTilt(() => {
      ref.current = deviceTiltStore.tilt;
    });
  }, []);
  return ref;
}

/** Stato React throttlato, per effetti dichiarativi (es. shine olografico via CSS). */
export function useDeviceTilt(throttleMs = 70) {
  const [tilt, setTilt] = useState<Tilt | null>(null);
  const lastUpdateRef = useRef(0);
  useEffect(() => {
    deviceTiltStore.init();
    return deviceTiltStore.subscribeTilt(() => {
      const now = performance.now();
      if (now - lastUpdateRef.current > throttleMs) {
        lastUpdateRef.current = now;
        setTilt({ ...deviceTiltStore.tilt });
      }
    });
  }, [throttleMs]);
  return tilt;
}
