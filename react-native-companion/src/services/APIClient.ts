// ============================================
// FinTrack React Native - API Client
// ============================================
// Handles authenticated requests to FinTrack backend with retry logic

import { API_CONFIG } from "../config";
import { TransactionPayload, APIResponse } from "../types";
import { generateNonce } from "../utils/crypto";

class APIClient {
  private apiKey: string = "";
  private baseUrl: string = API_CONFIG.BASE_URL;

  configure(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl;
  }

  /**
   * Send a transaction to the backend with authentication headers.
   * Includes replay protection (timestamp + nonce).
   */
  async sendTransaction(payload: TransactionPayload): Promise<APIResponse> {
    const timestamp = Date.now().toString();
    const nonce = payload.nonce || generateNonce();

    const response = await fetch(`${this.baseUrl}${API_CONFIG.INGEST_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-api-key": this.apiKey,
        "x-request-timestamp": timestamp,
        "x-request-nonce": nonce,
      },
      body: JSON.stringify({ ...payload, nonce }),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.error || "Request failed", response.status);
    }

    return data as APIResponse;
  }

  /**
   * Send transaction with exponential backoff retry.
   * Returns on success or throws after MAX_RETRIES.
   */
  async sendWithRetry(
    payload: TransactionPayload,
    maxRetries: number = API_CONFIG.MAX_RETRIES
  ): Promise<APIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendTransaction(payload);
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof APIError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on duplicate nonce (409) — it already succeeded
        if (error instanceof APIError && error.status === 409) {
          return { success: true, flagged: false };
        }

        if (attempt < maxRetries) {
          const delay = Math.min(
            API_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000,
            API_CONFIG.RETRY_MAX_DELAY_MS
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }
}

class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

// Singleton instance
export const apiClient = new APIClient();
export { APIError };
