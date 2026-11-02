const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Native C++ build paths in this project exceed Windows' 260-character limit.
 * The SDK's default CMake (3.22) fails on them; 3.31+ handles long paths.
 * Writes cmake.dir into android/local.properties so `expo prebuild --clean` keeps the fix.
 * Does nothing outside Windows or when that CMake version isn't installed.
 */
module.exports = function withAndroidCmakeDir(config, { version = '3.31.6' } = {}) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      if (process.platform !== 'win32') return config;

      const sdkDir =
        process.env.ANDROID_HOME ||
        process.env.ANDROID_SDK_ROOT ||
        path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
      const cmakeDir = path.join(sdkDir, 'cmake', version);
      if (!fs.existsSync(cmakeDir)) {
        console.warn(`[with-android-cmake-dir] CMake ${version} not found at ${cmakeDir}; skipping.`);
        return config;
      }

      const file = path.join(config.modRequest.platformProjectRoot, 'local.properties');
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      const lines = existing.split(/\r?\n/).filter((line) => line && !line.startsWith('cmake.dir='));
      lines.push(`cmake.dir=${cmakeDir.replace(/\\/g, '/')}`);
      fs.writeFileSync(file, lines.join('\n') + '\n');

      return config;
    },
  ]);
};
