// Best-effort in-memory rate limit. Serverless instances are ephemeral and
// not shared, so this only throttles bursts hitting the same warm instance —
// it is a speed bump, not a real distributed limiter.
const recentSubmissions = new Map();
const RATE_LIMIT_WINDOW_MS = 15000;

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Method Not Allowed' }));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Telegram env vars are not set' }));
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const lastSubmit = recentSubmissions.get(ip);
  if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_WINDOW_MS) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Забагато запитів, спробуйте пізніше' }));
    return;
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Honeypot: real visitors never fill this hidden field.
  const honeypot = (payload.website || '').toString().trim();
  if (honeypot) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const name = (payload.name || '').toString().trim().slice(0, 100);
  const phone = (payload.phone || '').toString().trim().slice(0, 30);
  const company = (payload.company || '—').toString().trim().slice(0, 150) || '—';
  const message = (payload.message || '—').toString().trim().slice(0, 1000) || '—';

  if (!name || !isValidPhone(phone)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Вкажіть коректні імʼя та телефон' }));
    return;
  }

  recentSubmissions.set(ip, Date.now());
  if (recentSubmissions.size > 500) {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [key, ts] of recentSubmissions) {
      if (ts < cutoff) recentSubmissions.delete(key);
    }
  }

  const text = [
    'Нова заявка з сайту PivTorg',
    `Імʼя: ${name}`,
    `Телефон: ${phone}`,
    `Компанія: ${company}`,
    `Коментар: ${message}`,
    `Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}`,
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, message: details }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: error.message }));
  }
};
