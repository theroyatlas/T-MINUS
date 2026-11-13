const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Reuse only the unchanged legacy harness. Run app.test.cjs alongside this file
// to retain its assertions. The application supplies every share payload.
const legacy = fs.readFileSync(path.join(__dirname, 'app.test.cjs'), 'utf8');
const harness = legacy.slice(0, legacy.indexOf("test('countdown"));
const moduleContext = vm.createContext({ require, __dirname, console });
vm.runInContext(harness + '\nglobalThis.startApp = boot;', moduleContext);
const URL = 'https://theroyatlas.github.io/T-MINUS/';
const languages = ['zh-TW', 'en', 'ja', 'es', 'fr', 'de'];

test('all supported share languages are explicitly covered', () => {
  const app = moduleContext.startApp();
  assert.deepEqual(Array.from(app.run('SUPPORTED_LANGS')), languages);
  assert.deepEqual(Array.from(app.run('Object.keys(I18N)')), languages);
});

for (const lang of languages) {
  test(`${lang}: native share receives the canonical URL in text and URL fields`, async () => {
    const app = moduleContext.startApp(); const shared = [], copied = [];
    app.ctx.navigator.share = payload => { shared.push(JSON.parse(JSON.stringify(payload))); return Promise.resolve(); };
    app.ctx.navigator.clipboard = { writeText: text => { copied.push(text); return Promise.resolve(); } };
    app.ctx.selectedLanguage = lang;
    app.run('currentLang = selectedLanguage; shareEvent(1)');
    await Promise.resolve();
    assert.equal(shared.length, 1);
    assert.equal(shared[0].url, URL);
    assert.ok(shared[0].text.includes(URL));
    assert.ok(!shared[0].text.includes('roywg925.github.io'));
    assert.ok(!/\{\w+\}/.test(shared[0].text));
    assert.ok(shared[0].title.length > 0);
    assert.equal(copied.length, 0);
  });
  test(`${lang}: clipboard fallback receives the canonical share text`, async () => {
    const app = moduleContext.startApp(); const copied = [];
    app.ctx.navigator.clipboard = { writeText: text => { copied.push(text); return Promise.resolve(); } };
    app.ctx.selectedLanguage = lang;
    app.run('currentLang = selectedLanguage; shareEvent(1)');
    await Promise.resolve();
    assert.equal(copied.length, 1);
    assert.ok(copied[0].includes(URL));
    assert.ok(!copied[0].includes('roywg925.github.io'));
    assert.ok(!/\{\w+\}/.test(copied[0]));
    assert.ok(app.notices.length > 0);
  });
}

test('invalid event and absent share APIs produce no external side effect', () => {
  const app = moduleContext.startApp(); const calls = [];
  app.ctx.navigator.share = data => { calls.push(data); return Promise.resolve(); };
  app.run('shareEvent(-1)');
  assert.equal(calls.length, 0);
  delete app.ctx.navigator.share;
  assert.doesNotThrow(() => app.run('shareEvent(1)'));
});
