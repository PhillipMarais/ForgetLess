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
      intent.getStringExtra(Alarms.EXTRA_TITLE) ?: "ForgetLess",
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
    // Exported for the system's broadcasts; anything else sent to it is ignored.
    if (intent.action !in RESTORE_ACTIONS) return
    Alarms.restore(context)
  }

  private companion object {
    val RESTORE_ACTIONS = setOf(
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
    )
  }
}
