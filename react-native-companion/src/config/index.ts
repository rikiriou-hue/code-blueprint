// ============================================
// FinTrack React Native - Configuration
// ============================================

import { DeviceConfig } from "../types";

// Target banking app package names
export const TARGET_PACKAGES = [
  "id.co.bri.brimo",           // BRImo
  "com.bca.mobile",            // BCA Mobile
  "com.mandiri.mobilebanking", // Livin' by Mandiri
  "com.bni.mobilebanking",     // BNI Mobile Banking
];

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || "https://apbdovvbmsbplskuncat.supabase.co/functions/v1",
  INGEST_ENDPOINT: "/ingest-transaction",
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY_MS: 1000,  // Exponential backoff base
  RETRY_MAX_DELAY_MS: 60000,
};

// Offline Queue Configuration
export const QUEUE_CONFIG = {
  STORAGE_KEY: "@fintrack/offline_queue",
  MAX_QUEUE_SIZE: 500,
  FLUSH_INTERVAL_MS: 30000,   // Try flushing every 30 seconds
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // Discard after 7 days
};

// Notification Listener Configuration
export const NOTIFICATION_CONFIG = {
  DEBOUNCE_MS: 500,            // Ignore duplicate notifications within 500ms
  MAX_TEXT_LENGTH: 1000,       // Max raw notification text to store
};

export const getDeviceConfig = (): DeviceConfig => ({
  apiKey: process.env.DEVICE_API_KEY || "",
  apiBaseUrl: API_CONFIG.BASE_URL,
  deviceFingerprint: "", // Will be set at runtime
  targetPackages: TARGET_PACKAGES,
  encryptionKey: process.env.ENCRYPTION_KEY,
});
