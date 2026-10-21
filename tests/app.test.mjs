import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

let server, App;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ App } = await server.ssrLoadModule('/src/App.tsx'));
});
after(async () => { await server?.close(); });

async function mount(t, repository) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.com/calismac/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
  await act(async () => root.render(createElement(App, { repository })));
  return {
    text: () => document.body.textContent,
    click: async label => {
      const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes(label));
      assert.ok(button, `Missing button: ${label}`);
      await act(async () => button.click());
    },
  };
}

test('catalog shows loading, error and a successful retry', async t => {
  let reject;
  let calls = 0;
  const view = await mount(t, {
    getCatalog() {
      calls++;
      return calls === 1 ? new Promise((_resolve, fail) => { reject = fail; }) : Promise.resolve([]);
    },
  });
  assert.match(view.text(), /Bölümler yükleniyor/);
  assert.equal(document.querySelectorAll('.list-button').length, 0);
  await act(async () => reject(new Error('offline')));
  assert.match(view.text(), /Bölümler yüklenemedi/);
  await view.click('Tekrar Dene');
  assert.match(view.text(), /Bölümler hazır/);
  assert.equal(calls, 2);
});
