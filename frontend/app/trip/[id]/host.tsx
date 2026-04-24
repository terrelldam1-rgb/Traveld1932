import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { api, formatApiError } from "../../../src/api";
import { useAuth } from "../../../src/auth";
import { theme } from "../../../src/theme";

export default function HostDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${id}/host-summary`);
      setTrip(data);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const regenerateCode = async () => {
    Alert.alert("Regenerate code?", "The old code will stop working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Regenerate",
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await api.post(`/trips/${id}/regenerate-code`);
            await Clipboard.setStringAsync(data.invite_code);
            Alert.alert("New code", `${data.invite_code}\n\nCopied to clipboard.`);
            load();
          } catch (e) { Alert.alert("Error", formatApiError(e)); }
        },
      },
    ]);
  };

  const removeMember = (m: any) => {
    Alert.alert("Remove member?", `Remove ${m.name} from this trip?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/trips/${id}/members/${m.id}`);
            load();
          } catch (e) { Alert.alert("Error", formatApiError(e)); }
        },
      },
    ]);
  };

  const sendAnnouncement = async () => {
    const text = announcement.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.post(`/trips/${id}/announcements`, { text });
      setAnnouncement("");
      Alert.alert("Posted!", "Your announcement is pinned to the trip chat.");
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !trip) {
    return <SafeAreaView style={s.safe}><ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  const members = trip.members_detail || [];
  const totalPaidInFull = members.filter((m: any) => m.paid_in_full).length;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Feather name="arrow-left" size={22} color={theme.colors.text} /></TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={s.title}>Host Dashboard</Text>
            <Text style={s.subtitle}>{trip.name}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {/* Stats hero */}
          <View style={s.hero}>
            <Text style={s.heroLabel}>RAISED</Text>
            <Text style={s.heroAmount}>${trip.total_raised.toFixed(2)}</Text>
            <Text style={s.heroSub}>of ${trip.pool_goal.toFixed(0)} goal · {members.length}/{trip.max_members} travelers</Text>
          </View>
          <View style={s.statRow}>
            <StatBox icon="check-circle" value={totalPaidInFull} label="Paid in full" />
            <StatBox icon="clock" value={members.length - totalPaidInFull} label="Outstanding" />
          </View>

          {/* Invite code */}
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="key" size={16} color={theme.colors.primary} />
              <Text style={s.cardTitle}>Invite code</Text>
              <View style={{ flex: 1 }} />
              <Text style={s.code}>{trip.invite_code}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={async () => { await Clipboard.setStringAsync(trip.invite_code); Alert.alert("Copied"); }}
                style={s.outlineBtn}
              >
                <Feather name="copy" size={14} color={theme.colors.primary} />
                <Text style={s.outlineBtnText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={regenerateCode} style={s.outlineBtn} testID="regen-code">
                <Feather name="refresh-cw" size={14} color={theme.colors.primary} />
                <Text style={s.outlineBtnText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Announcement */}
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="radio" size={16} color={theme.colors.accent} />
              <Text style={s.cardTitle}>Send announcement</Text>
            </View>
            <TextInput
              value={announcement}
              onChangeText={setAnnouncement}
              placeholder="Heads up crew — meet in the lobby at 7pm..."
              multiline
              style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
              placeholderTextColor={theme.colors.textMuted}
              testID="announcement-input"
            />
            <TouchableOpacity onPress={sendAnnouncement} disabled={busy || !announcement.trim()} style={[s.primary, (busy || !announcement.trim()) && { opacity: 0.5 }]} testID="send-announcement">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Post to Trip Chat</Text>}
            </TouchableOpacity>
          </View>

          {/* Members */}
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Feather name="users" size={16} color={theme.colors.secondary} />
              <Text style={s.cardTitle}>Members &amp; payments</Text>
            </View>
            {members.map((m: any) => (
              <View key={m.id} style={s.memberRow}>
                <View style={s.ava}>
                  <Text style={s.avaText}>{(m.name?.[0] || "?").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Text style={s.mName}>{m.name}</Text>
                    {m.role === "host" ? <View style={s.hostTag}><Text style={s.hostTagText}>HOST</Text></View> : null}
                    {m.paid_in_full ? <Feather name="check-circle" size={14} color={theme.colors.success} /> : null}
                  </View>
                  <Text style={s.muted}>
                    ${m.contributed.toFixed(0)} of ${m.share.toFixed(0)}
                    {m.remaining > 0 ? ` · -$${m.remaining.toFixed(0)}` : ""}
                  </Text>
                </View>
                {m.role !== "host" ? (
                  <TouchableOpacity onPress={() => removeMember(m)} style={s.removeBtn} testID={`remove-member-${m.id}`}>
                    <Feather name="x" size={16} color="#B03A2E" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.push(`/trip/${id}`)} style={s.outlineBtn}>
            <Feather name="external-link" size={14} color={theme.colors.primary} />
            <Text style={s.outlineBtnText}>View trip as member</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <View style={s.statBox}>
      <Feather name={icon} size={16} color={theme.colors.primary} />
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
  subtitle: { fontSize: 12, color: theme.colors.primary, fontWeight: "700" },
  hero: { backgroundColor: theme.colors.primary, borderRadius: 24, padding: 20, alignItems: "center" },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroAmount: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  statLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.textMuted, letterSpacing: 1 },
  card: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 16, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  code: { fontSize: 20, fontWeight: "800", color: theme.colors.primary, letterSpacing: 3 },
  outlineBtn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: "#fff", flex: 1 },
  outlineBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 13 },
  input: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 14, padding: 12, fontSize: 14, color: theme.colors.text, marginTop: 4 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 9999, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  ava: { width: 36, height: 36, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avaText: { color: "#fff", fontWeight: "800" },
  mName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  hostTag: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  hostTagText: { fontSize: 9, fontWeight: "800", color: theme.colors.primary, letterSpacing: 1 },
  removeBtn: { width: 32, height: 32, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#FDECEA" },
});
