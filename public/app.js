const $ = id => document.getElementById(id);

let messages = Store.get('messages', []);
let lastResult = Store.get('lastResult', null);

function init() {
  if (!Store.get('items')) {
    Store.set('items', Store.sampleItems.join('\n'));
  }
  $('items').value = Store.get('items', '');
  $('prefs').value = Store.get('prefs', '');
  const name = Store.get('name', '');
  $('name').value = name;
  sayHi(name);
  if (lastResult) showResult(lastResult);
}

function sayHi(name) {
  $('hello').textContent = name ? `Hi ${name}!` : '';
}

function setBusy(busy) {
  $('organize').disabled = busy;
  $('send-reply').disabled = busy;
  $('status').textContent = busy ? 'Thinking...' : '';
}

function friendlyError(code) {
  if (code === 'NO_KEY' || code === 'API_ERROR') {
    return "Hmm, the AI couldn't answer. Check that the key in .env is still good, then try again.";
  }
  return "Hmm, the AI couldn't answer. Check your internet connection and that the key in .env is still good.";
}

async function ask(followUp) {
  const items = $('items').value.trim();
  const prefs = $('prefs').value.trim();
  if (!items) {
    $('status').textContent = 'Add at least one thing to do first!';
    return;
  }
  Store.set('items', items);
  Store.set('prefs', prefs);

  if (followUp) {
    messages.push({ role: 'user', content: followUp });
  } else {
    messages = [];
  }

  setBusy(true);
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, preferences: prefs, messages }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      $('status').textContent = friendlyError(data.code);
      if (followUp) messages.pop();
      return;
    }
    messages.push({ role: 'assistant', content: data.raw });
    Store.set('messages', messages);
    Store.set('lastResult', data.result);
    lastResult = data.result;
    showResult(data.result);
  } catch {
    $('status').textContent = friendlyError('NETWORK');
    if (followUp) messages.pop();
  } finally {
    setBusy(false);
  }
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function dayIndex(day) {
  const i = DAY_ORDER.indexOf(String(day || '').slice(0, 3).toLowerCase());
  return i === -1 ? 99 : i;
}

function showResult(result) {
  $('result').hidden = false;
  $('ai-message').textContent = result.message || '';
  const tbody = $('schedule').querySelector('tbody');
  tbody.innerHTML = '';
  const sorted = (result.schedule || [])
    .slice()
    .sort((a, b) => dayIndex(a.day) - dayIndex(b.day) || String(a.start).localeCompare(String(b.start)));
  $('schedule').hidden = sorted.length === 0;
  sorted.forEach(slot => {
    const tr = document.createElement('tr');
    [slot.day, slot.start, slot.end, slot.activity, slot.note].forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  $('ai-question').textContent = result.question || '';
  $('reply').value = '';
}

$('organize').addEventListener('click', () => ask(null));
$('send-reply').addEventListener('click', () => {
  const text = $('reply').value.trim();
  if (text) ask(text);
});
$('reply').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const text = $('reply').value.trim();
    if (text) ask(text);
  }
});
$('save-name').addEventListener('click', () => {
  const name = $('name').value.trim();
  Store.set('name', name);
  sayHi(name);
});

init();
