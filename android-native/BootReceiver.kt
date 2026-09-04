package com.aosibin.spaced

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        // 设备重启后，Web 层并不知道之前排期的卡片。
        // 通过重新初始化 Web 逻辑或从本地缓存恢复可选的排期表。
        // 此处启动 MainActivity 触发 Web 层重新同步 (可选, 需根据业务决定是否自动启动)。
    }
}
