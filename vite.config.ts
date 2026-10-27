import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [react(), {
    name: 'app-shell-cache',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publicFiles = ['manifest.webmanifest', 'icons/favicon-32.png', 'icons/favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
      const template = readFileSync(new URL('./src/pwa/service-worker.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(template);
      for (const file of Object.values(bundle)) hash.update(file.type === 'chunk' ? file.code : file.source);
      for (const file of publicFiles) hash.update(readFileSync(new URL(`./public/${file}`, import.meta.url)));
      const files = [...new Set(['index.html', ...Object.keys(bundle), ...publicFiles])].map(file => `/calismac/${file}`);
      const source = template.replace('__SHELL_CACHE__', `calismac-shell-${hash.digest('hex').slice(0, 12)}`).replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  }],
  base: '/calismac/',
});
