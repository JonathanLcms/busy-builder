const AIClient = {
  async ask(key, payload) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: AIShared.MODEL, messages: AIShared.buildMessages(payload) }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await r.json();
    if (!r.ok) {
      return { ok: false, code: 'API_ERROR', error: data.error?.message || `HTTP ${r.status}` };
    }
    const raw = data.choices?.[0]?.message?.content || '';
    return { ok: true, raw, result: AIShared.parseResult(raw) };
  },
};
