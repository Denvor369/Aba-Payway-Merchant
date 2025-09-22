// Checkout + Language switching (English ↔ Khmer with Kantumruy for Khmer)
(function () {
  'use strict';

  const BAG_KEY = 'bag';
  const UPDATE_KEY = '__bag_updated_at';
  const FLAT_SHIPPING = 2.00;
  const FREE_SHIPPING_OVER = 60.00;

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const fmt = n => '$' + (Number(n || 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Small, page-local dictionary. Brand names stay English.
  const I18N = {
    en: {
      nav: { home: 'Home', products: 'Products', contact: 'Contact', cart: 'Cart' },
      checkout: {
        bagTitle: 'Shopping Bag', bagEmpty: 'Your bag is empty.', continue: 'Continue shopping',
        checkoutTitle: 'Checkout', buyer: 'Buyer Information', delivery: 'Delivery Information',
        payment: 'Payment Method', name: 'Name', phone: 'Phone Number', address: 'Address',
        province: 'Province', note: 'Note', provideTo: 'We will provide to', contactVia: 'Contact via',
        abaTitle: 'ABA KHQR', abaScan: 'Scan to pay with any banking app',
        abaNote: 'We encourage to use ABA only for transactions.',
        remove: 'Remove', each: 'each', deliveryFee: 'Delivery fee', total: 'Total', purchase: 'Purchase',
        ph: { name: 'Ex: Chan Mony', phone: 'Ex: 0xx xxx xxx', address: 'Ex: Chip Mong 598 Mall, Grand', province: 'Select a province', note: 'Additional delivery notes' }
      },
      provinces: {
        pp: 'Phnom Penh', sr: 'Siem Reap', bb: 'Battambang', pv: 'Preah Vihear',
        kg: 'Kampong Speu', kc: 'Kampong Cham', kt: 'Kratie', od: 'Oddar Meanchey',
        tk: 'Takeo', kn: 'Kampong Chhnang', ka: 'Kampong Thom', kp: 'Kampot',
        ks: 'Koh Kong', kd: 'Kandal', sv: 'Svay Rieng', st: 'Stung Treng',
        rt: 'Ratanakiri', mn: 'Mondulkiri', pa: 'Pailin', pg: 'Prey Veng',
        kao: 'Kep', tb: 'Tboung Khmum', bt: 'Banteay Meanchey', pl: 'Pursat',
        su: 'Preah Sihanouk'
      },
      footer: { tel: 'Tel:', telegram: 'Telegram', clickhere: '(Click here)', weaccept: 'We accept:', copyright: 'Copyright© 2025, Darila Official' }
    },
    kh: {
      nav: { home: 'ទំព័រដើម', products: 'ផលិតផល', contact: 'ទំនាក់ទំនង', cart: 'កាបូប' },
      checkout: {
        bagTitle: 'កាបូបទំនិញ', bagEmpty: 'កាបូបរបស់អ្នកទទេ។', continue: 'បន្តទិញទំនិញ',
        checkoutTitle: 'គិតលុយ', buyer: 'ព័ត៌មានអ្នកទិញ', delivery: 'ព័ត៌មានដឹកជញ្ជូន',
        payment: 'វិធីទូទាត់', name: 'ឈ្មោះ', phone: 'លេខទូរស័ព្ទ', address: 'អាសយដ្ឋាន',
        province: 'ខេត្ត/រាជធានី', note: 'កំណត់ចំណាំ', provideTo: 'យើងនឹងផ្តល់ឱ្យទៅកាន់',
        contactVia: 'ទាក់ទងតាម', abaTitle: 'ABA KHQR', abaScan: 'ស្គែនដើម្បីទូទាត់ជាមួយកម្មវិធីធនាគារណាមួយ',
        abaNote: 'សូមប្រើ ABA សម្រាប់ប្រតិបត្តិការបង់ប្រាក់។',
        remove: 'លុបចេញ', each: 'មួយ', deliveryFee: 'ថ្លៃដឹកជញ្ជូន', total: 'សរុប', purchase: 'ទិញ',
        ph: { name: 'ឧទាហរណ៍៖ ចន្ទ មន្នី', phone: 'ឧទាហរណ៍៖ 0xx xxx xxx', address: 'ឧទាហរណ៍៖ Chip Mong 598 Mall, Grand', province: 'ជ្រើសខេត្ត', note: 'កំណត់ចំណាំបន្ថែម' }
      },
      provinces: {
        pp: 'រាជធានីភ្នំពេញ', sr: 'សៀមរាប', bb: 'បាត់ដំបង', pv: 'ព្រះវិហារ',
        kg: 'កំពង់ស្ពឺ', kc: 'កំពង់ចាម', kt: 'ក្រចេះ', od: 'ឧត្តរមានជ័យ',
        tk: 'តាកែវ', kn: 'កំពង់ឆ្នាំង', ka: 'កំពង់ធំ', kp: 'កំពត',
        ks: 'កោះកុង', kd: 'កណ្តាល', sv: 'ស្វាយរៀង', st: 'ស្ទឹងត្រែង',
        rt: 'រតនគិរី', mn: 'មណ្ឌលគិរី', pa: 'ប៉ៃលិន', pg: 'ព្រៃវែង',
        kao: 'កែប', tb: 'ត្បូងឃ្មុំ', bt: 'បន្ទាយមានជ័យ', pl: 'ពោធិ៍សាត់',
        su: 'ព្រះសីហនុ'
      },
      footer: { tel: 'ទូរស័ព្ទ៖', telegram: 'តេលេក្រាម', clickhere: '(ចុចទីនេះ)', weaccept: 'យើងទទួលយក៖', copyright: 'រក្សាសិទ្ធិ© ២០២៥, Darila Official' }
    }
  };

  /* -------------------- BAG -------------------- */
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function tidyTitle(t) { return String(t || '').replace(/\s+\bA\b$/i, '').trim(); }

  function safeParseBag() {
    try {
      const raw = localStorage.getItem(BAG_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw 0;
      return parsed.map(i => ({
        id: i?.id ?? '',
        title: tidyTitle(i?.title ?? ''),
        price: Number(i?.price) || 0,
        qty: Math.max(0, Math.floor(Number(i?.qty) || 0)),
        img: i?.img ?? ''
      })).filter(x => x.title && x.qty > 0);
    } catch { localStorage.removeItem(BAG_KEY); return []; }
  }

  function saveBag(bag) {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag || [])); } catch (e) { }
    try { localStorage.setItem(UPDATE_KEY, Date.now().toString()); } catch (e) { }
    window.dispatchEvent(new Event('bag:updated'));
  }

  /* -------------------- RENDER -------------------- */
  function render() {
    const bag = safeParseBag();
    renderBag(bag);
    renderSummary(bag);
    // language is applied separately using current lang
  }

  function renderBag(bag) {
    const list = $('#bag-list');
    const empty = $('#bag-empty');
    if (!list) return;
    list.innerHTML = '';

    if (!bag.length) { if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';

    bag.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.dataset.id = String(item.id || '');

      const img = document.createElement('img');
      img.className = 'item-img';
      img.src = item.img || '';
      img.alt = item.title || '';

      const info = document.createElement('div');
      info.className = 'item-info';
      info.innerHTML = `
        <div class="item-title">${esc(item.title)}</div>
        <div class="item-sub">${fmt(item.price)} <span data-i18n="checkout.each">each</span></div>
        <div class="item-qty">
          <button class="btn-qty btn-minus" aria-label="Decrease">−</button>
          <span class="qty-num" aria-label="Quantity">${item.qty}</span>
          <button class="btn-qty btn-plus" aria-label="Increase">+</button>
        </div>`;

      const actions = document.createElement('div');
      actions.className = 'item-actions';
      actions.innerHTML = `
        <a href="#" class="link-remove" data-i18n="checkout.remove">Remove</a>
        <div class="price-line">${fmt(item.price * item.qty)}</div>`;

      row.append(img, info, actions);
      list.appendChild(row);
    });

    if (!list.__bound) {
      list.addEventListener('click', onListClick);
      list.__bound = true;
    }
  }

  function onListClick(e) {
    const t = e.target;
    const row = t.closest('.item-row'); if (!row) return;
    const id = row.dataset.id;
    const bag = safeParseBag();
    const idx = bag.findIndex(x => String(x.id) === String(id));
    if (idx < 0) return;

    if (t.classList.contains('btn-minus')) { bag[idx].qty = Math.max(1, bag[idx].qty - 1); saveBag(bag); doRender(); }
    if (t.classList.contains('btn-plus')) { bag[idx].qty = Math.max(1, bag[idx].qty + 1); saveBag(bag); doRender(); }
    if (t.classList.contains('link-remove')) { e.preventDefault(); bag.splice(idx, 1); saveBag(bag); doRender(); }
  }

  function renderSummary(bag) {
    const lines = $('#summary-lines');
    if (!lines) return;
    lines.innerHTML = '';
    let subtotal = 0;

    bag.forEach(it => {
      subtotal += it.price * it.qty;
      const line = document.createElement('div');
      line.className = 'row';
      line.innerHTML = `<span>${esc(it.title)} x ${it.qty}</span><span>${fmt(it.price * it.qty)}</span>`;
      lines.appendChild(line);
    });

    let shipping = FLAT_SHIPPING;
    const free = (subtotal >= FREE_SHIPPING_OVER);
    if (free) shipping = 0;

    const ship = document.createElement('div');
    ship.className = 'row';
    ship.innerHTML = free
      ? `<span class="label-shipping" data-i18n="checkout.deliveryFee">Delivery fee</span>
         <span><span class="s-strike">${fmt(FLAT_SHIPPING)}</span> <span class="pink">${fmt(0)}</span></span>`
      : `<span class="label-shipping" data-i18n="checkout.deliveryFee">Delivery fee</span>
         <span>${fmt(shipping)}</span>`;
    lines.appendChild(ship);

    const totalEl = $('#total');
    if (totalEl) totalEl.textContent = fmt(subtotal + shipping);
  }

  /* -------------------- LANGUAGE -------------------- */
  function getLang() {
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang === 'kh' || htmlLang === 'en') return htmlLang;

    const sel = $('#lang-switcher');
    if (sel && (sel.value === 'kh' || sel.value === 'en')) return sel.value;

    try { const stored = localStorage.getItem('lang'); if (stored === 'kh' || stored === 'en') return stored; } catch { }
    return 'en';
  }

  function setLang(lang) {
    try { localStorage.setItem('lang', lang); } catch { }
    document.documentElement.setAttribute('lang', lang === 'kh' ? 'kh' : 'en');
  }

  function t(dict, path) {
    return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : ''), dict);
  }

  function applyLanguage(lang) {
    setLang(lang);
    const dict = I18N[lang] || I18N.en;

    // text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = t(dict, el.dataset.i18n);
      if (val) el.textContent = val;
    });

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const val = t(dict, el.dataset.i18nPlaceholder);
      if (val) el.placeholder = val;
    });

    // --- Provinces select: translate by option value (pp, sr, bb, ...) ---
    (function translateProvinceSelect() {
      const sel = document.getElementById('province');
      if (!sel) return;

      const provDict = (dict && dict.provinces) ? dict.provinces : {};

      // placeholder
      const placeholderOpt = sel.querySelector('option[value=""]') || sel.options[0];
      if (placeholderOpt) {
        const ph = t(dict, 'checkout.ph.province') || placeholderOpt.textContent;
        if (ph) placeholderOpt.textContent = ph;
      }

      // options by value code
      Array.from(sel.options).forEach(opt => {
        const code = opt.value;
        if (!code) return;
        const label = provDict[code];
        if (label) opt.textContent = label;
      });
    })();

    try { window.dispatchEvent(new Event('lang:changed')); } catch (e) { }
  }

  /* render + language together */
  function doRender() {
    render();
    applyLanguage(getLang());
  }

  /* ---------- helpers for Purchase submission ---------- */
  function computeTotals(bag) {
    const subtotal = bag.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
    const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }

  function provinceLabelFromCode(code) {
    if (!code) return '';
    const lang = getLang();
    const dict = (I18N[lang] && I18N[lang].provinces) ? I18N[lang].provinces : I18N.en.provinces;
    return dict[code] || code;
  }

  /* -------------------- INIT -------------------- */
  window.addEventListener('storage', (ev) => {
    if (ev.key === BAG_KEY || ev.key === UPDATE_KEY) doRender();
    if (ev.key === 'lang') applyLanguage(getLang());
  });
  window.addEventListener('bag:updated', doRender);

  document.addEventListener('DOMContentLoaded', () => {
    // Ensure dropdown reflects current lang BEFORE translations apply
    const current = getLang();
    const sel = $('#lang-switcher');
    if (sel) sel.value = current;

    doRender();

    /* ===== Province Picker (searchable + EN/KH labels) ===== */
    (function ProvincePicker() {
      const picker = document.getElementById('province-picker');
      const input = document.getElementById('province-input');
      const list = document.getElementById('province-list');
      const hidden = document.getElementById('province'); // original select

      if (!picker || !input || !list || !hidden) return; // HTML not installed -> skip

      // Preferred display order (edit freely)
      const ORDER = ['pp', 'kd', 'kp', 'sr', 'bb', 'pv', 'kg', 'kc', 'kt', 'od', 'tk', 'kn', 'ka', 'ks', 'sv', 'st', 'rt', 'mn', 'pa', 'pg', 'kao', 'tb', 'bt', 'pl', 'su'];

      function getDict() {
        const lang = (document.documentElement.getAttribute('lang') === 'kh') ? 'kh' : 'en';
        const provs = (I18N && I18N[lang] && I18N[lang].provinces) ? I18N[lang].provinces
          : (I18N && I18N.en && I18N.en.provinces) ? I18N.en.provinces
            : {};
        return provs;
      }

      function buildList() {
        const dict = getDict();
        list.innerHTML = '';
        ORDER.filter(c => dict[c]).forEach(code => {
          const li = document.createElement('li');
          li.className = 'province-item';
          li.setAttribute('role', 'option');
          li.dataset.code = code;
          li.innerHTML = `<span class="label">${dict[code]}</span><span class="code">${code.toUpperCase()}</span>`;
          list.appendChild(li);
        });
        markSelected();
      }

      function markSelected() {
        const current = hidden.value || '';
        Array.from(list.children).forEach(li => {
          li.setAttribute('aria-selected', li.dataset.code === current ? 'true' : 'false');
          li.classList.toggle('active', li.dataset.code === current);
        });
        const dict = getDict();
        input.value = current ? (dict[current] || current) : '';
        toggleList(false);
        toggleClear();
      }

      function toggleList(open) {
        list.classList.toggle('open', !!open);
        input.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      function toggleClear() {
        const btn = picker.querySelector('.pp-clear');
        if (!btn) return;
        btn.style.display = input.value ? 'inline-flex' : 'none';
      }
      function filterList(query) {
        const q = (query || '').toLowerCase().trim();
        let any = false;
        Array.from(list.children).forEach(li => {
          const txt = (li.querySelector('.label')?.textContent || '').toLowerCase();
          const code = (li.dataset.code || '').toLowerCase();
          const show = !q || txt.includes(q) || code.includes(q);
          li.style.display = show ? '' : 'none';
          if (show) any = true;
        });
        list.style.display = any ? '' : 'none';
      }

      list.addEventListener('click', (e) => {
        const li = e.target.closest('.province-item');
        if (!li) return;
        hidden.value = li.dataset.code;
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        markSelected();
      });

      input.addEventListener('focus', () => toggleList(true));
      input.addEventListener('input', (e) => { filterList(e.target.value); toggleList(true); toggleClear(); });
      input.addEventListener('keydown', (e) => {
        const items = Array.from(list.children).filter(li => li.style.display !== 'none');
        if (!items.length) return;
        const currentIdx = items.findIndex(li => li.classList.contains('active'));
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const idx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, items.length - 1);
          items.forEach(li => li.classList.remove('active'));
          items[idx].classList.add('active');
          items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = currentIdx <= 0 ? 0 : currentIdx - 1;
          items.forEach(li => li.classList.remove('active'));
          items[idx].classList.add('active');
          items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = items[currentIdx >= 0 ? currentIdx : 0];
          target?.click();
        } else if (e.key === 'Escape') {
          toggleList(false);
          input.blur();
        }
      });

      // Clear
      picker.querySelector('.pp-clear')?.addEventListener('click', () => {
        input.value = '';
        hidden.value = '';
        filterList('');
        toggleClear();
        toggleList(true);
        input.focus();
      });

      // Quick chips
      picker.querySelectorAll('.province-chips .chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.dataset.code;
          hidden.value = code;
          markSelected();
        });
      });

      // Rebuild when language changes
      window.addEventListener('lang:changed', () => { buildList(); markSelected(); });

      // Init
      buildList();
      markSelected();
    })();

    // Minimal hamburger (your script.js may already handle this)
    const toggle = $('#navToggle'), nav = $('#site-nav');
    if (toggle && nav && !toggle.__wired) {
      const setOpen = (open) => {
        nav.classList.toggle('open', open);
        nav.classList.toggle('show', open);
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(!!open));
        nav.setAttribute('aria-hidden', String(!open));
      };
      toggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!nav.classList.contains('open') && !nav.classList.contains('show')); });
      document.addEventListener('click', (e) => { if (nav.classList.contains('open') || nav.classList.contains('show')) { if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); } });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
      toggle.__wired = true;
    }

    // Language switcher
    $('#lang-switcher')?.addEventListener('change', (e) => {
      applyLanguage(e.target.value);
      try { window.dispatchEvent(new Event('lang:changed')); } catch (e) { }
    });

    // Attach the purchase handler once everything is ready
    attachPurchaseHandler();
  });

  /* -------------------- PURCHASE HANDLER (Netlify Function) -------------------- */
  const ORDER_ENDPOINT = '/.netlify/functions/create-order';

  function attachPurchaseHandler() {
    const btn = $('#place-order');
    if (!btn || btn.__wired) return;

    btn.addEventListener('click', async () => {
      const bag = safeParseBag();
      if (!bag.length) { alert('Your bag is empty'); return; }

      const name = $('#name');
      const phone = $('#phone');
      const addr = $('#address');
      const province = $('#province');
      const note = $('#note');

      if (!name?.value.trim() || !phone?.value.trim() || !addr?.value.trim() || !province?.value) {
        alert('Please fill Name, Phone, Address and Province');
        return;
      }

      // Server will compute prices; send only id/qty
      const payload = {
        items: bag.map(it => ({ id: String(it.id), qty: Number(it.qty) })),
        customer: {
          name: name.value.trim(),
          phone: phone.value.trim(),
          address: addr.value.trim(),
          province: province.value,
          note: (note?.value || '').trim()
        }
      };

      try {
        btn.setAttribute('disabled', 'disabled');
        btn.classList.add('is-loading');

        const resp = await fetch(ORDER_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          console.error('Create order failed:', data);
          alert('Could not send order. Please contact us on Telegram.');
          return;
        }

        // Success UX
        saveBag([]);
        doRender();
        alert('Order received! We will contact you soon. (Order: ' + (data.orderId || '—') + ')');
        // Optionally: window.location.href = '/thank-you.html';
      } catch (err) {
        console.error(err);
        alert('Network error. Please try again.');
      } finally {
        btn.removeAttribute('disabled');
        btn.classList.remove('is-loading');
      }
    });

    btn.__wired = true;
  }
})();
