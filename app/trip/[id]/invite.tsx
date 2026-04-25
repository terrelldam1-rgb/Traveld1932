import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError, origin } from "../../../src/api";
import { theme } from "../../../src/theme";

export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${id}`);
      setTrip(data);
    } catch (e) {
      setErr(formatApiError(e));
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const code = trip?.invite_code || "------";
  const link = `${origin}/trip/join?code=${code}`;

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied!", "Invite code copied to clipboard.");
  };

  const share = async () => {
    try {
      await Share.share({
        message: `Join my trip "${trip?.name}" on Travel'D. Use invite code ${code} or open: ${link}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="x" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Invite Travelers</Text>
        <View style={{ width: 44 }} />
      </View>
      {err ? <Text style={{ color: "#B03A2E", padding: 24 }}>{err}</Text> : null}
      <View style={s.ticket}>
        <Text style={s.label}>YOUR TRIP CODE</Text>
        <Text style={s.code}>{code}</Text>
        <Text style={s.sub}>Share this code and friends can jump right in.</Text>
        <View style={s.btnRow}>
          <TouchableOpacity onPress={copy} style={s.copyBtn} testID="copy-invite-btn">
            <Feather name="copy" size={16} color={theme.colors.secondary} />
            <Text style={s.copyBtnText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={share} style={s.shareBtn} testID="share-invite-btn">
            <Feather name="share-2" size={16} color="#fff" />
            <Text style={s.shareBtnText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
      {trip?.members_detail?.length ? (
        <View style={{ padding: 24 }}>
          <Text style={s.joinedLabel}>ALREADY JOINED · {trip.members_detail.length}</Text>
          <View style={s.avatarRow}>
            {trip.members_detail.slice(0, 8).map((m: any, i: number) => (
              <View key={m.id} style={[s.ava, { marginLeft: i === 0 ? 0 : -10 }]}>
                <Text style={s.avaText}>{(m.name?.[0] || "?").toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", padding: 20, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  ticket: { margin: 24, backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, padding: 32, alignItems: "center" },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.textMuted },
  code: { fontSize: 56, fontWeight: "800", letterSpacing: 6, color: theme.colors.primary, marginTop: 8, fontVariant: ["tabular-nums"] },
  sub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 12, textAlign: "center" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  copyBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 14, paddingHorizontal: 22, borderRadius: 9999, backgroundColor: theme.colors.surfaceMuted },
  copyBtnText: { color: theme.colors.secondary, fontWeight: "700" },
  shareBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 14, paddingHorizontal: 22, borderRadius: 9999, backgroundColor: theme.colors.secondary },
  shareBtnText: { color: "#fff", fontWeight: "700" },
  joinedLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.textMuted, marginBottom: 12 },
  avatarRow: { flexDirection: "row" },
  ava: { width: 40, height: 40, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.bg },
  avaText: { color: "#fff", fontWeight: "800" },
});
