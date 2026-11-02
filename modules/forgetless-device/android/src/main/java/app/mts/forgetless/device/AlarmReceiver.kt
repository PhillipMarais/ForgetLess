package app.mts.forgetless.device

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fires scheduled alarms, and handles the Snooze and Dismiss buttons. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarm = Alarm(
      intent.getStringExtra(Alarms.EXTRA_ID) ?: return,
      System.currentTimeMillis(),
      intent.getStringExtra(Alarms.EXTRA_TITLE) ?: "Forgetless",
      intent.getStringExtra(Alarms.EXTRA_BODY) ?: "",
    )
    when (intent.action) {
      Alarms.ACTION_FIRE -> {
        Alarms.forget(context, alarm.id)
        Alarms.ring(context, alarm)
      }
      Alarms.ACTION_SNOOZE -> {
        Alarms.stopRinging(context, alarm)
        Alarms.snooze(context, alarm)
        AlarmActivity.closeOpen()
      }
      Alarms.ACTION_DISMISS -> {
        Alarms.stopRinging(context, alarm)
        AlarmActivity.closeOpen()
      }
    }
  }
}

/** Alarms are forgotten by the system on reboot and app updates; schedule them again. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Alarms.restore(context)
  }
}
