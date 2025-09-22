// Themed PayWay popup – drop‑in replacement
(function(){'use strict';
  const API_BASE = (window.PAYWAY_API_BASE || 'http://localhost:3000').replace(/\/+$/,'');
  const BAG_KEY = window.PAYWAY_BAG_KEY || 'bag';
  const BTN_ID = window.PAYWAY_BUTTON_ID || 'paywayBtn';

  function readBag(){ try{ const raw = localStorage.getItem(BAG_KEY); const a = JSON.parse(raw||'[]'); return Array.isArray(a)?a:[]; }catch{ return []; } }
  function toAPI(items){ return items.map(i=>({ name: String(i.title||i.name||'Item'), qty: Math.max(1, Number(i.qty||i.quantity||1)), price: Number(i.price||i.unitPrice||0) })); }
  function buyer(){ const v=id=> (document.getElementById(id)?.value||'').trim(); return { firstname: v('name')||'Guest', lastname:'Customer', email:'guest@example.com', phone: v('phone')||'+85500000000' }; }
  function total(items){ return items.reduce((s,i)=> s + Number(i.price||0)*Number(i.qty||1), 0); }
  function makeItemsHtml(items){
    if(!items || !items.length) return '<div class="item"><span>Items</span><span>$0.00</span></div>';
    return items.map(function(it){
      var qty = Math.max(1, Number(it.qty||1));
      var price = Number(it.price||0);
      var total = (price*qty).toFixed(2);
      var name = String(it.name||'Item');
      return '<div class="item"><span>'+name+' × '+qty+'</span><span>$'+total+'</span></div>';
    }).join('\n        ');
  }

  async function openPayway(){ 
    const bag = readBag(); if(!bag.length) { alert('Your bag is empty.'); return; }
    const win = window.open('', 'payway', 'width=560,height=760');
    const amt = total(bag);
    try{
      const resp = await fetch(API_BASE + '/payway/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          amount: amt.toFixed(2), currency:'USD',
          items: toAPI(bag),
          firstname: buyer().firstname, lastname: buyer().lastname, email: buyer().email, phone: buyer().phone,
          continue_success_url: location.origin + '/thank-you',
          return_params: 'orderId=' + Date.now()
        })
      });
      const text = await resp.text();
      if(!resp.ok || !text) throw new Error('Bad response');
      if(text.trim().startsWith('<')) { win.document.open(); win.document.write(text); win.document.close(); return; }
      const data = JSON.parse(text);
      if(data?.status?.code === '00') {
        var tpl = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">%%STYLE%%</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brand"><span class="logo">Darila • PayWay</span></div>
      <div class="pill"><span class="dot"></span> Waiting for payment</div>
    </div>
    <div class="content">
      <div class="hero">
        <div class="qr-card">
          <img src="__QR__" alt="ABA Pay QR" />
        </div>
        <div class="meta">
          <div class="title">Scan with ABA Mobile</div>
          <div class="hint">Open ABA or any KHQR banking app and scan the code.</div>
          <div class="row"><div class="lbl">Amount</div><div class="val">$__AMT__ USD</div></div>
          <div class="row"><div class="lbl">Transaction</div><div class="val">__TRAN__</div></div>
          <div class="btns">
            <a class="btn" href="__DEEPLINK__">Open ABA App</a>
            <button class="btn secondary" onclick="location.reload()">Refresh</button>
          </div>
        </div>
      </div>
      <div class="split"></div>
      <div class="items">__ITEMS__</div>
    </div>
    <div class="foot">
      <div class="muted">Leave this window open while you complete payment.</div>
      <div class="logo">Darila</div>
    </div>
  </div>
</body></html>`;
        var html = tpl
          .replace(/%%STYLE%%/g, `
  <style>
    :root{--brand:#c760db;--ink:#0b1220;--ring:rgba(199,96,219,.25);--card:#11131a;--card2:#0c0e14;}
    *{box-sizing:border-box}html,body{height:100%}
    body{margin:0;padding:24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,"Helvetica Neue";color:#fff;background:radial-gradient(1200px 600px at 50% -10%,#1a1830,#0b0b12 55%,#08080c 100%);-webkit-font-smoothing:antialiased}
    .wrap{max-width:520px;margin:0 auto;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 30px 70px rgba(0,0,0,.5);overflow:hidden}
    .head{padding:18px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03))}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);font-weight:800;font-size:12px;color:#cfd3dc}.pill .dot{width:8px;height:8px;border-radius:999px;background:#00d084;box-shadow:0 0 0 4px rgba(0,208,132,.12)}
    .content{padding:18px;display:grid;grid-template-columns:1fr;gap:16px}
    .hero{display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center}@media(max-width:520px){.hero{grid-template-columns:1fr;text-align:center}}
    .qr-card{background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
    .qr-card img{width:180px;height:180px;object-fit:contain;display:block;background:#fff;padding:10px;border-radius:10px}
    .meta{display:flex;flex-direction:column;gap:10px}.title{font-size:18px;font-weight:900}.hint{color:#cbd1dc;font-size:13px}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px}.row .lbl{color:#cbd1dc;font-weight:700;font-size:12px}.row .val{font-weight:900}
    .btns{display:flex;gap:10px;flex-wrap:wrap}.btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:12px;cursor:pointer;text-decoration:none;border:0;color:#0b1220;background:#fff;font-weight:900;box-shadow:0 10px 30px rgba(8,8,12,.25)}.btn.secondary{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.14)}
    .split{height:1px;background:rgba(255,255,255,.08);margin:4px 0}.items{display:flex;flex-direction:column;gap:8px;font-size:13px;color:#cbd1dc}.item{display:flex;justify-content:space-between;gap:12px}
    .foot{padding:12px 18px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;gap:10px}.logo{font-weight:900;background:linear-gradient(135deg,#c760db,#ff6fa6 70%);-webkit-background-clip:text;background-clip:text;color:transparent}.muted{color:#a9afbb;font-size:12px}
  </style>
`)
          .replace(/__QR__/g, data.qrImage)
          .replace(/__DEEPLINK__/g, data.abapay_deeplink)
          .replace(/__TRAN__/g, data.status.tran_id)
          .replace(/__AMT__/g, String(amt.toFixed(2)))
          .replace(/__ITEMS__/g, makeItemsHtml(toAPI(bag)));
        win.document.open(); win.document.write(html); win.document.close();
      } else {
        try{ win.close(); }catch(_){}
        alert((data && (data.detail?.status?.message || data.error || JSON.stringify(data))) || 'PayWay purchase failed');
      }
    } catch(e) {
      console.error(e); try{ win.close(); }catch(_){}
      alert('Request failed. Is your server running on ' + API_BASE + '?');
    }
  }

  function wire(btn){ if(!btn||btn.__wired) return; btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openPayway(); }); btn.__wired=true; }
  document.addEventListener('DOMContentLoaded', ()=> wire(document.getElementById(BTN_ID)));
})();
