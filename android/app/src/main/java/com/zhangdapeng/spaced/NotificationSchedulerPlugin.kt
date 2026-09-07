package com.zhangdapeng.spaced

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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
import org.json.JSONObject

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

        try {
            scheduleAlarm(context, cardId, question, category, nextReviewMs)
            rememberSchedule(context, cardId, question, category, nextReviewMs)
            android.util.Log.d("NotifScheduler", "scheduled card=$cardId next=$nextReviewMs")
        } catch (e: Exception) {
            call.reject("schedule failed: ${e.message}")
            return
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
        forgetSchedule(context, cardId)
        call.resolve()
    }

    companion object {
        const val CHANNEL_ID = "review_reminders"
        const val ACTION_REVIEW_ALARM = "com.zhangdapeng.spaced.REVIEW_ALARM"
        const val EXTRA_CARD_ID = "card_id"
        const val EXTRA_QUESTION = "question"
        const val EXTRA_CATEGORY = "category"
        const val EXTRA_NOTIFICATION_ID = "notif_id"

        private const val PREFS = "spaced_alarm_schedules"
        private const val KEY_SCHEDULES = "schedules"

        @Synchronized
        fun rememberSchedule(
            context: Context,
            cardId: String,
            question: String,
            category: String,
            nextReviewMs: Long,
        ) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_SCHEDULES, "{}")?.let { runCatching { JSONObject(it) }.getOrNull() }
                ?: JSONObject()
            val entry = JSONObject()
                .put("question", question)
                .put("category", category)
                .put("nextReviewMs", nextReviewMs)
            json.put(cardId, entry)
            prefs.edit().putString(KEY_SCHEDULES, json.toString()).apply()
        }

        @Synchronized
        fun forgetSchedule(context: Context, cardId: String) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_SCHEDULES, "{}")?.let { runCatching { JSONObject(it) }.getOrNull() }
                ?: JSONObject()
            if (json.has(cardId)) {
                json.remove(cardId)
                prefs.edit().putString(KEY_SCHEDULES, json.toString()).apply()
            }
        }

        fun loadSchedules(context: Context): JSONObject {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            return prefs.getString(KEY_SCHEDULES, "{}")?.let { runCatching { JSONObject(it) }.getOrNull() }
                ?: JSONObject()
        }

        fun buildPendingIntent(
            context: Context,
            cardId: String,
            question: String,
            category: String,
        ): PendingIntent {
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = ACTION_REVIEW_ALARM
                putExtra(EXTRA_CARD_ID, cardId)
                putExtra(EXTRA_QUESTION, question)
                putExtra(EXTRA_CATEGORY, category)
            }
            return PendingIntent.getBroadcast(
                context,
                cardId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /**
         * 重新注册单个卡片的闹钟（含精确权限降级逻辑）。
         * @return true 表示注册成功。
         */
        @JvmStatic
        fun scheduleAlarm(
            context: Context,
            cardId: String,
            question: String,
            category: String,
            nextReviewMs: Long,
        ): PendingIntent {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pendingIntent = buildPendingIntent(context, cardId, question, category)
            try {
                val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                    alarmManager.canScheduleExactAlarms()
                if (canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
                }
                return pendingIntent
            } catch (e: SecurityException) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextReviewMs, pendingIntent)
                return pendingIntent
            }
        }

        /**
         * 设备重启后恢复所有持久化的闹钟（过滤掉已过期的提醒）。
         */
        @JvmStatic
        fun restoreSchedulesAfterBoot(context: Context) {
            val schedules = loadSchedules(context)
            if (schedules.length() == 0) return
            val now = System.currentTimeMillis()
            val keys = ArrayList<String>(schedules.length())
            val it = schedules.keys()
            while (it.hasNext()) keys.add(it.next())
            for (cardId in keys) {
                val entry = schedules.optJSONObject(cardId)
                if (entry == null) {
                    forgetSchedule(context, cardId)
                    continue
                }
                val next = entry.optLong("nextReviewMs", 0L)
                if (next <= now) {
                    // 重启期间已过期的提醒：清除排期，等用户打开应用后由 Web 层重排
                    forgetSchedule(context, cardId)
                    continue
                }
                try {
                    scheduleAlarm(
                        context,
                        cardId,
                        entry.optString("question", "Review due"),
                        entry.optString("category", ""),
                        next,
                    )
                } catch (e: Exception) {
                    android.util.Log.e("NotifScheduler", "restore failed card=$cardId", e)
                }
            }
        }
    }
}
