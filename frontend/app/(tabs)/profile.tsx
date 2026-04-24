import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth";
import { theme } from "../../src/theme";

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>
      <View style={s.card}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.name?.[0] || "T").toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>
      <View style={{ paddingHorizontal: 24, marginTop: 16, gap: 12 }}>
        <Row icon="bell" label="Notifications enabled" />
        <Row icon="shield" label="Your data is encrypted" />
        <Row icon="globe" label="Powered by Travel'D" />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ padding: 24, paddingBottom: 140 }}>
        <TouchableOpacity testID="logout-btn" style={s.logout} onPress={signOut}>
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={s.row}>
      <Feather name={icon} size={18} color={theme.colors.secondary} />
      <Text style={s.rowText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.8 },
  card: { marginHorizontal: 24, marginTop: 20, padding: 24, backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: theme.colors.text, marginTop: 12 },
  email: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 16, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  rowText: { fontSize: 14, color: theme.colors.text, fontWeight: "500" },
  logout: { backgroundColor: theme.colors.secondary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
