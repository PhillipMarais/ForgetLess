package app.mts.forgetless.device

import android.content.Context
import android.graphics.Color
import org.json.JSONObject

/**
 * The app's current theme colours, handed over by the app whenever the theme changes, so the
 * alarm screen and the quick-add popups look like the app (Light, Dark or Custom).
 */
data class Appearance(
  val background: Int,
  val surface: Int,
  val text: Int,
  val textSecondary: Int,
  val accent: Int,
  val onAccent: Int,
  val border: Int,
  val danger: Int,
  val dark: Boolean,
) {
  companion object {
    private const val PREFS = "forgetless_appearance"
    private const val KEY = "colors"

    /** The Dark theme: used until the app has sent its colours. */
    val DEFAULT = Appearance(
      background = Color.parseColor("#0D0D0E"),
      surface = Color.parseColor("#17171A"),
      text = Color.parseColor("#F2EFEA"),
      textSecondary = Color.parseColor("#A8A39C"),
      accent = Color.parseColor("#FF6A13"),
      onAccent = Color.parseColor("#141414"),
      border = Color.parseColor("#2A2724"),
      danger = Color.parseColor("#FF4D5E"),
      dark = true,
    )

    fun save(context: Context, colors: Map<String, Any?>) {
      val json = JSONObject()
      colors.forEach { (key, value) -> json.put(key, value) }
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json.toString()).apply()
    }

    fun load(context: Context): Appearance {
      // The quick-add popup runs in its own process, so re-read the file rather than trust a
      // copy cached before the theme last changed.
      @Suppress("DEPRECATION")
      val raw = context.getSharedPreferences(PREFS, Context.MODE_MULTI_PROCESS).getString(KEY, null) ?: return DEFAULT
      return try {
        val json = JSONObject(raw)
        fun color(key: String, fallback: Int) =
          json.optString(key).takeIf { it.isNotEmpty() }?.let { runCatching { Color.parseColor(it) }.getOrNull() } ?: fallback
        Appearance(
          background = color("background", DEFAULT.background),
          surface = color("surface", DEFAULT.surface),
          text = color("text", DEFAULT.text),
          textSecondary = color("textSecondary", DEFAULT.textSecondary),
          accent = color("accent", DEFAULT.accent),
          onAccent = color("onAccent", DEFAULT.onAccent),
          border = color("border", DEFAULT.border),
          danger = color("danger", DEFAULT.danger),
          dark = json.optBoolean("dark", true),
        )
      } catch (_: Exception) {
        DEFAULT
      }
    }
  }
}
