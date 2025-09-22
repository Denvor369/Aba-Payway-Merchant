// netlify/functions/telegram-order.js
// Node 18+ (fetch available). NEVER expose your bot token in client-side JS.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;         // e.g. 123456:ABC...
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // your chat or group id (integer, can be negative for groups)
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;   // e.g. "YourShopBot" (no @)

function esc(s='') {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok:false, error:'Method not allowed' }) };
  }
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:'Missing Telegram env vars' }) };
  }

  const payload = JSON.parse(event.body || '{}');
  const { name, phone, provinceLabel, note, items = [], delivery, total, tgOptIn } = payload;

  if (!name || !phone || !provinceLabel || !Array.isArray(items) || !items.length) {
    return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Invalid order payload' }) };
  }

  // Make a short order id (for admin reference & deep-link token)
  const orderId = Math.random().toString(36).slice(2, 8).toUpperCase();

  const itemsBlock = items.map(it => `• ${esc(it.title)} × ${esc(it.qty)} — $${Number(it.price||0).toFixed(2)}`).join('\n');

  const text =
`<b>🧾 New Order #${orderId}</b>
<b>Name:</b> ${esc(name)}
<b>Phone:</b> ${esc(phone)}
<b>Province:</b> ${esc(provinceLabel)}
${note ? `<b>Note:</b> ${esc(note)}` : ''}
<b>Items:</b>
${esc(itemsBlock)}

<b>Delivery:</b> ${esc(delivery)}
<b>Total:</b> ${esc(total)}
${tgOptIn ? '\nCustomer ticked: Contact via Telegram ✅' : ''}`;

  // Inline button for you (admin) and, if tgOptIn, for the customer to quickly open the bot
  let reply_markup = undefined;
  let deepLink = undefined;

  if (tgOptIn && BOT_USERNAME) {
    deepLink = `https://t.me/${BOT_USERNAME}?start=order_${orderId}`;
    reply_markup = {
      inline_keyboard: [
        [{ text: '💬 Open Bot (Customer)', url: deepLink }],
        [{ text: '📞 Call Customer', url: `tel:${phone.replace(/\s+/g,'')}` }]
      ]
    };
  } else {
    reply_markup = {
      inline_keyboard: [
        [{ text: '📞 Call Customer', url: `tel:${phone.replace(/\s+/g,'')}` }]
      ]
    };
  }

  // Send to your admin chat
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup
    })
  });
  const data = await resp.json();

  if (!data.ok) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:'Telegram send failed', tg:data }) };
  }

  // Respond to the browser; if tgOptIn, include deep link for redirect
  return {
    statusCode: 200,
    body: JSON.stringify({ ok:true, orderId, deepLink })
  };
};
