// ============================================
// FinTrack React Native - Setup Screen
// ============================================
// First-time setup: enter API key and configure device

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { apiClient } from "../services/APIClient";
import { generateDeviceFingerprint } from "../utils/crypto";

interface SetupScreenProps {
  onComplete: (apiKey: string) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Masukkan API Key dari dashboard FinTrack");
      return;
    }

    setTesting(true);
    apiClient.configure(apiKey.trim());

    try {
      // Send a test ping (will be rejected as invalid payload, but confirms connectivity)
      const response = await fetch(
        `${process.env.API_BASE_URL || "https://apbdovvbmsbplskuncat.supabase.co/functions/v1"}/ingest-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-api-key": apiKey.trim(),
            "x-request-timestamp": Date.now().toString(),
            "x-request-nonce": "test-" + Date.now(),
          },
          body: JSON.stringify({ test: true }),
        }
      );

      if (response.status === 400) {
        // 400 means auth passed but payload invalid — device is valid!
        Alert.alert("✅ Berhasil!", "Device terhubung ke FinTrack backend.");
        onComplete(apiKey.trim());
      } else if (response.status === 403) {
        Alert.alert("❌ Gagal", "API Key tidak valid atau device nonaktif. Cek di dashboard.");
      } else {
        Alert.alert("⚠️ Error", `Unexpected response: ${response.status}`);
      }
    } catch (error: any) {
      Alert.alert("❌ Error", `Tidak bisa terhubung: ${error.message}`);
    }

    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.title}>FinTrack Setup</Text>
        <Text style={styles.subtitle}>
          Hubungkan perangkat ini ke dashboard FinTrack Anda
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>API Key</Text>
        <Text style={styles.hint}>
          Dapatkan API key dari halaman Perangkat di dashboard FinTrack web
        </Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Paste API key di sini..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, !apiKey.trim() && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={testing || !apiKey.trim()}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Koneksi & Simpan</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>Langkah Setup:</Text>
        <Text style={styles.step}>1. Login ke FinTrack dashboard di browser</Text>
        <Text style={styles.step}>2. Buka menu Perangkat → Tambah Device</Text>
        <Text style={styles.step}>3. Salin API Key yang di-generate</Text>
        <Text style={styles.step}>4. Paste API Key di atas</Text>
        <Text style={styles.step}>5. Aktifkan izin notifikasi setelah setup</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a", paddingHorizontal: 24, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8 },
  form: { marginBottom: 32 },
  label: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  hint: { color: "#666", fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: "#111127",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1e1e3a",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  steps: {
    backgroundColor: "#111127",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e1e3a",
  },
  stepsTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  step: { color: "#888", fontSize: 13, lineHeight: 22 },
});

export default SetupScreen;
