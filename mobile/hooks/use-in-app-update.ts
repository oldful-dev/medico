import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { checkAndStartUpdate } from 'expo-in-app-updates';

/**
 * Google Play In-App Updates (Android only). All UI (the immediate/flexible
 * update screen, progress, and "restart to install" prompt) is rendered
 * entirely by Play Core — nothing custom is shown here or anywhere else.
 *
 * Checks on mount and whenever the app returns to the foreground, but only
 * once per those triggers per session (the `checking` guard) — an already
 * in-flight or just-completed check is never retriggered while the promise
 * is pending. If Play Services/Play Store is unavailable, the device is
 * offline, or the check/update call itself fails, checkAndStartUpdate()
 * simply resolves false/throws and we swallow it — the app continues
 * normally either way.
 */
export function useInAppUpdate() {
  const checking = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const runCheck = () => {
      if (checking.current) return;
      checking.current = true;
      // Immediate flow when Play allows it for this update; checkAndStartUpdate
      // itself falls back to the flexible flow (still 100% Play-rendered UI)
      // when Play reports immediate isn't allowed for the pending update.
      checkAndStartUpdate(true)
        .catch(() => {
          // No network, Play Store not installed (e.g. sideloaded build),
          // or the update call failed — never block normal app usage.
        })
        .finally(() => {
          checking.current = false;
        });
    };

    runCheck();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => subscription.remove();
  }, []);
}
