// ============================================
// FinTrack Android - Native NotificationListenerService
// ============================================
// Place this file at:
// android/app/src/main/java/com/fintrack/FinTrackNotificationListener.kt

package com.fintrack

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Android NotificationListenerService that captures notifications
 * from target banking apps and forwards them to React Native.
 *
 * Required in AndroidManifest.xml:
 * <service
 *     android:name=".FinTrackNotificationListener"
 *     android:label="FinTrack Notification Listener"
 *     android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
 *     android:exported="false">
 *     <intent-filter>
 *         <action android:name="android.service.notification.NotificationListenerService" />
 *     </intent-filter>
 * </service>
 */
class FinTrackNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "FinTrackNotifListener"
        
        // Target package names — updated from React Native side
        var targetPackages: Set<String> = setOf(
            "id.co.bri.brimo",
            "com.bca.mobile",
            "com.mandiri.mobilebanking",
            "com.bni.mobilebanking"
        )
        
        // Reference to emit events to React Native
        var reactContext: com.facebook.react.bridge.ReactApplicationContext? = null
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return

        val packageName = sbn.packageName
        if (!targetPackages.contains(packageName)) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
        val subText = extras.getCharSequence("android.subText")?.toString() ?: ""

        Log.d(TAG, "Notification from $packageName: $text")

        // Send to React Native
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("title", title)
            putString("text", text)
            putString("bigText", bigText)
            putString("subText", subText)
            putDouble("timestamp", sbn.postTime.toDouble())
        }

        try {
            reactContext?.getJSModule(
                DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
            )?.emit("onNotificationReceived", params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit event to RN: ${e.message}")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Optional: track notification dismissals
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationListenerService connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListenerService disconnected")
    }
}
