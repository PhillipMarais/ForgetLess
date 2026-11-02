// Draws the app icon, Android adaptive icon layers, splash image and favicon from the logo
// in src/constants/logo.ts, using headless Chrome. Run: node scripts/generate-brand-assets.mjs
// (set CHROME_PATH if Chrome isn't in the default Windows location).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const logoSource = readFileSync(join(root, 'src/constants/logo.ts'), 'utf8');
const path = (name) => logoSource.match(new RegExp(`${name}: '([^']+)'`))[1];
const W = 367;
const H = 180;
const PATHS = { bar: path('bar'), f: path('f'), l: path('l'), foot: path('foot') };

const INK = '#0D0D0E';
const PAPER = '#F2EFEA';
const ORANGE = '#FF6A13';

/** The monogram centred on a square canvas, `scale` of its width wide. */
function mark({ size, scale, light = PAPER, accent = ORANGE }) {
  const width = size * scale;
  const height = (width * H) / W;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${W} ${H}"
    style="position:absolute;left:${(size - width) / 2}px;top:${(size - height) / 2}px">
    <path d="${PATHS.bar}" fill="${accent}"/><path d="${PATHS.f}" fill="${light}"/>
    <path d="${PATHS.l}" fill="${light}"/><path d="${PATHS.foot}" fill="${accent}"/></svg>`;
}

const darkBackground = (size) =>
  `<div style="position:absolute;inset:0;background:
     radial-gradient(circle at 50% 30%, rgba(255,106,19,0.22), rgba(255,106,19,0) 60%),
     linear-gradient(160deg, #1B1A1D 0%, ${INK} 70%);width:${size}px;height:${size}px"></div>`;

const ASSETS = [
  // Legacy square icon (also used by Expo for the Play listing preview).
  { file: 'assets/images/icon.png', size: 1024, html: (s) => darkBackground(s) + mark({ size: s, scale: 0.66 }) },
  // Adaptive icon: the launcher masks the 108dp canvas; keep the logo in the central 66dp.
  { file: 'assets/images/android-icon-background.png', size: 1024, html: (s) => darkBackground(s) },
  { file: 'assets/images/android-icon-foreground.png', size: 1024, html: (s) => mark({ size: s, scale: 0.5 }) },
  {
    file: 'assets/images/android-icon-monochrome.png',
    size: 1024,
    html: (s) => mark({ size: s, scale: 0.5, light: '#FFFFFF', accent: '#FFFFFF' }),
  },
  { file: 'assets/images/splash-icon.png', size: 1024, html: (s) => mark({ size: s, scale: 0.9 }) },
  { file: 'assets/images/favicon.png', size: 96, html: (s) => darkBackground(s) + mark({ size: s, scale: 0.72 }) },
];

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'brand-chrome-'));
const port = 9361;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let targets;
for (let attempt = 0; attempt < 50 && !targets; attempt++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let nextId = 1;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) pending.get(message.id)(message);
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const asset of ASSETS) {
  await send('Emulation.setDeviceMetricsOverride', { width: asset.size, height: asset.size, deviceScaleFactor: 1, mobile: false });
  const html = `<!doctype html><html><body style="margin:0;background:transparent">
    <div style="position:relative;width:${asset.size}px;height:${asset.size}px;overflow:hidden">${asset.html(asset.size)}</div></body></html>`;
  await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
  await sleep(400);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(root, asset.file), Buffer.from(result.data, 'base64'));
  console.log('wrote', asset.file);
}

ws.close();
proc.kill();
await sleep(300);
rmSync(profile, { recursive: true, force: true });
