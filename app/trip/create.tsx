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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { useAuth } from "../../src/auth";
import { COVER_OPTIONS, theme } from "../../src/theme";

const CATS = ["flight", "hotel", "transportation", "activities"];

// Public categories admins can apply
const PUBLIC_CATS: { id: string; label: string; icon: string }[] = [
  { id: "fine_dine", label: "Fine Dine", icon: "coffee" },
  { id: "party", label: "Party", icon: "music" },
  { id: "relax", label: "Relax", icon: "sun" },
  { id: "cultural", label: "Cultural", icon: "book-open" },
  { id: "quick_turn", label: "Quick Turn", icon: "zap" },
  { id: "birthday", label: "Birthday", icon: "gift" },
  { id: "guided", label: "Guided", icon: "compass" },
  { id: "unguided", label: "Unguided", icon: "map" },
  { id: "adventure", label: "Adventure", icon: "wind" },
  { id: "beach", label: "Beach", icon: "umbrella" },
  { id: "city", label: "City Break", icon: "navigation-2" },
  { id: "wellness", label: "Wellness", icon: "heart" },
];

export default function CreateTrip() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Basics
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState(COVER_OPTIONS[0].url);

  // Lodging / itinerary
  const [lodging, setLodging] = useState("");
  const [itinerary, setItinerary] = useState("");

  // Pricing
  const [poolGoal, setPoolGoal] = useState("");
  const [soloPrice, setSoloPrice] = useState("");
  const [catGoals, setCatGoals] = useState<Record<string, string>>({});
  const [payFullEnabled, setPayFullEnabled] = useState(true);

  // Capacity & rules
  const [maxMembers, setMaxMembers] = useState("15");
  const [tripRules, setTripRules] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [emergencyInfo, setEmergencyInfo] = useState("");
  const [docsRequired, setDocsRequired] = useState("");

  // Admin-only
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [guided, setGuided] = useState(false);
  const [statusDraft, setStatusDraft] = useState(false);
  const [featured, setFeatured] = useState(false);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d.trim());

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async () => {
    setErr("");
    if (!name || !destination) return setErr("Name and destination are required");
    if (!valid(start) || !valid(end)) return setErr("Dates must be YYYY-MM-DD");
    if (isPublic && !isAdmin) return setErr("Only admins can publish public trips");
    setBusy(true);
    try {
      const catGoalsNum: Record<string, number> = {};
      Object.entries(catGoals).forEach(([k, v]) => {
        const n = Number(v);
        if (v && !isNaN(n) && n > 0) catGoalsNum[k] = n;
      });
      const itineraryArr = itinerary
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, i) => {
          const m = line.match(/^Day\s*(\d+)\s*[:\-—]\s*(.+)/i);
          if (m) {
            const rest = m[2];
            const parts = rest.split(/\s*[—-]\s*/);
            return {
              day: parseInt(m[1]),
              title: (parts[0] || rest).trim(),
              details: (parts.slice(1).join(" — ") || "").trim(),
            };
          }
          return { day: i + 1, title: line, details: "" };
        });

      const payload: any = {
        name: name.trim(),
        destination: destination.trim(),
        start_date: start.trim(),
        end_date: end.trim(),
        cover_url: cover,
        description: description.trim() || null,
        lodging: lodging.trim() || null,
        itinerary: itineraryArr,
        pool_goal: Number(poolGoal) || 0,
        solo_price: Number(soloPrice) || 0,
        category_goals: catGoalsNum,
        max_members: Math.max(1, Math.min(15, parseInt(maxMembers) || 15)),
        pay_full_enabled: payFullEnabled,
        is_public: isAdmin ? isPublic : false,
        tags: isAdmin ? tags : [],
        guided: isAdmin ? guided : false,
        featured: isAdmin ? featured : false,
        status: statusDraft ? "draft" : "published",
      };
      // House rules etc are stored in description via formatted block — keep server compatible.
      const extraNotes = [
        tripRules.trim() ? `RULES:\n${tripRules.trim()}` : "",
        refundPolicy.trim() ? `REFUND POLICY:\n${refundPolicy.trim()}` : "",
        emergencyInfo.trim() ? `EMERGENCY:\n${emergencyInfo.trim()}` : "",
        docsRequired.trim() ? `DOCUMENTS:\n${docsRequired.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      if (extraNotes) {
        payload.description = `${payload.description ? payload.description + "\n\n" : ""}${extraNotes}`;
      }

      const { data } = await api.post("/trips", payload);
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
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 6, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {isAdmin ? (
            <View style={s.adminBanner}>
              <Feather name="shield" size={12} color={theme.colors.primary} />
              <Text style={s.adminBannerText}>SUPER ADMIN — extra controls available</Text>
            </View>
          ) : null}

          {/* ===== Basics ===== */}
          <Text style={s.section}>Basics</Text>
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
          <Text style={s.label}>Trip description</Text>
          <TextInput
            testID="trip-description"
            placeholder="Tell travelers what makes this trip special — vibe, highlights, who it's for…"
            value={description}
            onChangeText={setDescription}
            multiline
            style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
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
              <TouchableOpacity
                onPress={() => setCover(item.url)}
                style={[s.coverOpt, cover === item.url && s.coverSel]}
              >
                <Image source={{ uri: item.url }} style={s.coverImg} />
              </TouchableOpacity>
            )}
          />

          {/* ===== Lodging & Itinerary ===== */}
          <Text style={s.section}>Lodging & Itinerary</Text>
          <Text style={s.label}>Hotel / lodging details</Text>
          <TextInput
            testID="trip-lodging"
            placeholder="Hotel Belmar — 4 nights, ocean view rooms, breakfast included…"
            value={lodging}
            onChangeText={setLodging}
            multiline
            style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Itinerary (one line per day)</Text>
          <Text style={s.hint}>
            Format: <Text style={{ fontWeight: "700" }}>Day 1: Arrive — beach welcome dinner</Text>
          </Text>
          <TextInput
            testID="trip-itinerary"
            placeholder={"Day 1: Arrive — Welcome dinner\nDay 2: Snorkel Tour — Sunset cruise\nDay 3: Free day"}
            value={itinerary}
            onChangeText={setItinerary}
            multiline
            style={[s.input, { minHeight: 110, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* ===== Capacity & Rules ===== */}
          <Text style={s.section}>Capacity & Rules</Text>
          <Text style={s.label}>Max travelers (1–15)</Text>
          <TextInput
            testID="trip-max-members"
            value={maxMembers}
            onChangeText={setMaxMembers}
            keyboardType="numeric"
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Trip rules / code of conduct</Text>
          <TextInput
            placeholder="Be on time, respect local culture, share rides…"
            value={tripRules}
            onChangeText={setTripRules}
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Refund / cancellation policy</Text>
          <TextInput
            placeholder="Full refund 60 days out, 50% within 30 days, none within 14…"
            value={refundPolicy}
            onChangeText={setRefundPolicy}
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Emergency info / contacts</Text>
          <TextInput
            placeholder="On-trip emergency contact, local hospital, embassy info…"
            value={emergencyInfo}
            onChangeText={setEmergencyInfo}
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={s.label}>Documents / requirements</Text>
          <TextInput
            placeholder="Valid passport (6+ mo), travel insurance, vaccinations…"
            value={docsRequired}
            onChangeText={setDocsRequired}
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* ===== Pricing & Pool ===== */}
          <Text style={s.section}>Pricing & Pool</Text>
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

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Allow members to pay full upfront</Text>
              <Text style={s.toggleSub}>If off, only pool contributions are accepted.</Text>
            </View>
            <Switch
              value={payFullEnabled}
              onValueChange={setPayFullEnabled}
              trackColor={{ true: theme.colors.primary, false: "#ccc" }}
              thumbColor="#fff"
            />
          </View>

          <Text style={s.label}>Category goals (optional)</Text>
          {CATS.map((c) => (
            <View key={c} style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: 6 }}>
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

          {/* ===== Admin-only ===== */}
          {isAdmin ? (
            <>
              <Text style={s.section}>Admin · Visibility & Categories</Text>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Publish as public trip</Text>
                  <Text style={s.toggleSub}>Anyone can browse and join from the home feed.</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ true: theme.colors.primary, false: "#ccc" }}
                  thumbColor="#fff"
                  testID="toggle-public"
                />
              </View>

              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Feature this trip</Text>
                  <Text style={s.toggleSub}>Pin to the top of the public feed.</Text>
                </View>
                <Switch
                  value={featured}
                  onValueChange={setFeatured}
                  trackColor={{ true: theme.colors.accent, false: "#ccc" }}
                  thumbColor="#fff"
                />
              </View>

              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Guided trip</Text>
                  <Text style={s.toggleSub}>Includes a Travel&apos;D guide / host.</Text>
                </View>
                <Switch
                  value={guided}
                  onValueChange={setGuided}
                  trackColor={{ true: theme.colors.secondary, false: "#ccc" }}
                  thumbColor="#fff"
                />
              </View>

              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Save as draft</Text>
                  <Text style={s.toggleSub}>Won&apos;t show in public feed until published.</Text>
                </View>
                <Switch
                  value={statusDraft}
                  onValueChange={setStatusDraft}
                  trackColor={{ true: theme.colors.warning, false: "#ccc" }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={s.label}>Categories (tap to apply — multi-select)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {PUBLIC_CATS.map((c) => {
                  const on = tags.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => toggleTag(c.id)}
                      style={[s.tagChip, on && s.tagChipOn]}
                      testID={`tag-${c.id}`}
                    >
                      <Feather name={c.icon as any} size={12} color={on ? "#fff" : theme.colors.secondary} />
                      <Text style={[s.tagChipText, on && { color: "#fff" }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {tags.length > 0 ? (
                <Text style={s.hint}>Selected: {tags.join(", ")}</Text>
              ) : (
                <Text style={s.hint}>No category tags yet — tap chips above to apply.</Text>
              )}
            </>
          ) : null}

          {err ? <Text style={s.err}>{err}</Text> : null}

          <TouchableOpacity
            testID="submit-create-trip"
            style={[s.primary, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryText}>{statusDraft ? "Save Draft" : "Create Trip"}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
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
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  section: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.primary,
    marginTop: 22,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  hint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 6,
  },
  coverOpt: { borderRadius: 16, borderWidth: 3, borderColor: "transparent", marginTop: 6 },
  coverSel: { borderColor: theme.colors.primary },
  coverImg: { width: 100, height: 70, borderRadius: 12 },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  primary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 9999,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  adminBannerText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: theme.colors.primary },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  toggleSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tagChipText: { fontSize: 12, fontWeight: "700", color: theme.colors.secondary },
});
