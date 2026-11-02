package app.mts.forgetless.device

import android.app.Activity
import android.graphics.Color
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
      setTextColor(if (filled) INK else PAPER)
      background = GradientDrawable().apply {
        cornerRadius = dp(32).toFloat()
        if (filled) setColor(ORANGE) else setStroke(dp(2), MUTED)
      }
      setPadding(dp(24), dp(18), dp(24), dp(18))
      setOnClickListener { onClick() }
    }

  private fun buildLayout() = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    setBackgroundColor(BACKGROUND)
    setPadding(dp(32), dp(48), dp(32), dp(48))

    addView(text("FORGETLESS", 14f, ORANGE, bold = true).apply { letterSpacing = 0.2f })
    addView(
      text(DateFormat.getTimeFormat(this@AlarmActivity).format(Date()), 72f, PAPER, bold = true),
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(24) },
    )
    addView(
      text(alarm.title, 28f, PAPER, bold = true),
      LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(16) },
    )
    if (alarm.body.isNotEmpty()) {
      addView(
        text(alarm.body, 18f, MUTED),
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
    private val BACKGROUND = Color.parseColor("#0D0D0E")
    private val PAPER = Color.parseColor("#F2EFEA")
    private val MUTED = Color.parseColor("#A8A39C")
    private val ORANGE = Color.parseColor("#FF6A13")
    private val INK = Color.parseColor("#141414")

    private var current: WeakReference<AlarmActivity>? = null

    /** Closes the alarm screen when Snooze or Dismiss is tapped on the notification instead. */
    fun closeOpen() {
      current?.get()?.finish()
    }
  }
}
