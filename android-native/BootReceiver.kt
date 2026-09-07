package com.zhangdapeng.spaced

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        // 设备重启后，AlarmManager 中的所有闹钟都会丢失。
        // 从 SharedPreferences 恢复由 scheduleCard 持久化的未来提醒并重新注册。
        NotificationSchedulerPlugin.restoreSchedulesAfterBoot(context)
    }
}