// ============================================
// FinTrack React Native - Home Screen
// ============================================

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { notificationListener } from "../services/NotificationListener";
import { offlineQueue } from "../services/OfflineQueue";
import { apiClient } from "../services/APIClient";
import { ParsedTransaction } from "../types";
import { getAppDisplayName } from "../services/TransactionParser";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const HomeScreen: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<ParsedTransaction[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeApp();
    return () => {
      notificationListener.stop();
      offlineQueue.destroy();
    };
  }, []);

  const initializeApp = async () => {
    // Configure API client with stored credentials
    // In production, load from secure storage (react-native-keychain)
    const apiKey = ""; // Load from secure storage
    apiClient.configure(apiKey);

    // Initialize offline queue
    await offlineQueue.init();
    setQueueSize(offlineQueue.size);

    // Check notification permission
    const permitted = await notificationListener.checkPermission();
    setHasPermission(permitted);

    if (permitted) {
      startListening();
    }
  };

  const startListening = async () => {
    notificationListener.onTransaction((txn) => {
      setRecentTransactions((prev) => [txn, ...prev].slice(0, 50));
      setQueueSize(offlineQueue.size);
    });

    await notificationListener.start();
    setIsListening(true);
  };

  const handlePermissionRequest = () => {
    Alert.alert(
      "Izin Diperlukan",
      "FinTrack memerlukan akses notifikasi untuk menangkap transaksi dari aplikasi banking Anda. Aktifkan di pengaturan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Buka Pengaturan",
          onPress: () => notificationListener.openPermissionSettings(),
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await offlineQueue.flush();
    setQueueSize(offlineQueue.size);
    setRefreshing(false);
  }, []);

  const renderTransaction = ({ item }: { item: ParsedTransaction }) => (
    <View style={styles.txnCard}>
      <View style={styles.txnHeader}>
        <View
          style={[
            styles.txnIcon,
            { backgroundColor: item.type === "credit" ? "#22c55e20" : "#ef444420" },
          ]}
        >
          <Text style={{ color: item.type === "credit" ? "#22c55e" : "#ef4444", fontSize: 16 }}>
            {item.type === "credit" ? "↓" : "↑"}
          </Text>
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnMerchant}>{item.merchant || item.description || "Transaksi"}</Text>
          <Text style={styles.txnMeta}>
            {getAppDisplayName(item.sourceApp)} • {item.timestamp.toLocaleTimeString("id-ID")}
          </Text>
        </View>
        <Text
          style={[
            styles.txnAmount,
            { color: item.type === "credit" ? "#22c55e" : "#ef4444" },
          ]}
        >
          {item.type === "credit" ? "+" : "-"}
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>FinTrack</Text>
        <Text style={styles.subtitle}>Realtime Financial Tracker</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusRow}>
        <View style={[styles.statusCard, { backgroundColor: isListening ? "#22c55e15" : "#ef444415" }]}>
          <View style={[styles.statusDot, { backgroundColor: isListening ? "#22c55e" : "#ef4444" }]} />
          <Text style={styles.statusText}>{isListening ? "Listening" : "Stopped"}</Text>
        </View>
        {queueSize > 0 && (
          <View style={[styles.statusCard, { backgroundColor: "#f59e0b15" }]}>
            <Text style={styles.statusText}>📤 {queueSize} queued</Text>
          </View>
        )}
      </View>

      {/* Permission warning */}
      {!hasPermission && (
        <TouchableOpacity style={styles.permissionBanner} onPress={handlePermissionRequest}>
          <Text style={styles.permissionText}>⚠️ Izin notifikasi belum diaktifkan. Tap untuk mengaktifkan.</Text>
        </TouchableOpacity>
      )}

      {/* Transaction List */}
      <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
      <FlatList
        data={recentTransactions}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isListening
                ? "Menunggu notifikasi transaksi..."
                : "Mulai listener untuk menangkap transaksi"}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a", paddingHorizontal: 16, paddingTop: 48 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 4 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#ccc", fontSize: 13, fontWeight: "600" },
  permissionBanner: {
    backgroundColor: "#f59e0b20",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f59e0b40",
  },
  permissionText: { color: "#f59e0b", fontSize: 13 },
  sectionTitle: { color: "#888", fontSize: 13, fontWeight: "600", marginBottom: 12, textTransform: "uppercase" },
  txnCard: {
    backgroundColor: "#111127",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e1e3a",
  },
  txnHeader: { flexDirection: "row", alignItems: "center" },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txnInfo: { flex: 1 },
  txnMerchant: { color: "#fff", fontSize: 14, fontWeight: "600" },
  txnMeta: { color: "#666", fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: "700" },
  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center" },
});

export default HomeScreen;
