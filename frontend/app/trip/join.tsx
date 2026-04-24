import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError } from "../../src/api";
import { theme } from "../../src/theme";

export default function JoinTrip() {
  const router = useRouter();
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState((codeParam || "").toUpperCase());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (codeParam) setCode(String(codeParam).toUpperCase());
  }, [codeParam]);

  const submit = async () => {
    setErr("");
    if (!code) return setErr("Enter an invite code");
    setBusy(true);
    try {
      const { data } = await api.post("/trips/join", { invite_code: code });
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
          <Text style={s.title}>Join a Trip</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 24, gap: 16 }}>
          <Text style={s.headline}>Got an invite code?</Text>
          <Text style={s.sub}>Enter the 6-character code your host shared.</Text>
          <TextInput
            testID="join-code"
            placeholder="ABC123"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
            maxLength={10}
          />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <TouchableOpacity
            testID="submit-join"
            style={[s.primary, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Join Trip</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  headline: { fontSize: 28, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.8 },
  sub: { color: theme.colors.textMuted, fontSize: 14 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 20, fontSize: 28, color: theme.colors.primary, fontWeight: "800", letterSpacing: 6, textAlign: "center" },
  err: { color: "#B03A2E", fontSize: 13 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
