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

function setBusy(t, busy) {
  $(t.ids.organize).disabled = busy;
  $(t.ids.send).disabled = busy;
  $(t.ids.status).textContent = busy ? 'Thinking...' : '';
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
      body: JSON.stringify({ scope: t.scope, items, preferences: prefs, messages: t.messages }),
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

function selectTab(name) {
  $('panel-today').hidden = name !== 'today';
  $('panel-week').hidden = name !== 'week';
  $('tabbtn-today').classList.toggle('active', name === 'today');
  $('tabbtn-week').classList.toggle('active', name === 'week');
  Store.set('tab', name);
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
  $('tabbtn-today').addEventListener('click', () => selectTab('today'));
  $('tabbtn-week').addEventListener('click', () => selectTab('week'));
  selectTab(Store.get('tab', 'today'));
}

init();
