// ABA-style PayWay popup
(function(){'use strict';
  const API_BASE = (window.PAYWAY_API_BASE || 'http://localhost:3000').replace(/\/+$/,'');
  const BAG_KEY = 'bag';
  const BTN_ID = 'purchaseBtn';

  function readBag(){ try{ const raw = localStorage.getItem(BAG_KEY); const a = JSON.parse(raw||'[]'); return Array.isArray(a)?a:[]; }catch{ return []; } }
  function toAPI(items){ return items.map(i=>({ name: String(i.title||i.name||'Item'), qty: Math.max(1, Number(i.qty||i.quantity||1)), price: Number(i.price||i.unitPrice||0) })); }
  function total(items){ return items.reduce((s,i)=> s + Number(i.price||0)*Number(i.qty||1), 0); }

  async function openPayway(){ 
    const bag = readBag(); if(!bag.length) { alert('Your bag is empty.'); return; }
    const win = window.open('', 'payway', 'width=500,height=760');
    const amt = total(bag);
    try{
      const resp = await fetch(API_BASE + '/payway/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          amount: amt.toFixed(2), currency:'USD',
          items: toAPI(bag),
          firstname: 'Customer', lastname: 'Darila',
          email: 'guest@example.com', phone: '+85500000000',
          continue_success_url: location.origin + '/thank-you',
          return_params: 'orderId=' + Date.now()
        })
      });
      const text = await resp.text();
      if(!resp.ok || !text) throw new Error('Bad response');
      if(text.trim().startsWith('<')) { win.document.open(); win.document.write(text); win.document.close(); return; }
      const data = JSON.parse(text);
      if(data?.status?.code === '00') {
        var merchant = (data?.merchant_name) || 'Darila Shop';
        var tpl = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">%%STYLE%%</head>
<body>
  <div class="overlay">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">ABA KHQR</div>
        <button class="close" onclick="window.close()">×</button>
      </div>
      <div class="modal-body">
        <div class="khqr-card">
          <div class="khqr-band">KHQR</div>
          <div class="khqr-inner">
            <div class="merchant">__MERCHANT__</div>
            <div class="amount"><span class="val">__AMT__</span> <span class="cur">USD</span></div>
            <div class="dash"></div>
            <div class="qr-wrap"><img class="qr" src="__QR__" alt="ABA QR"/></div>
          </div>
        </div>
        <div class="btns">
          <a class="btn" href="__DEEPLINK__">Open ABA App</a>
          <button class="btn" onclick="location.reload()">Refresh</button>
        </div>
        <div class="footer">Scan with ABA Mobile, or other Mobile Banking App supporting KHQR.</div>
      </div>
    </div>
  </div>
</body></html>`.replace(/%%STYLE%%/g, `
  <style>
    :root{
      --bg:#6d7b8c;
      --modal:#ffffff;
      --ink:#1a1f2b;
      --muted:#6b7280;
      --line:#e5e7eb;
      --brand:#d91f3a; /* KHQR red band */
      --ring: rgba(0, 160, 220, .25);
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0; background:#6d7b8c; /* page backdrop like screenshot */
      font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:var(--ink);
    }
    .overlay{
      display:grid; place-items:center; min-height:100dvh; padding:24px;
    }
    .modal{
      width:min(420px, 100%); background:var(--modal); border-radius:14px;
      box-shadow: 0 30px 80px rgba(0,0,0,.35);
      padding:0; overflow:hidden; border:1px solid #e9eef5;
    }
    .modal-head{
      display:flex; align-items:center; justify-content:space-between;
      padding:18px 18px 10px;
    }
    .modal-title{ font-size:20px; font-weight:800; letter-spacing:.2px; color:#1f2937 }
    .close{ appearance:none; border:0; background:transparent; font-size:20px; line-height:1; color:#94a3b8; cursor:pointer; }
    .modal-body{ padding: 0 18px 18px; }
    .khqr-card{
      border-radius:20px; background:#fff; border:1px solid #eef2f7; overflow:hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,.06);
    }
    .khqr-band{ background:var(--brand); height:54px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; letter-spacing:1px }
    .khqr-inner{ padding:16px 18px 6px; }
    .merchant{ color:#6b7280; font-size:12px; font-weight:700 }
    .amount{ font-weight:900; font-size:28px; margin-top:8px; display:flex; align-items:baseline; gap:8px }
    .amount .cur{ font-weight:800; font-size:12px; color:#6b7280 }
    .dash{ height:1px; background:repeating-linear-gradient(90deg,#e5e7eb 0 8px, transparent 8px 16px); margin:10px -18px; }
    .qr-wrap{ display:grid; place-items:center; padding:12px 0 6px; }
    .qr{ width:240px; height:240px; object-fit:contain; display:block; }
    .footer{ text-align:center; color:#6b7280; font-size:12px; margin-top:12px }
    .btns{ display:flex; justify-content:center; gap:10px; margin-top:10px; }
    .btn{ appearance:none; border:1px solid #d1d5db; background:#fff; color:#111827; padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; text-decoration:none }
    .btn:focus{ outline:3px solid var(--ring); outline-offset:2px }
  </style>
`);
        var html = tpl
          .replace(/__QR__/g, data.qrImage)
          .replace(/__DEEPLINK__/g, data.abapay_deeplink)
          .replace(/__AMT__/g, String(amt.toFixed(2)))
          .replace(/__MERCHANT__/g, merchant);
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
