import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import { GoogleSheetsContentRepository } from '../src/data/GoogleSheetsContentRepository.ts';

let server, App;
const catalog = [
  { departmentId: 'tasarim', department: 'Tasarım', courseId: 'estetik', course: 'Estetik', midtermGid: '1', finalGid: '2' },
  { departmentId: 'tasarim', department: 'Tasarım', courseId: 'fotograf', course: 'Fotoğraf', midtermGid: '3', finalGid: '4' },
  { departmentId: 'sanat', department: 'Sanat', courseId: 'estetik', course: 'Estetik', midtermGid: '1', finalGid: '2' },
];
const question = {
  id: '2026-guz-ara-05', text: 'Soru metni\nİkinci satır',
  options: ['Bir', 'İki', 'Üç', 'Dört', 'Beş'].map(text => ({ text, correct: text === 'Üç' })),
};
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ App } = await server.ssrLoadModule('/src/App.tsx'));
});
after(async () => { await server?.close(); });

async function mount(t, repository) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.com/calismac/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById('root'));
  let launch = 0;
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
    reload: async () => { await act(async () => root.render(createElement(App, { repository, key: ++launch }))); },
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

test('all selection is derived from the count, including manual input', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [{}] });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  const all = [...document.querySelectorAll('button')].find(button => button.textContent === 'Tümü');
  assert.equal(document.getElementById('question-count').value, '1');
  assert.equal(all.getAttribute('aria-pressed'), 'true');
  await view.enterCount('');
  assert.equal(all.getAttribute('aria-pressed'), 'false');
  await view.enterCount('1');
  assert.equal(all.getAttribute('aria-pressed'), 'true');
  await view.enterCount('0');
  assert.equal(all.getAttribute('aria-pressed'), 'false');
  await view.click('Tümü');
  assert.equal(document.getElementById('question-count').value, '1');
  assert.equal(all.getAttribute('aria-pressed'), 'true');
});

test('bank failure retries on the same screen and initializes the new bank', async t => {
  let calls = 0;
  const view = await mount(t, {
    getCatalog: async () => catalog,
    getQuestionBank: async () => { if (++calls === 1) throw new Error('invalid content'); return [{}, {}, {}]; },
  });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  assert.match(view.text(), /Sorular yüklenemedi/);
  assert.equal(document.getElementById('question-count').disabled, true);
  await view.click('Tekrar Dene');
  assert.equal(document.getElementById('question-count').value, '3');
  assert.doesNotMatch(view.text(), /Sorular yüklenemedi/);
  assert.equal(calls, 2);
});

test('test screen renders selected session question and relabeled shuffled options', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  await view.click('Başla');
  assert.match(view.text(), /1 \/ 1/);
  assert.match(view.text(), /Soru metni\nİkinci satır/);
  const options = [...document.querySelectorAll('.option')];
  assert.equal(options.length, 5);
  assert.deepEqual(options.map(option => option.firstElementChild.textContent), ['A)', 'B)', 'C)', 'D)', 'E)']);
  assert.deepEqual(options.map(option => option.children[1].textContent).sort(), question.options.map(option => option.text).sort());
  assert.equal(document.querySelector('.question-image'), null);
});

test('question image appears between question text and options', async t => {
  const imageUrl = 'https://res.cloudinary.com/demo/image/upload/test.png';
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [{ ...question, imageUrl }] });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  await view.click('Başla');
  const image = document.querySelector('.question-image');
  assert.equal(image.src, imageUrl);
  assert.equal(image.previousElementSibling.className, 'question-text');
  assert.equal(image.nextElementSibling.className, 'options');
});

test('first answer locks all choices and preserves their order', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const options = [...document.querySelectorAll('.option')];
  const order = options.map(option => option.children[1].textContent);
  await act(async () => { options[0].click(); options[1].click(); });
  assert.ok(options.every(option => option.disabled));
  assert.equal(options[0].getAttribute('aria-pressed'), 'true');
  assert.equal(options[1].getAttribute('aria-pressed'), 'false');
  assert.deepEqual(options.map(option => option.children[1].textContent), order);
});

test('wrong answer shows chosen and correct options with textual feedback', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  assert.equal(document.querySelector('.correct'), null);
  await view.click('Bir');
  assert.match(document.querySelector('.incorrect').textContent, /Bir.*Yanlış/s);
  assert.match(document.querySelector('.correct').textContent, /Üç.*Doğru/s);
  assert.match(document.querySelector('[role="status"]').textContent, /Yanlış cevap/);
});

test('next question requires an answer, preserves order and ends at results', async t => {
  const random = t.mock.method(Math, 'random', () => 0.999);
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question, { ...question, id: 'second', text: 'İkinci soru' }] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const randomCalls = random.mock.callCount();
  assert.doesNotMatch(view.text(), /Sonraki Soru/);
  await view.click('Üç');
  await view.click('Sonraki Soru');
  assert.match(view.text(), /2 \/ 2/);
  assert.match(document.querySelector('.question-text').textContent, /İkinci soru/);
  assert.ok([...document.querySelectorAll('.option')].every(button => !button.disabled));
  await view.click('Bir');
  await view.click('Sonuçları Gör');
  assert.match(view.text(), /Sonuçlar/);
  assert.equal(random.mock.callCount(), randomCalls);
});

test('active-test exit confirmation preserves progress or discards the test', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const order = [...document.querySelectorAll('.option')].map(option => option.textContent);
  await view.click('Estetik');
  assert.equal(document.querySelector('dialog').open, true);
  await view.click('Devam Et');
  assert.equal(document.querySelector('dialog'), null);
  assert.deepEqual([...document.querySelectorAll('.option')].map(option => option.textContent), order);
  await act(async () => window.dispatchEvent(new window.PopStateEvent('popstate', { state: { calismacRoute: { page: 'count', departmentId: 'tasarim', courseId: 'estetik', examType: 'midterm' } } })));
  assert.ok(document.querySelector('dialog'));
  await view.click('Testten Çık');
  assert.ok(document.getElementById('question-count'));
  assert.equal(document.querySelector('.option'), null);
});

test('exiting toward an older session route discards the current incomplete test', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  await view.click('Üç'); await view.click('Sonuçları Gör'); await view.click('Ana Sayfa');
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  for (const page of ['results', 'test', 'wrong']) {
    await act(async () => window.dispatchEvent(new window.PopStateEvent('popstate', { state: { calismacRoute: { page, departmentId: 'tasarim', courseId: 'estetik', examType: 'midterm' } } })));
    assert.ok(document.querySelector('dialog'));
    await view.click('Devam Et');
    assert.ok(document.querySelector('.option'));
  }
  await act(async () => {
    const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
    window.history.back();
    await popped;
  });
  await view.click('Testten Çık');
  assert.ok(document.getElementById('question-count'));
  assert.equal(document.querySelector('.option'), null);
  assert.equal(window.history.state.calismacRoute.page, 'count');
});

test('all-correct results hide review and home returns to departments without confirmation', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  await view.click('Üç'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%100/);
  assert.match(view.text(), /1 Doğru/);
  assert.match(view.text(), /0 Yanlış/);
  assert.doesNotMatch(view.text(), /Yanlışları İncele/);
  await view.click('Ana Sayfa');
  assert.equal(document.querySelector('h1').textContent, 'Çalışmaç');
  assert.equal(document.querySelector('dialog'), null);
});

test('wrong-answer review keeps original choices, cannot change score and returns to results', async t => {
  t.mock.method(Math, 'random', () => 0.999);
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question, { ...question, id: 'second', text: 'Doğru yapılan soru' }] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  await view.click('Bir');
  const original = [...document.querySelectorAll('.option')].map(option => option.textContent);
  await view.click('Sonraki Soru'); await view.click('Üç'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%50/);
  await view.click('Yanlışları İncele');
  assert.match(view.text(), /1 \/ 1/);
  assert.doesNotMatch(view.text(), /Doğru yapılan soru/);
  assert.deepEqual([...document.querySelectorAll('.option')].map(option => option.textContent), original);
  assert.ok([...document.querySelectorAll('.option')].every(option => option.disabled));
  await view.click('Üç');
  await view.click('Sonuçlara Dön');
  assert.match(view.text(), /%50/);
  assert.equal(document.querySelector('dialog'), null);
});

test('new tests discard previous answers and history cannot restore a discarded session', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  await view.click('Bir'); await view.click('Sonuçları Gör'); await view.click('Ana Sayfa');
  await act(async () => window.dispatchEvent(new window.PopStateEvent('popstate', { state: { calismacRoute: { page: 'results', departmentId: 'tasarim', courseId: 'estetik', examType: 'midterm' } } })));
  assert.equal(document.querySelector('h1').textContent, 'Çalışmaç');
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Final'); await view.click('Başla');
  assert.ok([...document.querySelectorAll('.option')].every(option => !option.disabled));
  assert.equal(document.querySelector('.incorrect'), null);
  assert.equal(document.querySelector('.correct'), null);
});

test('a late response from a previous bank cannot overwrite the selected bank', async t => {
  let resolveOld;
  const view = await mount(t, {
    getCatalog: async () => catalog,
    getQuestionBank: async (_department, _course, exam) => exam === 'midterm'
      ? new Promise(resolve => { resolveOld = resolve; }) : [question, { ...question, id: 'second' }],
  });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize');
  await view.click('Estetik'); await view.click('Final');
  assert.equal(document.getElementById('question-count').value, '2');
  await act(async () => resolveOld([question]));
  assert.equal(document.getElementById('question-count').value, '2');
});

test('browser back requests confirmation and Escape continues the same test', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const leaving = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leaving);
  assert.equal(leaving.defaultPrevented, true);
  await act(async () => {
    const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
    window.history.back();
    await popped;
  });
  assert.ok(document.querySelector('dialog'));
  await act(async () => document.querySelector('dialog').dispatchEvent(new window.Event('cancel', { cancelable: true })));
  assert.equal(document.querySelector('dialog'), null);
  assert.ok(document.querySelector('.option'));
  await view.click('Üç'); await view.click('Sonuçları Gör');
  const complete = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(complete);
  assert.equal(complete.defaultPrevented, false);
});

test('multiple incorrect answers are reviewed once each without reshuffling', async t => {
  const random = t.mock.method(Math, 'random', () => 0.999);
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question, { ...question, id: 'second', text: 'İkinci yanlış' }] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const calls = random.mock.callCount();
  await view.click('Bir'); await view.click('Sonraki Soru'); await view.click('İki'); await view.click('Sonuçları Gör');
  await view.click('Yanlışları İncele');
  assert.match(view.text(), /1 \/ 2/);
  await view.click('Sonraki');
  assert.match(view.text(), /2 \/ 2/);
  assert.match(view.text(), /İkinci yanlış/);
  await view.click('Sonuçlara Dön');
  assert.match(view.text(), /%0/);
  assert.equal(random.mock.callCount(), calls);
});

test('published content changes reach the UI after a new launch without a new app build', async t => {
  const stored = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  t.after(() => { delete globalThis.localStorage; });
  const catalogHeaders = ['department_id', 'department', 'course_id', 'course', 'midterm_gid', 'final_gid'];
  const bankHeaders = ['id', 'question', 'image_url', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'answer'];
  let changed = false;
  const requestedGids = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const gid = new URL(url).searchParams.get('gid');
    requestedGids.push(gid);
    return new Response(Papa.unparse(gid === '0'
      ? [catalogHeaders, ['tasarim', changed ? 'Yeni bölüm' : 'Tasarım', 'estetik', changed ? 'Yeni ders adı' : 'Estetik', '1', '2']]
      : [bankHeaders, ['stable-question-id', changed ? 'Güncel soru,\nçok satır' : 'Eski soru', changed ? 'https://res.cloudinary.com/demo/image/upload/new.png' : 'https://res.cloudinary.com/demo/image/upload/old.png', 'Bir', 'İki', 'Üç', 'Dört', changed ? 'Yeni seçenek' : 'Beş', changed ? 'E' : 'A']]));
  });
  const view = await mount(t, new GoogleSheetsContentRepository());
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  assert.match(view.text(), /Eski soru/);
  assert.ok(document.querySelector('.question-image').src.endsWith('old.png'));
  await view.click('Bir'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%100/);
  changed = true;
  await view.reload();
  await view.click('Yeni bölüm'); await view.click('Yeni ders adı'); await view.click('Vize'); await view.click('Başla');
  assert.match(view.text(), /Güncel soru,\nçok satır/);
  assert.doesNotMatch(view.text(), /Eski soru/);
  assert.ok(document.querySelector('.question-image').src.endsWith('new.png'));
  await view.click('Yeni seçenek'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%100/);
  assert.deepEqual(requestedGids, ['0', '1', '0', '1']);
  assert.match(stored.get('calismac:content:v1:bank:estetik:midterm'), /Yeni seçenek/);
});

test('complete flow shares a course across departments while keeping exam banks separate', async t => {
  const requests = [];
  const view = await mount(t, {
    getCatalog: async () => catalog,
    getQuestionBank: async (department, course, exam) => {
      requests.push([department, course, exam]);
      return [{ ...question, text: exam === 'midterm' ? 'Vize sorusu' : 'Final sorusu' }];
    },
  });
  for (const [department, exam, text] of [['Tasarım', 'Vize', 'Vize sorusu'], ['Sanat', 'Vize', 'Vize sorusu'], ['Sanat', 'Final', 'Final sorusu']]) {
    await view.click(department); await view.click('Estetik'); await view.click(exam); await view.click('Başla');
    assert.equal(document.querySelector('.question-text').textContent, text);
    await view.click('Bir'); await view.click('Sonuçları Gör');
    assert.match(view.text(), /%0/);
    await view.click('Yanlışları İncele');
    assert.equal(document.querySelector('.question-text').textContent, text);
    await view.click('Sonuçlara Dön'); await view.click('Ana Sayfa');
  }
  assert.deepEqual(requests, [['tasarim', 'estetik', 'midterm'], ['sanat', 'estetik', 'midterm'], ['sanat', 'estetik', 'final']]);
});
