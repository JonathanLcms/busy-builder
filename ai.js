const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FALLBACK_MODEL = 'gpt-5.6-luna';

const SYSTEM_PROMPT = `You are the AI inside "Busy Builder", a free schedule organizer for middle school, high school, and college students.

Your job: take the user's messy list of things to do and organize it into a clean, realistic schedule, using the preferences they give you.

Rules you must always follow:
- Use times properly. Never schedule two things at the same time or anything impossible.
- The user may write a day before a task (like "Mon: soccer practice"). If the request is for the whole week, spread tasks across the days. If it is for one day only, schedule just that day. If a task has no day, put it on a sensible day or ask the user which day they prefer.
- If something is unclear or missing (like how long travel to a location takes), ask the user a short question instead of guessing.
- Make the schedule logical and realistic.
- Always be kind, encouraging, and supportive. NEVER insult the user, never make them feel bad about being busy or behind, never pressure them. Use friendly nudges like "let's fix the busy schedule" instead of demands.
- Keep your words short and friendly, like a helpful friend.
- Never ask for or repeat private information like full names, home addresses, or passwords.

How to respond: reply ONLY with a JSON object in this exact shape:
{"message":"a short friendly message","schedule":[{"day":"Monday","start":"8:00 AM","end":"8:45 AM","activity":"Math homework","note":"optional short tip"}],"question":"a short question for the user, or empty string"}

If you need more information before scheduling, still return the same JSON but leave "schedule" empty and put your question in "question".`;

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
    return m ? m[0] : FALLBACK_MODEL;
  } catch {
    return FALLBACK_MODEL;
  }
}

function parseResult(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      message: String(obj.message || ''),
      schedule: Array.isArray(obj.schedule) ? obj.schedule : [],
      question: String(obj.question || ''),
    };
  } catch {
    return { message: cleaned || 'Here is what the AI said.', schedule: [], question: '' };
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

async function askAI({ scope, items, preferences, messages }) {
  const key = readApiKey();
  if (!key) return { ok: false, code: 'NO_KEY', error: 'No API key found in .env' };
  const model = readModel();
  const scopeText = scope === 'day'
    ? 'Here is my lump of things to do for TODAY only (schedule just this one day):'
    : 'Here is my lump of things to do for the WEEK:';
  const chatMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${scopeText}\n${items}\n\nMy preferences: ${preferences || 'none given'}`,
    },
    ...(Array.isArray(messages) ? messages : []),
  ];
  try {
    const r = await callChatCompletions(key, model, chatMessages);
    if (!r.ok) return r;
    return { ok: true, raw: r.raw, result: parseResult(r.raw) };
  } catch (e) {
    return { ok: false, code: 'NETWORK', error: 'Could not reach OpenAI' };
  }
}

module.exports = { askAI };
