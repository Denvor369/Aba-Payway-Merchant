// server.telegram.js — Telegram order route (ESM)
import axios from 'axios';

export function attachTelegramOrderRoutes(app) {
  const {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_ADMIN_CHAT_ID,
    TELEGRAM_BOT_USERNAME
  } = process.env;

  app.post('/order/telegram', async (req, res) => {
    try {
      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
        return res.status(500).json({ ok:false, error: 'Missing TELEGRAM_* env vars' });
      }

      const payload = req.body || {};
      const { name, phone, provinceLabel, note, items = [], delivery, total, tgOptIn } = payload;

      if (!name || !phone || !provinceLabel || !Array.isArray(items) || !items.length) {
        return res.status(400).json({ ok:false, error: 'Invalid order payload' });
      }

      const orderId = Math.random().toString(36).slice(2, 8).toUpperCase();
      const esc = (s='') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      const itemsBlock = items.map(it => `• ${esc(it.title)} × ${esc(it.qty)} — $${Number(it.price||0).toFixed(2)}`).join('\n');

      const text =
`<b>🧾 New Order #${orderId}</b>
<b>Name:</b> ${esc(name)}
<b>Phone:</b> ${esc(phone)}
<b>Province:</b> ${esc(provinceLabel)}
${note ? `<b>Note:</b> ${esc(note)}` : ''}
<b>Items:</b>
${esc(itemsBlock)}

<b>Delivery:</b> ${esc(delivery || 'Standard')}
<b>Total:</b> ${esc(total || '')}
${tgOptIn ? '\nCustomer ticked: Contact via Telegram ✅' : ''}`;

      let reply_markup;
      let deepLink;
      if (tgOptIn && TELEGRAM_BOT_USERNAME) {
        deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=order_${orderId}`;
        reply_markup = {
          inline_keyboard: [
            [{ text: '💬 Open Bot (Customer)', url: deepLink }],
            [{ text: '📞 Call Customer', url: `tel:${String(phone||'').replace(/\s+/g,'')}` }]
          ]
        };
      } else {
        reply_markup = { inline_keyboard: [[{ text: '📞 Call Customer', url: `tel:${String(phone||'').replace(/\s+/g,'')}` }]] };
      }

      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const tgResp = await axios.post(url, {
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        reply_markup
      }, { timeout: 10000 });

      if (!tgResp.data || tgResp.data.ok !== true) {
        return res.status(500).json({ ok:false, error: 'Telegram send failed', tg: tgResp.data });
      }

      return res.json({ ok:true, orderId, deepLink });
    } catch (err) {
      console.error('[telegram] order error:', err?.response?.data || err.message || err);
      return res.status(500).json({ ok:false, error: 'Server error' });
    }
  });
}
