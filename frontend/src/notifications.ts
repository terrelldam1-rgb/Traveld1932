import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleCheckInReminder(
  flightId: string,
  airline: string,
  flightNumber: string,
  departureISO: string,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const ok = await ensurePermission();
  if (!ok) return null;
  const depart = new Date(departureISO).getTime();
  const triggerDate = new Date(depart - 24 * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now() + 5000) return null; // too close
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to check in",
      body: `${airline} ${flightNumber} departs in 24 hours. Check in now!`,
      data: { flightId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelReminder(id?: string | null) {
  if (!id || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
