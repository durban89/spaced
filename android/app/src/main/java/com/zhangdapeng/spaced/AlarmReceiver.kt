package com.zhangdapeng.spaced

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.net.toUri

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != NotificationSchedulerPlugin.ACTION_REVIEW_ALARM) return

        val cardId = intent.getStringExtra(NotificationSchedulerPlugin.EXTRA_CARD_ID) ?: return
        val question = intent.getStringExtra(NotificationSchedulerPlugin.EXTRA_QUESTION) ?: "Review due"
        val category = intent.getStringExtra(NotificationSchedulerPlugin.EXTRA_CATEGORY) ?: ""

        val contentIntent = PendingIntent.getActivity(
            context,
            cardId.hashCode(),
            DeepLinkHelper.reviewIntent(context, cardId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, NotificationSchedulerPlugin.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_name)
            .setContentTitle(question)
            .setContentText(category.ifBlank { "到复习时间了" })
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)

        val notificationId = cardId.hashCode()

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
            androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            // permission not granted; drop silently
        }
    }
}
