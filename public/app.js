const $ = id => document.getElementById(id);

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function dayIndex(day) {
  const i = DAY_ORDER.indexOf(String(day || '').slice(0, 3).toLowerCase());
  return i === -1 ? 99 : i;
}

function dayName(day) {
  const d = String(day || '').trim();
  return d ? d[0].toUpperCase() + d.slice(1) : 'Any day';
}

const TABS = {
  today: {
    scope: 'day',
    ids: {
      items: 't-items', prefs: 't-prefs', organize: 't-organize', status: 't-status',
      result: 't-result', message: 't-message', schedule: 't-schedule',
      question: 't-question', reply: 't-reply', send: 't-send',
      clear: 't-clear', copy: 't-copy',
    },
    fields: { items: 'today_items', prefs: 'today_prefs', messages: 'today_messages', result: 'today_lastResult' },
    messages: [],
    lastResult: null,
  },
  week: {
    scope: 'week',
    ids: {
      prefs: 'prefs', organize: 'organize', status: 'status',
      result: 'result', message: 'ai-message', schedule: 'schedule',
      question: 'ai-question', reply: 'reply', send: 'send-reply',
      clear: 'w-clear', copy: 'w-copy',
    },
    dayBoxes: { mon: 'w-mon', tue: 'w-tue', wed: 'w-wed', thu: 'w-thu', fri: 'w-fri', sat: 'w-sat', sun: 'w-sun', any: 'w-any' },
    fields: { items: 'items', prefs: 'prefs', messages: 'messages', result: 'lastResult' },
    messages: [],
    lastResult: null,
  },
};

const DAY_PREFIX = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

function collectItems(t) {
  if (!t.dayBoxes) return $(t.ids.items).value.trim();
  const map = {};
  const lines = [];
  Object.keys(t.dayBoxes).forEach(k => {
    const text = $(t.dayBoxes[k]).value.trim();
    map[k] = text;
    text.split('\n').filter(l => l.trim()).forEach(l => {
      lines.push(k === 'any' ? l.trim() : `${DAY_PREFIX[k]}: ${l.trim()}`);
    });
  });
  t.pendingDayMap = map;
  return lines.join('\n');
}

function migrateWeekItems(text) {
  const map = {};
  text.split('\n').forEach(line => {
    const m = line.match(/^\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*:\s*(.+)$/i);
    if (m) {
      const k = m[1].toLowerCase();
      map[k] = (map[k] ? map[k] + '\n' : '') + m[2].trim();
    } else if (line.trim()) {
      map.any = (map.any ? map.any + '\n' : '') + line.trim();
    }
  });
  return map;
}

function fillDayBoxes(t) {
  let data = Store.get(t.fields.items, null);
  if (!data) {
    data = Store.sampleWeekDays;
    Store.set(t.fields.items, data);
  } else if (typeof data === 'string') {
    data = migrateWeekItems(data);
    Store.set(t.fields.items, data);
  }
  Object.keys(t.dayBoxes).forEach(k => {
    $(t.dayBoxes[k]).value = data[k] || '';
  });
}

function sayHi(name) {
  $('hello').textContent = name ? `Hi ${name}!` : '';
}

let shortcuts = Store.get('shortcuts', null);
if (!shortcuts) {
  shortcuts = [
    { abbr: 'HW', meaning: 'Homework' },
    { abbr: 'SP', meaning: 'Soccer practice' },
  ];
  Store.set('shortcuts', shortcuts);
}

function renderShortcuts() {
  const host = $('sc-list');
  host.innerHTML = '';
  shortcuts.forEach((s, i) => {
    const chip = document.createElement('span');
    chip.className = 'sc-chip';
    chip.textContent = `${s.abbr} = ${s.meaning}`;
    const x = document.createElement('button');
    x.className = 'sc-x';
    x.textContent = '×';
    x.addEventListener('click', () => {
      shortcuts.splice(i, 1);
      Store.set('shortcuts', shortcuts);
      renderShortcuts();
    });
    chip.appendChild(x);
    host.appendChild(chip);
  });
}

function addShortcut() {
  const abbr = $('sc-abbr').value.trim().toUpperCase();
  const meaning = $('sc-mean').value.trim();
  if (!abbr || !meaning || shortcuts.some(s => s.abbr === abbr)) return;
  shortcuts.push({ abbr, meaning });
  Store.set('shortcuts', shortcuts);
  $('sc-abbr').value = '';
  $('sc-mean').value = '';
  renderShortcuts();
}

function setBusy(t, busy) {
  $(t.ids.organize).disabled = busy;
  $(t.ids.send).disabled = busy;
  $(t.ids.status).textContent = busy ? 'Thinking' : '';
  $(t.ids.status).classList.toggle('thinking', busy);
}

function friendlyError(code) {
  if (code === 'NO_KEY' || code === 'API_ERROR') {
    return "Hmm, the AI couldn't answer. Check that the key in .env is still good, then try again.";
  }
  return "Hmm, the AI couldn't answer. Check your internet connection and that the key in .env is still good.";
}

async function ask(t, followUp) {
  const items = collectItems(t);
  const prefs = $(t.ids.prefs).value.trim();
  if (!items) {
    $(t.ids.status).textContent = 'Add at least one thing to do first!';
    return;
  }
  Store.set(t.fields.items, t.dayBoxes ? t.pendingDayMap : items);
  Store.set(t.fields.prefs, prefs);

  if (followUp) {
    t.messages.push({ role: 'user', content: followUp });
  } else {
    t.messages = [];
  }

  setBusy(t, true);
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: t.scope, items, preferences: prefs, messages: t.messages, shortcuts }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      $(t.ids.status).textContent = friendlyError(data.code);
      if (followUp) t.messages.pop();
      return;
    }
    t.messages.push({ role: 'assistant', content: data.raw });
    Store.set(t.fields.messages, t.messages);
    Store.set(t.fields.result, data.result);
    t.lastResult = data.result;
    showResult(t, data.result);
  } catch {
    $(t.ids.status).textContent = friendlyError('NETWORK');
    if (followUp) t.messages.pop();
  } finally {
    setBusy(t, false);
  }
}

function buildTable(slots) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Start</th><th>End</th><th>Activity</th><th>Note</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  slots.forEach(slot => {
    const tr = document.createElement('tr');
    [slot.start, slot.end, slot.activity, slot.note].forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function showResult(t, result) {
  $(t.ids.result).hidden = false;
  $(t.ids.message).textContent = result.message || '';
  const host = $(t.ids.schedule);
  host.innerHTML = '';
  const slots = (result.schedule || [])
    .slice()
    .sort((a, b) => dayIndex(a.day) - dayIndex(b.day) || String(a.start).localeCompare(String(b.start)));
  host.hidden = slots.length === 0;

  if (t.scope === 'week') {
    const groups = {};
    slots.forEach(slot => {
      const name = dayName(slot.day);
      (groups[name] = groups[name] || []).push(slot);
    });
    Object.keys(groups).forEach(name => {
      const section = document.createElement('div');
      section.className = 'day-section';
      const h = document.createElement('h3');
      h.textContent = name;
      section.appendChild(h);
      section.appendChild(buildTable(groups[name]));
      host.appendChild(section);
    });
  } else if (slots.length) {
    host.appendChild(buildTable(slots));
  }

  $(t.ids.question).textContent = result.question || '';
  $(t.ids.reply).value = '';
}

function scheduleText(t, result) {
  const lines = [];
  if (t.scope === 'week') {
    const groups = {};
    (result.schedule || []).forEach(slot => {
      const name = dayName(slot.day);
      (groups[name] = groups[name] || []).push(slot);
    });
    Object.keys(groups).forEach(name => {
      lines.push(name.toUpperCase());
      groups[name].forEach(s => lines.push(`  ${s.start} - ${s.end}  ${s.activity}${s.note ? ' (' + s.note + ')' : ''}`));
    });
  } else {
    (result.schedule || []).forEach(s => lines.push(`${s.start} - ${s.end}  ${s.activity}${s.note ? ' (' + s.note + ')' : ''}`));
  }
  if (result.message) lines.push('', result.message);
  if (result.question) lines.push('', result.question);
  return lines.join('\n');
}

function copySchedule(t) {
  if (!t.lastResult) return;
  const text = scheduleText(t, t.lastResult);
  navigator.clipboard.writeText(text).then(() => {
    $(t.ids.copy).textContent = 'Copied!';
    setTimeout(() => { $(t.ids.copy).textContent = 'Copy schedule'; }, 1500);
  });
}

function clearTab(t) {
  if (t.dayBoxes) {
    Object.keys(t.dayBoxes).forEach(k => { $(t.dayBoxes[k]).value = ''; });
  } else {
    $(t.ids.items).value = '';
  }
  $(t.ids.prefs).value = '';
  $(t.ids.result).hidden = true;
  $(t.ids.status).textContent = '';
  t.messages = [];
  t.lastResult = null;
  Object.values(t.fields).forEach(field => Store.remove(field));
}

const TAB_NAMES = ['today', 'week', 'alarms'];

function selectTab(name) {
  TAB_NAMES.forEach(n => {
    $('panel-' + n).hidden = n !== name;
    $('tabbtn-' + n).classList.toggle('active', n === name);
  });
  Store.set('tab', name);
}

let alarms = Store.get('alarms', []);
let audioCtx = null;

function beep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.start();
    o.stop(audioCtx.currentTime + 0.6);
  } catch {}
}

function showAlarmAlert(a) {
  $('al-alert-text').textContent = `Time's up: ${a.note}`;
  $('al-alert').hidden = false;
  beep();
}

function renderAlarms() {
  const host = $('al-list');
  host.innerHTML = '';
  const sorted = alarms.slice().sort((a, b) => new Date(a.time) - new Date(b.time));
  $('al-empty').hidden = sorted.length > 0;
  sorted.forEach(a => {
    const row = document.createElement('div');
    row.className = 'alarm-row' + (a.fired ? ' done' : '');
    const span = document.createElement('span');
    const when = new Date(a.time);
    span.textContent = `${when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — ${a.note}`;
    row.appendChild(span);
    const x = document.createElement('button');
    x.className = 'sc-x';
    x.textContent = '×';
    x.addEventListener('click', () => {
      alarms = alarms.filter(al => al.id !== a.id);
      Store.set('alarms', alarms);
      renderAlarms();
    });
    row.appendChild(x);
    host.appendChild(row);
  });
}

function addAlarm() {
  const time = $('al-time').value;
  const note = $('al-note').value.trim();
  if (!time || !note) {
    $('al-status').textContent = 'Pick a time and write a note first!';
    return;
  }
  alarms.push({ id: Date.now(), time, note, fired: false });
  Store.set('alarms', alarms);
  $('al-time').value = '';
  $('al-note').value = '';
  $('al-status').textContent = 'Alarm set!';
  renderAlarms();
}

function checkAlarms() {
  const now = new Date();
  let changed = false;
  alarms.forEach(a => {
    if (!a.fired && new Date(a.time) <= now) {
      a.fired = true;
      changed = true;
      showAlarmAlert(a);
    }
  });
  if (changed) {
    Store.set('alarms', alarms);
    renderAlarms();
  }
}

function wireTab(t) {
  $(t.ids.organize).addEventListener('click', () => ask(t, null));
  $(t.ids.send).addEventListener('click', () => {
    const text = $(t.ids.reply).value.trim();
    if (text) ask(t, text);
  });
  $(t.ids.reply).addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const text = $(t.ids.reply).value.trim();
      if (text) ask(t, text);
    }
  });
  $(t.ids.clear).addEventListener('click', () => clearTab(t));
  $(t.ids.copy).addEventListener('click', () => copySchedule(t));
}

function init() {
  if (!Store.get('today_items')) {
    Store.set('today_items', Store.sampleTodayItems.join('\n'));
  }
  Object.values(TABS).forEach(t => {
    t.messages = Store.get(t.fields.messages, []);
    t.lastResult = Store.get(t.fields.result, null);
    if (t.dayBoxes) {
      fillDayBoxes(t);
    } else {
      $(t.ids.items).value = Store.get(t.fields.items, '');
    }
    $(t.ids.prefs).value = Store.get(t.fields.prefs, '');
    if (t.lastResult) showResult(t, t.lastResult);
    wireTab(t);
  });
  const name = Store.get('name', '');
  $('name').value = name;
  sayHi(name);
  $('save-name').addEventListener('click', () => {
    const n = $('name').value.trim();
    Store.set('name', n);
    sayHi(n);
  });
  TAB_NAMES.forEach(n => {
    $('tabbtn-' + n).addEventListener('click', () => selectTab(n));
  });
  selectTab(Store.get('tab', 'today'));
  $('al-add').addEventListener('click', addAlarm);
  $('al-note').addEventListener('keydown', e => {
    if (e.key === 'Enter') addAlarm();
  });
  $('al-dismiss').addEventListener('click', () => { $('al-alert').hidden = true; });
  document.addEventListener('click', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });
  renderAlarms();
  checkAlarms();
  setInterval(checkAlarms, 15000);
  $('sc-add').addEventListener('click', addShortcut);
  $('sc-mean').addEventListener('keydown', e => {
    if (e.key === 'Enter') addShortcut();
  });
  $('sc-abbr').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('sc-mean').focus();
  });
  renderShortcuts();
}

init();
