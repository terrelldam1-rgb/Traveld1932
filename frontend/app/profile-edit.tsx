import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { api, formatApiError } from "../src/api";
import { useAuth } from "../src/auth";
import { theme } from "../src/theme";

export default function EditProfile() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [emergency, setEmergency] = useState((user as any)?.emergency_contact || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr(""); setBusy(true);
    try {
      await api.patch("/auth/me", {
        name: name.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        emergency_contact: emergency.trim() || null,
      });
      await refresh();
      router.back();
    } catch (e) { setErr(formatApiError(e)); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top","bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Feather name="arrow-left" size={22} color={theme.colors.text}/></TouchableOpacity>
          <Text style={s.title}>Edit Profile</Text>
          <View style={{width:44}}/>
        </View>
        <ScrollView contentContainerStyle={{padding:24, gap:8}}>
          <Text style={s.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={s.input} placeholderTextColor={theme.colors.textMuted} testID="profile-name"/>
          <Text style={s.label}>Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="+1 555 123 4567" style={s.input} keyboardType="phone-pad" placeholderTextColor={theme.colors.textMuted} testID="profile-phone"/>
          <Text style={s.label}>Avatar URL (optional)</Text>
          <TextInput value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://..." autoCapitalize="none" style={s.input} placeholderTextColor={theme.colors.textMuted} testID="profile-avatar"/>
          <Text style={s.label}>Emergency contact</Text>
          <TextInput value={emergency} onChangeText={setEmergency} placeholder="Mom: +1 555 ..." style={s.input} placeholderTextColor={theme.colors.textMuted} testID="profile-emergency"/>
          {err ? <Text style={s.err}>{err}</Text> : null}
          <TouchableOpacity onPress={save} disabled={busy} style={[s.primary, busy && {opacity:0.7}]} testID="profile-save">
            {busy ? <ActivityIndicator color="#fff"/> : <Text style={s.primaryText}>Save</Text>}
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
  label: { fontSize:11, fontWeight:"800", letterSpacing:1.2, color: theme.colors.textMuted, marginTop:12 },
  input: { backgroundColor:"#fff", borderRadius:16, borderWidth:1, borderColor: theme.colors.border, padding:14, fontSize:15, color: theme.colors.text },
  err: { color:"#B03A2E", fontSize:13, marginTop:8 },
  primary: { backgroundColor: theme.colors.primary, paddingVertical:16, borderRadius:9999, alignItems:"center", marginTop:20 },
  primaryText: { color:"#fff", fontWeight:"700", fontSize:15 },
});
