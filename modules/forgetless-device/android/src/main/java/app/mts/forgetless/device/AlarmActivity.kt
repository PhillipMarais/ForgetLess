package app.mts.forgetless.device

import android.app.Activity
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import java.lang.ref.WeakReference
import java.util.Date

/**
 * The full-screen alarm shown over the lock screen: the time, what the alarm is for, and
 * Snooze / Dismiss. The sound comes from the alarm's notification and stops with it.
 */
class AlarmActivity : Activity() {
  private lateinit var alarm: Alarm
  /** The app's theme colours (Light, Dark or Custom). */
  private lateinit var palette: Appearance

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    current = WeakReference(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    palette = Appearance.load(this)

    alarm = Alarm(
      intent.getStringExtra(Alarms.EXTRA_ID) ?: "",
      System.currentTimeMillis(),
      intent.getStringExtra(Alarms.EXTRA_TITLE) ?: "ForgetLess",
      intent.getStringExtra(Alarms.EXTRA_BODY) ?: "",
    )
    setContentView(buildLayout())
  }

  override fun onDestroy() {
    if (current?.get() === this) current = null
    super.onDestroy()
  }

  private fun dp(value: Int) =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun text(value: String, size: Float, color: Int, bold: Boolean = false) =
    TextView(this).apply {
      text = value
      setTextColor(color)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
      gravity = Gravity.CENTER
      if (bold) typeface = Typeface.DEFAULT_BOLD
    }

  private fun button(label: String, filled: Boolean, onClick: () -> Unit) =
    TextView(this).apply {
      text = label
      gravity = Gravity.CENTER
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(if (filled) palette.onAccent else palette.text)
      background = GradientDrawable().apply {
        cornerRadius = dp(32).toFloat()
        if (filled) setColor(palette.accent) else setStroke(dp(2), palette.textSecondary)
      }
      setPadding(dp(24), dp(18), dp(24), dp(18))
      setOnClickListener { onClick() }
    }

  private fun buildLayout() = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    setBackgroundColor(palette.background)
    setPadding(dp(32), dp(48), dp(32), dp(48))

    addView(text("FORGETLESS", 14f, palette.accent, bold = true).apply { letterSpacing = 0.2f })
    addView(
      text(DateFormat.getTimeFormat(this@AlarmActivity).format(Date()), 72f, palette.text, bold = true),
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(24) },
    )
    addView(
      text(alarm.title, 28f, palette.text, bold = true),
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(16) },
    )
    if (alarm.body.isNotEmpty()) {
      addView(
        text(alarm.body, 18f, palette.textSecondary),
        LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(8) },
      )
    }
    addView(
      button("Dismiss", filled = true) { dismiss() },
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(64) },
    )
    addView(
      button("Snooze ${Alarms.config(this@AlarmActivity).snoozeMinutes} min", filled = false) { snooze() },
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(16) },
    )
  }

  private fun dismiss() {
    Alarms.stopRinging(this, alarm)
    finish()
  }

  private fun snooze() {
    Alarms.stopRinging(this, alarm)
    Alarms.snooze(this, alarm)
    finish()
  }

  @Deprecated("Deprecated in Android 13; still called on older versions.")
  override fun onBackPressed() {
    // Ignore: leaving would hide the alarm while it keeps ringing. Dismiss or snooze it.
  }

  companion object {
    private var current: WeakReference<AlarmActivity>? = null

    /** Closes the alarm screen when Snooze or Dismiss is tapped on the notification instead. */
    fun closeOpen() {
      current?.get()?.finish()
    }
  }
}
