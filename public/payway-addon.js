// payway-addon.js — Minimal PayWay popup/QR add-on (dedicated button)
// Relies on payway-config.js variables: API_BASE, BAG_KEY, BUTTON_ID
(function () {
  'use strict';

  const API_BASE = (window.PAYWAY_API_BASE || "http://localhost:3000").replace(/\/+$/, "");
  const BAG_KEY = window.PAYWAY_BAG_KEY || "bag";
  const BUTTON_ID = window.PAYWAY_BUTTON_ID || "paywayBtn";
  const FALLBACK_KEYS = [BAG_KEY, "cart", "shoppingCart", "items", "basket"];

  function readFromKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return null;
      return arr.map(i => ({
        title: String(i?.title || i?.name || "Item"),
        qty: Math.max(1, Number(i?.qty || i?.quantity || 1)),
        price: Number(i?.price || i?.unitPrice || 0)
      }));
    } catch { return null; }
  }
  function readBag() {
    for (const k of FALLBACK_KEYS) {
      const v = readFromKey(k);
      if (v && v.length) return v;
    }
    if (Array.isArray(window.__BAG__) && window.__BAG__.length) {
      return window.__BAG__.map(i => ({
        title: String(i?.title || i?.name || "Item"),
        qty: Math.max(1, Number(i?.qty || i?.quantity || 1)),
        price: Number(i?.price || i?.unitPrice || 0)
      }));
    }
    return [];
  }
  function getBuyer() {
    const val = id => (document.getElementById(id)?.value || "").trim();
    return {
      firstname: val("name") || "Guest",
      lastname: "Customer",
      email: "guest@example.com",
      phone: val("phone") || "+85500000000"
    };
  }
  function calcTotal(items) {
    return items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  }
  async function openPaywayCheckout({ amount, items, buyer }) {
    const win = window.open("", "payway", "width=480,height=720");
    try {
      const resp = await fetch(`${API_BASE}/payway/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount || 0).toFixed(2),
          currency: "USD",
          items: items.map(i => ({ name: i.title, qty: i.qty, price: i.price })),
          firstname: buyer?.firstname || "Guest",
          lastname: "Customer",
          email: "guest@example.com",
          phone: buyer?.phone || "+85500000000",
          continue_success_url: location.origin + "/thank-you",
          return_params: `orderId=${Date.now()}`
        })
      });
      const text = await resp.text();
      if (!resp.ok || !text) throw new Error("Bad response");
      if (text.trim().startsWith("<")) { win.document.open(); win.document.write(text); win.document.close(); return; }
      const data = JSON.parse(text);
      if (data?.status?.code === "00") {
        win.document.open();
        win.document.write(`
          <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
          <style>body{font-family:system-ui,Arial;margin:24px;text-align:center}img{max-width:260px}
          a.btn{display:inline-block;margin-top:12px;padding:10px 14px;border-radius:10px;border:1px solid #ccc;text-decoration:none}
          .note{color:#666;margin-top:10px;font-size:14px}</style></head><body>
            <h2>Scan with ABA Mobile</h2>
            <img src="${data.qrImage}" alt="ABA Pay QR"/>
            <div><a class="btn" href="${data.abapay_deeplink}">Open ABA App</a></div>
            <div class="note">Transaction ID: ${data.status.tran_id}</div>
          </body></html>`);
        win.document.close();
      } else {
        try { win.close(); } catch(_){}
        alert((data && (data.detail?.status?.message || data.error || JSON.stringify(data))) || "PayWay purchase failed");
      }
    } catch (e) {
      console.error(e);
      try { win.close(); } catch(_){}
      alert("Request failed. Is your server running on " + API_BASE + "?");
    }
  }
  function wire(button) {
    if (!button || button.__paywayWired) return;
    button.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation(); // ensure no duplicate handlers fire
      const items = readBag();
      if (!items.length) { alert("Your bag is empty."); return; }
      const buyer = getBuyer();
      const total = calcTotal(items);
      await openPaywayCheckout({ amount: total, items, buyer });
    });
    button.__paywayWired = true;
  }
  document.addEventListener("DOMContentLoaded", () => { wire(document.getElementById(BUTTON_ID)); });
})();