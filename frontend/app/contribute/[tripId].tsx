import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatApiError, origin } from "../../src/api";
import { theme } from "../../src/theme";

const CATS = [
  { id: "flight", label: "Flight", icon: "send" },
  { id: "hotel", label: "Hotel", icon: "home" },
  { id: "transportation", label: "Transport", icon: "truck" },
  { id: "activities", label: "Activities", icon: "star" },
  { id: "general", label: "General", icon: "dollar-sign" },
] as const;

type Pkg = { id: string; amount: number };

export default function Contribute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pkg, setPkg] = useState<string>("");
  const [cat, setCat] = useState<string>("general");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api.get("/payments/packages").then(({ data }) => {
      setPackages(data);
      if (data[1]) setPkg(data[1].id);
    });
  }, []);

  const pay = async () => {
    setErr("");
    if (!pkg) return setErr("Choose an amount");
    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        trip_id: tripId,
        package_id: pkg,
        category: cat,
        origin_url: origin,
      });
      const result = await WebBrowser.openBrowserAsync(data.url, { dismissButtonStyle: "close" });
      // User dismissed or completed. Start polling:
      await pollStatus(data.session_id);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const pollStatus = async (sessionId: string) => {
    for (let i = 0; i < 8; i++) {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          Alert.alert("Success", "Contribution added to the pool!");
          router.back();
          return;
        }
        if (data.status === "expired") {
          Alert.alert("Canceled", "Payment session expired.");
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2500));
    }
    Alert.alert("Pending", "Payment still processing. We’ll update once confirmed.");
    router.back();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Feather name="x" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Contribute</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Text style={s.headline}>How much will you pitch in?</Text>
        <View style={s.grid}>
          {packages.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPkg(p.id)}
              style={[s.pkgCard, pkg === p.id && s.pkgCardSel]}
              testID={`pkg-${p.id}`}
            >
              <Text style={[s.pkgAmt, pkg === p.id && { color: "#fff" }]}>${p.amount.toFixed(0)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>APPLY TO CATEGORY</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATS.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCat(c.id)}
              style={[s.catChip, cat === c.id && s.catChipSel]}
              testID={`cat-${c.id}`}
            >
              <Feather name={c.icon as any} size={14} color={cat === c.id ? "#fff" : theme.colors.secondary} />
              <Text style={[s.catText, cat === c.id && { color: "#fff" }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}

        <TouchableOpacity
          testID="pay-btn"
          style={[s.primary, busy && { opacity: 0.7 }]}
          onPress={pay}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="lock" size={16} color="#fff" />
              <Text style={s.primaryText}>Pay tier with Stripe</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="pay-full-btn"
          style={s.secondary}
          onPress={async () => {
            try {
              setBusy(true);
              const { data } = await api.post("/payments/checkout-full", {
                trip_id: tripId,
                origin_url: origin,
              });
              const WB = await import("expo-web-browser");
              await WB.openBrowserAsync(data.url, { dismissButtonStyle: "close" });
              await pollStatus(data.session_id);
            } catch (e) {
              setErr(formatApiError(e));
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        >
          <Feather name="credit-card" size={16} color={theme.colors.primary} />
          <Text style={s.secondaryText}>Pay full trip price</Text>
        </TouchableOpacity>
        <Text style={s.note}>Test mode. Use Stripe test card 4242 4242 4242 4242.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  headline: { fontSize: 24, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  pkgCard: { width: "31%", paddingVertical: 24, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  pkgCardSel: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pkgAmt: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.textMuted },
  catChip: { flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: theme.colors.surfaceMuted },
  catChipSel: { backgroundColor: theme.colors.secondary },
  catText: { color: theme.colors.secondary, fontWeight: "700", fontSize: 13 },
  err: { color: "#B03A2E", fontSize: 13 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondary: { paddingVertical: 16, borderRadius: 9999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10, borderWidth: 2, borderColor: theme.colors.primary, backgroundColor: "#fff" },
  secondaryText: { color: theme.colors.primary, fontWeight: "700", fontSize: 15 },
  note: { fontSize: 12, color: theme.colors.textMuted, textAlign: "center" },
});
