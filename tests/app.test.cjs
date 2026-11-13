const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the shipped inline script, including initialization. DOM/clock/storage
// doubles isolate logic; these tests are not browser or visual acceptance.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const NOW = Date.parse('2026-11-10T12:00:00Z');
function element() {
  const classes = new Set();
  return { textContent: '', innerHTML: '', dataset: {}, style: { setProperty() {} },
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
    addEventListener() {}, querySelector() { return element(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100 }; }, getContext() { return {}; }, remove() {} };
}
function boot(data = new Map(), faults = {}) {
  const nodes = new Map(), notices = [], timers = [];
  const document = { documentElement: element(), body: { appendChild: el => notices.push(el) },
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    querySelector: () => element(), querySelectorAll: () => [], createElement: element, addEventListener() {} };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ document, navigator: { language: 'en' }, Date: Clock, console,
    localStorage: { getItem(k) { if (faults.read) throw Error('blocked'); return data.get(k) ?? null; },
      setItem(k,v) { if (faults.write) throw Error('quota'); if (faults.writes) faults.writes.push(k); data.set(k,String(v)); } },
    requestAnimationFrame() {}, setInterval() {}, setTimeout(fn) { timers.push(fn); },
    window: { addEventListener() {}, innerWidth:1280, innerHeight:800 } });
  vm.runInContext(script, ctx, { timeout: 1000 });
  return { ctx, data, faults, notices, nodes, run: code => vm.runInContext(code, ctx, { timeout: 1000 }),
    vote(id=1) { ctx.testButton = element(); ctx.testId = id; this.run('voteHype(testButton, testId)'); return ctx.testButton; } };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('countdown exact, past, subsecond and day rollover boundaries', () => {
  const app = boot();
  for (const delta of [-1, 0, 1, 999, 1000, 59999, 60000, 3599999, 3600000, 86399999, 86400000, 90061000]) {
    app.ctx.target = new Date(NOW + delta).toISOString();
    const cd = plain(app.run('getCountdown(target)'));
    assert.equal(cd.expired, delta <= 0);
    assert.equal(cd.total, Math.max(0,delta));
    assert.equal(cd.days*86400+cd.hours*3600+cd.minutes*60+cd.seconds, Math.floor(Math.max(0,delta)/1000));
    assert.ok(cd.hours < 24 && cd.minutes < 60 && cd.seconds < 60);
  }
});
test('invalid countdown and progress inputs never produce NaN', () => {
  const app = boot();
  for (const input of ['', 'not-a-date', undefined, null, {}, Infinity]) {
    app.ctx.input = input;
    const cd = app.run('getCountdown(input)');
    assert.equal(cd.expired, true);
    assert.equal(cd.total, 0);
    assert.equal(app.run('getTimeProgress(input)'), 0);
  }
});
test('valid local vote persists once across reload', () => {
  const app = boot();
  const before = app.run('getVoteCount(1)');
  app.vote(); app.vote();
  assert.equal(app.run('getVoteCount(1)'), before+1);
  const reloaded = boot(app.data);
  assert.equal(reloaded.run('getVoteCount(1)'), before+1);
  assert.equal(reloaded.run('hasVoted(1)'), true);
  reloaded.vote();
  assert.equal(reloaded.run('getVoteCount(1)'), before+1);
});
test('reject unknown and malformed vote IDs without writing', () => {
  const app = boot(); const before = [...app.data];
  for (const id of [0, -1, 999999, '1', '__proto__', null, NaN, 1.5]) app.vote(id);
  assert.deepEqual([...app.data],before);
});
test('corrupt JSON is preserved through startup and attempted vote, with visible error', () => {
  const data = new Map([['dp_votes', '{broken']]);
  const app = boot(data); app.vote();
  assert.equal(data.get('dp_votes'), '{broken');
  assert.equal(app.run('hasVoted(1)'), false);
  assert.ok(app.notices.some(el => el.textContent.length > 0));
});
test('valid JSON with invalid vote shapes does not crash or overwrite source', () => {
  for (const raw of ['null','[]','42','{"1":-1}','{"1":"8"}','{"1":1.5}','{"__proto__":12}']) {
    const data = new Map([['dp_votes', raw]]);
    const app = boot(data); app.vote();
    assert.equal(data.get('dp_votes'), raw);
    assert.equal(app.run('hasVoted(1)'), false);
    assert.ok(app.notices.length > 0);
  }
});
test('invalid personal vote flags preserve original and block vote mutation', () => {
  const raw = '{"1":"false"}';
  const app = boot(new Map([['dp_my_votes',raw]])); app.vote(2);
  assert.equal(app.data.get('dp_my_votes'),raw);
  assert.equal(app.run('hasVoted(2)'),false);
  assert.ok(app.notices.length > 0);
});
test('unavailable storage reads remain explicit and do not accept a vote', () => {
  const app = boot(new Map(),{read:true}); app.vote();
  assert.equal(app.run('hasVoted(1)'),false);
  assert.ok(app.notices.length > 0);
});
test('failed write does not change counts, voted state, button or existing bytes', () => {
  const app = boot(); const before = [...app.data], count = app.run('getVoteCount(1)');
  app.faults.write = true;
  const button = app.vote();
  assert.equal(app.run('getVoteCount(1)'),count);
  assert.equal(app.run('hasVoted(1)'),false);
  assert.equal(button.classList.contains('voted'),false);
  assert.deepEqual([...app.data],before);
  assert.ok(app.notices.length > 0);
  app.faults.write = false; app.vote();
  assert.equal(app.run('getVoteCount(1)'),count+1);
});
test('language inputs normalize safely and selection survives reload', () => {
  const app = boot();
  for (const [input, expected] of [['en-US','en'],['zh-HK','zh-TW'],['XX','zh-TW'],[null,'zh-TW'],['ja','ja']]) {
    app.ctx.input = input; assert.equal(app.run('normalizeLang(input)'),expected);
  }
  app.run("applyLanguage('ja')");
  assert.equal(boot(app.data).run('currentLang'),'ja');
});

test('rendered card digits shrink correctly across the 100 to 99 day boundary', () => {
  const app = boot();
  const id = app.run('events.find(e => e.id !== heroEvent.id).id');
  const container = app.nodes.get('card-cd-'+id) || element();
  app.nodes.set('card-cd-'+id,container);
  let digits = [];
  Object.defineProperty(container,'innerHTML', { set(markup) {
    digits = [...markup.matchAll(/class="card-digit"[^>]*>(\d)<\/div>/g)].map(match=>({textContent:match[1],classList:{add(){},remove(){}}}));
  }});
  app.ctx.document.querySelectorAll = selector => selector === `.card-digit[data-event="${id}"]` ? digits : [];
  app.ctx.cardId=id;
  app.run("events.find(e=>e.id===cardId).date=new Date(Date.now()+100*86400000).toISOString(); document.getElementById('card-cd-'+cardId).innerHTML=buildCardCountdown(events.find(e=>e.id===cardId))");
  assert.equal(digits.length,9);
  app.run('Date.now=()=>'+(NOW+1000)+';updateCardDigits()');
  assert.equal(digits.map(d=>d.textContent).join(''),'99235959');
});

test('legacy counts and flags migrate without deleting or rewriting legacy bytes', () => {
  const counts='{"1":42,"2":8}', mine='{"1":true}';
  const app=boot(new Map([['dp_votes',counts],['dp_my_votes',mine]]));
  assert.equal(app.run('getVoteCount(1)'),42);
  assert.equal(app.run('hasVoted(1)'),true);
  app.vote(2);
  assert.equal(app.data.get('dp_votes'),counts);
  assert.equal(app.data.get('dp_my_votes'),mine);
  const reloaded=boot(app.data);
  assert.equal(reloaded.run('getVoteCount(2)'),9);
  assert.equal(reloaded.run('hasVoted(2)'),true);
});
test('each vote commits both fields in a single storage write', () => {
  const app=boot(); app.faults.writes=[]; app.vote();
  assert.equal(app.faults.writes.length,1);
  const record=JSON.parse(app.data.get(app.faults.writes[0]));
  assert.equal(record.counts['1'],app.run('getVoteCount(1)'));
  assert.equal(record.mine['1'],true);
});
test('invalid current storage schema fails closed and preserves all original keys', () => {
  for(const raw of ['{broken','null','{}','[]','{"version":2,"counts":{},"mine":{}}','{"version":1,"counts":{"1":-4},"mine":{}}']) {
    const app=boot(new Map([['dp_vote_state',raw],['dp_votes','{"1":12}']]));
    app.vote();
    assert.equal(app.data.get('dp_vote_state'),raw);
    assert.equal(app.data.get('dp_votes'),'{"1":12}');
    assert.equal(app.run('hasVoted(1)'),false);
    assert.ok(app.notices.length>0);
  }
});
test('count overflow is rejected without changing existing data', () => {
  const app=boot(new Map([['dp_votes',JSON.stringify({1:Number.MAX_SAFE_INTEGER})]]));
  const before=[...app.data];app.vote();
  assert.deepEqual([...app.data],before);
  assert.equal(app.run('hasVoted(1)'),false);
  assert.ok(app.notices.length>0);
});
