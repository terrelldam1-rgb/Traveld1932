import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api, formatApiError } from "../src/api";
import { theme } from "../src/theme";

const VIBES = ["Solo", "Family", "Friends"];

export default function BirthdayRequest() {
  const router = useRouter();
  const [personName, setPersonName] = useState("");
  const [date, setDate] = useState("");
  const [vibe, setVibe] = useState("Friends");
  const [groupSize, setGroupSize] = useState("4");
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!personName) return setErr("Whose birthday is it?");
    if (!date) return setErr("Pick a birthday date");
    setBusy(true);
    try {
      await api.post("/inbox/birthday-request", {
        person_name: personName.trim(),
        birthday_date: date,
        destination_ideas: destination.trim() || null,
        group_size: parseInt(groupSize) || 1,
        vibe: vibe.toLowerCase(),
        budget: parseFloat(budget) || null,
        notes: notes.trim() || null,
      });
      Alert.alert("Request sent!", "The founder will craft a tailored birthday trip and reach out soon.");
      router.back();
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
            <Feather name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Birthday Planner</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <Feather name="gift" size={28} color={theme.colors.primary} />
            <Text style={s.heroText}>
              Tell us about the birthday — the founder will custom-design a trip for you.
            </Text>
          </View>

          <Text style={s.label}>Whose birthday?</Text>
          <TextInput testID="bd-person" value={personName} onChangeText={setPersonName} placeholder="Your name or a loved one" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Birthday date (YYYY-MM-DD)</Text>
          <TextInput testID="bd-date" value={date} onChangeText={setDate} placeholder="2026-09-15" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Vibe</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {VIBES.map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVibe(v)}
                style={[s.chip, vibe === v && s.chipSel]}
                testID={`bd-vibe-${v.toLowerCase()}`}
              >
                <Text style={[s.chipText, vibe === v && { color: "#fff" }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Group size</Text>
          <TextInput testID="bd-size" value={groupSize} onChangeText={setGroupSize} keyboardType="numeric" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Destination ideas (optional)</Text>
          <TextInput testID="bd-destination" value={destination} onChangeText={setDestination} placeholder="Tulum or Amalfi Coast" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Approx budget per person (USD, optional)</Text>
          <TextInput testID="bd-budget" value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="1500" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Notes (dietary, activities, vibe...)</Text>
          <TextInput
            testID="bd-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Wine tasting, no red-eye flights, wants a spa day..."
            style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
            multiline
            placeholderTextColor={theme.colors.textMuted}
          />

          {err ? <Text style={s.err}>{err}</Text> : null}

          <TouchableOpacity
            testID="bd-submit"
            style={[s.primary, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Request My Trip</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  hero: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: theme.colors.surfaceHighlight, padding: 16, borderRadius: 20, marginBottom: 8 },
  heroText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.textMuted, marginTop: 10 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, fontSize: 15, color: theme.colors.text },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  chipSel: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontWeight: "700", color: theme.colors.text },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 20 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
