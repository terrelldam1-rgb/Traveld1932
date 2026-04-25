import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type ContactPref = "email" | "phone" | "hidden";

export default function EditProfile() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [emergency, setEmergency] = useState((user as any)?.emergency_contact || "");
  const [preferredContact, setPreferredContact] = useState<ContactPref>(
    ((user as any)?.preferred_contact as ContactPref) || "email"
  );
  const [instagram, setInstagram] = useState((user as any)?.instagram || "");
  const [tiktok, setTiktok] = useState((user as any)?.tiktok || "");
  const [twitter, setTwitter] = useState((user as any)?.twitter || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "We need photo library access to set your profile picture.");
        return;
      }
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        const dataUrl = a.base64
          ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}`
          : a.uri;
        setAvatarUrl(dataUrl);
      }
    } catch (e: any) {
      Alert.alert("Couldn't pick image", e?.message || "Try again.");
    } finally {
      setUploading(false);
    }
  };

  const cleanHandle = (h: string) => h.trim().replace(/^@+/, "");

  const save = async () => {
    setErr("");
    setBusy(true);
    try {
      await api.patch("/auth/me", {
        name: name.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        emergency_contact: emergency.trim() || null,
        preferred_contact: preferredContact,
        instagram: cleanHandle(instagram) || null,
        tiktok: cleanHandle(tiktok) || null,
        twitter: cleanHandle(twitter) || null,
      });
      await refresh();
      router.back();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const initial = (name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Feather name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Edit Profile</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 4, paddingBottom: 60 }}>
          {/* Avatar picker */}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            <TouchableOpacity onPress={pickAvatar} style={s.avatarWrap} testID="profile-avatar-pick">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={[s.avatarImg, s.avatarFallback]}>
                  <Text style={s.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={s.avatarBadge}>
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={[s.hint, { marginTop: 8 }]}>Tap to change profile picture</Text>
          </View>

          <Text style={s.section}>Identity</Text>
          <Text style={s.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
            testID="profile-name"
          />
          <Text style={s.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 123 4567"
            style={s.input}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textMuted}
            testID="profile-phone"
          />

          <Text style={s.section}>Preferred contact for trip members</Text>
          <Text style={s.hint}>Picked option is shown on trips you host so members can reach you.</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(
              [
                { id: "email", label: "Email", icon: "mail" },
                { id: "phone", label: "Phone", icon: "phone" },
                { id: "hidden", label: "Hidden", icon: "eye-off" },
              ] as { id: ContactPref; label: string; icon: any }[]
            ).map((opt) => {
              const on = preferredContact === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setPreferredContact(opt.id)}
                  style={[s.pill, on && s.pillOn]}
                  testID={`pref-${opt.id}`}
                >
                  <Feather name={opt.icon} size={14} color={on ? "#fff" : theme.colors.secondary} />
                  <Text style={[s.pillText, on && { color: "#fff" }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.section}>Social handles (optional)</Text>
          <Text style={s.hint}>Shown publicly on trips you host. Leave blank to hide.</Text>
          <Text style={s.label}>Instagram</Text>
          <View style={s.handleRow}>
            <Text style={s.atSign}>@</Text>
            <TextInput
              value={instagram}
              onChangeText={setInstagram}
              placeholder="yourhandle"
              autoCapitalize="none"
              style={s.handleInput}
              placeholderTextColor={theme.colors.textMuted}
              testID="profile-instagram"
            />
          </View>
          <Text style={s.label}>TikTok</Text>
          <View style={s.handleRow}>
            <Text style={s.atSign}>@</Text>
            <TextInput
              value={tiktok}
              onChangeText={setTiktok}
              placeholder="yourhandle"
              autoCapitalize="none"
              style={s.handleInput}
              placeholderTextColor={theme.colors.textMuted}
              testID="profile-tiktok"
            />
          </View>
          <Text style={s.label}>X / Twitter</Text>
          <View style={s.handleRow}>
            <Text style={s.atSign}>@</Text>
            <TextInput
              value={twitter}
              onChangeText={setTwitter}
              placeholder="yourhandle"
              autoCapitalize="none"
              style={s.handleInput}
              placeholderTextColor={theme.colors.textMuted}
              testID="profile-twitter"
            />
          </View>

          <Text style={s.section}>Safety</Text>
          <Text style={s.label}>Emergency contact</Text>
          <TextInput
            value={emergency}
            onChangeText={setEmergency}
            placeholder="Mom: +1 555 ..."
            style={s.input}
            placeholderTextColor={theme.colors.textMuted}
            testID="profile-emergency"
          />

          {err ? <Text style={s.err}>{err}</Text> : null}
          <TouchableOpacity
            onPress={save}
            disabled={busy}
            style={[s.primary, busy && { opacity: 0.7 }]}
            testID="profile-save"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Save</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  section: { fontSize: 13, fontWeight: "800", color: theme.colors.primary, marginTop: 22, letterSpacing: 0.4 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 6,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  atSign: { fontSize: 16, color: theme.colors.primary, fontWeight: "800", marginRight: 4 },
  handleInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: theme.colors.text },
  err: { color: "#B03A2E", fontSize: 13, marginTop: 8 },
  primary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: "center",
    marginTop: 20,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 9999,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  avatarImg: {
    width: 120,
    height: 120,
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarFallback: {
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 42, fontWeight: "800", color: theme.colors.primary },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: 13, fontWeight: "700", color: theme.colors.secondary },
});
