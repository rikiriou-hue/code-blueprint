// ============================================
// FinTrack React Native - Crypto Utilities
// ============================================

/**
 * Generate a cryptographically random nonce for replay protection.
 * Uses react-native-get-random-values polyfill for crypto.getRandomValues.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a device fingerprint.
 * In production, combine Android ID + app-specific salt for uniqueness.
 */
export function generateDeviceFingerprint(androidId: string, salt: string = "fintrack"): string {
  // Simple hash — in production use SHA-256
  const input = `${androidId}:${salt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `ft_${Math.abs(hash).toString(36)}_${androidId.substring(0, 8)}`;
}
