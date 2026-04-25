import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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
import { IMAGES, theme } from "../../../src/theme";

const CATEGORIES = [
  { id: "flight", label: "Flights", icon: "send" },
  { id: "hotel", label: "Hotel", icon: "home" },
  { id: "transportation", label: "Transport", icon: "truck" },
  { id: "activities", label: "Activities", icon: "star" },
];

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [draftMsg, setDraftMsg] = useState("");
  const [draftSug, setDraftSug] = useState("");
  const [tab, setTab] = useState<"pool" | "flights" | "chat" | "ideas" | "members">("pool");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, f, m, sug] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/flights`, { params: { trip_id: id } }),
        api.get(`/trips/${id}/messages`),
        api.get(`/trips/${id}/suggestions`),
      ]);
      setTrip(t.data);
      setFlights(f.data);
      setMessages(m.data);
      setSuggestions(sug.data);
      setErr("");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // poll chat when chat tab is active
  useEffect(() => {
    if (tab !== "chat") return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/trips/${id}/messages`);
        setMessages(data);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [tab, id]);

  const sendMessage = async () => {
    const text = draftMsg.trim();
    if (!text) return;
    setDraftMsg("");
    try {
      const { data } = await api.post(`/trips/${id}/messages`, { text });
      setMessages((prev) => [...prev, data]);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const addSuggestion = async () => {
    const title = draftSug.trim();
    if (!title) return;
    setDraftSug("");
    try {
      const { data } = await api.post(`/trips/${id}/suggestions`, { title });
      setSuggestions((prev) => [data, ...prev]);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const toggleLike = async (sid: string) => {
    try {
      const { data } = await api.post(`/trips/${id}/suggestions/${sid}/like`);
      setSuggestions((prev) => prev.map((s) => (s.id === sid ? { ...s, ...data } : s)));
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !trip) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ padding: 24, color: theme.colors.text }}>{err || "Trip not found"}</Text>
      </SafeAreaView>
    );
  }

  const isHost = trip.host_id === user?.id;
  const progress = trip.pool_goal > 0 ? Math.min(1, trip.total_raised / trip.pool_goal) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ImageBackground source={{ uri: trip.cover_url || IMAGES.tropical }} style={s.hero}>
        <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={["top"]} style={s.heroSafe}>
          <View style={s.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              testID="invite-share-btn"
              onPress={() => router.push(`/trip/${id}/invite`)}
              style={s.iconBtn}
            >
              <Feather name="share-2" size={18} color="#fff" />
            </TouchableOpacity>
            {isHost || (user as any)?.role === "admin" ? (
              <TouchableOpacity
                testID="host-dashboard-btn"
                onPress={() => router.push(`/trip/${id}/host`)}
                style={s.iconBtn}
              >
                <Feather name="sliders" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}
            </View>
          </View>
          <View style={s.heroBottom}>
            <Text style={s.heroDest}>{trip.destination}</Text>
            <Text style={s.heroName}>{trip.name}</Text>
            <Text style={s.heroDates}>
              {new Date(trip.start_date).toLocaleDateString()} – {new Date(trip.end_date).toLocaleDateString()}
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }} style={{ marginBottom: 16 }}>
        <View style={s.segment}>
          {(["pool", "flights", "chat", "ideas", "members"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[s.segmentItem, tab === t && s.segmentActive]}
            >
              <Text style={[s.segmentText, tab === t && s.segmentTextActive]}>
                {t === "flights" ? "TRANSPORT" : t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160, gap: 16 }}>
        {tab === "pool" && (
          <>
            {/* About / details card */}
            {(trip.description || trip.lodging || (trip.itinerary && trip.itinerary.length > 0) || (trip.tags && trip.tags.length > 0)) ? (
              <View style={s.aboutCard}>
                {trip.tags && trip.tags.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {trip.tags.map((t: string) => (
                      <View key={t} style={s.aboutTag}>
                        <Text style={s.aboutTagText}>{t.replace(/_/g, " ").toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {trip.description ? (
                  <>
                    <Text style={s.aboutTitle}>About this trip</Text>
                    <Text style={s.aboutBody}>{trip.description}</Text>
                  </>
                ) : null}
                {trip.lodging ? (
                  <>
                    <Text style={[s.aboutTitle, { marginTop: 12 }]}>Lodging</Text>
                    <Text style={s.aboutBody}>{trip.lodging}</Text>
                  </>
                ) : null}
                {trip.itinerary && trip.itinerary.length > 0 ? (
                  <>
                    <Text style={[s.aboutTitle, { marginTop: 12 }]}>Itinerary</Text>
                    {trip.itinerary.map((d: any, i: number) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                        <View style={s.dayChip}>
                          <Text style={s.dayChipText}>D{d.day || i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.dayTitle}>{d.title}</Text>
                          {d.details ? <Text style={s.dayDetails}>{d.details}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
            ) : null}

            {trip.solo_price > 0 ? (
              <View style={s.soloCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.soloLabel}>TRAVELING ALONE</Text>
                  <Text style={s.soloStrike}>${trip.solo_price.toFixed(0)}</Text>
                </View>
                <Feather name="arrow-right" size={20} color="#fff" />
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={s.soloLabel}>YOUR SHARE</Text>
                  <Text style={s.soloShare}>${trip.share_per_person.toFixed(0)}</Text>
                  {trip.solo_savings > 0 ? (
                    <Text style={s.soloSave}>Save ${trip.solo_savings.toFixed(0)}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={s.poolCard}>
              <Text style={s.poolLabel}>TOTAL RAISED</Text>
              <Text style={s.poolAmount}>${trip.total_raised.toFixed(2)}</Text>
              {trip.pool_goal > 0 ? (
                <>
                  <View style={s.progressBg}>
                    <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={s.poolGoal}>Goal ${trip.pool_goal.toFixed(0)} · {trip.members_detail.length} travelers</Text>
                </>
              ) : null}
            </View>

            {trip.share_per_person > 0 ? (() => {
              const myMember = trip.members_detail.find((m: any) => m.id === user?.id);
              const myContrib = myMember?.contributed || 0;
              const myRemaining = myMember?.remaining || 0;
              const myProgress = trip.share_per_person > 0 ? Math.min(1, myContrib / trip.share_per_person) : 0;
              return (
                <View style={s.myShareCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={s.myShareLabel}>YOUR PROGRESS</Text>
                    <Text style={s.myShareAmt}>
                      ${myContrib.toFixed(0)} / ${trip.share_per_person.toFixed(0)}
                    </Text>
                  </View>
                  <View style={[s.catBar, { marginTop: 12 }]}>
                    <View style={[s.catBarFill, { width: `${myProgress * 100}%` }]} />
                  </View>
                  <Text style={s.myShareRemaining}>
                    {myRemaining > 0
                      ? `$${myRemaining.toFixed(0)} remaining to cover your share`
                      : "You're fully paid for this trip "}
                  </Text>
                </View>
              );
            })() : null}

            {CATEGORIES.map((c) => {
              const raised = trip.category_raised?.[c.id] || 0;
              const goal = trip.category_goals?.[c.id] || 0;
              const p = goal > 0 ? Math.min(1, raised / goal) : 0;
              return (
                <View key={c.id} style={s.catRow}>
                  <View style={s.catIconWrap}>
                    <Feather name={c.icon as any} size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={s.catLabel}>{c.label}</Text>
                      <Text style={s.catAmt}>
                        ${raised.toFixed(0)}{goal > 0 ? ` / $${goal.toFixed(0)}` : ""}
                      </Text>
                    </View>
                    <View style={s.catBar}>
                      <View style={[s.catBarFill, { width: `${p * 100}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              testID="trip-pool-contribute-btn"
              style={s.contributeBtn}
              onPress={() => router.push(`/contribute/${id}`)}
            >
              <Feather name="dollar-sign" size={18} color="#fff" />
              <Text style={s.contributeText}>Contribute to Pool</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === "flights" && (
          <>
            <TouchableOpacity
              testID="add-flight-btn"
              style={s.addFlightBtn}
              onPress={() => router.push({ pathname: "/flight/add", params: { trip_id: id } })}
            >
              <Feather name="plus" size={18} color={theme.colors.primary} />
              <Text style={s.addFlightText}>Add your flight</Text>
            </TouchableOpacity>
            {flights.length === 0 ? (
              <Text style={s.muted}>No flights yet for this trip.</Text>
            ) : (
              flights.map((f) => (
                <View key={f.id} style={s.flightCard}>
                  <Text style={s.flightAirline}>{f.airline} {f.flight_number}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <View>
                      <Text style={s.airport}>{f.departure_airport}</Text>
                      <Text style={s.muted}>{new Date(f.departure_time).toLocaleString()}</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color={theme.colors.textMuted} />
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.airport}>{f.arrival_airport}</Text>
                      <Text style={s.muted}>{new Date(f.arrival_time).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === "chat" && (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, minHeight: 400 }}>
            {messages.length === 0 ? (
              <View style={{ alignItems: "center", padding: 20, gap: 6 }}>
                <Feather name="message-circle" size={36} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.textMuted }}>No messages yet. Say hi to your crew!</Text>
              </View>
            ) : (
              messages.map((m: any) => {
                const mine = m.user_id === user?.id;
                return (
                  <View key={m.id} style={[s.msgRow, mine && { justifyContent: "flex-end" }]}>
                    <View style={[s.msgBubble, mine ? s.msgMine : s.msgTheirs]}>
                      {!mine ? <Text style={s.msgAuthor}>{m.user_name}</Text> : null}
                      <Text style={[s.msgText, mine && { color: "#fff" }]}>{m.text}</Text>
                      <Text style={[s.msgTime, mine && { color: "rgba(255,255,255,0.7)" }]}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={s.chatInputRow}>
              <TextInput
                value={draftMsg}
                onChangeText={setDraftMsg}
                placeholder="Message the crew..."
                placeholderTextColor={theme.colors.textMuted}
                style={s.chatInput}
                testID="chat-input"
              />
              <TouchableOpacity onPress={sendMessage} style={s.sendBtn} testID="chat-send">
                <Feather name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {tab === "ideas" && (
          <>
            <View style={s.chatInputRow}>
              <TextInput
                value={draftSug}
                onChangeText={setDraftSug}
                placeholder="Any must-sees? Drop a spot, restaurant, vibe..."
                placeholderTextColor={theme.colors.textMuted}
                style={s.chatInput}
                testID="sug-input"
              />
              <TouchableOpacity onPress={addSuggestion} style={s.sendBtn} testID="sug-send">
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {suggestions.length === 0 ? (
              <View style={{ alignItems: "center", padding: 20, gap: 6 }}>
                <Feather name="map-pin" size={36} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.textMuted }}>No ideas yet. Be the first!</Text>
              </View>
            ) : (
              suggestions.map((sg: any) => (
                <View key={sg.id} style={s.sugCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sugTitle}>{sg.title}</Text>
                    <Text style={s.muted}>— {sg.user_name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleLike(sg.id)}
                    style={[s.likeBtn, sg.liked_by_me && { backgroundColor: theme.colors.primary }]}
                    testID={`sug-like-${sg.id}`}
                  >
                    <Feather name="heart" size={14} color={sg.liked_by_me ? "#fff" : theme.colors.primary} />
                    <Text style={[s.likeText, sg.liked_by_me && { color: "#fff" }]}>{sg.like_count}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {tab === "members" && (
          <>
            <View style={s.membersHeader}>
              <Text style={s.membersCount}>{trip.members_detail.length} traveling</Text>
              <TouchableOpacity onPress={() => router.push(`/trip/${id}/invite`)}>
                <Text style={s.inviteLink}>Invite more</Text>
              </TouchableOpacity>
            </View>
            {trip.members_detail.map((m: any) => (
              <View key={m.id} style={s.memberRow}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberInitial}>{(m.name?.[0] || "?").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.memberName}>{m.name}</Text>
                    {m.role === "host" ? (
                      <View style={s.hostTag}>
                        <Text style={s.hostTagText}>HOST</Text>
                      </View>
                    ) : null}
                    {m.paid_in_full ? (
                      <Feather name="check-circle" size={14} color={theme.colors.success} />
                    ) : null}
                  </View>
                  <Text style={s.muted}>
                    {m.share > 0
                      ? `$${m.contributed.toFixed(0)} of $${m.share.toFixed(0)} share`
                      : `$${m.contributed.toFixed(0)} contributed`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.memberAmt}>${m.contributed.toFixed(0)}</Text>
                  {m.share > 0 && m.remaining > 0 ? (
                    <Text style={s.memberRemaining}>-${m.remaining.toFixed(0)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
            {isHost ? (
              <TouchableOpacity
                style={[s.addFlightBtn, { marginTop: 16, borderColor: "#B03A2E" }]}
                onPress={() => {
                  api.delete(`/trips/${id}`).then(() => router.replace("/(tabs)"));
                }}
              >
                <Feather name="trash-2" size={16} color="#B03A2E" />
                <Text style={[s.addFlightText, { color: "#B03A2E" }]}>Delete trip</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  hero: { height: 280 },
  heroSafe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  heroBottom: { paddingBottom: 20 },
  heroDest: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  heroName: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  heroDates: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  segment: { flexDirection: "row", backgroundColor: theme.colors.surfaceMuted, borderRadius: 9999, padding: 4 },
  segmentItem: { paddingVertical: 10, paddingHorizontal: 18, alignItems: "center", borderRadius: 9999 },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1.2 },
  segmentTextActive: { color: theme.colors.text },
  poolCard: { backgroundColor: theme.colors.secondary, borderRadius: 24, padding: 24, alignItems: "center" },
  poolLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  poolAmount: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1, marginTop: 6 },
  progressBg: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 9999, marginTop: 16, width: "100%", overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  poolGoal: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 8, fontWeight: "600" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  catIconWrap: { width: 36, height: 36, borderRadius: 9999, backgroundColor: theme.colors.surfaceHighlight, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  catAmt: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" },
  catBar: { height: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: 9999, marginTop: 8, overflow: "hidden" },
  catBarFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 9999 },
  contributeBtn: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 9999, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 },
  contributeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  addFlightBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 9999, borderWidth: 2, borderStyle: "dashed", borderColor: theme.colors.primary },
  addFlightText: { color: theme.colors.primary, fontWeight: "700" },
  flightCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  flightAirline: { fontSize: 14, fontWeight: "700", color: theme.colors.primary },
  airport: { fontSize: 20, fontWeight: "800", color: theme.colors.text, letterSpacing: 1 },
  muted: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  membersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  membersCount: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  inviteLink: { fontSize: 13, fontWeight: "700", color: theme.colors.primary },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  memberAvatar: { width: 40, height: 40, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  memberInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  memberName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  memberAmt: { fontSize: 14, fontWeight: "800", color: theme.colors.secondary },
  memberRemaining: { fontSize: 11, color: theme.colors.primary, fontWeight: "700", marginTop: 2 },
  hostTag: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  hostTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: theme.colors.primary },
  soloCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.primary, borderRadius: 24, padding: 20 },
  soloLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  soloStrike: { color: "rgba(255,255,255,0.7)", fontSize: 22, fontWeight: "800", textDecorationLine: "line-through", marginTop: 2 },
  soloShare: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
  soloSave: { color: "#FFE0B2", fontSize: 11, fontWeight: "700", marginTop: 2 },
  myShareCard: { backgroundColor: theme.colors.surfaceHighlight, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.primary },
  myShareLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: theme.colors.primary },
  myShareAmt: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
  myShareRemaining: { fontSize: 12, color: theme.colors.secondary, marginTop: 10, fontWeight: "600" },
  msgRow: { flexDirection: "row", marginBottom: 8 },
  msgBubble: { maxWidth: "78%", padding: 12, borderRadius: 18 },
  msgMine: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  msgTheirs: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.border, borderBottomLeftRadius: 4 },
  msgAuthor: { fontSize: 11, fontWeight: "800", color: theme.colors.primary, marginBottom: 2 },
  msgText: { fontSize: 14, color: theme.colors.text, lineHeight: 19 },
  msgTime: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4, textAlign: "right" },
  chatInputRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 },
  chatInput: { flex: 1, backgroundColor: "#fff", borderRadius: 9999, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, color: theme.colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  sugCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 8 },
  sugTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  likeBtn: { flexDirection: "row", gap: 4, alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: theme.colors.surfaceHighlight },
  likeText: { fontSize: 12, fontWeight: "700", color: theme.colors.primary },
  aboutCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  aboutTitle: { fontSize: 13, fontWeight: "800", color: theme.colors.primary, letterSpacing: 0.6, marginBottom: 4 },
  aboutBody: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  aboutTag: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  aboutTagText: { fontSize: 10, fontWeight: "800", color: theme.colors.primary, letterSpacing: 0.8 },
  dayChip: { width: 36, height: 28, borderRadius: 9999, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  dayChipText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  dayTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  dayDetails: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 17 },
});
