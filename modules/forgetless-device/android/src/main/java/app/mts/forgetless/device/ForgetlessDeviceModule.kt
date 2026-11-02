package app.mts.forgetless.device

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream

class AlarmRecord : Record {
  @Field var id: String = ""
  @Field var at: Double = 0.0
  @Field var title: String = ""
  @Field var body: String = ""
}

class AlarmConfigRecord : Record {
  @Field var soundUri: String? = null
  @Field var vibrate: Boolean = true
  @Field var snoozeMinutes: Int = 10
}

/** ForgetLess's own Android features: alarms, alarm sounds, a ping, and PDF pages as pictures. */
class ForgetlessDeviceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var preview: Ringtone? = null

  override fun definition() = ModuleDefinition {
    Name("ForgetlessDevice")

    // --- Alarms ---------------------------------------------------------------------------

    Function("setAlarms") { alarms: List<AlarmRecord>, config: AlarmConfigRecord ->
      Alarms.setConfig(context, AlarmConfig(config.soundUri, config.vibrate, config.snoozeMinutes))
      Alarms.replaceAll(context, alarms.map { Alarm(it.id, it.at.toLong(), it.title, it.body) })
    }

    Function("testAlarm") { title: String, body: String ->
      Alarms.ring(context, Alarm("test", System.currentTimeMillis(), title, body))
    }

    Function("alarmPermissions") {
      val notifications = NotificationManagerCompat.from(context).areNotificationsEnabled()
      val fullScreen =
        if (Build.VERSION.SDK_INT >= 34) {
          context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
        } else {
          true
        }
      mapOf(
        "notifications" to notifications,
        "exactAlarms" to Alarms.canScheduleExact(context),
        "fullScreen" to fullScreen,
      )
    }

    Function("openAlarmSettings") { which: String ->
      val pkg = Uri.parse("package:${context.packageName}")
      val intent = when {
        which == "fullScreen" && Build.VERSION.SDK_INT >= 34 ->
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg)
        which == "exactAlarms" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
      }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** The phone's alarm sounds, by name. */
    Function("alarmSounds") {
      val manager = RingtoneManager(context).apply { setType(RingtoneManager.TYPE_ALARM) }
      val sounds = mutableListOf<Map<String, String>>()
      manager.cursor.use { cursor ->
        while (cursor.moveToNext()) {
          sounds.add(
            mapOf(
              "title" to cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX),
              "uri" to manager.getRingtoneUri(cursor.position).toString(),
            ),
          )
        }
      }
      sounds
    }

    Function("previewSound") { uri: String? ->
      preview?.stop()
      val sound = Alarms.soundUri(context, AlarmConfig(uri, false, 10))
      preview = RingtoneManager.getRingtone(context, sound)?.apply {
        audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        play()
      }
    }

    Function("stopPreview") {
      preview?.stop()
      preview = null
    }

    /** The app's theme colours, for the alarm screen and the quick-add popups. */
    Function("setAppearance") { colors: Map<String, Any?> ->
      Appearance.save(context, colors)
    }

    /** A short "ping", e.g. when a voice note starts listening. */
    Function("playPing") {
      val tone = ToneGenerator(android.media.AudioManager.STREAM_NOTIFICATION, 90)
      tone.startTone(ToneGenerator.TONE_PROP_BEEP, 160)
      Handler(Looper.getMainLooper()).postDelayed({ tone.release() }, 400)
    }

    /** Sends the app to the background, back to the home screen (like pressing Home). */
    Function("moveToBack") {
      appContext.currentActivity?.let { activity -> activity.runOnUiThread { activity.moveTaskToBack(true) } }
    }

    OnDestroy {
      preview?.stop()
    }

    // --- PDFs -----------------------------------------------------------------------------

    AsyncFunction("pdfPageCount") { uri: String ->
      openPdf(uri).use { (_, renderer) -> renderer.pageCount }
    }

    /** Renders one page `width` pixels wide to a cached JPEG and returns its file URI and size. */
    AsyncFunction("renderPdfPage") { uri: String, index: Int, width: Int ->
      val directory = File(context.cacheDir, "pdf-pages").apply { mkdirs() }
      val out = File(directory, "${uri.hashCode().toUInt()}-$index-$width.jpg")
      openPdf(uri).use { (_, renderer) ->
        renderer.openPage(index).use { page ->
          val height = (width.toDouble() * page.height / page.width).toInt()
          if (!out.exists()) {
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            FileOutputStream(out).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it) }
            bitmap.recycle()
          }
          mapOf("uri" to Uri.fromFile(out).toString(), "width" to width, "height" to height)
        }
      }
    }
  }

  private class OpenPdf(val descriptor: ParcelFileDescriptor, val renderer: PdfRenderer) : AutoCloseable {
    operator fun component1() = descriptor
    operator fun component2() = renderer

    override fun close() {
      renderer.close()
      descriptor.close()
    }
  }

  private fun openPdf(uri: String): OpenPdf {
    val descriptor = context.contentResolver.openFileDescriptor(Uri.parse(uri), "r")
      ?: throw IllegalArgumentException("Could not open $uri")
    return OpenPdf(descriptor, PdfRenderer(descriptor))
  }
}
