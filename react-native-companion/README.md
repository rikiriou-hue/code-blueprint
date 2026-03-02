# FinTrack Android Companion App

React Native companion app yang menangkap notifikasi transaksi dari mobile banking dan mengirim data ke FinTrack Dashboard secara realtime.

## Arsitektur

```
┌─────────────────────────────────────────────────┐
│                  Android Device                  │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │ Bank App     │───▶│ NotificationListener  │  │
│  │ (BRImo, etc) │    │ Service               │  │
│  └──────────────┘    └──────────┬────────────┘  │
│                                 │                │
│                      ┌──────────▼────────────┐  │
│                      │ TransactionParser     │  │
│                      │ (regex extraction)    │  │
│                      └──────────┬────────────┘  │
│                                 │                │
│                      ┌──────────▼────────────┐  │
│                      │ EncryptionService     │  │
│                      │ (AES-256-GCM)         │  │
│                      └──────────┬────────────┘  │
│                                 │                │
│                      ┌──────────▼────────────┐  │
│                      │ OfflineQueue          │  │
│                      │ (AsyncStorage)        │  │
│                      └──────────┬────────────┘  │
│                                 │                │
│                      ┌──────────▼────────────┐  │
│                      │ APIClient             │  │
│                      │ (retry + backoff)     │  │
│                      └──────────┬────────────┘  │
└─────────────────────────────────┼────────────────┘
                                  │ HTTPS
                       ┌──────────▼────────────┐
                       │ FinTrack Backend      │
                       │ (Edge Function)       │
                       └───────────────────────┘
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env
# Edit .env dengan API URL dan device API key dari dashboard

# 3. Run Android
npx react-native run-android
```

## Konfigurasi Android

### Notification Access
App ini memerlukan izin Notification Listener. User perlu mengaktifkan secara manual di:
`Settings > Apps & Notifications > Special App Access > Notification Access`

### Required Permissions
- `BIND_NOTIFICATION_LISTENER_SERVICE`
- `FOREGROUND_SERVICE`
- `INTERNET`
- `RECEIVE_BOOT_COMPLETED`

## Struktur Folder

```
src/
├── config/           # Environment config & constants
├── services/         # Core business logic services
│   ├── NotificationListener.ts
│   ├── TransactionParser.ts
│   ├── EncryptionService.ts
│   ├── APIClient.ts
│   └── OfflineQueue.ts
├── screens/          # UI screens
│   ├── HomeScreen.tsx
│   ├── SetupScreen.tsx
│   └── LogScreen.tsx
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── types/            # TypeScript interfaces
├── utils/            # Helper utilities
└── navigation/       # React Navigation setup
```
