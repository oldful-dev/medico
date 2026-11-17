// Bridge that lets legacy `Alert.alert(...)` calls render through the app's own
// CustomAlertModal (see components/common/GlobalAlertHost.tsx). React Native's
// native alert is intentionally disabled app-wide in app/_layout.tsx, which used
// to make every Alert.alert call silent.

export interface GlobalAlertButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GlobalAlertPayload {
  title: string;
  message: string;
  buttons?: GlobalAlertButton[];
}

type Listener = (payload: GlobalAlertPayload) => void;

let listener: Listener | null = null;
const pending: GlobalAlertPayload[] = [];

export function setGlobalAlertListener(next: Listener | null) {
  listener = next;
  if (listener) {
    while (pending.length) listener(pending.shift() as GlobalAlertPayload);
  }
}

export function showGlobalAlert(title?: string, message?: string, buttons?: GlobalAlertButton[]) {
  const payload: GlobalAlertPayload = {
    title: title ?? '',
    message: message ?? '',
    buttons,
  };
  if (listener) listener(payload);
  else pending.push(payload); // host not mounted yet — show once it is
}
