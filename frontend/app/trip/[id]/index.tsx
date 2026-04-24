import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../../src/api";
import { useAuth } from "../../../src/auth";
import { IMAGES, theme } from "../../../src/theme";

const CATEGORIES = [
  { id: "flight", label: "Flights", icon: "send" },
  { id: "hotel", label: "Hotel", icon: "home" },
  { id: "transportation", label: "Transport", icon: "truck" },
  { id: "activities", label: "Activities", icon: "star" },
];

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [tab, setTab] = useState<"pool" | "flights" | "members">("pool");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/flights`, { params: { trip_id: id } }),
      ]);
      setTrip(t.data);
      setFlights(f.data);
      setErr("");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !trip) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ padding: 24, color: theme.colors.text }}>{err || "Trip not found"}</Text>
      </SafeAreaView>
    );
  }

  const isHost = trip.host_id === user?.id;
  const progress = trip.pool_goal > 0 ? Math.min(1, trip.total_raised / trip.pool_goal) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ImageBackground source={{ uri: trip.cover_url || IMAGES.tropical }} style={s.hero}>
        <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={["top"]} style={s.heroSafe}>
          <View style={s.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="invite-share-btn"
              onPress={() => router.push(`/trip/${id}/invite`)}
              style={s.iconBtn}
            >
              <Feather name="share-2" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={s.heroBottom}>
            <Text style={s.heroDest}>{trip.destination}</Text>
            <Text style={s.heroName}>{trip.name}</Text>
            <Text style={s.heroDates}>
              {new Date(trip.start_date).toLocaleDateString()} – {new Date(trip.end_date).toLocaleDateString()}
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={s.segment}>
        {(["pool", "flights", "members"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[s.segmentItem, tab === t && s.segmentActive]}
          >
            <Text style={[s.segmentText, tab === t && s.segmentTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160, gap: 16 }}>
        {tab === "pool" && (
          <>
            <View style={s.poolCard}>
              <Text style={s.poolLabel}>TOTAL RAISED</Text>
              <Text style={s.poolAmount}>${trip.total_raised.toFixed(2)}</Text>
              {trip.pool_goal > 0 ? (
                <>
                  <View style={s.progressBg}>
                    <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={s.poolGoal}>Goal ${trip.pool_goal.toFixed(0)}</Text>
                </>
              ) : null}
            </View>

            {CATEGORIES.map((c) => {
              const raised = trip.category_raised?.[c.id] || 0;
              const goal = trip.category_goals?.[c.id] || 0;
              const p = goal > 0 ? Math.min(1, raised / goal) : 0;
              return (
                <View key={c.id} style={s.catRow}>
                  <View style={s.catIconWrap}>
                    <Feather name={c.icon as any} size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={s.catLabel}>{c.label}</Text>
                      <Text style={s.catAmt}>
                        ${raised.toFixed(0)}{goal > 0 ? ` / $${goal.toFixed(0)}` : ""}
                      </Text>
                    </View>
                    <View style={s.catBar}>
                      <View style={[s.catBarFill, { width: `${p * 100}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              testID="trip-pool-contribute-btn"
              style={s.contributeBtn}
              onPress={() => router.push(`/contribute/${id}`)}
            >
              <Feather name="dollar-sign" size={18} color="#fff" />
              <Text style={s.contributeText}>Contribute to Pool</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === "flights" && (
          <>
            <TouchableOpacity
              testID="trip-add-flight-btn"
              style={s.addFlightBtn}
              onPress={() => router.push({ pathname: "/flight/add", params: { trip_id: id } })}
            >
              <Feather name="plus" size={18} color={theme.colors.primary} />
              <Text style={s.addFlightText}>Add your flight</Text>
            </TouchableOpacity>
            {flights.length === 0 ? (
              <Text style={s.muted}>No flights yet for this trip.</Text>
            ) : (
              flights.map((f) => (
                <View key={f.id} style={s.flightCard}>
                  <Text style={s.flightAirline}>{f.airline} {f.flight_number}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <View>
                      <Text style={s.airport}>{f.departure_airport}</Text>
                      <Text style={s.muted}>{new Date(f.departure_time).toLocaleString()}</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color={theme.colors.textMuted} />
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.airport}>{f.arrival_airport}</Text>
                      <Text style={s.muted}>{new Date(f.arrival_time).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === "members" && (
          <>
            <View style={s.membersHeader}>
              <Text style={s.membersCount}>{trip.members_detail.length} traveling</Text>
              <TouchableOpacity onPress={() => router.push(`/trip/${id}/invite`)}>
                <Text style={s.inviteLink}>Invite more</Text>
              </TouchableOpacity>
            </View>
            {trip.members_detail.map((m: any) => (
              <View key={m.id} style={s.memberRow}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberInitial}>{(m.name?.[0] || "?").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>
                    {m.name} {m.role === "host" ? "· Host" : ""}
                  </Text>
                  <Text style={s.muted}>{m.email}</Text>
                </View>
                <Text style={s.memberAmt}>${m.contributed.toFixed(0)}</Text>
              </View>
            ))}
            {isHost ? (
              <TouchableOpacity
                style={[s.addFlightBtn, { marginTop: 16, borderColor: "#B03A2E" }]}
                onPress={() => {
                  api.delete(`/trips/${id}`).then(() => router.replace("/(tabs)"));
                }}
              >
                <Feather name="trash-2" size={16} color="#B03A2E" />
                <Text style={[s.addFlightText, { color: "#B03A2E" }]}>Delete trip</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  hero: { height: 280 },
  heroSafe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  heroBottom: { paddingBottom: 20 },
  heroDest: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  heroName: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  heroDates: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  segment: { flexDirection: "row", backgroundColor: theme.colors.surfaceMuted, margin: 20, borderRadius: 9999, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9999 },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1.2 },
  segmentTextActive: { color: theme.colors.text },
  poolCard: { backgroundColor: theme.colors.secondary, borderRadius: 24, padding: 24, alignItems: "center" },
  poolLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  poolAmount: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1, marginTop: 6 },
  progressBg: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 9999, marginTop: 16, width: "100%", overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  poolGoal: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 8, fontWeight: "600" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  catIconWrap: { width: 36, height: 36, borderRadius: 9999, backgroundColor: theme.colors.surfaceHighlight, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  catAmt: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" },
  catBar: { height: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: 9999, marginTop: 8, overflow: "hidden" },
  catBarFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  contributeBtn: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 },
  contributeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  addFlightBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 9999, borderWidth: 2, borderStyle: "dashed", borderColor: theme.colors.primary },
  addFlightText: { color: theme.colors.primary, fontWeight: "700" },
  flightCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  flightAirline: { fontSize: 14, fontWeight: "700", color: theme.colors.primary },
  airport: { fontSize: 20, fontWeight: "800", color: theme.colors.text, letterSpacing: 1 },
  muted: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  membersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  membersCount: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  inviteLink: { fontSize: 13, fontWeight: "700", color: theme.colors.primary },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  memberAvatar: { width: 40, height: 40, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  memberInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  memberName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  memberAmt: { fontSize: 14, fontWeight: "800", color: theme.colors.secondary },
});
