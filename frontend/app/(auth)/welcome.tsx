import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IMAGES, theme } from "../../src/theme";

export default function Welcome() {
  const router = useRouter();
  return (
    <ImageBackground source={{ uri: IMAGES.heroOnboarding }} style={{ flex: 1 }} resizeMode="cover">
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.topRow}>
          <View style={s.badge}>
            <Feather name="compass" size={14} color={theme.colors.primary} />
            <Text style={s.badgeText}>TRIPHOST</Text>
          </View>
        </View>
        <View style={s.bottom}>
          <Text style={s.headline}>Travel together,{"\n"}effortlessly.</Text>
          <Text style={s.sub}>
            Host trips, split the pool, track flights — bring everyone along for the ride.
          </Text>
          <TouchableOpacity
            testID="get-started-btn"
            style={s.primary}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={s.primaryText}>Get Started</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="have-account-btn"
            style={s.ghost}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={s.ghostText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  topRow: { paddingTop: 16, flexDirection: "row" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 9999,
  },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.text },
  bottom: { paddingBottom: 16, gap: 16 },
  headline: { color: "#fff", fontSize: 42, fontWeight: "800", letterSpacing: -1.5, lineHeight: 46 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 22 },
  primary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ghost: { alignItems: "center", paddingVertical: 12 },
  ghostText: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 14 },
});
