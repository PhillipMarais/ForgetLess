package app.mts.forgetless.device

import android.Manifest
import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.database.sqlite.SQLiteDatabase
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowInsets
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import java.io.File
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * A small popup over the home screen for adding a task, a note or a voice note straight from a
 * widget, without opening the app. Opened by forgetless-quick://task, ://note or ://voice.
 * It writes to the app's database itself, then asks the widgets to redraw.
 */
class QuickAddActivity : Activity() {
  private enum class Mode { TASK, NOTE, VOICE }

  private lateinit var mode: Mode
  private lateinit var palette: Appearance
  private lateinit var titleInput: EditText
  private var bodyInput: EditText? = null
  private var micButton: TextView? = null
  private var statusText: TextView? = null
  private lateinit var saveButton: TextView

  /** Task: days from today it is due, or null for no date. */
  private var dueDays: Int? = null
  private var categoryId: String? = null
  private var defaultTitle = ""

  private var recognizer: SpeechRecognizer? = null
  private var listening = false
  /** Pauses with nothing heard in a row; listening stops after a few. */
  private var silentTries = 0

  private val databaseFile by lazy { File(filesDir, "SQLite/forgetless.db") }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    mode = when (intent.data?.host) {
      "note" -> Mode.NOTE
      "voice" -> Mode.VOICE
      else -> Mode.TASK
    }
    palette = Appearance.load(this)

    // The app has never run (or is older than this popup): open the app instead.
    if (!databaseReady()) {
      openApp(null)
      return
    }

    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    window.setSoftInputMode(
      WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
        (if (mode == Mode.VOICE) WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
        else WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE),
    )
    if (mode == Mode.TASK) dueDays = if (readSetting("taskDefaultDate") == true) 0 else null
    setContentView(buildLayout())

    if (mode == Mode.VOICE) startListening()
    else titleInput.requestFocus()
  }

  override fun onDestroy() {
    recognizer?.destroy()
    recognizer = null
    super.onDestroy()
  }

  // --- Layout -------------------------------------------------------------------------------

  private fun dp(value: Int) =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun rounded(color: Int, radius: Int, stroke: Int? = null) = GradientDrawable().apply {
    cornerRadius = dp(radius).toFloat()
    setColor(color)
    if (stroke != null) setStroke(dp(1), stroke)
  }

  private fun label(value: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
    text = value
    setTextColor(color)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    if (bold) typeface = Typeface.DEFAULT_BOLD
  }

  private fun input(hint: String, multiline: Boolean) = EditText(this).apply {
    this.hint = hint
    setHintTextColor(palette.textSecondary)
    setTextColor(palette.text)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, if (multiline) 16f else 18f)
    background = rounded(palette.surface, 12)
    setPadding(dp(14), dp(12), dp(14), dp(12))
    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or
      (if (multiline) InputType.TYPE_TEXT_FLAG_MULTI_LINE else 0)
    if (multiline) {
      minLines = 3
      maxLines = 8
      gravity = Gravity.TOP or Gravity.START
    } else {
      maxLines = 1
      imeOptions = EditorInfo.IME_ACTION_DONE
    }
  }

  private fun button(value: String, filled: Boolean, onClick: () -> Unit) = TextView(this).apply {
    text = value
    gravity = Gravity.CENTER
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
    typeface = Typeface.DEFAULT_BOLD
    setTextColor(if (filled) palette.onAccent else palette.text)
    background = if (filled) rounded(palette.accent, 28) else rounded(Color.TRANSPARENT, 28, palette.border)
    setPadding(dp(16), dp(14), dp(16), dp(14))
    setOnClickListener { onClick() }
  }

  /** A row of single-choice chips; returns the row. */
  private fun <T> chips(options: List<Pair<String, T>>, selected: T, onPick: (T) -> Unit): View {
    val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    val views = mutableListOf<Pair<TextView, T>>()
    fun paint(current: T) = views.forEach { (view, value) ->
      val on = value == current
      view.setTextColor(if (on) palette.onAccent else palette.textSecondary)
      view.background = if (on) rounded(palette.accent, 20) else rounded(Color.TRANSPARENT, 20, palette.border)
    }
    options.forEach { (text, value) ->
      val chip = label(text, 14f, palette.textSecondary).apply {
        setPadding(dp(14), dp(7), dp(14), dp(7))
        setOnClickListener {
          onPick(value)
          paint(value)
        }
      }
      views.add(chip to value)
      row.addView(chip, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { marginEnd = dp(8) })
    }
    paint(selected)
    return HorizontalScrollView(this).apply {
      isHorizontalScrollBarEnabled = false
      addView(row)
    }
  }

  private fun buildLayout(): View {
    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.argb(140, 0, 0, 0))
      // Tapping outside the card closes it, like a dialog.
      setOnClickListener { finish() }
    }
    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      isClickable = true
      background = GradientDrawable().apply {
        val radius = dp(24).toFloat()
        cornerRadii = floatArrayOf(radius, radius, radius, radius, 0f, 0f, 0f, 0f)
        setColor(palette.background)
      }
      setPadding(dp(20), dp(12), dp(20), dp(20))
    }
    fun add(view: View, top: Int = 12) =
      card.addView(view, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(top) })

    // Handle bar and title.
    card.addView(
      View(this).apply { background = rounded(palette.border, 3) },
      LinearLayout.LayoutParams(dp(40), dp(5)).apply { gravity = Gravity.CENTER_HORIZONTAL },
    )
    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val heading = when (mode) {
      Mode.TASK -> "Add task"
      Mode.NOTE -> "New note"
      Mode.VOICE -> "Voice note"
    }
    header.addView(label(heading, 20f, palette.text, bold = true), LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
    header.addView(label("✕", 22f, palette.textSecondary).apply {
      contentDescription = "Close"
      setPadding(dp(12), dp(4), dp(4), dp(4))
      setOnClickListener { finish() }
    })
    add(header)

    titleInput = input(if (mode == Mode.TASK) "What needs doing?" else "Title", multiline = false)
    if (mode == Mode.VOICE) {
      // The date and time is a stand-in title until you tap it to type your own.
      defaultTitle = voiceTitle()
      titleInput.setText(defaultTitle)
      titleInput.setOnFocusChangeListener { _, focused ->
        val current = titleInput.text.toString()
        if (focused && current == defaultTitle) titleInput.setText("")
        if (!focused && current.isBlank()) titleInput.setText(defaultTitle)
      }
    }
    titleInput.setOnEditorActionListener { _, action, _ ->
      if (action == EditorInfo.IME_ACTION_DONE && mode == Mode.TASK) {
        save()
        true
      } else false
    }
    add(titleInput)

    if (mode == Mode.TASK) {
      add(chips(listOf("No date" to null, "Today" to 0, "Tomorrow" to 1), dueDays) { dueDays = it })
    } else {
      if (mode == Mode.VOICE) {
        micButton = button("", filled = false) { if (listening) stopListening() else startListening() }
        add(micButton!!)
        statusText = label("Language: ${speechLanguageName()}", 13f, palette.textSecondary).apply {
          gravity = Gravity.CENTER
        }
        add(statusText!!, top = 6)
        paintMic()
      }
      bodyInput = input(if (mode == Mode.VOICE) "What you say appears here. You can also type." else "Start writing…", multiline = true)
      add(bodyInput!!)
      val categories = readCategories()
      if (categories.isNotEmpty()) {
        val none = if (mode == Mode.VOICE) "Voice notes" else "No category"
        add(chips(listOf<Pair<String, String?>>(none to null) + categories.map { it.second to it.first }, null) { categoryId = it })
      }
    }

    val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    buttons.addView(
      button("Open app", filled = false) { openInApp() },
      LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f).apply { marginEnd = dp(8) },
    )
    saveButton = button(if (mode == Mode.TASK) "Add" else "Save", filled = true) { save() }
    buttons.addView(saveButton, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
    add(buttons, top = 16)

    // Keep the card above the keyboard and the navigation bar.
    root.setOnApplyWindowInsetsListener { view, insets ->
      val bottom = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        maxOf(insets.getInsets(WindowInsets.Type.ime()).bottom, insets.getInsets(WindowInsets.Type.navigationBars()).bottom)
      } else {
        @Suppress("DEPRECATION")
        insets.systemWindowInsetBottom
      }
      view.setPadding(0, 0, 0, bottom)
      insets
    }
    root.addView(card, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT, Gravity.BOTTOM))
    card.setOnClickListener { }

    val watcher = object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      override fun afterTextChanged(s: Editable?) = paintSave()
    }
    titleInput.addTextChangedListener(watcher)
    bodyInput?.addTextChangedListener(watcher)
    paintSave()
    return root
  }

  private fun canSave() = when (mode) {
    Mode.TASK -> titleInput.text.isNotBlank()
    Mode.NOTE -> titleInput.text.isNotBlank() || bodyInput?.text?.isNotBlank() == true
    Mode.VOICE -> bodyInput?.text?.isNotBlank() == true
  }

  private fun paintSave() {
    saveButton.alpha = if (canSave()) 1f else 0.5f
  }

  private fun paintMic() {
    val mic = micButton ?: return
    mic.text = if (listening) "●  Listening… tap to stop" else "🎤  Speak"
    mic.setTextColor(if (listening) palette.onAccent else palette.accent)
    mic.background = if (listening) rounded(palette.accent, 28) else rounded(Color.TRANSPARENT, 28, palette.accent)
  }

  private fun voiceTitle(): String {
    val now = Date()
    val day = java.text.SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(now)
    return "$day, ${DateFormat.getTimeFormat(this).format(now)}"
  }

  // --- Saving -------------------------------------------------------------------------------

  private fun databaseReady(): Boolean {
    if (!databaseFile.exists()) return false
    return try {
      SQLiteDatabase.openDatabase(databaseFile.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
        // Version 6 added voice notes; older databases are upgraded by the app.
        db.version >= 6
      }
    } catch (_: Exception) {
      false
    }
  }

  private fun save() {
    if (!canSave()) return
    if (listening) stopListening()
    val now = System.currentTimeMillis()
    try {
      SQLiteDatabase.openDatabase(databaseFile.path, null, SQLiteDatabase.OPEN_READWRITE).use { db ->
        if (mode == Mode.TASK) {
          val due = dueDays?.let { days ->
            Calendar.getInstance().apply {
              set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
              add(Calendar.DAY_OF_MONTH, days)
            }.timeInMillis
          }
          db.execSQL(
            "INSERT INTO tasks (id, title, notes, due_at, due_all_day, time_zone, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)",
            arrayOf<Any?>(UUID.randomUUID().toString(), titleInput.text.toString().trim(), due, if (due != null) 1 else 0, TimeZone.getDefault().id, now, now),
          )
        } else {
          val title = titleInput.text.toString().trim().ifEmpty { defaultTitle }
          db.execSQL(
            "INSERT INTO notes (id, title, body, pinned, category_id, kind, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)",
            arrayOf<Any?>(UUID.randomUUID().toString(), title, bodyInput?.text.toString().trim(), categoryId, if (mode == Mode.VOICE) "voice" else null, now, now),
          )
        }
      }
    } catch (error: Exception) {
      Toast.makeText(this, "Couldn’t save. Try again in the app.", Toast.LENGTH_LONG).show()
      return
    }
    refreshWidgets()
    Toast.makeText(applicationContext, if (mode == Mode.TASK) "Task added" else "Note saved", Toast.LENGTH_SHORT).show()
    finish()
  }

  /** Asks every ForgetLess widget to redraw with the new task or note. */
  private fun refreshWidgets() {
    val manager = AppWidgetManager.getInstance(this)
    for (name in listOf("Today", "Calendar", "Tasks", "Notes")) {
      val component = ComponentName(packageName, "$packageName.widget.$name")
      val ids = try { manager.getAppWidgetIds(component) } catch (_: Exception) { intArrayOf() }
      if (ids.isEmpty()) continue
      sendBroadcast(
        Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
          .setComponent(component)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids),
      )
    }
  }

  // --- Opening the app ----------------------------------------------------------------------

  private fun openApp(link: String?) {
    val intent = if (link != null) {
      Intent(Intent.ACTION_VIEW, Uri.parse(link)).setPackage(packageName)
    } else {
      packageManager.getLaunchIntentForPackage(packageName)
    }
    intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let { startActivity(it) }
    finish()
  }

  /** "Open app": carries on in the full editor (time, repeat, alarm, pictures). */
  private fun openInApp() {
    if (listening) stopListening()
    val title = Uri.encode(titleInput.text.toString().trim())
    openApp(
      when (mode) {
        Mode.TASK -> "forgetless:///task/new?title=$title"
        Mode.NOTE -> "forgetless:///note/new"
        Mode.VOICE -> "forgetless:///voice-note"
      },
    )
  }

  // --- Settings and categories from the database ---------------------------------------------

  /** A setting's stored JSON value (string, boolean or number), or null. */
  private fun readSetting(key: String): Any? = try {
    SQLiteDatabase.openDatabase(databaseFile.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
      db.rawQuery("SELECT value FROM settings WHERE key = ?", arrayOf(key)).use { cursor ->
        if (cursor.moveToFirst()) JSONArray("[${cursor.getString(0)}]").get(0) else null
      }
    }
  } catch (_: Exception) {
    null
  }

  private fun readCategories(): List<Pair<String, String>> = try {
    SQLiteDatabase.openDatabase(databaseFile.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
      db.rawQuery("SELECT id, name FROM note_categories WHERE deleted_at IS NULL ORDER BY sort_order, name", null).use { cursor ->
        buildList { while (cursor.moveToNext()) add(cursor.getString(0) to cursor.getString(1)) }
      }
    }
  } catch (_: Exception) {
    emptyList()
  }

  // --- Speech --------------------------------------------------------------------------------

  /** "af-ZA" from Settings → General → Voice notes language; "phone" is the phone's language. */
  private fun speechLanguage(): String {
    val setting = readSetting("speechLanguage") as? String
    return if (setting.isNullOrEmpty() || setting == "phone") Locale.getDefault().toLanguageTag() else setting
  }

  private fun speechLanguageName(): String {
    val tag = speechLanguage()
    return Locale.forLanguageTag(tag).getDisplayName(Locale.forLanguageTag(tag)).replaceFirstChar { it.uppercase() }
  }

  private fun startListening() {
    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), MIC_REQUEST)
      return
    }
    if (!SpeechRecognizer.isRecognitionAvailable(this)) {
      statusText?.text = "Speech to text isn’t available on this phone."
      return
    }
    listening = true
    silentTries = 0
    paintMic()
    // A short ping so you know when to talk, then listen once it has finished.
    try {
      val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
      tone.startTone(ToneGenerator.TONE_PROP_BEEP, 160)
      Handler(Looper.getMainLooper()).postDelayed({ tone.release() }, 400)
    } catch (_: Exception) {
    }
    Handler(Looper.getMainLooper()).postDelayed({ if (listening) listenOnce() }, 250)
  }

  private fun listenOnce() {
    val speech = recognizer ?: SpeechRecognizer.createSpeechRecognizer(this).also { recognizer = it }
    speech.setRecognitionListener(listener)
    speech.startListening(
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, speechLanguage())
        .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true),
    )
  }

  private fun stopListening() {
    listening = false
    recognizer?.stopListening()
    paintMic()
    statusText?.text = "Language: ${speechLanguageName()}"
  }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) {
      statusText?.text = "Listening in ${speechLanguageName()}…"
    }
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onPartialResults(partialResults: Bundle?) {
      val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
      if (!text.isNullOrBlank()) statusText?.text = text
    }

    override fun onResults(results: Bundle?) {
      val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()
      if (!text.isNullOrEmpty()) {
        silentTries = 0
        appendSentence(text)
      }
      // Keep listening through pauses until Stop.
      if (listening) listenOnce()
    }

    override fun onError(error: Int) {
      when (error) {
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
          silentTries++
          if (listening && silentTries < 3) {
            listenOnce()
            return
          }
        }
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
          statusText?.text = "Microphone access is off. Turn it on in your phone settings."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
          statusText?.text = "Speech needs an internet connection on this phone."
        12, 13 -> // ERROR_LANGUAGE_NOT_SUPPORTED, ERROR_LANGUAGE_UNAVAILABLE (Android 12+)
          statusText?.text = "${speechLanguageName()} isn’t available for speech on this phone."
        else -> statusText?.text = "Couldn’t hear that. Tap Speak to try again."
      }
      listening = false
      paintMic()
    }
  }

  private fun appendSentence(sentence: String) {
    val body = bodyInput ?: return
    val current = body.text.toString().trimEnd()
    val next = sentence.replaceFirstChar { it.uppercase() }
    body.setText(if (current.isEmpty()) next else if (current.last() in ".!?") "$current $next" else "$current. $next")
    body.setSelection(body.text.length)
  }

  @Deprecated("Deprecated in Android 13; still called on older versions.")
  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == MIC_REQUEST && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startListening()
    else statusText?.text = "Microphone access is off. Turn it on in your phone settings."
  }

  override fun finish() {
    // Hide the keyboard with the popup.
    (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)?.hideSoftInputFromWindow(window.decorView.windowToken, 0)
    super.finish()
  }

  companion object {
    private const val MIC_REQUEST = 41
  }
}
