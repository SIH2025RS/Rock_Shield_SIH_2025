// @ts-nocheck
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 500, 500],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('[alertsNotifications] Failed to set Android channel', e);
    }
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[alertsNotifications] Notification permissions not granted');
    }
  } catch (e) {
    console.warn('[alertsNotifications] Failed to request permissions', e);
  }
}

export async function initAlertNotifications() {
  await ensureInitialized();
}

export async function notifyNewAlert(alert) {
  try {
    await ensureInitialized();

    const severity = String(alert?.severity || 'unknown').toUpperCase();
    const title = alert?.title || 'New RockShield alert';
    const bodySource = alert?.recommended_action || alert?.description || '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: bodySource ? `${severity}: ${bodySource}` : severity,
        data: {
          id: alert?.id ?? null,
          severity: alert?.severity ?? null,
        },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[alertsNotifications] Failed to schedule notification', e);
  }
}
