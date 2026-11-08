const fs = require('fs');
const path = require('path');

function envValue(name) {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const line = env.split(/\r?\n/).find(l => l.trim().startsWith(name + '='));
    return line ? line.split('=').slice(1).join('=').trim() : '';
  } catch {
    return '';
  }
}

async function sendScheduleEmail({ to, subject, message }) {
  const serviceId = envValue('EMAILJS_SERVICE_ID');
  const templateId = envValue('EMAILJS_TEMPLATE_ID');
  const publicKey = envValue('EMAILJS_PUBLIC_KEY');
  const privateKey = envValue('EMAILJS_PRIVATE_KEY');
  if (!serviceId || !templateId || !publicKey) {
    return { ok: false, code: 'NOT_CONFIGURED', error: 'EmailJS keys missing in .env' };
  }
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        ...(privateKey ? { accessToken: privateKey } : {}),
        template_params: {
          to_email: to,
          subject,
          message,
          from_name: 'Busy Builder',
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { ok: false, code: 'API_ERROR', error: `EmailJS HTTP ${r.status}` };
    return { ok: true };
  } catch {
    return { ok: false, code: 'NETWORK', error: 'Could not reach the email service' };
  }
}

module.exports = { sendScheduleEmail };
