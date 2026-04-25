import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { formatApiError } from "../../src/api";
import { useAuth } from "../../src/auth";
import { theme } from "../../src/theme";

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.back} testID="back-btn">
            <Feather name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Start your journey</Text>
          <Text style={s.sub}>Create an account to host trips & invite friends.</Text>

          <Text style={s.label}>Your name</Text>
          <TextInput
            testID="register-name"
            value={name}
            onChangeText={setName}
            placeholder="Jane Traveler"
            placeholderTextColor={theme.colors.textMuted}
            style={s.input}
          />
          <Text style={s.label}>Email</Text>
          <TextInput
            testID="register-email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@travel.com"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.input}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            testID="register-password"
            value={password}
            onChangeText={setPassword}
            placeholder="6+ characters"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={s.input}
          />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <TouchableOpacity
            testID="register-submit-button"
            style={[s.primary, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Create Account</Text>}
          </TouchableOpacity>
          <View style={s.bottomRow}>
            <Text style={s.muted}>Already have an account? </Text>
            <Link href="/(auth)/login" style={s.link}>
              Sign In
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, gap: 12 },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: theme.colors.text, letterSpacing: -1, marginTop: 8 },
  sub: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, color: theme.colors.textMuted, marginTop: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bottomRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  muted: { color: theme.colors.textMuted, fontSize: 14 },
  link: { color: theme.colors.primary, fontWeight: "700", fontSize: 14 },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
});
