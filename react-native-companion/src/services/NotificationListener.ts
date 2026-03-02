// ============================================
// FinTrack React Native - Notification Listener
// ============================================
// Bridge to Android NotificationListenerService via native module
//
// This file provides the React Native side of the notification listener.
// The actual NotificationListenerService must be implemented in Java/Kotlin
// as a native Android module.
//
// See: android/app/src/main/java/com/fintrack/NotificationListenerModule.kt

import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import { NotificationData, ParsedTransaction, TransactionPayload } from "../types";
import { parseNotification, getAppDisplayName } from "./TransactionParser";
import { apiClient } from "./APIClient";
import { offlineQueue } from "./OfflineQueue";
import { generateNonce } from "../utils/crypto";
import { TARGET_PACKAGES, NOTIFICATION_CONFIG } from "../config";

const { NotificationListenerModule } = NativeModules;

class NotificationListenerService {
  private emitter: NativeEventEmitter | null = null;
  private lastNotificationHash = "";
  private lastNotificationTime = 0;
  private onTransactionCallback?: (txn: ParsedTransaction) => void;

  /**
   * Start listening for notifications from target banking apps.
   * Requires Notification Access permission to be enabled.
   */
  async start() {
    if (Platform.OS !== "android") {
      console.warn("[NotificationListener] Only supported on Android");
      return;
    }

    // Check if permission is granted
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      console.warn("[NotificationListener] Notification access not granted");
      return;
    }

    this.emitter = new NativeEventEmitter(NotificationListenerModule);

    // Listen for notification events from native module
    this.emitter.addListener("onNotificationReceived", (data: NotificationData) => {
      this.handleNotification(data);
    });

    // Tell native module which packages to watch
    NotificationListenerModule.setTargetPackages(TARGET_PACKAGES);
    NotificationListenerModule.startListening();

    console.log("[NotificationListener] Started. Watching:", TARGET_PACKAGES);
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.emitter) {
      this.emitter.removeAllListeners("onNotificationReceived");
    }
    NotificationListenerModule?.stopListening?.();
  }

  /**
   * Check if notification listener permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      return await NotificationListenerModule.isPermissionGranted();
    } catch {
      return false;
    }
  }

  /**
   * Open Android notification access settings
   */
  openPermissionSettings() {
    NotificationListenerModule?.openNotificationSettings?.();
  }

  /**
   * Register callback for parsed transactions
   */
  onTransaction(callback: (txn: ParsedTransaction) => void) {
    this.onTransactionCallback = callback;
  }

  // --- Private ---

  private async handleNotification(data: NotificationData) {
    // Filter: only process target apps
    if (!TARGET_PACKAGES.includes(data.packageName)) return;

    // Debounce: ignore duplicate notifications
    const hash = `${data.packageName}:${data.text}`;
    const now = Date.now();
    if (hash === this.lastNotificationHash && now - this.lastNotificationTime < NOTIFICATION_CONFIG.DEBOUNCE_MS) {
      return;
    }
    this.lastNotificationHash = hash;
    this.lastNotificationTime = now;

    console.log(`[NotificationListener] Received from ${getAppDisplayName(data.packageName)}`);

    // Parse the notification text
    const parsed = parseNotification(data);
    if (!parsed) {
      console.log("[NotificationListener] Could not parse notification, skipping");
      return;
    }

    // Notify UI
    this.onTransactionCallback?.(parsed);

    // Build API payload
    const payload: TransactionPayload = {
      amount: parsed.amount,
      transaction_type: parsed.type,
      description: parsed.description,
      merchant: parsed.merchant,
      source_app: parsed.sourceApp,
      raw_notification: parsed.rawText,
      transaction_time: parsed.timestamp.toISOString(),
      nonce: generateNonce(),
    };

    // Send to backend (or queue if offline)
    try {
      const result = await apiClient.sendWithRetry(payload);
      console.log(`[NotificationListener] Transaction sent. ID: ${result.transaction_id}, Flagged: ${result.flagged}`);
    } catch (error) {
      console.warn("[NotificationListener] Failed to send, queuing for later:", error);
      await offlineQueue.enqueue(payload);
    }
  }
}

// Singleton
export const notificationListener = new NotificationListenerService();
