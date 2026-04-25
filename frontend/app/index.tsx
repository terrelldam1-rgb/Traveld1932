import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/auth";
import { theme } from "../src/theme";

export default function Index() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href="/(tabs)" />;
}
