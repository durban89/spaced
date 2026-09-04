package com.zhangdapeng.spaced

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "NotificationScheduler",
    permissions = [
        Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS]),
        Permission(alias = "alarm", strings = [Manifest.permission.SCHEDULE_EXACT_ALARM])
    ]
)
class NotificationSchedulerPlugin : Plugin() {

    override fun load() {
        createChannel()
        super.load()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Review Reminders",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "到复习时间了"
        }
        manager.createNotificationChannel(channel)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("notifications", call, "permissionCallback")
        } else {
            val result = JSObject().put("granted", true)
            call.resolve(result)
        }
    }

    @PluginMethod
    fun testNotification(call: PluginCall) {
        try {
            val notificationId = System.currentTimeMillis().toInt()
            val builder = androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle("测试通知 Spaced")
                .setContentText("通知链路正常 ✓ 到复习时间请查收")
                .setAutoCancel(true)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_REMINDER)
            var ok = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                ok = false
            }
            if (ok) {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(notificationId, builder.build())
            }
            android.util.Log.d("NotifScheduler", "testNotification ok=$ok notifId=$notificationId")
            call.resolve(JSObject().put("ok", ok))
        } catch (e: Exception) {
            android.util.Log.e("NotifScheduler", "testNotification failed", e)
            call.reject("testNotification failed: ${e.message}")
        }
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        android.util.Log.d("NotifScheduler", "checkPermission sdk=${Build.VERSION.SDK_INT} granted=$granted")
        call.resolve(JSObject().put("granted", granted))
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().put("granted", granted))
    }

    @PluginMethod
    fun scheduleCard(call: PluginCall) {
        val cardId = call.getString("cardId") ?: run {
            return call.reject("cardId required")
        }
        val question = call.getString("question") ?: "Review due"
        val category = call.getString("category") ?: ""
        val nextReviewMs = call.getLong("nextReviewMs") ?: run {
            return call.reject("nextReviewMs required")
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_REVIEW_ALARM
            putExtra(EXTRA_CARD_ID, cardId)
            putExtra(EXTRA_QUESTION, question)
            putExtra(EXTRA_CATEGORY, category)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            cardId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                alarmManager.canScheduleExactAlarms()
            if (canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // 精确闹钟权限未授予（Android 12+ 默认拒绝，尤其华为/荣耀），降级为非精确
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
            }
            android.util.Log.d("NotifScheduler", "scheduled card=$cardId next=$nextReviewMs exact=$canExact")
        } catch (e: SecurityException) {
            // 权限缺失时降级为非精确闹钟
            try {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
            } catch (e2: Exception) {
                call.reject("schedule failed: ${e2.message}")
                return
            }
        }

        call.resolve()
    }

    @PluginMethod
    fun cancelCard(call: PluginCall) {
        val cardId = call.getString("cardId")
        if (cardId == null) return call.reject("cardId required")

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply { action = ACTION_REVIEW_ALARM }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            cardId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
        call.resolve()
    }

    companion object {
        const val CHANNEL_ID = "review_reminders"
        const val ACTION_REVIEW_ALARM = "com.zhangdapeng.spaced.REVIEW_ALARM"
        const val EXTRA_CARD_ID = "card_id"
        const val EXTRA_QUESTION = "question"
        const val EXTRA_CATEGORY = "category"
        const val EXTRA_NOTIFICATION_ID = "notif_id"
    }
}
