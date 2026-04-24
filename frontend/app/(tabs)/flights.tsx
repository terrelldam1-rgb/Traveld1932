import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { cancelReminder } from "../../src/notifications";
import { IMAGES, theme } from "../../src/theme";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hoursUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

export default function Flights() {
  const router = useRouter();
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/flights");
      setFlights(data);
      setErr("");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string, reminderId?: string) => {
    Alert.alert("Delete flight?", "This will cancel its check-in reminder.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/flights/${id}`);
            await cancelReminder(reminderId);
            load();
          } catch (e) {
            Alert.alert("Error", formatApiError(e));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Flights</Text>
        <TouchableOpacity
          testID="add-flight-btn"
          onPress={() => router.push("/flight/add")}
          style={s.addBtn}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <FlatList
        data={flights}
        keyExtractor={(f) => f.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 16 }}
        renderItem={({ item }) => {
          const h = hoursUntil(item.departure_time);
          const inWindow = h > 0 && h <= 24;
          const past = h < 0;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.airlineBadge}>
                  <Feather name="send" size={14} color={theme.colors.primary} />
                  <Text style={s.airlineText}>{item.airline}</Text>
                </View>
                <Text style={s.flightNo}>{item.flight_number}</Text>
                <TouchableOpacity onPress={() => remove(item.id, item.reminder_id)}>
                  <Feather name="trash-2" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.airport}>{item.departure_airport}</Text>
                  <Text style={s.time}>{fmtTime(item.departure_time)}</Text>
                </View>
                <Feather name="arrow-right" size={22} color={theme.colors.textMuted} />
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={s.airport}>{item.arrival_airport}</Text>
                  <Text style={s.time}>{fmtTime(item.arrival_time)}</Text>
                </View>
              </View>
              <View style={s.footer}>
                {past ? (
                  <View style={[s.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Text style={[s.badgeText, { color: theme.colors.textMuted }]}>Completed</Text>
                  </View>
                ) : inWindow ? (
                  <View style={[s.badge, { backgroundColor: theme.colors.primary }]}>
                    <Feather name="bell" size={12} color="#fff" />
                    <Text style={[s.badgeText, { color: "#fff" }]}>CHECK IN NOW</Text>
                  </View>
                ) : (
                  <View style={[s.badge, { backgroundColor: theme.colors.surfaceHighlight }]}>
                    <Feather name="clock" size={12} color={theme.colors.primary} />
                    <Text style={[s.badgeText, { color: theme.colors.primary }]}>
                      Reminder in {Math.max(0, h - 24)}h
                    </Text>
                  </View>
                )}
                {item.confirmation_number ? (
                  <Text style={s.conf}>PNR · {item.confirmation_number}</Text>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Image source={{ uri: IMAGES.flightsEmpty }} style={s.emptyImg} />
              <Text style={s.emptyTitle}>No flights saved</Text>
              <Text style={s.emptySub}>Add a flight to get a 24-hour check-in reminder.</Text>
              <TouchableOpacity style={s.primary} onPress={() => router.push("/flight/add")}>
                <Text style={s.primaryText}>Add Flight</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.8 },
  addBtn: { width: 44, height: 44, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  airlineBadge: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  airlineText: { fontSize: 12, fontWeight: "700", color: theme.colors.primary },
  flightNo: { fontSize: 18, fontWeight: "800", color: theme.colors.text, letterSpacing: 1 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  airport: { fontSize: 22, fontWeight: "800", color: theme.colors.text, letterSpacing: 1 },
  time: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border, paddingTop: 10 },
  badge: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  conf: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "600" },
  empty: { alignItems: "center", padding: 30, gap: 10 },
  emptyImg: { width: 220, height: 160, borderRadius: 20, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 9999, marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700" },
  err: { color: "#B03A2E", paddingHorizontal: 24 },
});
