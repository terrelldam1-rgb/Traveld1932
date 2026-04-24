import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { COVER_OPTIONS, theme } from "../../src/theme";

const CATS = ["flight", "hotel", "transportation", "activities"];

export default function CreateTrip() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [poolGoal, setPoolGoal] = useState("");
  const [soloPrice, setSoloPrice] = useState("");
  const [catGoals, setCatGoals] = useState<Record<string, string>>({});
  const [cover, setCover] = useState(COVER_OPTIONS[0].url);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d.trim());

  const submit = async () => {
    setErr("");
    if (!name || !destination) return setErr("Name and destination are required");
    if (!valid(start) || !valid(end)) return setErr("Dates must be YYYY-MM-DD");
    setBusy(true);
    try {
      const catGoalsNum: Record<string, number> = {};
      Object.entries(catGoals).forEach(([k, v]) => {
        const n = Number(v);
        if (v && !isNaN(n) && n > 0) catGoalsNum[k] = n;
      });
      const { data } = await api.post("/trips", {
        name: name.trim(),
        destination: destination.trim(),
        start_date: start.trim(),
        end_date: end.trim(),
        cover_url: cover,
        description: description.trim() || null,
        pool_goal: Number(poolGoal) || 0,
        solo_price: Number(soloPrice) || 0,
        category_goals: catGoalsNum,
        is_public: isAdmin ? isPublic : false,
        tags: isAdmin ? tags : [],
        max_members: Math.max(1, Math.min(15, parseInt(maxMembers) || 15)),
        guided: isAdmin ? guided : false,
      });
      router.replace(`/trip/${data.id}`);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Host a Trip</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Trip name</Text>
          <TextInput
            testID="trip-name"
            placeholder="Island Hop 2026"
            value={name}
            onChangeText={setName}
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Destination</Text>
          <TextInput
            testID="trip-destination"
            placeholder="Bali, Indonesia"
            value={destination}
            onChangeText={setDestination}
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Start (YYYY-MM-DD)</Text>
              <TextInput
                testID="trip-start"
                placeholder="2026-06-10"
                value={start}
                onChangeText={setStart}
                style={s.input}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>End (YYYY-MM-DD)</Text>
              <TextInput
                testID="trip-end"
                placeholder="2026-06-20"
                value={end}
                onChangeText={setEnd}
                style={s.input}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <Text style={s.label}>Cover</Text>
          <FlatList
            data={COVER_OPTIONS}
            horizontal
            keyExtractor={(c) => c.url}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setCover(item.url)} style={[s.coverOpt, cover === item.url && s.coverSel]}>
                <Image source={{ uri: item.url }} style={s.coverImg} />
              </TouchableOpacity>
            )}
          />

          <Text style={s.label}>Solo price (what 1 traveler would pay alone)</Text>
          <TextInput
            testID="solo-price"
            placeholder="800"
            value={soloPrice}
            onChangeText={setSoloPrice}
            keyboardType="numeric"
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={s.label}>Total group pool goal (USD)</Text>
          <TextInput
            testID="pool-goal"
            placeholder="2000"
            value={poolGoal}
            onChangeText={setPoolGoal}
            keyboardType="numeric"
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={s.label}>Category goals (optional)</Text>
          {CATS.map((c) => (
            <View key={c} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Text style={{ width: 120, color: theme.colors.text, textTransform: "capitalize" }}>{c}</Text>
              <TextInput
                placeholder="0"
                value={catGoals[c] || ""}
                onChangeText={(v) => setCatGoals((prev) => ({ ...prev, [c]: v }))}
                keyboardType="numeric"
                style={[s.input, { flex: 1 }]}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          ))}

          {err ? <Text style={s.err}>{err}</Text> : null}

          <TouchableOpacity
            testID="submit-create-trip"
            style={[s.primary, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Create Trip</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.textMuted, marginTop: 12 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, fontSize: 15, color: theme.colors.text },
  coverOpt: { borderRadius: 16, borderWidth: 3, borderColor: "transparent" },
  coverSel: { borderColor: theme.colors.primary },
  coverImg: { width: 100, height: 70, borderRadius: 12 },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 20 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  adminBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 9999, alignSelf: "flex-start" },
  adminBannerText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: theme.colors.primary },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginTop: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  toggleSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  tagChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  tagChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tagChipText: { fontSize: 12, fontWeight: "700", color: theme.colors.secondary },
});
