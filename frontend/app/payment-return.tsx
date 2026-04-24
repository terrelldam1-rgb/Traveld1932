import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/api";
import { theme } from "../src/theme";

export default function PaymentReturn() {
  const { session_id, canceled } = useLocalSearchParams<{ session_id?: string; canceled?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "paid" | "canceled" | "error">(
    canceled ? "canceled" : "pending"
  );

  useEffect(() => {
    if (!session_id || canceled) return;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const { data } = await api.get(`/payments/status/${session_id}`);
        if (data.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (data.status === "expired") {
          setStatus("canceled");
          return;
        }
      } catch {
        setStatus("error");
        return;
      }
      if (attempts < 8) setTimeout(poll, 2500);
      else setStatus("error");
    };
    poll();
  }, [session_id, canceled]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.box}>
        {status === "pending" && <ActivityIndicator color={theme.colors.primary} size="large" />}
        {status === "paid" && <Feather name="check-circle" size={72} color={theme.colors.success} />}
        {status === "canceled" && <Feather name="x-circle" size={72} color={theme.colors.warning} />}
        {status === "error" && <Feather name="alert-circle" size={72} color={theme.colors.primary} />}
        <Text style={s.title}>
          {status === "pending"
            ? "Confirming your payment..."
            : status === "paid"
            ? "Contribution added!"
            : status === "canceled"
            ? "Payment canceled"
            : "Still processing"}
        </Text>
        <Text style={s.sub}>
          {status === "paid" ? "The trip pool has been updated." : "You can safely return to your trip."}
        </Text>
        <TouchableOpacity style={s.primary} onPress={() => router.replace("/(tabs)")}>
          <Text style={s.primaryText}>Back to Trips</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  box: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text, textAlign: "center" },
  sub: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 9999, marginTop: 16 },
  primaryText: { color: "#fff", fontWeight: "700" },
});
