import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const CATEGORY_TABS = [
  { id: "all", label: "All", icon: "globe" },
  { id: "fine_dine", label: "Fine Dine", icon: "coffee" },
  { id: "party", label: "Party", icon: "music" },
  { id: "relax", label: "Relax", icon: "sun" },
  { id: "cultural", label: "Cultural", icon: "book-open" },
  { id: "quick_turn", label: "Quick Turn", icon: "zap" },
  { id: "birthday", label: "Birthday", icon: "gift" },
  { id: "guided", label: "Guided", icon: "compass" },
  { id: "unguided", label: "Unguided", icon: "map" },
];

function fmtRange(a: string, b: string) {
  const o = { month: "short", day: "numeric" } as const;
  return `${new Date(a).toLocaleDateString(undefined, o)} – ${new Date(b).toLocaleDateString(undefined, o)}`;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | string>("all");
  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [pub, mine] = await Promise.all([
        api.get("/trips/public"),
        api.get("/trips"),
      ]);
      setPublicTrips(pub.data);
      setMyTrips(mine.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = tab === "all" ? publicTrips : publicTrips.filter((t: any) => (t.tags || []).includes(tab));
  const isAdmin = (user as any)?.role === "admin";

  const joinPublic = async (id: string) => {
    try {
      await api.post(`/trips/${id}/join-public`);
      router.push(`/trip/${id}`);
    } catch (e) {
      Alert.alert("Cannot join", formatApiError(e));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hi, {user?.name?.split(" ")[0] || "Traveler"}</Text>
            <Text style={s.title}>Find your next adventure.</Text>
          </View>
        </View>

        <View style={s.quickRow}>
          <TouchableOpacity
            testID="private-trips-btn"
            style={[s.quickBtn, { backgroundColor: theme.colors.secondary }]}
            onPress={() => router.push("/private-trips")}
          >
            <Feather name="lock" size={16} color="#fff" />
            <Text style={s.quickBtnText}>Private Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="birthday-planner-btn"
            style={[s.quickBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/birthday-request")}
          >
            <Feather name="gift" size={16} color="#fff" />
            <Text style={s.quickBtnText}>Birthday Trip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 20 }}
        >
          {CATEGORY_TABS.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setTab(c.id)}
              style={[s.chip, tab === c.id && s.chipActive]}
              testID={`cat-tab-${c.id}`}
            >
              <Feather name={c.icon as any} size={13} color={tab === c.id ? "#fff" : theme.colors.secondary} />
              <Text style={[s.chipText, tab === c.id && { color: "#fff" }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>TRAVEL&apos;D TRIPS</Text>
          <Text style={s.count}>{filtered.length}</Text>
        </View>

        {loading && filtered.length === 0 ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : null}

        {!loading && filtered.length === 0 ? (
          <View style={s.empty}>
            <Feather name="compass" size={36} color={theme.colors.textMuted} />
            <Text style={s.emptyTitle}>No trips in this category yet</Text>
            <Text style={s.emptySub}>
              {isAdmin ? "Post your first trip from the Trips tab." : "Check back soon!"}
            </Text>
          </View>
        ) : null}

        {filtered.map((t: any) => (
          <PublicTripCard key={t.id} trip={t} onView={() => router.push(`/trip/${t.id}`)} onJoin={() => joinPublic(t.id)} />
        ))}

        {myTrips.length > 0 ? (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>YOUR TRIPS</Text>
              <Text style={s.count}>{myTrips.length}</Text>
            </View>
            {myTrips.map((t: any) => (
              <TouchableOpacity key={t.id} onPress={() => router.push(`/trip/${t.id}`)} style={s.myRow}>
                <ImageBackground
                  source={{ uri: t.cover_url || IMAGES.amalfi }}
                  style={s.myRowImg}
                  imageStyle={{ borderRadius: 14 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{t.name}</Text>
                  <Text style={s.rowDest}>{t.destination}</Text>
                  <Text style={s.rowDates}>{fmtRange(t.start_date, t.end_date)}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PublicTripCard({ trip, onView, onJoin }: { trip: any; onView: () => void; onJoin: () => void }) {
  const progress = trip.pool_goal > 0 ? Math.min(1, trip.total_raised / trip.pool_goal) : 0;
  const spotsLeft = (trip.max_members || 15) - (trip.members_detail?.length || 0);
  const full = spotsLeft <= 0;
  return (
    <TouchableOpacity onPress={onView} activeOpacity={0.9} style={s.heroWrap}>
      <ImageBackground
        source={{ uri: trip.cover_url || IMAGES.tropical }}
        style={s.hero}
        imageStyle={{ borderRadius: 24 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
        />
        <View style={s.heroTopRow}>
          {trip.guided ? (
            <View style={s.guidedTag}>
              <Feather name="compass" size={10} color="#fff" />
              <Text style={s.guidedTagText}>GUIDED BY FOUNDER</Text>
            </View>
          ) : null}
          <View style={s.spotsTag}>
            <Text style={[s.spotsText, full && { color: "#FFB3A0" }]}>
              {full ? "FULL" : `${spotsLeft} spots left`}
            </Text>
          </View>
        </View>
        <View style={s.heroInner}>
          <Text style={s.heroDest}>{trip.destination}</Text>
          <Text style={s.heroName}>{trip.name}</Text>
          <Text style={s.heroDates}>{fmtRange(trip.start_date, trip.end_date)}</Text>
          {trip.solo_price > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <Text style={s.heroSoloStrike}>${trip.solo_price.toFixed(0)}</Text>
              <Text style={s.heroShare}>${(trip.share_per_person || 0).toFixed(0)} / person</Text>
            </View>
          ) : null}
          {trip.pool_goal > 0 ? (
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          ) : null}
          <TouchableOpacity
            testID={`join-public-${trip.id}`}
            onPress={onJoin}
            disabled={full}
            style={[s.joinBtn, full && { opacity: 0.4 }]}
          >
            <Text style={s.joinBtnText}>{full ? "Trip Full" : "Join This Trip"}</Text>
            <Feather name="arrow-right" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  greeting: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "600" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24, marginTop: 16 },
  quickBtn: { flex: 1, paddingVertical: 13, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  quickBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chip: { flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: "700", color: theme.colors.secondary },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginTop: 28, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.textMuted },
  count: { fontSize: 12, color: theme.colors.primary, fontWeight: "700" },
  heroWrap: { paddingHorizontal: 24, marginBottom: 16 },
  hero: { height: 320, borderRadius: 24, overflow: "hidden" },
  heroTopRow: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  guidedTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(224,109,83,0.9)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9999 },
  guidedTagText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  spotsTag: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  spotsText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  heroInner: { padding: 20, gap: 2, marginTop: "auto" },
  heroDest: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  heroName: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  heroDates: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  heroSoloStrike: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "700", textDecorationLine: "line-through" },
  heroShare: { color: "#fff", fontSize: 18, fontWeight: "800" },
  progressBg: { height: 5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 9999, marginTop: 10, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  joinBtn: { marginTop: 14, backgroundColor: "#fff", paddingVertical: 12, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  joinBtnText: { color: theme.colors.primary, fontWeight: "800", fontSize: 14 },
  empty: { padding: 40, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" },
  myRow: { marginHorizontal: 24, marginBottom: 12, padding: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  myRowImg: { width: 56, height: 56, borderRadius: 14 },
  rowName: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  rowDest: { fontSize: 12, color: theme.colors.primary, fontWeight: "600", marginTop: 2 },
  rowDates: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
