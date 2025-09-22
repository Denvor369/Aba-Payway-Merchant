/* File: checkout.telegram.js */
(() => {
  'use strict';

  // Where to POST the order
  const ENDPOINT = (window.__TG_ORDER_ENDPOINT__ || '/telegram-order.php');

  // Helper: read cart from localStorage (same key your site uses)
  function loadBag() {
    try {
      const raw = localStorage.getItem('bag');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // Format money
  const fmt = n => '$' + (Number(n) || 0).toFixed(2);

  // Build a readable summary for Telegram
  function buildSummaryLines(bag) {
    if (!bag.length) return '—';
    return bag.map(it => {
      const title = (it.title || it.id || 'Item').toString().trim();
      const price = Number(it.price || 0);
      const qty = Number(it.qty || 0);
      return `• ${title} ×${qty} — ${fmt(price * qty)}`;
    }).join('\n');
  }

  // Total
  function calcTotal(bag) {
    return bag.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 0)), 0);
  }

  // Minimal toast
  function toast(msg, ms = 2000) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;left:50%;transform:translateX(-50%);bottom:24px;
      background:#111;color:#fff;padding:10px 14px;border-radius:10px;
      font-weight:600;z-index:99999;box-shadow:0 4px 18px rgba(0,0,0,.25)
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  async function sendOrder(payload) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    // Try to parse, but fall back to raw text (useful while debugging)
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, data: json };
  }

  function $(sel, root = document) { return root.querySelector(sel); }

  function bind() {
    const btn = $('#purchaseBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const name = ($('#name')?.value || '').trim();
      const phone = ($('#phone')?.value || '').trim();
      // Province: prefer hidden/select "province" if it exists; else use search input "province-input"
      const provinceSel = $('#province');
      const provinceInput = $('#province-input');
      const province =
        (provinceSel && provinceSel.options[provinceSel.selectedIndex]?.text?.trim()) ||
        (provinceInput?.value?.trim()) || '';

      const note = ($('#note')?.value || '').trim();
      const tgOptIn = !!$('#tg-optin')?.checked;

      if (!name || !phone || !province) {
        toast('Please fill Name, Phone and Province.');
        return;
      }

      const bag = loadBag();
      if (!bag.length) {
        toast('Your bag is empty.');
        return;
      }

      // Optional: if you ever store the customer chat id after they /start the bot
      // (e.g., via webhook), you can put it into localStorage and we’ll send it along.
      const customerChatId = localStorage.getItem('tg_chat_id') || null;

      const payload = {
        name,
        phone,
        province,
        note,
        bag,
        total: calcTotal(bag),
        bag_text: buildSummaryLines(bag),
        telegram_opt_in: tgOptIn,
        customer_chat_id: customerChatId ? String(customerChatId) : null,
        // A simple order id for reference
        order_id: 'ORD-' + Date.now()
      };

      btn.disabled = true;
      btn.classList.add('disabled');
      btn.textContent = 'Sending…';

      try {
        const { ok, status, data } = await sendOrder(payload);
        if (ok && (data?.ok === true || data?.success === true)) {
          alert('✅ Order sent! We will contact you on Telegram soon.');
          // Clear cart after success
          localStorage.removeItem('bag');
          location.href = 'index.html#home';
        } else {
          console.error('Order failed:', status, data);
          alert('Could not send order. Please contact us on Telegram.');
        }
      } catch (err) {
        console.error(err);
        alert('Could not send order. Please contact us on Telegram.');
      } finally {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.textContent = 'Purchase';
      }
    });
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
