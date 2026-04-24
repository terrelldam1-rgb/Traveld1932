import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { api, formatApiError } from "../src/api";
import { theme } from "../src/theme";

export default function Support() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setErr(""); if (!subject || !message) return setErr("Subject and message are required");
    setBusy(true);
    try {
      await api.post("/inbox/support", { subject: subject.trim(), message: message.trim() });
      Alert.alert("Sent!", "The founder will respond in your inbox.");
      router.back();
    } catch (e) { setErr(formatApiError(e)); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top","bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Feather name="arrow-left" size={22} color={theme.colors.text}/></TouchableOpacity>
          <Text style={s.title}>Help &amp; Support</Text>
          <View style={{width:44}}/>
        </View>
        <ScrollView contentContainerStyle={{padding:24, gap:8}}>
          <View style={s.hero}>
            <Feather name="help-circle" size={24} color={theme.colors.primary}/>
            <Text style={s.heroText}>Questions, issues, trip help? Write the founder directly.</Text>
          </View>
          <Text style={s.label}>Subject</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder="e.g. Payment not showing up" style={s.input} placeholderTextColor={theme.colors.textMuted} testID="support-subject"/>
          <Text style={s.label}>Message</Text>
          <TextInput value={message} onChangeText={setMessage} placeholder="Tell us what's going on..." multiline style={[s.input, { minHeight: 160, textAlignVertical: "top" }]} placeholderTextColor={theme.colors.textMuted} testID="support-message"/>
          {err ? <Text style={s.err}>{err}</Text> : null}
          <TouchableOpacity onPress={send} disabled={busy} style={[s.primary, busy && {opacity:0.7}]} testID="support-send">
            {busy ? <ActivityIndicator color="#fff"/> : <Text style={s.primaryText}>Send to Founder</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor: theme.colors.bg },
  header: { flexDirection:"row", paddingHorizontal:20, paddingTop:12, alignItems:"center", justifyContent:"space-between" },
  iconBtn: { width:44, height:44, borderRadius:9999, alignItems:"center", justifyContent:"center", backgroundColor:"#fff", borderWidth:1, borderColor: theme.colors.border },
  title: { fontSize:18, fontWeight:"800", color: theme.colors.text },
  hero: { flexDirection:"row", gap:14, alignItems:"center", backgroundColor: theme.colors.surfaceMuted, padding:16, borderRadius:20, marginBottom:8 },
  heroText: { flex:1, color: theme.colors.text, fontSize:13, lineHeight:18, fontWeight:"500" },
  label: { fontSize:11, fontWeight:"800", letterSpacing:1.2, color: theme.colors.textMuted, marginTop:12 },
  input: { backgroundColor:"#fff", borderRadius:16, borderWidth:1, borderColor: theme.colors.border, padding:14, fontSize:15, color: theme.colors.text },
  err: { color:"#B03A2E", fontSize:13, marginTop:8 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical:16, borderRadius:9999, alignItems:"center", marginTop:20 },
  primaryText: { color:"#fff", fontWeight:"700", fontSize:15 },
});
