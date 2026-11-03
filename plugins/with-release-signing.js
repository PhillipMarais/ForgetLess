const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release builds with the Play upload key when it is set up on this computer, so
 * `expo prebuild` keeps the setting. The key and its passwords stay out of the project: they
 * come from the user's ~/.gradle/gradle.properties:
 *
 *   FORGETLESS_UPLOAD_STORE_FILE=C:/path/to/forgetless-upload.jks
 *   FORGETLESS_UPLOAD_STORE_PASSWORD=...
 *   FORGETLESS_UPLOAD_KEY_ALIAS=forgetless-upload
 *   FORGETLESS_UPLOAD_KEY_PASSWORD=...
 *
 * Without them, release builds are signed with the debug key (fine for sideloading only).
 * Phones that sideloaded a debug-signed build only accept updates signed the same way, so
 * `./gradlew assembleRelease -Psideload` still signs with the debug key.
 */
const MARKER = '// with-release-signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes(MARKER)) return config;

    gradle = gradle.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        ${MARKER}
        if (project.hasProperty('FORGETLESS_UPLOAD_STORE_FILE')) {
            upload {
                storeFile file(FORGETLESS_UPLOAD_STORE_FILE)
                storePassword FORGETLESS_UPLOAD_STORE_PASSWORD
                keyAlias FORGETLESS_UPLOAD_KEY_ALIAS
                keyPassword FORGETLESS_UPLOAD_KEY_PASSWORD
            }
        }
`,
    );
    gradle = gradle.replace(
      /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig project.hasProperty('FORGETLESS_UPLOAD_STORE_FILE') && !project.hasProperty('sideload') ? signingConfigs.upload : signingConfigs.debug`,
    );
    if (!gradle.includes('signingConfigs.upload')) {
      throw new Error('[with-release-signing] Could not find the release signing config in build.gradle.');
    }
    config.modResults.contents = gradle;
    return config;
  });
};
