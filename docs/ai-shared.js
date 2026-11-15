(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AIShared = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const MODEL = 'gpt-5.6-luna';

  const SYSTEM_PROMPT = `You are the AI inside "Busy Builder", a free schedule organizer for middle school, high school, and college students.

Your job: take the user's messy list of things to do and organize it into a clean, realistic schedule, using the preferences they give you.

Rules you must always follow:
- Use times properly. Never schedule two things at the same time or anything impossible.
- The user may write a day before a task (like "Mon: soccer practice"). If the request is for the whole week, spread tasks across the days. If it is for one day only, schedule just that day. If a task has no day, put it on a sensible day or ask the user which day they prefer.
- If something is unclear or missing (like how long travel to a location takes), ask the user a short question instead of guessing.
- The user may type one of their own short codes (like "HW"). Always write the full meaning in the schedule — never the short code itself.
- Make the schedule logical and realistic.
- Always be kind, encouraging, and supportive. NEVER insult the user, never make them feel bad about being busy or behind, never pressure them. Use friendly nudges like "let's fix the busy schedule" instead of demands.
- Keep your words short and friendly, like a helpful friend.
- Never ask for or repeat private information like full names, home addresses, or passwords.

How to respond: reply ONLY with a JSON object in this exact shape:
{"message":"a short friendly message","schedule":[{"day":"Monday","start":"8:00 AM","end":"8:45 AM","activity":"Math homework","note":"optional short tip"}],"question":"a short question for the user, or empty string"}

If you need more information before scheduling, still return the same JSON but leave "schedule" empty and put your question in "question".`;

  function buildMessages({ scope, items, preferences, messages, shortcuts }) {
    const scopeText = scope === 'day'
      ? 'Here is my lump of things to do for TODAY only (schedule just this one day):'
      : 'Here is my lump of things to do for the WEEK:';
    const shortcutText = Array.isArray(shortcuts) && shortcuts.length
      ? `\n\nMy shortcuts (write the full meaning, never the code): ${shortcuts.map(s => `${s.abbr} = ${s.meaning}`).join('; ')}`
      : '';
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${scopeText}\n${items}\n\nMy preferences: ${preferences || 'none given'}${shortcutText}`,
      },
      ...(Array.isArray(messages) ? messages : []),
    ];
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

  return { MODEL, SYSTEM_PROMPT, buildMessages, parseResult };
});
