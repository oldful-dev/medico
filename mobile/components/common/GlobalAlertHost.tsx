import React, { useCallback, useEffect, useState } from 'react';
import { CustomAlertModal } from './CustomAlertModal';
import { GlobalAlertPayload, setGlobalAlertListener } from '@/utils/globalAlert';

/**
 * Renders every `Alert.alert(...)` call (routed here from app/_layout.tsx)
 * through CustomAlertModal. Alerts that arrive while one is showing are queued.
 */
export function GlobalAlertHost() {
  const [queue, setQueue] = useState<GlobalAlertPayload[]>([]);
  const current = queue[0];

  useEffect(() => {
    setGlobalAlertListener((payload) => setQueue((q) => [...q, payload]));
    return () => setGlobalAlertListener(null);
  }, []);

  const buttons = current?.buttons ?? [];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b !== cancelBtn);
  // Native convention: the last non-cancel button is the affirmative action.
  const primary = actionBtns.length ? actionBtns[actionBtns.length - 1] : undefined;
  const secondary = cancelBtn ?? (actionBtns.length > 1 ? actionBtns[0] : undefined);
  const destructive = primary?.style === 'destructive';

  const dismiss = useCallback((btn?: { onPress?: (v?: string) => void }) => {
    setQueue((q) => q.slice(1));
    if (btn?.onPress) setTimeout(() => btn.onPress?.(), 0);
  }, []);

  if (!current) return null;

  return (
    <CustomAlertModal
      visible
      title={current.title}
      message={current.message}
      iconName={destructive ? 'warning-outline' : 'information-circle-outline'}
      buttonText={primary?.text || 'OK'}
      onClose={() => dismiss(primary)}
      secondaryButtonText={secondary?.text}
      onSecondaryPress={() => dismiss(secondary)}
      secondaryDestructive={secondary?.style === 'destructive'}
    />
  );
}
