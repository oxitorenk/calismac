import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('dark palette keeps text readable and enabled control boundaries distinguishable', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  const colors = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*#([\da-f]{6});/g)].map(([, name, value]) => [name, value]));
  const luminance = name => colors[name].match(/../g)
    .map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  for (const [foreground, background, minimum] of [
    ['text', 'background', 4.5], ['text', 'surface', 4.5], ['text-muted', 'surface', 4.5],
    ['on-accent', 'accent', 4.5], ['on-accent', 'accent-active', 4.5],
    ['correct-text', 'correct-background', 4.5], ['incorrect-text', 'incorrect-background', 4.5],
    ['control-border', 'surface', 3], ['control-border', 'surface-active', 3],
  ]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    const contrast = (values[1] + 0.05) / (values[0] + 0.05);
    assert.ok(contrast >= minimum, `${foreground} on ${background}: ${contrast.toFixed(2)} < ${minimum}`);
  }
});
