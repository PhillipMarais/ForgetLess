# Releasing ForgetLess on Google Play

This is the checklist for putting ForgetLess on Play, with the answers the Play Console asks
for. The facts here match the app as of version 1.0.0 (versionCode 1).

## 1. Build

| Build | Command (in `android/`) | Signed with | Use |
| --- | --- | --- | --- |
| Play bundle | `./gradlew.bat bundleRelease` | Upload key | Upload to Play: `app/build/outputs/bundle/release/app-release.aab` |
| Test APK | `./gradlew.bat assembleRelease -Psideload` | Debug key | Sideloading onto test phones |

- Before each build, delete `android/app/build/generated/assets/react/release`, or the old
  JavaScript bundle can ship.
- After changing `app.json` or a config plugin, run
  `npx expo prebuild --platform android --no-install` first.
- For every Play upload, raise `android.versionCode` by 1 in `app.json`. Raise `version`
  (for example 1.0.1) when the change is visible to users.

### The upload key

- The keystore is at `C:\Users\User\.forgetless-keys\forgetless-upload.jks`, with alias
  `forgetless-upload`.
- Its password is in `~/.gradle/gradle.properties` and in `README-BACKUP-THIS.txt` next to it.
- `plugins/with-release-signing.js` reads it from there, so it is never part of the project.
- **Back up the .jks file and the password** in a password manager and a second place.
  Then delete the README text file.
- Turn on **Play App Signing** (the default for new apps). Google then holds the real
  signing key. If the upload key is ever lost, Play support can reset it.

### Phones with a test build

A phone running a sideloaded test build can't update to the Play version, because the two are
signed with different keys. To switch, the person has to uninstall the test build, and that
deletes everything in it.

There's no export or backup feature yet. Before testers switch, they should either re-enter
their important items, or wait for an export/import feature.

## 2. Play Console setup

1. Create the developer account (one-time US$25 fee). Choose a personal account. New personal
   accounts must run a **closed test with at least 12 testers for 14 days in a row** before
   they can publish to production. Plan for this, and check the current rule in the Console,
   because Google changes it from time to time.
2. Create the app:
   - Name: ForgetLess
   - Default language: English
   - App or game: App
   - Free or paid: Free
3. Upload the AAB to the closed testing track and add testers by email.

## 3. App content answers

**Privacy policy URL.** Required, because the app asks for the microphone and calendar. Use
https://phillipmarais.github.io/forgetless/privacy-policy.html (the site's copy of
`docs/privacy-policy.md`; keep the two the same).

**Ads.** No.

**App access.** All features work without signing in.

**Content rating questionnaire.** Category: Utility / productivity. Answer "no" to violence,
sexual content, gambling and user-to-user sharing. Expect the lowest rating (Everyone / PEGI 3).

**Target audience.** 18 and over, or 13 and over. Not designed for children.

**Data safety.**

- Does the app collect or share user data? **No.**
  - All data stays on the device.
  - The app has no internet permission. It is blocked in `app.json` (`blockedPermissions`).
  - Data handled only on the device doesn't count as "collected" under Play's definition.
- Is data encrypted in transit? Not applicable, because nothing is transmitted.
- Can users request deletion? Yes: in the app, or by uninstalling.
- Speech recognition is done by the phone's own recognition service (Google's), not by
  ForgetLess. ForgetLess receives only text.

**Government apps, financial features, health.** No.

### Permission declarations Play asks about

| Permission | What to declare |
| --- | --- |
| `USE_EXACT_ALARM` | Core function: alarm clock and calendar app. Users set alarms on tasks and events that must ring at the exact minute. |
| `USE_FULL_SCREEN_INTENT` | Core function: alarm clock. A ringing alarm shows a full-screen alarm screen over the lock screen. |
| `READ_CALENDAR` | Reads only Google holiday calendars, to show public holidays such as election days. The user can turn it off in Settings. |
| `RECORD_AUDIO` | Speech-to-text for notes. Started by the user, and no audio is stored. |

You may be asked for a short video of each feature (an alarm ringing over the lock screen, and
speaking a note). Record these on the phone with the screen recorder.

## 4. Store listing

- **App name:** ForgetLess
- **Short description (80 characters at most):** Calendar, tasks, notes and real alarms, all
  on your phone. No account, no ads.
- **Full description (draft):**

  > ForgetLess keeps your day in one place: a calendar, tasks, notes and alarms that really
  > ring.
  >
  > • Calendar with day, week and month views, and public holidays for your country
  > • Tasks with dates, repeats and steps; tick them off from the home screen
  > • Notes with categories, pictures, PDFs and voice-to-text
  > • Real alarms that ring through silent mode and over the lock screen
  > • Home screen widgets: Today, Calendar, Tasks, Notes and Voice note
  > • Light, dark or your own colours
  >
  > Private by design: everything stays on your phone. There's no account and no ads, and the
  > app has no internet access.

- **Graphics** are in `store/`:
  - `play-icon-512.png` (app icon) and `feature-graphic.png` (1024×500). Both are drawn by
    `node scripts/generate-brand-assets.mjs` from `assets/brand/app-icon.svg`.
  - `phone/` (1080×1920) and `tablet/` (2560×1600, used for both 7-inch and 10-inch tablets).
    Play rejects screenshots whose long side is more than twice the short side, so phone
    screenshots can't come from a 20:9 phone such as the S25 FE.
- **Retaking the screenshots** (on emulators, so no real notes appear):
  1. The emulators are `fl_phone` (Pixel, 1080×1920) and `fl_tablet` (Pixel Tablet), using
     the Android 15 `google_apis` image. Start one with
     `emulator -avd fl_phone -no-window -no-snapshot`.
  2. Run `adb root`. Set the time zone to Africa/Johannesburg, turn off automatic time, and
     set the clock to 08:30 with `adb shell date MMDDhhmmYYYY.ss`. Install the sideload APK
     and open it once.
  3. Build the made-up data:
     `STORE_DB=<file> npx jest --testRegex 'store-data\.seed\.ts$' scripts/store-data.seed.ts`.
     Copy the file over `/data/data/app.mts.forgetless/files/SQLite/forgetless.db`, deleting
     the `-wal` and `-shm` files. Then `chown` it to the app's user and run `restorecon`.
  4. For a tidy status bar, use the System UI demo mode
     (`am broadcast -a com.android.systemui.demo`). Take each screenshot with
     `adb exec-out screencap -p`.
  5. To show the alarm screen: lock the screen, then set the clock to 15 seconds before
     "Pick up dry cleaning" (17:00).
- **Category:** Productivity.
- **Contact email:** phillip-marais@outlook.com (shown publicly).

## 5. Before pressing "Publish"

- [ ] `npm run check` and `npx expo-doctor` pass.
- [ ] `versionCode` is higher than on the last upload.
- [ ] Tested on the AAB's own build: install it from the closed testing track, not by sideloading.
- [ ] Alarm checked: rings while locked, after a restart, and with Do Not Disturb on.
- [ ] Privacy policy URL works.
