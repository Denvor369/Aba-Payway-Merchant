
/* ===== i18n bootstrap (EN ↔ KH) ===== */
(function(){
  // Safe global
  window.i18n = window.i18n || {};

  // Dictionaries
  const dict = {
    en: {
      "nav.home": "Home",
      "nav.products": "Products",
      "nav.contact": "Contact",
      "nav.cart": "Cart",
      "title": "Shopping Bag",
      "th.product": "Product",
      "th.price": "Price",
      "th.qty": "Quantity",
      "th.subtotal": "Subtotal",
      "continue": "← Continue shopping",
      "proceed": "Proceed to Checkout",
      "we_accept": "We Accept:",
      "copyright": "Copyright © 2025 By SENG Chhunsour",

      // Keys referenced inside cart.js (underscored variants)
      "th_product": "Product",
      "th_price": "Price",
      "th_qty": "Quantity",
      "th_subtotal": "Subtotal",
      "qty_decrease": "decrease",
      "qty_increase": "increase",
      "remove": "Remove",
      "empty": "Your bag is empty.",
      "toast_empty": "Your cart is empty",

      // Title full text (tab)
      "page.title": "Shopping Bag — Darila Official",
    },
    kh: {
      "nav.home": "ទំព័រដើម",
      "nav.products": "ផលិតផល",
      "nav.contact": "ទំនាក់ទំនង",
      "nav.cart": "កន្ត្រក",
      "title": "កន្ត្រកទំនិញ",
      "th.product": "ផលិតផល",
      "th.price": "តម្លៃ",
      "th.qty": "បរិមាណ",
      "th.subtotal": "សរុបរង",
      "continue": "← បន្តទិញទំនិញ",
      "proceed": "បន្តទៅទូទាត់ប្រាក់",
      "we_accept": "យើង​ទទួល​បង់៖",
      "copyright": "រក្សាសិទ្ធិ © 2025 ដោយ SENG Chhunsour",

      "th_product": "ផលិតផល",
      "th_price": "តម្លៃ",
      "th_qty": "បរិមាណ",
      "th_subtotal": "សរុបរង",
      "qty_decrease": "បន្ថយ",
      "qty_increase": "បន្ថែម",
      "remove": "យកចេញ",
      "empty": "កន្ត្រករបស់អ្នក​ទទេ។",
      "toast_empty": "កន្ត្រកទំនិញទទេ",

      "page.title": "កន្ត្រកទំនិញ — Darila Official",
    }
  };

  // public API
  function t(key, fallback){
    const lang = (localStorage.getItem('siteLang') || localStorage.getItem('lang') || document.documentElement.lang || 'kh');
    const d = dict[lang] || dict.kh;
    if (key in d) return d[key];
    return (typeof fallback === 'string' && fallback.length ? fallback : key);
  }

  function applyI18n(lang){
    // translate data-i18n nodes
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var k = el.getAttribute('data-i18n');
      var v = t(k, el.textContent.trim());
      if (typeof v === 'string') el.textContent = v;
    });

    // special cases (not all had data-i18n in the markup)
    var accept = document.querySelector('.accept-label');
    if (accept) accept.textContent = t('we_accept', accept.textContent.trim());

    // page title
    var ttl = t('page.title', document.title);
    if (ttl) document.title = ttl;
  }

  function setLang(lang){
    var val = (lang === 'en') ? 'en' : 'kh';
    try { localStorage.setItem('siteLang', val); localStorage.setItem('lang', val); } catch(e){}
    // HTML lang & body class for font handling
    document.documentElement.setAttribute('lang', val === 'en' ? 'en' : 'kh');
    document.body.classList.toggle('lang-kh', val === 'kh');
    // Re-run translations
    applyI18n(val);
  }

  // expose
  window.i18n.t = t;
  window.setLang = setLang;

  // initial on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    var initial = (localStorage.getItem('siteLang') || localStorage.getItem('lang') || document.documentElement.lang || 'kh');
    setLang(initial);
    // Keep the switcher UI in sync if it exists
    var sel = document.getElementById('lang-switcher');
    if (sel) { sel.value = (initial === 'en') ? 'en' : 'kh'; }
  });
})();
/* ===== end i18n bootstrap ===== */


// cart.js — localized & cleaned bag handling; prevents checkout when bag empty
(function () {
  'use strict';

  const BAG_KEY = 'bag';
  const UPDATE_KEY = '__bag_updated_at';
  const PLACEHOLDER_IMG = 'images/placeholder.png';

  // helpers
  const $ = (sel, root = document) => (root || document).querySelector(sel);
  const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const formatMoney = n => `$${Number(n || 0).toFixed(2)}`;

  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // tiny translator (uses window.i18n from the page)
  const __t = (k, d) => (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(k, d) : (d || k);

  // remove trailing " A" (case-insensitive) from titles — e.g. "Sunscreen A" -> "Sunscreen"
  function tidyTitle(t) {
    if (!t) return '';
    return String(t).replace(/\s+\bA\b$/i, '').trim();
  }

  // small toast
  function showToast(msg, d = 1400) {
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'app-toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: '20px', background: 'rgba(0,0,0,0.85)', color: '#fff',
      padding: '10px 12px', borderRadius: '8px', zIndex: 99999
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), d);
  }

  // normalize bag items: ensure qty is integer >=1 and remove items with qty <= 0
  function normalizeBag(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map(it => {
        const id = it?.id ?? '';
        const rawTitle = it?.title ?? '';
        const title = tidyTitle(rawTitle);
        const price = Number(it?.price) || 0;
        const qty = Math.floor(Number(it?.qty) || 0);
        const img = it?.img ?? '';
        return { id, title, price, qty, img };
      })
      .filter(it => it.id !== '' && Number(it.qty) > 0);
  }

  // storage helpers
  function getBagFromStorage() {
    try {
      const raw = localStorage.getItem(BAG_KEY) || '[]';
      const parsed = JSON.parse(raw);
      return normalizeBag(parsed);
    } catch (e) {
      localStorage.removeItem(BAG_KEY);
      return [];
    }
  }

  function saveBagToStorage(items) {
    const normalized = normalizeBag(items || []);
    try { localStorage.setItem(BAG_KEY, JSON.stringify(normalized)); } catch (e) {}
    try { localStorage.setItem(UPDATE_KEY, Date.now().toString()); } catch (e) {}
    // in-tab notification
    window.dispatchEvent(new Event('bag:updated'));
  }

  // prefer global APIs if available
  function getBag() {
    if (window.cart && typeof window.cart.loadBag === 'function') {
      try { return normalizeBag(window.cart.loadBag() || []); } catch (e) {}
    }
    if (window.app && typeof window.app.loadBag === 'function') {
      try { return normalizeBag(window.app.loadBag() || []); } catch (e) {}
    }
    return getBagFromStorage();
  }

  function saveBag(items) {
    const normalized = normalizeBag(items || []);
    if (window.cart && typeof window.cart.saveBag === 'function') {
      try { window.cart.saveBag(normalized); updateCartQuantity(normalized); return; } catch (e) {}
    }
    if (window.app && typeof window.app.saveBag === 'function') {
      try { window.app.saveBag(normalized); updateCartQuantity(normalized); return; } catch (e) {}
    }
    saveBagToStorage(normalized);
    updateCartQuantity(normalized);
  }

  // DOM refs
  const tbody = document.getElementById('bag-items');
  const checkoutBtn = document.getElementById('checkout-link'); // may be button or anchor
  const TOTAL_EL = document.getElementById('bag-total');
  const CART_QUANTITY_BADGE = document.getElementById('cart-quantity');
  if (!tbody) return; // not the bag page

  // UI updates
  function updateCartQuantity(items) {
    const bag = (items || getBag());
    const total = bag.reduce((s, i) => s + Number(i.qty || 0), 0);
    if (CART_QUANTITY_BADGE) CART_QUANTITY_BADGE.textContent = total;
    if (TOTAL_EL) {
      const subtotal = bag.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 0)), 0);
      TOTAL_EL.textContent = formatMoney(subtotal);
    }
    updateCheckoutLinkState(bag);
  }

  function updateCheckoutLinkState(bag) {
    const effectiveBag = (bag || getBag()).filter(i => Number(i.qty) > 0);
    const empty = effectiveBag.length === 0;
    if (checkoutBtn) {
      if (empty) {
        checkoutBtn.classList.add('disabled');
        checkoutBtn.setAttribute('aria-disabled', 'true');
        checkoutBtn.dataset.disabled = '1';
      } else {
        checkoutBtn.classList.remove('disabled');
        checkoutBtn.removeAttribute('aria-disabled');
        delete checkoutBtn.dataset.disabled;
      }
    }
    // defensive: any place-order / checkout action buttons
    $$(' .place-order, .checkout-action, button[data-role="checkout"]').forEach(b => {
      b.disabled = empty;
      empty ? b.classList.add('disabled') : b.classList.remove('disabled');
      empty ? b.setAttribute('aria-disabled', 'true') : b.removeAttribute('aria-disabled');
    });
  }

  // rendering
  function createGeneratedRow(item) {
    const img = item.img || PLACEHOLDER_IMG;
    const subtotal = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    return `<tr class="bag-row" data-id="${escapeHtml(item.id)}" data-generated="true">
      <td data-label="${escapeHtml(__t('th_product','Product'))}">
        <div class="product-info">
          <img class="product-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(item.title || item.id)}">
          <div>
            <div class="product-title">${escapeHtml(item.title || item.id)}</div>
          </div>
        </div>
      </td>
      <td data-label="${escapeHtml(__t('th_price','Price'))}" class="cell-price">${formatMoney(item.price)}</td>
      <td data-label="${escapeHtml(__t('th_qty','Quantity'))}" class="qty-cell">
        <div class="qty-control">
          <button class="qty-btn" data-action="decrease" aria-label="${escapeHtml(__t('qty_decrease','decrease'))}">−</button>
          <input class="qty-input" type="number" min="1" value="${Number(item.qty || 1)}" />
          <button class="qty-btn" data-action="increase" aria-label="${escapeHtml(__t('qty_increase','increase'))}">+</button>
        </div>
      </td>
      <td data-label="${escapeHtml(__t('th_subtotal','Subtotal'))}" class="cell-subtotal">${formatMoney(subtotal)}</td>
      <td data-label="${escapeHtml(__t('remove','Remove'))}" class="remove-cell">
        <button class="remove-btn" data-action="remove">${escapeHtml(__t('remove','Remove'))}</button>
      </td>
    </tr>`;
  }

  function updateRowValues(row, item) {
    const qtyInput = row.querySelector('.qty-input');
    const priceCell = row.querySelector('.cell-price');
    const subtotalCell = row.querySelector('.cell-subtotal');
    if (qtyInput) qtyInput.value = Number(item.qty || 1);
    if (priceCell) priceCell.textContent = formatMoney(item.price);
    if (subtotalCell) subtotalCell.textContent = formatMoney(Number(item.price || 0) * Number(item.qty || 0));
  }

  function render() {
    const bag = getBag();

    // remove previously generated rows
    tbody.querySelectorAll('.bag-row[data-generated="true"]').forEach(r => r.remove());

    // effective bag removes any items with qty <= 0
    const effectiveBag = bag.filter(i => Number(i.qty) > 0);

    if (!effectiveBag || effectiveBag.length === 0) {
      tbody.innerHTML = `<tr class="bag-row"><td colspan="5" style="padding:20px;text-align:center;color:#666">${escapeHtml(__t('empty','Your bag is empty.'))}</td></tr>`;
      updateCartQuantity(effectiveBag);
      return;
    }

    // append generated rows for items
    effectiveBag.forEach(item => {
      const id = String(item.id);
      const existsStatic = !!tbody.querySelector(`.bag-row:not([data-generated])[data-id="${CSS.escape(id)}"]`);
      const existsGenerated = !!tbody.querySelector(`.bag-row[data-generated="true"][data-id="${CSS.escape(id)}"]`);
      if (!existsStatic && !existsGenerated) {
        tbody.insertAdjacentHTML('beforeend', createGeneratedRow(item));
      } else if (existsGenerated) {
        const row = tbody.querySelector(`.bag-row[data-generated="true"][data-id="${CSS.escape(id)}"]`);
        updateRowValues(row, item);
      } else if (existsStatic) {
        const row = tbody.querySelector(`.bag-row:not([data-generated])[data-id="${CSS.escape(id)}"]`);
        if (row) updateRowValues(row, item);
      }
    });

    updateCartQuantity(effectiveBag);
  }

  // delegation: decrease/increase/remove
  tbody.addEventListener('click', function (e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const row = btn.closest('.bag-row');
    if (!row) return;
    const id = row.dataset.id;
    if (!id) return;

    let bag = getBag(); // normalized bag

    if (action === 'decrease') {
      const it = bag.find(x => String(x.id) === String(id));
      if (!it) return;
      it.qty = Math.max(1, (it.qty || 1) - 1);
      saveBag(bag);
      render();
    } else if (action === 'increase') {
      const it = bag.find(x => String(x.id) === String(id));
      if (!it) return;
      it.qty = (it.qty || 0) + 1;
      saveBag(bag);
      render();
    } else if (action === 'remove') {
      if (window.cart && typeof window.cart.removeFromBag === 'function') {
        try { window.cart.removeFromBag(id); } catch (err) {
          bag = bag.filter(x => String(x.id) !== String(id));
          saveBag(bag);
        }
      } else {
        bag = bag.filter(x => String(x.id) !== String(id));
        saveBag(bag);
      }
      // remove DOM rows
      const genRow = tbody.querySelector(`.bag-row[data-generated="true"][data-id="${CSS.escape(String(id))}"]`);
      if (genRow) genRow.remove();
      const staticRow = tbody.querySelector(`.bag-row:not([data-generated])[data-id="${CSS.escape(String(id))}"]`);
      if (staticRow) staticRow.remove();
      render();
    }
  });

  // quantity input change
  tbody.addEventListener('change', function (e) {
    const input = e.target;
    if (!input.classList.contains('qty-input')) return;
    const row = input.closest('.bag-row');
    if (!row) return;
    const id = row.dataset.id;
    let v = parseInt(input.value, 10) || 1;
    if (v < 1) v = 1;

    if (window.cart && typeof window.cart.setQty === 'function') {
      try { window.cart.setQty(id, v); } catch (err) {
        const bag = getBag().map(it => String(it.id) === String(id) ? Object.assign({}, it, { qty: v }) : it);
        saveBag(bag);
      }
    } else {
      const bag = getBag().map(it => String(it.id) === String(id) ? Object.assign({}, it, { qty: v }) : it);
      saveBag(bag);
    }
    render();
  });

  // proceed to checkout - blocked when bag empty
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function (ev) {
      ev.preventDefault(); // intercept always to verify bag
      const effectiveBag = getBag().filter(i => Number(i.qty) > 0);
      if (!effectiveBag || effectiveBag.length === 0) {
        showToast(__t('toast_empty','Your cart is empty'));
        if (typeof window.app?.showMiniCart === 'function') window.app.showMiniCart(true);
        return;
      }
      // non-empty: navigate
      if (checkoutBtn.tagName.toLowerCase() === 'a') {
        window.location.href = checkoutBtn.href || 'checkout.html';
      } else {
        window.location.href = 'checkout.html';
      }
    });
  }

  // handle ?add=ID&qty=N (idempotent)
  (function handleQueryAdd() {
    try {
      const params = new URLSearchParams(location.search);
      const id = params.get('add');
      if (!id) return;
      const qty = Math.max(1, parseInt(params.get('qty') || '1', 10));

      const bag = getBag();
      const existing = bag.find(x => String(x.id) === String(id));

      if (existing) {
        existing.qty = qty;
        saveBag(bag);
      } else {
        const card = document.querySelector(`.product-card[data-id="${id}"]`);
        const rawTitle = card?.dataset?.title || card?.querySelector('.product-title')?.textContent || id;
        const title = tidyTitle(rawTitle);
        const price = Number(card?.dataset?.price || 0);
        const img = card?.querySelector('img')?.src || '';
        bag.push({ id, title, price, qty, img });
        saveBag(bag);
      }

      history.replaceState({}, document.title, location.pathname + location.hash);
    } catch (e) { /* ignore */ }
  })();

  // sync across tabs and in-tab
  window.addEventListener('storage', (ev) => {
    if (ev.key === BAG_KEY || ev.key === UPDATE_KEY) render();
  });
  window.addEventListener('bag:updated', () => render());

  // boot
  document.addEventListener('DOMContentLoaded', render);

})();
