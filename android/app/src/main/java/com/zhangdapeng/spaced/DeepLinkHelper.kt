package com.zhangdapeng.spaced

import android.content.Context
import android.content.Intent

object DeepLinkHelper {
    /**
     * 构建打开 Web 层某个路由的 Intent。
     * Capacitor 使用 "app://{scheme}/{path}" 形式的 deep link。
     */
    fun reviewIntent(context: Context, cardId: String): Intent {
        val flags = Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        return context.packageManager.getLaunchIntentForPackage(context.packageName)!!
            .apply {
                this.flags = flags
                data = "app://zhangdapeng/#/review?cardId=$cardId".toUri()
            }
    }
}

private fun String.toUri(): android.net.Uri = android.net.Uri.parse(this)
