import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { api, formatApiError } from "../../src/api";
import { scheduleCheckInReminder } from "../../src/notifications";
import { theme } from "../../src/theme";

export default function AddFlight() {
  const router = useRouter();
  const { trip_id } = useLocalSearchParams<{ trip_id?: string }>();
  const [trips, setTrips] = useState<any[]>([]);
  const [tripId, setTripId] = useState<string | undefined>(trip_id);
  const [airline, setAirline] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [depAirport, setDepAirport] = useState("");
  const [arrAirport, setArrAirport] = useState("");
  const [depTime, setDepTime] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [pnr, setPnr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/trips").then(({ data }) => setTrips(data)).catch(() => {});
  }, []);

  const validDateTime = (v: string) => !isNaN(Date.parse(v));

  const submit = async () => {
    setErr("");
    if (!airline || !flightNo || !depAirport || !arrAirport) return setErr("Fill all required fields");
    if (!validDateTime(depTime) || !validDateTime(arrTime))
      return setErr("Use ISO datetime e.g. 2026-06-10T08:30");
    setBusy(true);
    try {
      const { data } = await api.post("/flights", {
        trip_id: tripId || null,
        airline: airline.trim(),
        flight_number: flightNo.trim().toUpperCase(),
        departure_airport: depAirport.trim().toUpperCase(),
        arrival_airport: arrAirport.trim().toUpperCase(),
        departure_time: new Date(depTime).toISOString(),
        arrival_time: new Date(arrTime).toISOString(),
        confirmation_number: pnr || null,
      });
      await scheduleCheckInReminder(data.id, data.airline, data.flight_number, data.departure_time);
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
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Add Flight</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {trips.length > 0 ? (
            <>
              <Text style={s.label}>Attach to trip (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity onPress={() => setTripId(undefined)} style={[s.chip, !tripId && s.chipSel]}>
                  <Text style={[s.chipText, !tripId && s.chipTextSel]}>None</Text>
                </TouchableOpacity>
                {trips.map((t) => (
                  <TouchableOpacity key={t.id} onPress={() => setTripId(t.id)} style={[s.chip, tripId === t.id && s.chipSel]}>
                    <Text style={[s.chipText, tripId === t.id && s.chipTextSel]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}
          <Text style={s.label}>Airline</Text>
          <TextInput testID="flight-airline" value={airline} onChangeText={setAirline} placeholder="Delta" style={s.input} placeholderTextColor={theme.colors.textMuted} />
          <Text style={s.label}>Flight number</Text>
          <TextInput testID="flight-number" value={flightNo} onChangeText={setFlightNo} placeholder="DL245" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>From (airport code)</Text>
              <TextInput value={depAirport} onChangeText={setDepAirport} placeholder="JFK" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>To</Text>
              <TextInput value={arrAirport} onChangeText={setArrAirport} placeholder="CDG" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" maxLength={4} />
            </View>
          </View>
          <Text style={s.label}>Departs (e.g. 2026-06-10T08:30)</Text>
          <TextInput testID="flight-depart" value={depTime} onChangeText={setDepTime} placeholder="2026-06-10T08:30" style={s.input} placeholderTextColor={theme.colors.textMuted} />
          <Text style={s.label}>Arrives</Text>
          <TextInput testID="flight-arrive" value={arrTime} onChangeText={setArrTime} placeholder="2026-06-10T20:30" style={s.input} placeholderTextColor={theme.colors.textMuted} />
          <Text style={s.label}>Confirmation # (optional)</Text>
          <TextInput value={pnr} onChangeText={setPnr} placeholder="PNR/ABC123" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Text style={s.hint}>We’ll remind you to check in 24 hours before departure.</Text>
          <TouchableOpacity testID="submit-add-flight" style={[s.primary, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Save Flight</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.textMuted, marginTop: 12 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, fontSize: 15, color: theme.colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: theme.colors.surfaceMuted },
  chipSel: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
  chipTextSel: { color: "#fff" },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 12 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
