const fs = require('fs');
const path = require('path');
const { SYSTEM_PROMPT, MODEL, buildMessages, parseResult } = require('./docs/ai-shared.js');

const ROOT = __dirname;

function readApiKey() {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const line = env.split(/\r?\n/).find(l => l.trim().startsWith('OPENAI_API_KEY='));
    return line ? line.split('=').slice(1).join('=').trim() : '';
  } catch {
    return '';
  }
}

function readModel() {
  try {
    const notes = fs.readFileSync(path.join(ROOT, 'NOTES.md'), 'utf8');
    const m = notes.match(/gpt-[a-z0-9.-]+/i);
    return m ? m[0] : MODEL;
  } catch {
    return MODEL;
  }
}

async function callChatCompletions(key, model, messages) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await r.json();
  if (!r.ok) {
    const err = data.error?.message || `HTTP ${r.status}`;
    if (r.status === 404 || /does not exist|not supported|unsupported/i.test(err)) {
      return callResponses(key, model, messages);
    }
    return { ok: false, code: 'API_ERROR', error: err };
  }
  return { ok: true, raw: data.choices?.[0]?.message?.content || '' };
}

async function callResponses(key, model, messages) {
  const input = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions: SYSTEM_PROMPT, input }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, code: 'API_ERROR', error: data.error?.message || `HTTP ${r.status}` };
  return { ok: true, raw: data.output_text || '' };
}

async function askAI(payload) {
  const key = readApiKey();
  if (!key) return { ok: false, code: 'NO_KEY', error: 'No API key found in .env' };
  const model = readModel();
  try {
    const r = await callChatCompletions(key, model, buildMessages(payload));
    if (!r.ok) return r;
    return { ok: true, raw: r.raw, result: parseResult(r.raw) };
  } catch (e) {
    return { ok: false, code: 'NETWORK', error: 'Could not reach OpenAI' };
  }
}

module.exports = { askAI };
