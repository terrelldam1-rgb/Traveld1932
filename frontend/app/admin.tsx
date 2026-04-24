import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../src/api";
import { useAuth } from "../src/auth";
import { theme } from "../src/theme";

type Stats = {
  users: number;
  trips: number;
  flights: number;
  total_pooled_usd: number;
  paid_transactions: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"overview" | "trips" | "users">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, u] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/trips"),
        api.get("/admin/users"),
      ]);
      setStats(s.data);
      setTrips(t.data);
      setUsers(u.data);
      setErr("");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if ((user as any)?.role !== "admin") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Feather name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Admin</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
          <Feather name="lock" size={40} color={theme.colors.textMuted} />
          <Text style={s.muted}>Admin access only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.title}>Super Admin</Text>
          <Text style={s.subtitle}>Travel&apos;D Control Center</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.segment}>
        {(["overview", "trips", "users"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[s.segmentItem, tab === t && s.segmentActive]}
            testID={`admin-tab-${t}`}
          >
            <Text style={[s.segmentText, tab === t && s.segmentTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {err ? <Text style={s.err}>{err}</Text> : null}

      {tab === "overview" && (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
        >
          {loading && !stats ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : null}
          {stats ? (
            <>
              <View style={s.heroCard}>
                <Text style={s.heroLabel}>TOTAL POOLED</Text>
                <Text style={s.heroAmount}>${stats.total_pooled_usd.toFixed(2)}</Text>
                <Text style={s.heroSub}>
                  Across {stats.paid_transactions} paid contributions
                </Text>
              </View>
              <View style={s.grid}>
                <StatCard icon="users" value={stats.users} label="Travelers" />
                <StatCard icon="map" value={stats.trips} label="Trips" />
                <StatCard icon="send" value={stats.flights} label="Flights" />
                <StatCard icon="credit-card" value={stats.paid_transactions} label="Payments" />
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      {tab === "trips" && (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 12 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{item.name}</Text>
                <Text style={s.muted}>
                  {item.destination} · {item.members_detail?.length || 0} travelers
                </Text>
                <Text style={s.muted}>
                  Code {item.invite_code} ·{" "}
                  {new Date(item.start_date).toLocaleDateString()}–
                  {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.rowAmt}>${item.total_raised.toFixed(0)}</Text>
                {item.pool_goal > 0 ? (
                  <Text style={s.muted}>/${item.pool_goal.toFixed(0)}</Text>
                ) : null}
              </View>
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={s.muted}>No trips yet.</Text> : null}
        />
      )}

      {tab === "users" && (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 12 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.ava}>
                <Text style={s.avaText}>{(item.name?.[0] || "?").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Text style={s.rowTitle}>{item.name}</Text>
                  {item.role === "admin" ? (
                    <View style={s.adminTag}>
                      <Text style={s.adminTagText}>ADMIN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={s.muted}>{item.email}</Text>
                <Text style={s.muted}>
                  Joined {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={s.muted}>No users yet.</Text> : null}
        />
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statIcon}>
        <Feather name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  subtitle: { fontSize: 11, fontWeight: "700", color: theme.colors.primary, letterSpacing: 1 },
  segment: { flexDirection: "row", backgroundColor: theme.colors.surfaceMuted, margin: 20, borderRadius: 9999, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9999 },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1.2 },
  segmentTextActive: { color: theme.colors.text },
  heroCard: { backgroundColor: theme.colors.secondary, borderRadius: 24, padding: 24, alignItems: "center" },
  heroLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroAmount: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1, marginTop: 6 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "48%", backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 16, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 9999, backgroundColor: theme.colors.surfaceHighlight, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "800", color: theme.colors.text, marginTop: 6 },
  statLabel: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted, letterSpacing: 1 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  rowAmt: { fontSize: 16, fontWeight: "800", color: theme.colors.secondary },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  ava: { width: 40, height: 40, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avaText: { color: "#fff", fontWeight: "800" },
  adminTag: { backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  adminTagText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  err: { color: "#B03A2E", paddingHorizontal: 20 },
});
