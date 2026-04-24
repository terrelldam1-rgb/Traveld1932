import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  ImageBackground,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { IMAGES, theme } from "../../src/theme";

export default function Trips() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Your Trips</Text>
        <TouchableOpacity
          testID="header-create-trip"
          onPress={() => router.push("/trip/create")}
          style={s.addBtn}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {err ? <Text style={s.err}>{err}</Text> : null}

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/trip/${item.id}`)}
            style={s.card}
          >
            <ImageBackground
              source={{ uri: item.cover_url || IMAGES.amalfi }}
              style={s.cardImg}
              imageStyle={{ borderRadius: 16 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardDest}>{item.destination}</Text>
              <Text style={s.cardDates}>
                {new Date(item.start_date).toLocaleDateString()} – {new Date(item.end_date).toLocaleDateString()}
              </Text>
              <View style={s.pill}>
                <Feather name="users" size={10} color={theme.colors.secondary} />
                <Text style={s.pillText}>{item.members_detail?.length || 0} members</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Feather name="map" size={40} color={theme.colors.textMuted} />
              <Text style={s.emptyTitle}>No trips yet</Text>
              <TouchableOpacity style={s.primary} onPress={() => router.push("/trip/create")}>
                <Text style={s.primaryText}>Host your first trip</Text>
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
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardImg: { width: 76, height: 76, borderRadius: 16 },
  cardName: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  cardDest: { fontSize: 13, color: theme.colors.primary, fontWeight: "600", marginTop: 2 },
  cardDates: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, alignSelf: "flex-start" },
  pillText: { fontSize: 10, fontWeight: "700", color: theme.colors.secondary },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 9999, marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700" },
  err: { color: "#B03A2E", paddingHorizontal: 24 },
});
