/* checkout.telegram.js */
(() => {
  'use strict';

  // Always prefer your Netlify Function; fall back only if window var is set.
  const ENDPOINT = window.__TG_ORDER_ENDPOINT__ || '/.netlify/functions/telegram-order';

  // helpers
  const $ = (s, root = document) => root.querySelector(s);
  const fmt = n => '$' + (Number(n) || 0).toFixed(2);

  function loadBag() {
    try { return JSON.parse(localStorage.getItem('bag') || '[]') || []; }
    catch { return []; }
  }
  function calcTotal(bag) {
    return bag.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 0)), 0);
  }
  function provinceLabel() {
    const sel = $('#province');
    const input = $('#province-input');
    return (sel && sel.options[sel.selectedIndex]?.text?.trim()) ||
           (input?.value?.trim()) || '';
  }
  function cloneWithoutListeners(el) {
    const clone = el.cloneNode(true);
    el.replaceWith(clone);
    return clone;
  }

  function bind() {
    let btn = document.querySelector('#place-order, #purchaseBtn');
    if (!btn) return;

    // Strip old checkout.js listeners that require Address
    btn = cloneWithoutListeners(btn);
    btn.id = 'purchaseBtn'; // stable id for our script

    btn.addEventListener('click', async () => {
      const name = ($('#name')?.value || '').trim();
      const phone = ($('#phone')?.value || '').trim();
      const prov = provinceLabel();
      const note = ($('#note')?.value || '').trim();
      const tgOptIn = !!$('#tg-optin')?.checked;

      if (!name || !phone || !prov) {
        alert('Please fill Name, Phone and Province.');
        return;
      }

      const bag = loadBag();
      if (!bag.length) { alert('Your bag is empty.'); return; }

      const total = calcTotal(bag);
      const payload = {
        name, phone, provinceLabel: prov, note, tgOptIn,
        items: bag.map(it => ({
          title: String(it.title || it.id || 'Item'),
          qty: Number(it.qty || 0),
          price: Number(it.price || 0)
        })),
        delivery: 'Standard',
        total: fmt(total)
      };

      btn.disabled = true;
      btn.classList.add('is-loading');
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error('Order failed', data);
          alert('Could not send order. Please contact us on Telegram.');
          return;
        }

        localStorage.setItem('bag', '[]'); // clear cart
        alert('Order sent! We will contact you soon.');
        if (data.deepLink) location.href = data.deepLink; // optional deep link to your bot
      } catch (e) {
        console.error(e);
        alert('Network error. Please try again.');
      } finally {
        btn.disabled = false;
        btn.classList.remove('is-loading');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
