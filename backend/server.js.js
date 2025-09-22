// backend/server.js  (CommonJS; works on Node 18+)
// Run: node server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// Allow your dev site (VS Code Live Server is usually 127.0.0.1:5500)
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]
}));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID; // @channel_username or -100xxxxxxxxxx

app.get('/health', (_req, res) => res.json({ ok:true }));

app.post('/api/telegram-order', async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok:false, error:'Missing TELEGRAM_* env vars' });
    }

    const body  = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const text = [
      '🧾 *New Order*',
      `👤 *Name:* ${body.name || '-'}`,
      `📞 *Phone:* ${body.phone || '-'}`,
      `📍 *Address:* ${body.address || '-'}`,
      `🏙️ *Province:* ${body.provinceLabel || body.province || '-'}`,
      body.note ? `📝 *Note:* ${body.note}` : null,
      '',
      '🛒 *Items:*',
      ...(items.length ? items.map(it => `• ${it.title} × ${it.qty} — ${it.lineTotal}`) : ['(empty)']),
      '',
      `🚚 *Delivery Fee:* ${body.delivery ?? '-'}`,
      `💰 *Total:* ${body.total ?? '-'}`,
      '',
      `☎️ Telegram opt-in: ${body.tgOptIn ? 'Yes' : 'No'}`
    ].filter(Boolean).join('\n');

    // Node 18+ has global fetch
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return res.status(502).json({ ok:false, error: tgData.description || 'Telegram error' });
    }
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running at http://localhost:${PORT}`));
