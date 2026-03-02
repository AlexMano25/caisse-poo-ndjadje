import { Alert, Platform } from 'react-native';

/**
 * Web-safe alert (information only, no callback).
 * Uses window.alert() on web, Alert.alert() on mobile.
 */
export function webSafeInfo(title, message) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message || '');
  }
}

/**
 * Web-safe confirm dialog with callback.
 * Uses window.confirm() on web, Alert.alert() with buttons on mobile.
 * Returns void – executes onConfirm() if user confirms.
 */
export function webSafeAlert(title, message, onConfirm, onCancel) {
  if (Platform.OS === 'web') {
    const ok = window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok && onConfirm) onConfirm();
    if (!ok && onCancel) onCancel();
  } else {
    const buttons = [
      { text: 'Annuler', style: 'cancel', onPress: onCancel || undefined },
      { text: 'Confirmer', onPress: onConfirm || undefined },
    ];
    Alert.alert(title, message || '', buttons);
  }
}
