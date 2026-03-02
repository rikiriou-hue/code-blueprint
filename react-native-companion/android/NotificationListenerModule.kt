// ============================================
// FinTrack Android - React Native Bridge Module
// ============================================
// Place this file at:
// android/app/src/main/java/com/fintrack/NotificationListenerModule.kt

package com.fintrack

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native native module that bridges the NotificationListenerService
 * to JavaScript. Provides permission checks, settings navigation, and
 * target package configuration.
 */
class NotificationListenerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        FinTrackNotificationListener.reactContext = reactContext
    }

    override fun getName(): String = "NotificationListenerModule"

    /**
     * Check if notification listener permission is granted
     */
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            val cn = ComponentName(reactApplicationContext, FinTrackNotificationListener::class.java)
            val flat = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                "enabled_notification_listeners"
            )
            val enabled = flat != null && flat.contains(cn.flattenToString())
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Open Android notification listener settings
     */
    @ReactMethod
    fun openNotificationSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to app notification settings
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        }
    }

    /**
     * Update target package names to filter notifications
     */
    @ReactMethod
    fun setTargetPackages(packages: ReadableArray) {
        val set = mutableSetOf<String>()
        for (i in 0 until packages.size()) {
            packages.getString(i)?.let { set.add(it) }
        }
        FinTrackNotificationListener.targetPackages = set
    }

    /**
     * Start listening (service is always running if permission is granted,
     * this just ensures the RN bridge is active)
     */
    @ReactMethod
    fun startListening() {
        FinTrackNotificationListener.reactContext = reactApplicationContext
    }

    /**
     * Stop emitting events to RN
     */
    @ReactMethod
    fun stopListening() {
        FinTrackNotificationListener.reactContext = null
    }
}
