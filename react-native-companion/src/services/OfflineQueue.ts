// ============================================
// FinTrack React Native - Offline Queue
// ============================================
// Persists failed transactions and retries when connectivity returns

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { QUEUE_CONFIG } from "../config";
import { QueuedTransaction, TransactionPayload } from "../types";
import { apiClient } from "./APIClient";
import { generateNonce } from "../utils/crypto";

class OfflineQueue {
  private queue: QueuedTransaction[] = [];
  private isFlushing = false;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize: load persisted queue and start background flush
   */
  async init() {
    await this.loadFromStorage();
    this.startPeriodicFlush();
    this.listenForConnectivity();
  }

  /**
   * Add a transaction to the offline queue
   */
  async enqueue(payload: TransactionPayload) {
    const item: QueuedTransaction = {
      id: generateNonce(),
      payload,
      retryCount: 0,
      createdAt: Date.now(),
    };

    this.queue.push(item);

    // Enforce max queue size (drop oldest)
    if (this.queue.length > QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-QUEUE_CONFIG.MAX_QUEUE_SIZE);
    }

    await this.saveToStorage();
    console.log(`[OfflineQueue] Enqueued transaction. Queue size: ${this.queue.length}`);
  }

  /**
   * Attempt to send all queued transactions
   */
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;

    this.isFlushing = true;
    console.log(`[OfflineQueue] Flushing ${this.queue.length} queued transactions...`);

    const completed: string[] = [];
    const now = Date.now();

    for (const item of this.queue) {
      // Discard expired items
      if (now - item.createdAt > QUEUE_CONFIG.MAX_AGE_MS) {
        completed.push(item.id);
        continue;
      }

      try {
        await apiClient.sendWithRetry(item.payload, 1); // single retry during flush
        completed.push(item.id);
        console.log(`[OfflineQueue] Sent queued transaction: ${item.id}`);
      } catch (error) {
        item.retryCount++;
        item.lastAttempt = now;
        console.warn(`[OfflineQueue] Failed to send ${item.id}, retry #${item.retryCount}`);
        // Stop flushing on network errors to avoid draining battery
        break;
      }
    }

    this.queue = this.queue.filter((item) => !completed.includes(item.id));
    await this.saveToStorage();
    this.isFlushing = false;
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Clear the entire queue
   */
  async clear() {
    this.queue = [];
    await this.saveToStorage();
  }

  // --- Private helpers ---

  private async loadFromStorage() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_CONFIG.STORAGE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
    } catch {
      this.queue = [];
    }
  }

  private async saveToStorage() {
    try {
      await AsyncStorage.setItem(QUEUE_CONFIG.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("[OfflineQueue] Failed to persist queue:", error);
    }
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => this.flush(), QUEUE_CONFIG.FLUSH_INTERVAL_MS);
  }

  private listenForConnectivity() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && this.queue.length > 0) {
        console.log("[OfflineQueue] Connectivity restored, flushing queue...");
        this.flush();
      }
    });
  }

  destroy() {
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

// Singleton
export const offlineQueue = new OfflineQueue();
