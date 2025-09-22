// payway-inline-aba.js — Same-page ABA-style modal (no new tab)
// Uses payway-config.js: window.PAYWAY_API_BASE, PAYWAY_BAG_KEY, PAYWAY_BUTTON_ID
(function(){
  'use strict';

  const API_BASE = (window.PAYWAY_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
  const BAG_KEY  = window.PAYWAY_BAG_KEY  || 'bag';
  const BTN_ID   = window.PAYWAY_BUTTON_ID || 'paywayBtn';

  function readBag(){
    try {
      const raw = localStorage.getItem(BAG_KEY);
      const a = JSON.parse(raw || '[]');
      return Array.isArray(a) ? a : [];
    } catch { return []; }
  }
  function toAPI(items){
    return items.map(i => ({
      name: String(i.title || i.name || 'Item'),
      qty:  Math.max(1, Number(i.qty || i.quantity || 1)),
      price:Number(i.price || i.unitPrice || 0)
    }));
  }
  function total(items){
    return items.reduce((s,i)=> s + Number(i.price||0)*Number(i.qty||1), 0);
  }

  // Inject a shadow-root modal so your site's CSS doesn't interfere
  function openModal(){
    let host = document.getElementById('pw-modal-host');
    if (host) host.remove();

    host = document.createElement('div');
    host.id = 'pw-modal-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({mode:'open'});

    shadow.innerHTML = `
      <style>
        :host, * { box-sizing: border-box; }
        .overlay{position:fixed;inset:0;background:rgba(17,24,39,.65);display:grid;place-items:center;z-index:999999}
        .modal{width:min(420px, 92vw);background:#fff;border-radius:14px;border:1px solid #e9eef5;box-shadow:0 30px 80px rgba(0,0,0,.35);overflow:hidden}
        .head{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 10px}
        .title{font:800 20px/1.2 Inter,system-ui,Arial;color:#1f2937}
        .close{appearance:none;border:0;background:transparent;font-size:22px;line-height:1;color:#94a3b8;cursor:pointer}
        .body{padding:0 16px 16px}
        .card{border-radius:20px;background:#fff;border:1px solid #eef2f7;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .band{background:#d91f3a;height:54px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;letter-spacing:1px}
        .inner{padding:16px 18px 6px}
        .merchant{color:#6b7280;font:700 12px/1 Inter,system-ui,Arial}
        .amt{font-weight:900;font-size:28px;margin-top:8px;display:flex;align-items:baseline;gap:8px}
        .cur{font-weight:800;font-size:12px;color:#6b7280}
        .dash{height:1px;background:repeating-linear-gradient(90deg,#e5e7eb 0 8px, transparent 8px 16px);margin:10px -18px}
        .qrwrap{display:grid;place-items:center;padding:12px 0 6px}
        .qr{width:240px;height:240px;object-fit:contain;display:block}
        .btns{display:flex;justify-content:center;gap:10px;margin-top:10px;flex-wrap:wrap}
        .btn{appearance:none;border:1px solid #d1d5db;background:#fff;color:#111827;padding:8px 12px;border-radius:10px;font-weight:800;cursor:pointer;text-decoration:none}
        .btn:focus{outline:3px solid rgba(0,160,220,.25);outline-offset:2px}
        .foot{color:#6b7280;font:500 12px/1.4 Inter,system-ui,Arial;text-align:center;margin-top:12px}
        .iframeWrap{border-radius:20px;overflow:hidden;border:1px solid #eef2f7}
        .paywayFrame{width:100%;height:560px;border:0;background:#fff}
        .msg{color:#111827;font:600 14px/1.4 Inter,system-ui,Arial;text-align:center;padding:8px}
        @media (max-height:680px){ .paywayFrame{height:68vh} .qr{width:200px;height:200px} }
      </style>
      <div class="overlay" role="dialog" aria-modal="true">
        <div class="modal" part="modal">
          <div class="head">
            <div class="title">ABA KHQR</div>
            <button class="close" aria-label="Close">×</button>
          </div>
          <div class="body">
            <div class="msg">Preparing payment…</div>
          </div>
        </div>
      </div>
    `;
    const api = {
      setContent(html){ shadow.querySelector('.body').innerHTML = html; },
      close(){ host.remove(); }
    };
    shadow.querySelector('.close').addEventListener('click', api.close);
    shadow.querySelector('.overlay').addEventListener('click', (e)=>{
      if(e.target.classList.contains('overlay')) api.close();
    });
    document.addEventListener('keydown', function esc(ev){
      if(ev.key === 'Escape'){ api.close(); document.removeEventListener('keydown', esc); }
    });
    return api;
  }

  async function run(){
    const items = readBag();
    if(!items.length){ alert('Your bag is empty.'); return; }

    const modal = openModal();
    const amt = total(items).toFixed(2);

    try{
      const resp = await fetch(API_BASE + '/payway/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          amount: amt, currency:'USD',
          items: toAPI(items),
          firstname: 'Customer', lastname: 'Darila',
          email: 'guest@example.com', phone: '+85500000000',
          continue_success_url: location.origin + '/thank-you',
          return_params: 'orderId=' + Date.now()
        })
      });
      const text = await resp.text();
      if(!resp.ok || !text) throw new Error('Bad response');

      // If PayWay returns full HTML card page, embed it in an iframe inside modal
      if (text.trim().startsWith('<')){
        const html = `
          <div class="iframeWrap">
            <iframe class="paywayFrame" title="ABA PayWay" referrerpolicy="no-referrer"></iframe>
          </div>
        `;
        modal.setContent(html);
        const frame = modal.__frame = modal.shadowRoot ? null : null; // not used
        // write into the iframe
        const body = document.createElement('div');
        body.innerHTML = html;
        const iframe = document.querySelector('#pw-modal-host').shadowRoot.querySelector('.paywayFrame');
        const doc = iframe.contentWindow.document;
        doc.open(); doc.write(text); doc.close();
        return;
      }

      // Otherwise JSON with QR
      const data = JSON.parse(text);
      if (data?.status?.code === '00'){
        const content = `
          <div class="card">
            <div class="band">KHQR</div>
            <div class="inner">
              <div class="merchant">Darila Shop</div>
              <div class="amt"><span class="val">${amt}</span> <span class="cur">USD</span></div>
              <div class="dash"></div>
              <div class="qrwrap"><img class="qr" src="${data.qrImage}" alt="ABA QR"/></div>
            </div>
          </div>
          <div class="btns">
            <a class="btn" href="${data.abapay_deeplink}">Open ABA App</a>
            <button class="btn" id="pwRefresh">Refresh</button>
          </div>
          <div class="foot">Scan with ABA Mobile, or other Mobile Banking App supporting KHQR.</div>
        `;
        modal.setContent(content);
        const host = document.getElementById('pw-modal-host');
        host.shadowRoot.getElementById('pwRefresh')?.addEventListener('click', ()=> location.reload());
      } else {
        modal.setContent(`<div class="msg">${(data && (data.detail?.status?.message || data.error || JSON.stringify(data))) || 'PayWay purchase failed'}</div>`);
      }
    } catch(e){
      console.error(e);
      modal.setContent(`<div class="msg">Request failed. Is your server running on ${API_BASE}?</div>`);
    }
  }

  function wire(){
    const btn = document.getElementById(BTN_ID);
    if(!btn || btn.__pwInline) return;
    btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); run(); });
    btn.__pwInline = true;
  }

  document.addEventListener('DOMContentLoaded', wire);
})();
