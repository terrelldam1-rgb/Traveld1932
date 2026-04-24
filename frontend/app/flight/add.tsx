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

type T = "flight" | "train" | "bus" | "ferry" | "car";

const TYPES: { id: T; label: string; icon: string }[] = [
  { id: "flight", label: "Flight", icon: "send" },
  { id: "train", label: "Train", icon: "git-commit" },
  { id: "bus", label: "Bus", icon: "truck" },
  { id: "ferry", label: "Ferry", icon: "anchor" },
  { id: "car", label: "Car Rental", icon: "navigation" },
];

export default function AddTransport() {
  const router = useRouter();
  const { trip_id } = useLocalSearchParams<{ trip_id?: string }>();
  const [trips, setTrips] = useState<any[]>([]);
  const [tripId, setTripId] = useState<string | undefined>(trip_id);
  const [type, setType] = useState<T>("flight");

  // Common fields (meaning shifts based on type)
  const [operator, setOperator] = useState(""); // airline / train op / bus op / ferry op / rental co
  const [number, setNumber] = useState(""); // flight# / train# / bus# / ferry# / reservation#
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [depTime, setDepTime] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [pnr, setPnr] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [notes, setNotes] = useState("");

  // Flight-only
  const [terminal, setTerminal] = useState("");
  const [gate, setGate] = useState("");
  const [seat, setSeat] = useState("");
  const [checkinUrl, setCheckinUrl] = useState("");
  // Train
  const [coach, setCoach] = useState("");
  // Ferry
  const [cabin, setCabin] = useState("");
  const [deck, setDeck] = useState("");
  // Car
  const [carModel, setCarModel] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [bookedOn, setBookedOn] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/trips").then(({ data }) => setTrips(data)).catch(() => {});
  }, []);

  const validDT = (v: string) => !isNaN(Date.parse(v));

  // Labels change per type
  const L = {
    flight: { operator: "Airline", number: "Flight #", from: "From airport", to: "To airport", dep: "Departs", arr: "Arrives" },
    train: { operator: "Rail operator", number: "Train #", from: "From station", to: "To station", dep: "Departs", arr: "Arrives" },
    bus: { operator: "Bus line", number: "Route / Bus #", from: "From station", to: "To station", dep: "Departs", arr: "Arrives" },
    ferry: { operator: "Ferry operator", number: "Ferry / Route #", from: "From port", to: "To port", dep: "Departs", arr: "Arrives" },
    car: { operator: "Rental company", number: "Reservation #", from: "Pickup location", to: "Return location", dep: "Pickup date/time", arr: "Return date/time" },
  }[type];

  const submit = async () => {
    setErr("");
    if (!operator || !number || !fromLoc || !toLoc) return setErr("Fill all required fields");
    if (!validDT(depTime) || !validDT(arrTime))
      return setErr("Use ISO datetime e.g. 2026-07-10T08:30");
    setBusy(true);
    try {
      const extras: Record<string, any> = {};
      if (type === "flight") {
        if (terminal) extras.terminal = terminal;
        if (gate) extras.gate = gate;
        if (seat) extras.seat = seat;
        if (checkinUrl) extras.checkin_url = checkinUrl;
      } else if (type === "train") {
        if (coach) extras.coach = coach;
        if (seat) extras.seat = seat;
      } else if (type === "bus") {
        if (seat) extras.seat = seat;
      } else if (type === "ferry") {
        if (cabin) extras.cabin = cabin;
        if (deck) extras.deck = deck;
      } else if (type === "car") {
        if (carModel) extras.car_model = carModel;
        if (dailyRate) extras.daily_rate = Number(dailyRate);
        if (totalPrice) extras.total_price = Number(totalPrice);
        if (bookedOn) extras.booked_on = bookedOn;
      }

      const payload: any = {
        trip_id: tripId || null,
        transport_type: type,
        airline: operator.trim(),
        flight_number: number.trim().toUpperCase(),
        departure_airport: fromLoc.trim().toUpperCase(),
        arrival_airport: toLoc.trim().toUpperCase(),
        departure_time: new Date(depTime).toISOString(),
        arrival_time: new Date(arrTime).toISOString(),
        confirmation_number: pnr || null,
        booking_reference: bookingRef || null,
        notes: notes || null,
        extras,
      };
      // Flight-only top-level (kept for legacy)
      if (type === "flight") {
        payload.terminal = terminal || null;
        payload.gate = gate || null;
        payload.seat = seat || null;
        payload.checkin_url = checkinUrl || null;
      }

      const { data } = await api.post("/flights", payload);
      // Only schedule check-in reminder for flights (24h before departure)
      if (type === "flight") {
        await scheduleCheckInReminder(data.id, data.airline, data.flight_number, data.departure_time);
      }
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
          <Text style={s.title}>Add Transportation</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 8, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                style={[s.chip, type === t.id && s.chipSel]}
                testID={`transport-${t.id}`}
              >
                <Feather name={t.icon as any} size={14} color={type === t.id ? "#fff" : theme.colors.secondary} />
                <Text style={[s.chipText, type === t.id && { color: "#fff" }, { marginLeft: 4 }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {trips.length > 0 ? (
            <>
              <Text style={s.label}>Attach to trip (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity onPress={() => setTripId(undefined)} style={[s.chip, !tripId && s.chipSel]}>
                  <Text style={[s.chipText, !tripId && { color: "#fff" }]}>None</Text>
                </TouchableOpacity>
                {trips.map((tr) => (
                  <TouchableOpacity key={tr.id} onPress={() => setTripId(tr.id)} style={[s.chip, tripId === tr.id && s.chipSel]}>
                    <Text style={[s.chipText, tripId === tr.id && { color: "#fff" }]}>{tr.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={s.label}>{L.operator}</Text>
          <TextInput testID="t-operator" value={operator} onChangeText={setOperator} placeholder={type === "car" ? "Hertz / Enterprise" : type === "flight" ? "Delta" : "Operator"} style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>{L.number}</Text>
          <TextInput testID="t-number" value={number} onChangeText={setNumber} placeholder={type === "flight" ? "DL245" : type === "car" ? "RES1234567" : "Enter #"} style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{L.from}</Text>
              <TextInput value={fromLoc} onChangeText={setFromLoc} placeholder={type === "flight" ? "JFK" : type === "car" ? "LAX T1" : "Origin"} style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{L.to}</Text>
              <TextInput value={toLoc} onChangeText={setToLoc} placeholder={type === "flight" ? "CDG" : "Destination"} style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />
            </View>
          </View>

          <Text style={s.label}>{L.dep}</Text>
          <TextInput testID="t-dep" value={depTime} onChangeText={setDepTime} placeholder="2026-07-10T08:30" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>{L.arr}</Text>
          <TextInput testID="t-arr" value={arrTime} onChangeText={setArrTime} placeholder="2026-07-10T18:30" style={s.input} placeholderTextColor={theme.colors.textMuted} />

          <Text style={s.label}>Confirmation # (optional)</Text>
          <TextInput value={pnr} onChangeText={setPnr} placeholder="PNR / confirmation" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />

          <Text style={s.label}>Booking reference (optional)</Text>
          <TextInput value={bookingRef} onChangeText={setBookingRef} placeholder="Booking ref" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="characters" />

          {/* ===== Type-specific ===== */}
          {type === "flight" ? (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Terminal</Text>
                  <TextInput value={terminal} onChangeText={setTerminal} placeholder="B" style={s.input} placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Gate</Text>
                  <TextInput value={gate} onChangeText={setGate} placeholder="B12" style={s.input} placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Seat</Text>
                  <TextInput value={seat} onChangeText={setSeat} placeholder="14A" style={s.input} placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <Text style={s.label}>Check-in URL</Text>
              <TextInput value={checkinUrl} onChangeText={setCheckinUrl} placeholder="https://airline.com/check-in" style={s.input} placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />
              <Text style={s.hint}>We&apos;ll remind you to check in 24 hours before departure.</Text>
            </>
          ) : null}

          {type === "train" ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Coach / Carriage</Text>
                <TextInput value={coach} onChangeText={setCoach} placeholder="6" style={s.input} placeholderTextColor={theme.colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Seat</Text>
                <TextInput value={seat} onChangeText={setSeat} placeholder="32A" style={s.input} placeholderTextColor={theme.colors.textMuted} />
              </View>
            </View>
          ) : null}

          {type === "bus" ? (
            <>
              <Text style={s.label}>Seat (optional)</Text>
              <TextInput value={seat} onChangeText={setSeat} placeholder="8B" style={s.input} placeholderTextColor={theme.colors.textMuted} />
            </>
          ) : null}

          {type === "ferry" ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Deck</Text>
                <TextInput value={deck} onChangeText={setDeck} placeholder="3" style={s.input} placeholderTextColor={theme.colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cabin</Text>
                <TextInput value={cabin} onChangeText={setCabin} placeholder="B204" style={s.input} placeholderTextColor={theme.colors.textMuted} />
              </View>
            </View>
          ) : null}

          {type === "car" ? (
            <>
              <Text style={s.label}>Car model / class</Text>
              <TextInput value={carModel} onChangeText={setCarModel} placeholder="Compact SUV — Toyota RAV4" style={s.input} placeholderTextColor={theme.colors.textMuted} />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Daily rate (USD)</Text>
                  <TextInput value={dailyRate} onChangeText={setDailyRate} placeholder="45" keyboardType="numeric" style={s.input} placeholderTextColor={theme.colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Total price (USD)</Text>
                  <TextInput value={totalPrice} onChangeText={setTotalPrice} placeholder="315" keyboardType="numeric" style={s.input} placeholderTextColor={theme.colors.textMuted} />
                </View>
              </View>
              <Text style={s.label}>Booked on (date)</Text>
              <TextInput value={bookedOn} onChangeText={setBookedOn} placeholder="2026-05-01" style={s.input} placeholderTextColor={theme.colors.textMuted} />
            </>
          ) : null}

          <Text style={s.label}>Notes (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Window seat, extra legroom..." multiline style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholderTextColor={theme.colors.textMuted} />

          {err ? <Text style={s.err}>{err}</Text> : null}

          <TouchableOpacity testID="submit-add-flight" style={[s.primary, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Save</Text>}
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
  chip: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border },
  chipSel: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.secondary, fontWeight: "700", fontSize: 12 },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", marginTop: 20 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
