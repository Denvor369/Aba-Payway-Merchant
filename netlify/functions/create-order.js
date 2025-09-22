// /.netlify/functions/create-order
exports.handler = async (event) => {
  const ORIGIN = process.env.ORIGIN || '*';
  const DRY_RUN = String(process.env.DRY_RUN || '').trim() === '1'; // ← set to 1 to TEST without Telegram

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const items = Array.isArray(body.items) ? body.items : [];
  const customer = body.customer || {};
  if (!items.length) return { statusCode: 400, body: 'No items' };

  // Authoritative price list (edit as needed)
  const catalog = { sunscreen: 9.9, fiber: 12.9, mask: 1.99 };

  // Validate & compute
  let total = 0;
  const normalized = [];
  for (const raw of items) {
    const id = String(raw.id || '').trim();
    const qty = Number(raw.qty);
    if (!catalog[id]) return { statusCode: 400, body: `Unknown item: ${id}` };
    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) return { statusCode: 400, body: `Bad quantity for ${id}` };
    const price = catalog[id];
    total += price * qty;
    normalized.push({ id, qty, price });
  }

  const orderId = 'ORD' + Date.now();

  // Build Telegram message text
  const summary = normalized.map(i => `${i.id} x${i.qty}`).join(', ');
  const lines = [
    `🧾 New order ${orderId}`,
    `Items: ${summary}`,
    `Total: $${total.toFixed(2)}`,
    customer.name ? `Name: ${customer.name}` : '',
    customer.phone ? `Phone: ${customer.phone}` : '',
    customer.address ? `Address: ${customer.address}` : '',
    customer.province ? `Province: ${customer.province}` : '',
    customer.note ? `Note: ${customer.note}` : ''
  ].filter(Boolean);

  // ---- DRY RUN MODE: do everything except calling Telegram ----
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would send message:\n' + lines.join('\n'));
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': ORIGIN, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ orderId, status: 'pending', total, dryRun: true, preview: lines })
    };
  }

  // ---- Real Telegram send ----
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { statusCode: 500, body: 'Telegram not configured' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true })
    });
    const tg = await res.json();
    if (!res.ok || !tg.ok) {
      return { statusCode: 502, body: `Telegram error: ${tg.description || res.statusText}` };
    }
  } catch {
    return { statusCode: 502, body: 'Telegram request failed' };
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': ORIGIN, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ orderId, status: 'pending', total })
  };
};
