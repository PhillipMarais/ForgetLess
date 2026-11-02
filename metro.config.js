const http = require('http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite as WebAssembly.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// expo-sqlite on web needs SharedArrayBuffer, which requires cross-origin isolation headers.
// The usual `server.enhanceMiddleware` hook misses "/": Expo's dev server answers that route
// before Metro's middleware runs. So the dev server process sets them on every response instead.
// Deployed web builds need the same headers from the host (see the expo-router plugin in app.json).
const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
const writeHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function (...args) {
  if (!this.headersSent) {
    for (const [name, value] of Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS)) {
      if (!this.hasHeader(name)) this.setHeader(name, value);
    }
  }
  return writeHead.apply(this, args);
};

module.exports = config;
