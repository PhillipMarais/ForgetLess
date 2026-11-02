package app.mts.forgetless.device

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/** One alarm to ring at `at` (epoch ms). `id` is stable per task or event occurrence. */
data class Alarm(val id: String, val at: Long, val title: String, val body: String) {
  fun toJson(): JSONObject =
    JSONObject().put("id", id).put("at", at).put("title", title).put("body", body)

  companion object {
    fun fromJson(json: JSONObject) =
      Alarm(json.getString("id"), json.getLong("at"), json.optString("title"), json.optString("body"))
  }
}

/** How alarms ring; chosen in the app's Alarm settings. A null sound is the phone's default. */
data class AlarmConfig(val soundUri: String?, val vibrate: Boolean, val snoozeMinutes: Int) {
  fun toJson(): JSONObject =
    JSONObject().put("soundUri", soundUri ?: JSONObject.NULL).put("vibrate", vibrate)
      .put("snoozeMinutes", snoozeMinutes)

  companion object {
    val DEFAULT = AlarmConfig(null, true, 10)

    fun fromJson(json: JSONObject?) =
      if (json == null) DEFAULT
      else AlarmConfig(
        if (json.isNull("soundUri")) null else json.getString("soundUri"),
        json.optBoolean("vibrate", true),
        json.optInt("snoozeMinutes", 10),
      )
  }
}

/**
 * Schedules alarms with AlarmManager.setAlarmClock (exact, shown in the status bar, allowed
 * in Doze) and keeps the list in SharedPreferences so BootReceiver can restore it.
 * The app replaces the whole list whenever tasks or events change.
 */
object Alarms {
  const val ACTION_FIRE = "app.mts.forgetless.alarm.FIRE"
  const val ACTION_DISMISS = "app.mts.forgetless.alarm.DISMISS"
  const val ACTION_SNOOZE = "app.mts.forgetless.alarm.SNOOZE"
  const val EXTRA_ID = "id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"

  private const val PREFS = "forgetless_alarms"
  private const val KEY_ALARMS = "alarms"
  private const val KEY_CONFIG = "config"
  private const val CHANNEL_PREFIX = "alarms_"
  /** Ringing stops by itself after this long, like a clock app. */
  private const val RING_TIMEOUT_MS = 10 * 60 * 1000L

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun stored(context: Context): List<Alarm> {
    val raw = prefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
    val array = JSONArray(raw)
    return (0 until array.length()).map { Alarm.fromJson(array.getJSONObject(it)) }
  }

  private fun store(context: Context, alarms: List<Alarm>) {
    val array = JSONArray()
    alarms.forEach { array.put(it.toJson()) }
    prefs(context).edit().putString(KEY_ALARMS, array.toString()).apply()
  }

  fun config(context: Context): AlarmConfig =
    AlarmConfig.fromJson(prefs(context).getString(KEY_CONFIG, null)?.let { JSONObject(it) })

  fun setConfig(context: Context, config: AlarmConfig) {
    prefs(context).edit().putString(KEY_CONFIG, config.toJson().toString()).apply()
  }

  /** Cancels every stored alarm, then schedules `alarms` (past ones are skipped). */
  fun replaceAll(context: Context, alarms: List<Alarm>) {
    val now = System.currentTimeMillis()
    // Keep snoozes: they come from the alarm screen, not from the app's data.
    val snoozed = stored(context).filter { it.id.startsWith("snooze:") && it.at > now }
    stored(context).forEach { cancel(context, it) }
    val upcoming = alarms.filter { it.at > now } + snoozed
    store(context, upcoming)
    upcoming.forEach { schedule(context, it) }
  }

  /** Schedules the stored alarms again, e.g. after a reboot (the system forgets them). */
  fun restore(context: Context) {
    val now = System.currentTimeMillis()
    val upcoming = stored(context).filter { it.at > now }
    store(context, upcoming)
    upcoming.forEach { schedule(context, it) }
  }

  fun snooze(context: Context, alarm: Alarm) {
    val minutes = config(context).snoozeMinutes
    val baseId = alarm.id.removePrefix("snooze:")
    val snoozed = Alarm("snooze:$baseId", System.currentTimeMillis() + minutes * 60_000L, alarm.title, alarm.body)
    store(context, stored(context).filter { it.id != snoozed.id } + snoozed)
    schedule(context, snoozed)
  }

  fun forget(context: Context, id: String) {
    store(context, stored(context).filter { it.id != id })
  }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
  }

  private fun schedule(context: Context, alarm: Alarm) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val fire = firePendingIntent(context, alarm)
    if (canScheduleExact(context)) {
      val show = PendingIntent.getActivity(
        context,
        alarm.id.hashCode(),
        context.packageManager.getLaunchIntentForPackage(context.packageName),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      manager.setAlarmClock(AlarmManager.AlarmClockInfo(alarm.at, show), fire)
    } else {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, fire)
    }
  }

  private fun cancel(context: Context, alarm: Alarm) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(firePendingIntent(context, alarm))
  }

  private fun alarmIntent(context: Context, action: String, alarm: Alarm) =
    Intent(context, AlarmReceiver::class.java)
      .setAction(action)
      // A distinct data URI per alarm keeps their PendingIntents apart.
      .setData(Uri.parse("forgetless-alarm://${Uri.encode(alarm.id)}"))
      .putExtra(EXTRA_ID, alarm.id)
      .putExtra(EXTRA_TITLE, alarm.title)
      .putExtra(EXTRA_BODY, alarm.body)

  private fun firePendingIntent(context: Context, alarm: Alarm) =
    PendingIntent.getBroadcast(
      context,
      alarm.id.hashCode(),
      alarmIntent(context, ACTION_FIRE, alarm),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  fun actionPendingIntent(context: Context, action: String, alarm: Alarm) =
    PendingIntent.getBroadcast(
      context,
      (action + alarm.id).hashCode(),
      alarmIntent(context, action, alarm),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  fun notificationId(alarm: Alarm) = alarm.id.removePrefix("snooze:").hashCode()

  fun soundUri(context: Context, config: AlarmConfig): Uri =
    config.soundUri?.let { Uri.parse(it) }
      ?: RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)
      ?: Settings.System.DEFAULT_ALARM_ALERT_URI

  /**
   * A channel's sound can't change after it is created, so each sound + vibrate choice gets
   * its own channel and older alarm channels are removed.
   */
  private fun channelFor(context: Context, config: AlarmConfig): String {
    val id = CHANNEL_PREFIX + (config.soundUri + ":" + config.vibrate).hashCode().toUInt()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return id
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.notificationChannels
      .filter { it.id.startsWith(CHANNEL_PREFIX) && it.id != id }
      .forEach { manager.deleteNotificationChannel(it.id) }
    if (manager.getNotificationChannel(id) == null) {
      val channel = NotificationChannel(id, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Alarms for your tasks and events"
        setSound(
          soundUri(context, config),
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        enableVibration(config.vibrate)
        if (config.vibrate) vibrationPattern = longArrayOf(0, 800, 600, 800, 600)
        setBypassDnd(true)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }
    return id
  }

  /** Rings: a full-screen alarm when the phone is locked, otherwise a heads-up notification. */
  fun ring(context: Context, alarm: Alarm) {
    val config = config(context)
    val screen = PendingIntent.getActivity(
      context,
      notificationId(alarm),
      Intent(context, AlarmActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        .putExtra(EXTRA_ID, alarm.id)
        .putExtra(EXTRA_TITLE, alarm.title)
        .putExtra(EXTRA_BODY, alarm.body),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val notification = NotificationCompat.Builder(context, channelFor(context, config))
      .setSmallIcon(R.drawable.ic_stat_alarm)
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setColor(0xFFFF6A13.toInt())
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(RING_TIMEOUT_MS)
      .setContentIntent(screen)
      .setFullScreenIntent(screen, true)
      .setSound(soundUri(context, config), AudioManagerStream.ALARM)
      .setVibrate(if (config.vibrate) longArrayOf(0, 800, 600, 800, 600) else null)
      .addAction(0, "Snooze ${config.snoozeMinutes} min", actionPendingIntent(context, ACTION_SNOOZE, alarm))
      .addAction(0, "Dismiss", actionPendingIntent(context, ACTION_DISMISS, alarm))
      .build()
    // Insistent: the sound repeats until the alarm is dismissed or snoozed.
    notification.flags = notification.flags or NotificationCompat.FLAG_INSISTENT
    try {
      NotificationManagerCompat.from(context).notify(notificationId(alarm), notification)
    } catch (_: SecurityException) {
      // Notifications are turned off for the app; nothing can ring.
    }
  }

  fun stopRinging(context: Context, alarm: Alarm) {
    NotificationManagerCompat.from(context).cancel(notificationId(alarm))
  }
}

/** AudioManager.STREAM_ALARM, for the pre-Android 8 notification sound. */
private object AudioManagerStream {
  const val ALARM = android.media.AudioManager.STREAM_ALARM
}
