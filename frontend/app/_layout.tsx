import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9F7F3" } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="trip/create" options={{ presentation: "modal" }} />
            <Stack.Screen name="trip/join" options={{ presentation: "modal" }} />
            <Stack.Screen name="trip/[id]/invite" options={{ presentation: "modal" }} />
            <Stack.Screen name="flight/add" options={{ presentation: "modal" }} />
            <Stack.Screen name="contribute/[tripId]" options={{ presentation: "modal" }} />
            <Stack.Screen name="payment-return" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
