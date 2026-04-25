import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { getCarrierActions } from "../../src/carriers";
import { theme } from "../../src/theme";

const TYPE_META: Record<string, { icon: string; label: string; a: string; b: string }> = {
  flight: { icon: "send", label: "Flight", a: "Departure airport", b: "Arrival airport" },
  train: { icon: "git-commit", label: "Train", a: "From station", b: "To station" },
  bus: { icon: "truck", label: "Bus", a: "From", b: "To" },
  ferry: { icon: "anchor", label: "Ferry", a: "Port of departure", b: "Port of arrival" },
  car: { icon: "navigation", label: "Car Rental", a: "Pickup", b: "Return" },
  shuttle: { icon: "users", label: "Shuttle", a: "Pickup", b: "Drop-off" },
  rideshare: { icon: "smartphone", label: "Rideshare", a: "Pickup", b: "Drop-off" },
  other: { icon: "more-horizontal", label: "Other", a: "Origin", b: "Destination" },
};

function fmt(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function hoursUntil(dt?: string) {
  if (!dt) return 0;
  try {
    return Math.round((new Date(dt).getTime() - Date.now()) / (1000 * 60 * 60));
  } catch {
    return 0;
  }
}

export default function TransportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/flights/${id}`);
      setItem(data);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open link");
    }
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  const shareTicket = async () => {
    if (!item) return;
    const msg = `${item.airline} ${item.flight_number}\n${item.departure_airport} → ${item.arrival_airport}\nDepart: ${fmt(item.departure_time)}\nArrive: ${fmt(item.arrival_time)}${item.confirmation_number ? `\nConf #: ${item.confirmation_number}` : ""}${item.seat ? `\nSeat: ${item.seat}` : ""}`;
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const remove = () => {
    Alert.alert("Delete transport?", "This removes the record (no refund).", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/flights/${id}`);
            router.back();
          } catch (e) {
            Alert.alert("Error", formatApiError(e));
          }
        },
      },
    ]);
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const tType = item.transport_type || "flight";
  const meta = TYPE_META[tType] || TYPE_META.other;
  const carrier = getCarrierActions(tType, item.airline, item.flight_number);
  const h = hoursUntil(item.departure_time);
  const inCheckinWindow = tType === "flight" && h > 0 && h <= 24;
  const past = h < 0;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Ticket</Text>
        <TouchableOpacity onPress={shareTicket} style={s.iconBtn} testID="share-ticket">
          <Feather name="share-2" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 80 }}>
        {/* Type badge + status */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={s.typeBadge}>
            <Feather name={meta.icon as any} size={14} color={theme.colors.primary} />
            <Text style={s.typeBadgeText}>{meta.label.toUpperCase()}</Text>
          </View>
          {inCheckinWindow ? (
            <View style={[s.statusPill, { backgroundColor: theme.colors.primary }]}>
              <Feather name="bell" size={12} color="#fff" />
              <Text style={[s.statusText, { color: "#fff" }]}>CHECK IN NOW</Text>
            </View>
          ) : past ? (
            <View style={[s.statusPill, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[s.statusText, { color: theme.colors.textMuted }]}>COMPLETED</Text>
            </View>
          ) : h > 0 ? (
            <View style={[s.statusPill, { backgroundColor: theme.colors.surfaceHighlight }]}>
              <Feather name="clock" size={12} color={theme.colors.primary} />
              <Text style={[s.statusText, { color: theme.colors.primary }]}>
                {h < 24 ? `In ${h}h` : `In ${Math.round(h / 24)}d`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Hero — boarding-pass style */}
        <View style={s.hero}>
          <Text style={s.heroAirline}>{item.airline}</Text>
          <Text style={s.heroFlight}>{item.flight_number}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, gap: 12 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={s.heroCode}>{item.departure_airport}</Text>
              <Text style={s.heroCityLabel}>{meta.a}</Text>
              <Text style={s.heroTime}>{fmt(item.departure_time)}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Feather name="arrow-right" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={s.heroCode}>{item.arrival_airport}</Text>
              <Text style={s.heroCityLabel}>{meta.b}</Text>
              <Text style={s.heroTime}>{fmt(item.arrival_time)}</Text>
            </View>
          </View>
        </View>

        {/* Primary actions */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => open(item.checkin_url || carrier.checkinUrl)}
            style={[s.action, { backgroundColor: theme.colors.primary }]}
            testID="action-checkin"
          >
            <Feather name="check-circle" size={16} color="#fff" />
            <Text style={[s.actionText, { color: "#fff" }]}>Check-in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => open(carrier.trackUrl)}
            style={[s.action, { backgroundColor: theme.colors.secondary }]}
            testID="action-track"
          >
            <Feather name="map-pin" size={16} color="#fff" />
            <Text style={[s.actionText, { color: "#fff" }]}>Track live</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {carrier.manageUrl ? (
            <TouchableOpacity onPress={() => open(carrier.manageUrl)} style={s.actionSub}>
              <Feather name="edit-3" size={14} color={theme.colors.primary} />
              <Text style={s.actionSubText}>Manage booking</Text>
            </TouchableOpacity>
          ) : null}
          {carrier.supportPhone ? (
            <TouchableOpacity
              onPress={() => open(`tel:${carrier.supportPhone!.replace(/[^+\d]/g, "")}`)}
              style={s.actionSub}
            >
              <Feather name="phone" size={14} color={theme.colors.primary} />
              <Text style={s.actionSubText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {carrier.website ? (
            <TouchableOpacity onPress={() => open(carrier.website)} style={s.actionSub}>
              <Feather name="globe" size={14} color={theme.colors.primary} />
              <Text style={s.actionSubText}>Website</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Ticket info grid */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Ticket info</Text>
          <InfoRow label="Confirmation #" value={item.confirmation_number} copyable onCopy={copy} />
          <InfoRow label="Booking reference" value={item.booking_reference} copyable onCopy={copy} />
          <InfoRow label="Seat" value={item.seat} />
          <InfoRow label={tType === "flight" ? "Departure terminal" : "Terminal"} value={item.terminal} />
          {item.terminal_arrival ? <InfoRow label="Arrival terminal" value={item.terminal_arrival} /> : null}
          <InfoRow label="Gate" value={item.gate} />
          <InfoRow label="Baggage" value={item.baggage_info} />
          {item.notes ? <InfoRow label="Notes" value={item.notes} /> : null}
        </View>

        <TouchableOpacity onPress={remove} style={s.deleteBtn} testID="delete-ticket">
          <Feather name="trash-2" size={14} color="#B03A2E" />
          <Text style={s.deleteBtnText}>Delete transport record</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copyable?: boolean;
  onCopy?: (v: string, l: string) => void;
}) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
        <Text style={s.infoValue} numberOfLines={2}>
          {value}
        </Text>
        {copyable ? (
          <TouchableOpacity onPress={() => onCopy?.(value, label)}>
            <Feather name="copy" size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "800", color: theme.colors.primary, letterSpacing: 1.1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  hero: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroAirline: { fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1.2 },
  heroFlight: { fontSize: 26, fontWeight: "800", color: theme.colors.text, marginTop: 2 },
  heroCode: { fontSize: 22, fontWeight: "800", color: theme.colors.primary },
  heroCityLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2, letterSpacing: 0.5 },
  heroTime: { fontSize: 12, color: theme.colors.text, marginTop: 6, fontWeight: "600", textAlign: "center" },
  action: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionText: { fontSize: 14, fontWeight: "700" },
  actionSub: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionSubText: { fontSize: 12, fontWeight: "700", color: theme.colors.primary },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 13, fontWeight: "800", color: theme.colors.primary, letterSpacing: 0.5, marginBottom: 6 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "700", letterSpacing: 0.4, minWidth: 100 },
  infoValue: { fontSize: 13, color: theme.colors.text, fontWeight: "600", textAlign: "right", flexShrink: 1 },
  deleteBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FDECEA",
    marginTop: 6,
  },
  deleteBtnText: { color: "#B03A2E", fontWeight: "700", fontSize: 13 },
});
