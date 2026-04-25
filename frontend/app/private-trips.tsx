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

export default function PrivateTrips() {
  const router = useRouter();
  const [mode, setMode] = useState<"have_code" | "request">("have_code");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitCode = async () => {
    setErr("");
    if (!code) return setErr("Enter a code");
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

  const submitRequest = async () => {
    setErr("");
    setBusy(true);
    try {
      await api.post("/inbox/request-code", { message: message.trim() });
      Alert.alert("Request sent!", "The founder will review and get back to you soon.");
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
          <Text style={s.title}>Private Trips</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.segment}>
          <TouchableOpacity
            onPress={() => setMode("have_code")}
            style={[s.segItem, mode === "have_code" && s.segActive]}
            testID="private-have-code"
          >
            <Text style={[s.segText, mode === "have_code" && s.segTextActive]}>I HAVE A CODE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("request")}
            style={[s.segItem, mode === "request" && s.segActive]}
            testID="private-request-code"
          >
            <Text style={[s.segText, mode === "request" && s.segTextActive]}>REQUEST ACCESS</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
          {mode === "have_code" ? (
            <>
              <Text style={s.headline}>Enter your invite code</Text>
              <Text style={s.sub}>Got a 6-character code from the host? Paste it below.</Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder="ABC123"
                autoCapitalize="characters"
                style={s.codeInput}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={10}
                testID="private-code-input"
              />
              {err ? <Text style={s.err}>{err}</Text> : null}
              <TouchableOpacity
                style={[s.primary, busy && { opacity: 0.7 }]}
                onPress={submitCode}
                disabled={busy}
                testID="private-submit-code"
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Join Trip</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.headline}>Request a private code</Text>
              <Text style={s.sub}>
                Send a request to the founder. You&apos;ll be notified in the app when approved.
              </Text>
              <Text style={s.label}>Message (optional)</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="e.g. Group of 4 friends looking for a July trip..."
                style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={theme.colors.textMuted}
                testID="private-request-message"
              />
              {err ? <Text style={s.err}>{err}</Text> : null}
              <TouchableOpacity
                style={[s.primary, busy && { opacity: 0.7 }]}
                onPress={submitRequest}
                disabled={busy}
                testID="private-request-submit"
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Send Request</Text>}
              </TouchableOpacity>
            </>
          )}
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
  segment: { flexDirection: "row", marginHorizontal: 24, marginTop: 16, backgroundColor: theme.colors.surfaceMuted, borderRadius: 9999, padding: 4 },
  segItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9999 },
  segActive: { backgroundColor: "#fff" },
  segText: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1.2 },
  segTextActive: { color: theme.colors.text },
  headline: { fontSize: 24, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.5 },
  sub: { color: theme.colors.textMuted, fontSize: 14 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.textMuted, marginTop: 8 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, fontSize: 15, color: theme.colors.text },
  codeInput: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 20, fontSize: 28, color: theme.colors.primary, fontWeight: "800", letterSpacing: 6, textAlign: "center" },
  err: { color: "#B03A2E", fontSize: 13 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
