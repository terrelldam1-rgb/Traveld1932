import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { useAuth } from "../../src/auth";
import { IMAGES, theme } from "../../src/theme";

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_url?: string;
  host_id: string;
  pool_goal: number;
  total_raised: number;
  members_detail: Array<{ id: string; name: string; avatar_url?: string | null }>;
  invite_code: string;
};

function daysUntil(d: string): number {
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function fmtRange(a: string, b: string) {
  const o = { month: "short", day: "numeric" } as const;
  return `${new Date(a).toLocaleDateString(undefined, o)} – ${new Date(b).toLocaleDateString(undefined, o)}`;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/trips");
      setTrips(data);
      setErr("");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = Date.now();
  const upcoming = trips
    .filter((t) => new Date(t.end_date).getTime() >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const past = trips.filter((t) => new Date(t.end_date).getTime() < now);
  const next = upcoming[0];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hi, {user?.name?.split(" ")[0] || "Traveler"}</Text>
            <Text style={s.title}>Let’s plan something unforgettable.</Text>
          </View>
        </View>

        <View style={s.quickRow}>
          <TouchableOpacity
            testID="create-trip-button"
            style={[s.quickBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/trip/create")}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={s.quickBtnText}>Host a Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="join-trip-button"
            style={[s.quickBtn, { backgroundColor: theme.colors.secondary }]}
            onPress={() => router.push("/trip/join")}
          >
            <Feather name="users" size={18} color="#fff" />
            <Text style={s.quickBtnText}>Join with Code</Text>
          </TouchableOpacity>
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}

        {loading && trips.length === 0 ? (
          <View style={{ padding: 48 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {next ? (
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>NEXT UP</Text>
            <Text style={s.countdown}>
              in {Math.max(0, daysUntil(next.start_date))} days
            </Text>
          </View>
        ) : null}
        {next ? <HeroCard trip={next} onPress={() => router.push(`/trip/${next.id}`)} /> : null}

        {upcoming.length > 1 ? (
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>UPCOMING</Text>
          </View>
        ) : null}
        <FlatList
          data={upcoming.slice(1)}
          keyExtractor={(t) => t.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => router.push(`/trip/${item.id}`)} />
          )}
        />

        {past.length > 0 ? (
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>PAST TRIPS</Text>
          </View>
        ) : null}
        {past.map((t) => (
          <TripRow key={t.id} trip={t} onPress={() => router.push(`/trip/${t.id}`)} />
        ))}

        {!loading && trips.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No trips yet</Text>
            <Text style={s.emptySub}>
              Host your first trip or join one with an invite code.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const progress = trip.pool_goal > 0 ? Math.min(1, trip.total_raised / trip.pool_goal) : 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.heroWrap}>
      <ImageBackground
        source={{ uri: trip.cover_url || IMAGES.tropical }}
        style={s.hero}
        imageStyle={{ borderRadius: 24 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
        />
        <View style={s.heroInner}>
          <Text style={s.heroDest}>{trip.destination}</Text>
          <Text style={s.heroName}>{trip.name}</Text>
          <Text style={s.heroDates}>{fmtRange(trip.start_date, trip.end_date)}</Text>
          {trip.pool_goal > 0 ? (
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          ) : null}
          {trip.pool_goal > 0 ? (
            <Text style={s.heroPool}>
              ${trip.total_raised.toFixed(0)} of ${trip.pool_goal.toFixed(0)} pooled
            </Text>
          ) : null}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.card}>
      <ImageBackground
        source={{ uri: trip.cover_url || IMAGES.mountains }}
        style={s.cardImg}
        imageStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)"]}
          style={{ ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        />
      </ImageBackground>
      <View style={s.cardBody}>
        <Text numberOfLines={1} style={s.cardName}>
          {trip.name}
        </Text>
        <Text style={s.cardDest}>{trip.destination}</Text>
        <Text style={s.cardDates}>{fmtRange(trip.start_date, trip.end_date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TripRow({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.row}>
      <ImageBackground
        source={{ uri: trip.cover_url || IMAGES.amalfi }}
        style={s.rowImg}
        imageStyle={{ borderRadius: 16 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{trip.name}</Text>
        <Text style={s.rowDest}>{trip.destination}</Text>
        <Text style={s.rowDates}>{fmtRange(trip.start_date, trip.end_date)}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  greeting: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "600" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24, marginTop: 20 },
  quickBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.textMuted },
  countdown: { fontSize: 12, color: theme.colors.primary, fontWeight: "700" },
  heroWrap: { paddingHorizontal: 24 },
  hero: { height: 260, borderRadius: 24, overflow: "hidden", justifyContent: "flex-end" },
  heroInner: { padding: 20 },
  heroDest: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  heroName: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  heroDates: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  progressBg: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 9999, marginTop: 12, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  heroPool: { color: "#fff", fontSize: 12, marginTop: 6, fontWeight: "600" },
  card: {
    width: 240,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  cardImg: { height: 140 },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  cardDest: { fontSize: 13, color: theme.colors.primary, fontWeight: "600", marginTop: 2 },
  cardDates: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  row: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowImg: { width: 64, height: 64, borderRadius: 16 },
  rowName: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  rowDest: { fontSize: 12, color: theme.colors.primary, fontWeight: "600", marginTop: 2 },
  rowDates: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  empty: { padding: 40, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" },
  err: { color: "#B03A2E", paddingHorizontal: 24, marginTop: 8 },
});
