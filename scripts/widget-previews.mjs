// Makes the pictures the home screen's widget list shows (assets/widgets/*.png) by drawing
// each widget with made-up data on a connected phone (src/app/widget-previews.tsx), taking a
// screenshot and cutting the widget out. Needs the app installed and adb on the PATH.
// Run: node scripts/widget-previews.mjs, then rebuild (app.json points at the pictures).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import Jimp from 'jimp-compact';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const NAMES = ['Today', 'Calendar', 'Tasks', 'Notes', 'VoiceNote'];
const adb = (...args) => execFileSync('adb', args, { maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

mkdirSync(join(root, 'assets/widgets'), { recursive: true });
for (const name of NAMES) {
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `forgetless:///widget-previews?name=${name}`);
  await sleep(2500);
  const xml = adb('exec-out', 'uiautomator', 'dump', '/dev/tty').toString();
  const node = xml.match(/content-desc="widget-preview"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!node) throw new Error(`No preview found for ${name}`);
  const [x1, y1, x2, y2] = node.slice(1).map(Number);
  const image = (await Jimp.read(adb('exec-out', 'screencap', '-p'))).crop(x1, y1, x2 - x1, y2 - y1);
  // The screen behind is pure green: turn it (and the green in the rounded edges) transparent.
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (_x, _y, i) {
    const data = this.bitmap.data;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const alpha = 1 - Math.max(0, g - Math.max(r, b)) / 255;
    if (alpha <= 0.02) {
      data[i + 3] = 0;
      return;
    }
    // Seen = alpha × widget + (1 − alpha) × green; solve for the widget's own colour.
    const clamp = (value) => Math.round(Math.max(0, Math.min(255, value)));
    data[i] = clamp(r / alpha);
    data[i + 1] = clamp((g - (1 - alpha) * 255) / alpha);
    data[i + 2] = clamp(b / alpha);
    data[i + 3] = Math.round(alpha * 255);
  });
  const file = join(root, 'assets/widgets', `${name.toLowerCase()}.png`);
  await image.writeAsync(file);
  console.log('wrote', file, image.bitmap.width, 'x', image.bitmap.height);
}
adb('shell', 'input', 'keyevent', 'BACK');
