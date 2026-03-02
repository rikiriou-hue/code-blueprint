// ============================================
// FinTrack React Native - Type Definitions
// ============================================

export interface TransactionPayload {
  amount: number;
  transaction_type: "debit" | "credit";
  description?: string;
  merchant?: string;
  source_app?: string;
  raw_notification?: string;
  transaction_time: string;
  nonce: string;
}

export interface ParsedTransaction {
  amount: number;
  type: "debit" | "credit";
  merchant?: string;
  description?: string;
  timestamp: Date;
  sourceApp: string;
  rawText: string;
}

export interface QueuedTransaction {
  id: string;
  payload: TransactionPayload;
  retryCount: number;
  createdAt: number;
  lastAttempt?: number;
}

export interface DeviceConfig {
  apiKey: string;
  apiBaseUrl: string;
  deviceFingerprint: string;
  targetPackages: string[];
  encryptionKey?: string;
}

export interface NotificationData {
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  bigText?: string;
  timestamp: number;
}

export interface APIResponse {
  success: boolean;
  transaction_id?: string;
  flagged?: boolean;
  error?: string;
}

export type ConnectionStatus = "connected" | "disconnected" | "syncing";
