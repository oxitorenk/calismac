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
      const custom = [...document.querySelectorAll('button')].find(button => button.textContent === 'Özel');
      if (custom && custom.getAttribute('aria-pressed') !== 'true') await act(async () => custom.click());
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
  const skeleton = document.querySelector('.loading-skeleton--list');
  assert.equal(skeleton.getAttribute('role'), 'status');
  assert.equal(skeleton.querySelector('.sr-only').textContent, 'Bölümler yükleniyor…');
  assert.equal(skeleton.querySelector('.skeleton-placeholder').getAttribute('aria-hidden'), 'true');
  assert.equal(skeleton.querySelectorAll('.skeleton-placeholder > span').length, 3);
  assert.equal(document.querySelectorAll('.list-button').length, 0);
  await act(async () => reject(new Error('offline')));
  assert.equal(document.querySelector('.loading-skeleton'), null);
  assert.match(view.text(), /Bölümler yüklenemedi/);
  await view.click('Tekrar Dene');
  assert.match(view.text(), /Tasarım/);
  assert.equal(calls, 2);
});

test('skeleton motion pauses offscreen and in a hidden tab, then cleans up', async t => {
  let intersect, resolve, disconnected = false;
  const previous = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class {
    constructor(callback) { intersect = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  };
  t.after(() => { if (previous) globalThis.IntersectionObserver = previous; else delete globalThis.IntersectionObserver; });
  await mount(t, { getCatalog: () => new Promise(done => { resolve = done; }) });
  const skeleton = document.querySelector('.loading-skeleton');
  const visibility = hidden => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    document.dispatchEvent(new window.Event('visibilitychange'));
  };
  visibility(false);
  assert.equal(skeleton.style.getPropertyValue('--skeleton-play-state'), 'running');
  intersect([{ isIntersecting: false }]);
  assert.equal(skeleton.style.getPropertyValue('--skeleton-play-state'), 'paused');
  intersect([{ isIntersecting: true }]);
  visibility(true);
  assert.equal(skeleton.style.getPropertyValue('--skeleton-play-state'), 'paused');
  visibility(false);
  assert.equal(skeleton.style.getPropertyValue('--skeleton-play-state'), 'running');
  await act(async () => resolve(catalog));
  assert.equal(document.querySelector('.loading-skeleton'), null);
  assert.equal(disconnected, true);
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
  assert.equal(document.activeElement, document.querySelector('h1'));
  assert.equal(document.querySelectorAll('.list-button').length, 1);
  assert.match(view.text(), /Estetik/);
  assert.doesNotMatch(view.text(), /Fotoğraf/);
  await view.click('Estetik');
  assert.equal(document.querySelector('h1').textContent, 'Estetik');
  assert.equal(document.activeElement, document.querySelector('h1'));
  await view.click('Dersler');
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
  assert.equal(document.getElementById('question-count').value, '1');
  assert.equal(document.querySelector('.back').textContent.trim(), 'Sınav Tipi');
  assert.equal(document.getElementById('page-context').textContent, 'Final');
  assert.equal(document.querySelector('main > h2'), null);
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
  assert.doesNotMatch(view.text(), /Sorular yükleniyor/);
  await act(async () => t.mock.timers.tick(400));
  assert.match(view.text(), /Sorular yükleniyor/);
  assert.ok(document.querySelector('.loading-skeleton--line'));
  assert.ok([...document.querySelectorAll('section button')].every(button => button.disabled));
  await act(async () => resolve([{}]));
  assert.doesNotMatch(view.text(), /Sorular yükleniyor/);
  assert.equal(document.querySelector('.loading-skeleton'), null);
  assert.equal(input.disabled, false);
});

test('ready initializes count once without overwriting manual edits', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => Array.from({ length: 30 }, () => ({})) });
  await view.click('Tasarım');
  await view.click('Estetik');
  await view.click('Vize');
  assert.equal(document.getElementById('question-count').value, '20');
  assert.equal(document.querySelector('.bank-summary, .answer-guidance'), null);
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
    assert.equal(document.getElementById('question-count').getAttribute('aria-invalid'), 'true');
    assert.equal(document.getElementById('question-count').getAttribute('aria-describedby'), 'count-error');
    assert.equal(document.getElementById('count-error').getAttribute('role'), 'alert');
  }
  for (const value of ['1', '5']) {
    await view.enterCount(value);
    assert.equal(start.disabled, false, value);
    assert.equal(document.getElementById('count-error'), null);
  }
});

test('presets replace custom counts and hide the custom field', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => Array.from({ length: 50 }, () => ({})) });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize');
  const preset = label => [...document.querySelectorAll('.test-setup button')].find(button => button.textContent === label);
  assert.equal(preset('20').getAttribute('aria-pressed'), 'true');
  assert.equal(document.getElementById('custom-count').hidden, true);
  await act(async () => preset('10').click());
  assert.equal(document.getElementById('question-count').value, '10');
  await view.enterCount('7');
  assert.equal(document.getElementById('custom-count').hidden, false);
  assert.equal(preset('Özel').getAttribute('aria-pressed'), 'true');
  assert.deepEqual([...document.querySelectorAll('.count-presets button')].map(button => button.textContent), ['10', '20', 'Özel', 'Tümü']);
  await act(async () => preset('20').click());
  assert.equal(document.getElementById('question-count').value, '20');
  assert.equal(document.getElementById('custom-count').hidden, true);
  await view.click('Tümü');
  assert.equal(document.getElementById('question-count').value, '50');
});

test('all selection gives way to custom input and can be reselected', async t => {
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
  assert.equal(all.getAttribute('aria-pressed'), 'false');
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
  assert.equal(document.activeElement, document.querySelector('.question-text'));
  assert.equal(document.activeElement.getAttribute('aria-describedby'), 'question-progress');
  assert.ok(document.querySelector('main.study-shell'));
  assert.equal(document.querySelector('header h1').textContent, 'Estetik');
  assert.equal(document.querySelector('.study-context').textContent, 'Vize');
  assert.equal(document.querySelector('.question-content').getAttribute('tabindex'), '0');
  assert.equal(document.querySelector('.question-content').getAttribute('role'), 'region');
  assert.equal(document.querySelector('.study-actions'), null);
  assert.equal(document.querySelectorAll('.option .feedback').length, 5);
  assert.ok([...document.querySelectorAll('.option .feedback')].every(label => label.textContent.trim() === ''));
  const options = [...document.querySelectorAll('.option')];
  assert.equal(options.length, 5);
  assert.deepEqual(options.map(option => option.firstElementChild.textContent), ['A', 'B', 'C', 'D', 'E']);
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
  assert.equal(image.hidden, true);
  assert.ok(document.querySelector('.loading-skeleton--image'));
  assert.equal(image.previousElementSibling.className, 'question-text');
  assert.ok(image.compareDocumentPosition(document.querySelector('.options')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok([...document.querySelectorAll('.option')].every(button => button.disabled));
  await act(async () => image.dispatchEvent(new window.Event('load')));
  assert.equal(image.hidden, false);
  assert.equal(document.querySelector('.loading-skeleton--image'), null);
  assert.ok([...document.querySelectorAll('.option')].every(button => !button.disabled));
});

test('failed question images retry without changing answers and reset for the next question', async t => {
  t.mock.method(Math, 'random', () => 0.999);
  const imageUrl = 'https://res.cloudinary.com/demo/image/upload/test.png';
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [
    { ...question, imageUrl }, { ...question, id: 'second', imageUrl },
  ] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const order = [...document.querySelectorAll('.option')].map(button => button.textContent);
  const imageEvent = async name => act(async () => document.querySelector('.question-image').dispatchEvent(new window.Event(name)));
  await imageEvent('error');
  assert.equal(document.querySelector('.loading-skeleton--image'), null);
  assert.match(document.querySelector('[role="alert"]').textContent, /görseli yüklenemedi/);
  await view.click('Bir');
  assert.equal(document.querySelector('.incorrect'), null);
  const failedImage = document.querySelector('.question-image');
  [...document.querySelectorAll('button')].find(button => button.textContent === 'Görseli Tekrar Dene').focus();
  await view.click('Görseli Tekrar Dene');
  assert.ok(document.querySelector('.loading-skeleton--image'));
  assert.equal(document.activeElement.className, 'question-text');
  assert.notEqual(document.querySelector('.question-image'), failedImage);
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.ok([...document.querySelectorAll('.option')].every(button => button.disabled));
  await imageEvent('load');
  assert.equal(document.activeElement, document.querySelector('.question-text'));
  assert.deepEqual([...document.querySelectorAll('.option')].map(button => button.textContent), order);
  await view.click('Bir');
  await imageEvent('error'); await view.click('Görseli Tekrar Dene'); await imageEvent('load');
  assert.ok([...document.querySelectorAll('.option')].every(button => button.disabled));
  assert.match(document.querySelector('.incorrect').textContent, /Bir/);
  await view.click('Sonraki Soru');
  assert.ok([...document.querySelectorAll('.option')].every(button => button.disabled));
  await imageEvent('load'); await view.click('Bir'); await view.click('Sonuçları Gör');
  await view.click('Yanlışları İncele');
  await imageEvent('error'); await view.click('Görseli Tekrar Dene'); await imageEvent('load');
  assert.ok([...document.querySelectorAll('.option')].every(button => button.disabled));
  await view.click('Sonraki');
  assert.match(view.text(), /Görsel yükleniyor/);
  await view.click('Sonuçlara Dön');
  assert.match(view.text(), /%0/);
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

test('mobile continuation hint follows scrolling and viewport or content changes', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  const content = document.querySelector('.question-content');
  Object.defineProperties(content, {
    scrollHeight: { configurable: true, value: 1000, writable: true },
    clientHeight: { configurable: true, value: 400, writable: true },
    scrollTop: { configurable: true, value: 0, writable: true },
  });
  await act(async () => window.dispatchEvent(new window.Event('resize')));
  assert.equal(content.dataset.moreBelow, 'true');
  content.scrollTop = 599;
  await act(async () => content.dispatchEvent(new window.Event('scroll')));
  assert.equal(content.dataset.moreBelow, 'false');
  content.clientHeight = 250;
  await act(async () => window.dispatchEvent(new window.Event('resize')));
  assert.equal(content.dataset.moreBelow, 'true');
  content.scrollHeight = 200;
  content.scrollTop = 0;
  await act(async () => window.dispatchEvent(new window.Event('resize')));
  assert.equal(content.dataset.moreBelow, 'false');
});

for (const scenario of [
  { name: 'reveals a correct answer below the footer', answer: 'Üç', top: 450, height: 100, offset: 58 },
  { name: 'waits for a request before revealing a wrong answer', answer: 'Bir', top: 90, height: 100, offset: -18, manual: true },
  { name: 'omits reveal action when the correct answer is visible', answer: 'Bir', top: 150, height: 100, offset: 0, manual: true },
  { name: 'keeps a fully visible correct option still', answer: 'Üç', top: 150, height: 100, offset: 0 },
  { name: 'respects reduced motion', answer: 'Üç', top: 450, height: 100, offset: 58, reduced: true },
  { name: 'keeps the correct answer above the mobile continuation fade', answer: 'Üç', top: 450, height: 100, offset: 82, inset: 32 },
  { name: 'shows the start of an option taller than the viewport', answer: 'Üç', top: 150, height: 500, offset: 42 },
]) {
  test(scenario.name, async t => {
    const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
    await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
    const scrolls = [];
    window.HTMLElement.prototype.scrollBy = function (options) { scrolls.push({ element: this, ...options }); };
    window.matchMedia = () => ({ matches: !!scenario.reduced });
    if (scenario.inset) document.querySelector('.question-content').style.scrollPaddingBottom = `${scenario.inset}px`;
    t.mock.method(window.HTMLElement.prototype, 'getBoundingClientRect', function () {
      return this.classList.contains('question-content')
        ? { top: 100, bottom: 500, height: 400 }
        : { top: scenario.top, bottom: scenario.top + scenario.height, height: scenario.height };
    });
    await view.click(scenario.answer);
    if (scenario.manual) {
      assert.deepEqual(scrolls, []);
      assert.equal(Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Doğru cevabı gör ↓'), !!scenario.offset);
      if (scenario.offset) {
        await view.click('Doğru cevabı gör ↓');
        t.mock.method(document.querySelector('.correct'), 'getBoundingClientRect', () => ({ top: 150, bottom: 250, height: 100 }));
        await act(async () => document.querySelector('.question-content').dispatchEvent(new window.Event('scroll')));
        assert.equal(Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Doğru cevabı gör ↓'), false);
      }
    }
    assert.deepEqual(scrolls, scenario.offset ? [{ element: document.querySelector('.question-content'), top: scenario.offset, behavior: scenario.reduced ? 'instant' : 'smooth' }] : []);
    assert.notEqual(document.activeElement, document.querySelector('.correct'));
  });
}

test('wrong answer shows chosen and correct options with textual feedback', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  assert.equal(document.querySelector('.correct'), null);
  await view.click('Bir');
  assert.match(document.querySelector('.incorrect').textContent, /Bir.*Yanlış/s);
  assert.equal(document.querySelector('.study-actions').previousElementSibling.className, 'question-content');
  assert.equal(document.querySelector('.study-actions .primary').textContent, 'Sonuçları Gör');
  assert.match(document.querySelector('.correct').textContent, /Üç.*Doğru/s);
  assert.equal(document.querySelector('.correct .feedback').textContent.trim(), 'Doğru');
  assert.equal(document.querySelector('.incorrect .feedback').textContent.trim(), 'Cevabın — Yanlış');
  assert.equal(document.querySelectorAll('.feedback svg[aria-hidden="true"]').length, 2);
  assert.match(document.querySelector('[role="status"]').textContent, /Yanlış/);
  const correctLabel = document.querySelector('.correct').firstElementChild.textContent[0];
  assert.equal(document.querySelector('.study-actions [role="status"]').textContent, `Yanlış · Doğru cevap ${correctLabel}`);
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
  assert.equal(document.activeElement, document.querySelector('.question-text'));
  assert.match(document.querySelector('.question-text').textContent, /İkinci soru/);
  assert.ok([...document.querySelectorAll('.option')].every(button => !button.disabled));
  await view.click('Bir');
  await view.click('Sonuçları Gör');
  assert.match(view.text(), /Sonuçlar/);
  assert.equal(document.activeElement, document.querySelector('h1'));
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
  await view.click('Üç'); await view.click('Sonuçları Gör'); await view.click('Ders Seçimi'); await view.click('Bölümler');
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

test('all-correct results return to courses in the same department without confirmation', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Estetik'); await view.click('Vize'); await view.click('Başla');
  await view.click('Üç'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%100/);
  assert.deepEqual([...document.querySelectorAll('.result-counts dt')].map(item => item.textContent), ['Doğru', 'Yanlış']);
  assert.deepEqual([...document.querySelectorAll('.result-counts dd')].map(item => item.textContent), ['1', '0']);
  assert.equal(document.querySelector('.result-summary').textContent, '1 soruda 1 doğru.');
  assert.match(document.querySelector('.study-context').textContent, /Vize.*Estetik/);
  assert.doesNotMatch(view.text(), /Yanlışları İncele/);
  await view.click('Ders Seçimi');
  assert.equal(document.querySelector('h1').textContent, 'Tasarım');
  assert.equal(window.history.state.calismacRoute.page, 'courses');
  assert.equal(window.history.state.calismacRoute.departmentId, 'tasarim');
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
  assert.equal(document.querySelector('.score').getAttribute('aria-label'), 'Başarı oranı yüzde 50');
  assert.equal(document.querySelector('.result-actions .primary').textContent, 'Yanlışları İncele');
  await view.click('Yanlışları İncele');
  assert.match(view.text(), /1 \/ 1/);
  assert.equal(document.activeElement, document.querySelector('.question-text'));
  assert.ok(document.querySelector('main.study-shell .study-actions'));
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
  await view.click('Bir'); await view.click('Sonuçları Gör'); await view.click('Ders Seçimi'); await view.click('Bölümler');
  await act(async () => window.dispatchEvent(new window.PopStateEvent('popstate', { state: { calismacRoute: { page: 'results', departmentId: 'tasarim', courseId: 'estetik', examType: 'midterm' } } })));
  assert.equal(document.querySelector('h1').textContent, 'Bölümler');
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
  await view.click('Sınav Tipi'); await view.click('Final');
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
  await view.click('Üç');
  const answered = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(answered);
  assert.equal(answered.defaultPrevented, true);
  await view.click('Sonuçları Gör');
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
  await act(async () => document.querySelector('.question-image').dispatchEvent(new window.Event('load')));
  await view.click('Bir'); await view.click('Sonuçları Gör');
  assert.match(view.text(), /%100/);
  changed = true;
  await view.reload();
  await view.click('Yeni bölüm'); await view.click('Yeni ders adı'); await view.click('Vize'); await view.click('Başla');
  assert.match(view.text(), /Güncel soru,\nçok satır/);
  assert.doesNotMatch(view.text(), /Eski soru/);
  assert.ok(document.querySelector('.question-image').src.endsWith('new.png'));
  await act(async () => document.querySelector('.question-image').dispatchEvent(new window.Event('load')));
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
    await view.click('Sonuçlara Dön'); await view.click('Ders Seçimi'); await view.click('Bölümler');
  }
  assert.deepEqual(requests, [['tasarim', 'estetik', 'midterm'], ['sanat', 'estetik', 'midterm'], ['sanat', 'estetik', 'final']]);
});


test('study solves selected courses in selection order and summarizes all results', async t => {
  const requests = [];
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async (department, course, exam) => {
    requests.push([department, course, exam]);
    return [question];
  } });
  await view.click('Tasarım'); await view.click('Çalışma oluştur');
  const proceed = () => Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('dersle devam'));
  assert.equal(proceed().disabled, true);
  await view.click('Fotoğraf'); await view.click('Estetik');
  assert.deepEqual(Array.from(document.querySelectorAll('.list-button[aria-pressed="true"] .selection-order')).map(el => el.textContent), ['2', '1']);
  await view.click('2 dersle devam'); await view.click('Final'); await view.click('Başla');
  assert.deepEqual(requests, [['tasarim', 'fotograf', 'final'], ['tasarim', 'estetik', 'final']]);
  assert.equal(document.querySelector('h1').textContent, 'Fotoğraf');
  await view.click('Bir'); await view.click('Sonuçları Gör'); await view.click('Yanlışları İncele');
  await view.click('Sonuçlara Dön');
  await view.click('Sıradaki ders: Estetik');
  assert.equal(document.querySelector('h1').textContent, 'Estetik');
  await view.click('Üç'); await view.click('Sonuçları Gör'); await view.click('Çalışma sonuçlarını gör');
  assert.equal(document.querySelectorAll('.study-summary li').length, 2);
  assert.match(document.querySelector('.study-summary').textContent, /Fotoğraf.*0 doğru.*Estetik.*1 doğru/);
  await view.click('Fotoğraf');
  assert.equal(document.querySelector('h1').textContent, 'Fotoğraf');
  assert.match(view.text(), /%0/);
  assert.doesNotMatch(view.text(), /Sıradaki ders/);
  await view.click('Yanlışları İncele');
  assert.equal(document.querySelectorAll('.option[disabled]').length, 5);
  await view.click('Sonuçlara Dön');
  await act(async () => document.querySelector('.result-actions .primary').click());
  assert.equal(document.querySelectorAll('.study-summary li').length, 2);
  await view.click('Estetik');
  assert.match(view.text(), /%100/);
  assert.doesNotMatch(view.text(), /Yanlışları İncele|Sıradaki ders/);
  await act(async () => document.querySelector('.back').click());
  assert.match(document.querySelector('.study-summary').textContent, /Fotoğraf.*0 doğru.*Estetik.*1 doğru/);
  await view.click('Ders Seçimi');
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.querySelector('h1').textContent, 'Tasarım');
});

test('study retries bank errors and confirms leaving a running study', async t => {
  let calls = 0;
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => {
    if (++calls === 1) throw new Error('offline');
    return [question];
  } });
  await view.click('Tasarım'); await view.click('Çalışma oluştur'); await view.click('Estetik');
  await view.click('1 dersle devam'); await view.click('Vize');
  assert.match(view.text(), /Sorular yüklenemedi/);
  await view.click('Tekrar Dene'); await view.click('Başla');
  await act(async () => document.querySelector('.back').click());
  assert.ok(document.querySelector('dialog'));
  await view.click('Devam Et'); assert.ok(document.querySelector('.option'));
  await act(async () => document.querySelector('.back').click());
  assert.match(document.querySelector('dialog').textContent, /tüm ilerlemen ve tamamladığın derslerin sonuçları kaybolacak/);
  await view.click('Çalışmadan Çık');
  assert.equal(document.querySelector('h1').textContent, 'Tasarım');
});


for (const all of [false, true]) test(`study ${all ? 'all' : 'custom'} count applies independently to each course`, async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async (_department, course) =>
    Array.from({ length: course === 'estetik' ? 3 : 1 }, (_, i) => ({ ...question, id: String(i) })) });
  await view.click('Tasarım'); await view.click('Çalışma oluştur'); await view.click('Estetik'); await view.click('Fotoğraf');
  await view.click('2 dersle devam'); await view.click('Vize');
  if (all) await view.click('Tümü'); else await view.enterCount('2');
  assert.equal(document.querySelector('#count-title').textContent, 'Her dersten kaç soru?');
  assert.deepEqual(Array.from(document.querySelectorAll('.workload-preview dd')).map(el => el.textContent), [all ? '3 soru' : '2 soru', '1 soru']);
  assert.equal(document.querySelector('.workload-total').textContent, `Toplam ${all ? 4 : 3} soru · 2 ders`);
  if (!all) {
    await view.enterCount('0');
    assert.equal(document.querySelector('.workload-preview'), null);
    await view.enterCount('2');
  }
  await view.click('Başla');
  const count = all ? 3 : 2;
  assert.match(document.querySelector('#question-progress').textContent, new RegExp(`1 / ${count}`));
  for (let i = 0; i < count; i++) {
    await view.click('Üç'); await view.click(i === count - 1 ? 'Sonuçları Gör' : 'Sonraki Soru');
  }
  await view.click('Sıradaki ders: Fotoğraf');
  assert.match(document.querySelector('#question-progress').textContent, /1 \/ 1/);
});


for (const mode of ['custom', 'all', 'preset']) test(`study editing preserves ${mode} count and exam while recalculating workload`, async t => {
  const requests = [];
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async (_department, course, exam) => {
    requests.push([course, exam]);
    return Array.from({ length: course === 'estetik' ? 24 : 3 }, (_, i) => ({ ...question, id: String(i) }));
  } });
  await view.click('Tasarım'); await view.click('Çalışma oluştur'); await view.click('Estetik'); await view.click('Fotoğraf');
  await view.click('2 dersle devam');
  assert.deepEqual(Array.from(document.querySelectorAll('.study-itinerary li')).map(el => el.textContent), ['Estetik', 'Fotoğraf']);
  await view.click('Final');
  assert.equal(document.querySelector('.workload-total').textContent, 'Toplam 23 soru · 2 ders');
  if (mode === 'all') await view.click('Tümü');
  else if (mode === 'custom') await view.enterCount('12');
  else await view.click('20');
  await view.click('Dersleri düzenle');
  assert.deepEqual(Array.from(document.querySelectorAll('.selection-order')).map(el => el.textContent), ['1', '2']);
  await view.click('Estetik');
  await view.click('Devam et');
  assert.match(document.querySelector('.study-context').textContent, /Final/);
  assert.deepEqual(Array.from(document.querySelectorAll('.study-itinerary li')).map(el => el.textContent), ['Fotoğraf']);
  assert.equal(document.querySelector('.workload-total').textContent, 'Toplam 3 soru · 1 ders');
  if (mode === 'custom') assert.equal(document.getElementById('question-count').value, '12');
  else assert.equal(Array.from(document.querySelectorAll('.count-presets button')).find(el => el.textContent === (mode === 'all' ? 'Tümü' : '20')).getAttribute('aria-pressed'), 'true');
  await view.click('Dersleri düzenle'); await view.click('Estetik'); await view.click('Devam et');
  assert.deepEqual(Array.from(document.querySelectorAll('.study-itinerary li')).map(el => el.textContent), ['Fotoğraf', 'Estetik']);
  assert.equal(document.querySelector('.workload-total').textContent, `Toplam ${mode === 'all' ? 27 : mode === 'custom' ? 15 : 23} soru · 2 ders`);
  assert.ok(requests.every(([, exam]) => exam === 'final'));
  await view.click('Başla');
  assert.equal(document.querySelector('h1').textContent, 'Fotoğraf');
  assert.match(document.querySelector('#question-progress').textContent, /1 \/ 3/);
});

test('study setup back and canceled course edits preserve the committed selection', async t => {
  const view = await mount(t, { getCatalog: async () => catalog, getQuestionBank: async () => [question] });
  await view.click('Tasarım'); await view.click('Çalışma oluştur'); await view.click('Estetik');
  await view.click('1 dersle devam');
  await act(async () => document.querySelector('.back').click());
  await view.click('Estetik');
  assert.equal(Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Devam et').disabled, true);
  await view.click('Fotoğraf'); await view.click('Vazgeç');
  assert.deepEqual(Array.from(document.querySelectorAll('.study-itinerary li')).map(el => el.textContent), ['Estetik']);
  await view.click('Vize'); await view.enterCount('1');
  await act(async () => document.querySelector('.back').click());
  await view.click('Vize');
  assert.equal(document.getElementById('question-count').value, '1');
});
