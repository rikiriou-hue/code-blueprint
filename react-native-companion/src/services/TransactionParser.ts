// ============================================
// FinTrack React Native - Transaction Parser
// ============================================
// Parses banking notification text into structured transaction data

import { NotificationData, ParsedTransaction } from "../types";

// -----------------------------------------------
// BRImo Notification Patterns
// -----------------------------------------------
// Debit: "BRImo Notifikasi: Pembelian sebesar Rp150.000 berhasil di TOKOPEDIA"
// Credit: "BRImo Notifikasi: Transfer masuk sebesar Rp1.000.000 dari JOHN DOE"
// Transfer out: "BRImo Notifikasi: Transfer sebesar Rp500.000 ke JANE DOE berhasil"

const BRIMO_PATTERNS = {
  debit: [
    /(?:Pembelian|Pembayaran|Transfer)\s+sebesar\s+Rp\s*([\d.,]+)\s+(?:berhasil\s+)?(?:di|ke)\s+(.+)/i,
    /Penarikan\s+tunai\s+sebesar\s+Rp\s*([\d.,]+)/i,
  ],
  credit: [
    /Transfer\s+masuk\s+sebesar\s+Rp\s*([\d.,]+)\s+dari\s+(.+)/i,
    /(?:Setoran|Deposit)\s+sebesar\s+Rp\s*([\d.,]+)/i,
  ],
};

// -----------------------------------------------
// BCA Mobile Patterns
// -----------------------------------------------
const BCA_PATTERNS = {
  debit: [
    /(?:Transfer|Pemindahan)\s+(?:Dana\s+)?(?:sebesar\s+)?Rp\s*([\d.,]+)\s+(?:ke|a\.n)\s+(.+)/i,
    /Pembayaran\s+(?:sebesar\s+)?Rp\s*([\d.,]+)\s+(?:untuk|ke)\s+(.+)/i,
  ],
  credit: [
    /(?:Uang\s+masuk|Transfer\s+masuk|CR)\s+(?:sebesar\s+)?Rp\s*([\d.,]+)/i,
  ],
};

// -----------------------------------------------
// Generic Amount Parser
// -----------------------------------------------
function parseAmount(amountStr: string): number {
  // Remove dots (thousands separator) and replace comma with dot (decimal)
  // "1.500.000" -> 1500000, "1.500.000,50" -> 1500000.50
  const cleaned = amountStr
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

// -----------------------------------------------
// App-specific parsers
// -----------------------------------------------
function parseBrimo(text: string): Partial<ParsedTransaction> | null {
  // Try debit patterns first
  for (const pattern of BRIMO_PATTERNS.debit) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: parseAmount(match[1]),
        type: "debit",
        merchant: match[2]?.trim() || undefined,
        description: text.substring(0, 200),
      };
    }
  }
  // Try credit patterns
  for (const pattern of BRIMO_PATTERNS.credit) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: parseAmount(match[1]),
        type: "credit",
        merchant: match[2]?.trim() || undefined,
        description: text.substring(0, 200),
      };
    }
  }
  return null;
}

function parseBCA(text: string): Partial<ParsedTransaction> | null {
  for (const pattern of BCA_PATTERNS.debit) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: parseAmount(match[1]),
        type: "debit",
        merchant: match[2]?.trim() || undefined,
        description: text.substring(0, 200),
      };
    }
  }
  for (const pattern of BCA_PATTERNS.credit) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: parseAmount(match[1]),
        type: "credit",
        description: text.substring(0, 200),
      };
    }
  }
  return null;
}

// -----------------------------------------------
// Generic fallback parser (catches Rp amounts)
// -----------------------------------------------
function parseGeneric(text: string): Partial<ParsedTransaction> | null {
  const amountMatch = text.match(/Rp\s*([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseAmount(amountMatch[1]);
  if (amount <= 0) return null;

  // Heuristic: if text contains transfer/bayar/beli = debit, masuk/terima = credit
  const isCredit = /masuk|terima|cr\b|credit/i.test(text);
  const type = isCredit ? "credit" : "debit";

  return { amount, type, description: text.substring(0, 200) };
}

// -----------------------------------------------
// Main Parser
// -----------------------------------------------
const PARSERS: Record<string, (text: string) => Partial<ParsedTransaction> | null> = {
  "id.co.bri.brimo": parseBrimo,
  "com.bca.mobile": parseBCA,
};

export function parseNotification(notification: NotificationData): ParsedTransaction | null {
  const text = notification.bigText || notification.text || "";
  if (!text.trim()) return null;

  // Use app-specific parser or generic fallback
  const parser = PARSERS[notification.packageName] || parseGeneric;
  const result = parser(text);

  if (!result || !result.amount || result.amount <= 0) return null;

  return {
    amount: result.amount,
    type: result.type || "debit",
    merchant: result.merchant,
    description: result.description,
    timestamp: new Date(notification.timestamp),
    sourceApp: notification.packageName,
    rawText: text.substring(0, 1000),
  };
}

// Map package name to friendly app name
export function getAppDisplayName(packageName: string): string {
  const names: Record<string, string> = {
    "id.co.bri.brimo": "BRImo",
    "com.bca.mobile": "BCA Mobile",
    "com.mandiri.mobilebanking": "Livin' Mandiri",
    "com.bni.mobilebanking": "BNI Mobile",
  };
  return names[packageName] || packageName;
}
