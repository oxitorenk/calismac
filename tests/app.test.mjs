import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

let server, App;
const catalog = [
  { departmentId: 'tasarim', department: 'Tasarım', courseId: 'estetik', course: 'Estetik', midtermGid: '1', finalGid: '2' },
  { departmentId: 'tasarim', department: 'Tasarım', courseId: 'fotograf', course: 'Fotoğraf', midtermGid: '3', finalGid: '4' },
  { departmentId: 'sanat', department: 'Sanat', courseId: 'estetik', course: 'Estetik', midtermGid: '1', finalGid: '2' },
];
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
    enterCount: async value => {
      const input = document.getElementById('question-count');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      await act(async () => input.dispatchEvent(new window.Event('input', { bubbles: true })));
    },
  };
}

test('catalog shows loading, error and a successful retry', async t => {
  let reject;
  let calls = 0;
  const view = await mount(t, {
    getCatalog() {
      calls++;
      return calls === 1 ? new Promise((_resolve, fail) => { reject = fail; }) : Promise.resolve(catalog);
    },
  });
  assert.match(view.text(), /Bölümler yükleniyor/);
  assert.equal(document.querySelectorAll('.list-button').length, 0);
  await act(async () => reject(new Error('offline')));
  assert.match(view.text(), /Bölümler yüklenemedi/);
  await view.click('Tekrar Dene');
  assert.match(view.text(), /Tasarım/);
  assert.equal(calls, 2);
});

test('departments are distinct by ID and the entire row navigates', async t => {
  const view = await mount(t, { getCatalog: async () => catalog });
  assert.equal(document.querySelectorAll('.list-button').length, 2);
  await view.click('Sanat');
  assert.equal(document.querySelector('h1').textContent, 'Sanat');
  await view.click('Bölümler');
  assert.equal(document.querySelectorAll('.list-button').length, 2);
});

test('courses are filtered by department and preserve the shared course identity', async t => {
  const view = await mount(t, { getCatalog: async () => catalog });
  await view.click('Sanat');
  assert.equal(document.querySelectorAll('.list-button').length, 1);
  assert.match(view.text(), /Estetik/);
  assert.doesNotMatch(view.text(), /Fotoğraf/);
  await view.click('Estetik');
  assert.equal(document.querySelector('h1').textContent, 'Estetik');
  await view.click('Sanat');
  await view.click('Bölümler');
  await view.click('Tasarım');
  assert.equal(document.querySelectorAll('.list-button').length, 2);
});

test('only the selected exam bank is requested at selection time', async t => {
  const requests = [];
  const view = await mount(t, {
    getCatalog: async () => catalog,
    getQuestionBank: async (...args) => { requests.push(args); return [{}]; },
  });
  await view.click('Tasarım');
  await view.click('Estetik');
  assert.deepEqual(requests, []);
  await view.click('Final');
  assert.deepEqual(requests, [['tasarim', 'estetik', 'final']]);
  assert.match(view.text(), /1 soru hazır/);
});

test('bank loading stays on count screen with delayed indicator and disabled controls', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve;
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: () => new Promise(done => { resolve = done; }) });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  const input = document.getElementById('question-count');
  assert.equal(input.disabled, true);
  assert.equal(input.value, '');
  assert.doesNotMatch(view.text(), /Yükleniyor/);
  await act(async () => t.mock.timers.tick(400));
  assert.match(view.text(), /Yükleniyor/);
  assert.ok([...document.querySelectorAll('section button')].every(button => button.disabled));
  await act(async () => resolve([{}]));
  assert.doesNotMatch(view.text(), /Yükleniyor/);
  assert.equal(input.disabled, false);
});

test('ready initializes count once without overwriting manual edits', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => Array.from({ length: 30 }, () => ({})) });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  assert.equal(document.getElementById('question-count').value, '20');
  await view.enterCount('7');
  assert.equal(document.getElementById('question-count').value, '7');
});

test('question count accepts only integers within the bank bounds', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => Array.from({ length: 5 }, () => ({})) });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  const start = [...document.querySelectorAll('button')].find(button => button.textContent === 'Başla');
  assert.equal(document.getElementById('question-count').value, '5');
  assert.equal(start.disabled, false);
  for (const value of ['', '0', '6', '-1', '1.5', '1e1', 'abc']) {
    await view.enterCount(value);
    assert.equal(start.disabled, true, value);
  }
  for (const value of ['1', '5']) {
    await view.enterCount(value);
    assert.equal(start.disabled, false, value);
  }
});
