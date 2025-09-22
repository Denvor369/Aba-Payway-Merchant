// checkout.payway-addon.js — Non-intrusive PayWay popup/QR helper
// Keep your original checkout.js. Just include this file AFTER it.
// Default binds to #purchaseBtn (change at bottom if needed).
(function () {
  'use strict';

  const API_BASE = (window.PAYWAY_API_BASE || "http://localhost:3000").replace(/\/+$/,"");

  function readBag() {
    // Prefer existing function from your original script if present
    if (typeof window.safeParseBag === "function") {
      try { return window.safeParseBag(); } catch (e) {}
    }
    try {
      const raw = localStorage.getItem('bag');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(i => ({
        title: String(i?.title || 'Item'),
        qty: Math.max(1, Number(i?.qty || 1)),
        price: Number(i?.price || 0)
      }));
    } catch { return []; }
  }

  function computeTotals(items) {
    // Prefer existing computeTotals if present
    if (typeof window.computeTotals === "function") {
      try { return window.computeTotals(items); } catch (e) {}
    }
    const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
    const shipping = 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
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
          lastname: buyer?.lastname || "Customer",
          email: buyer?.email || "guest@example.com",
          phone: buyer?.phone || "+85500000000",
          continue_success_url: location.origin + "/thank-you",
          return_params: `orderId=${Date.now()}`
        })
      });

      const text = await resp.text();
      if (!resp.ok || !text) throw new Error("PayWay response invalid");

      if (text.trim().startsWith("<")) {
        win.document.open(); win.document.write(text); win.document.close();
        return;
      }

      const data = JSON.parse(text);
      if (data?.status?.code === "00") {
        const qrImg = data.qrImage;
        const deeplink = data.abapay_deeplink;
        const tranId = data.status.tran_id;

        win.document.open();
        win.document.write(`
          <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            body{font-family:system-ui,Arial;margin:24px;text-align:center}
            img{max-width:260px}
            a.btn{display:inline-block;margin-top:12px;padding:10px 14px;border-radius:10px;border:1px solid #ccc;text-decoration:none}
            .note{color:#666;margin-top:10px;font-size:14px}
          </style></head><body>
            <h2>Scan with ABA Mobile</h2>
            <img src="${qrImg}" alt="ABA Pay QR"/>
            <div><a class="btn" href="${deeplink}">Open ABA App</a></div>
            <div class="note">Transaction ID: ${tranId}</div>
            <div class="note">Leave this window open while you complete payment.</div>
          </body></html>
        `);
        win.document.close();
      } else {
        try { win.close(); } catch (_) {}
        const msg = (data && (data.detail?.status?.message || data.error || JSON.stringify(data))) || "PayWay purchase failed";
        alert(msg);
        console.error("PayWay error:", data);
      }
    } catch (err) {
      console.error("[payway] create failed:", err);
      try { win.close(); } catch (_) {}
      alert("Failed to open PayWay checkout. Make sure your server is running on " + API_BASE);
    }
  }

  function wire(button) {
    if (!button || button.__paywayWired) return;
    button.addEventListener("click", async (e) => {
      // Let your original handlers run first if they are on the same button
      // If you want to fully replace them, uncomment: e.preventDefault(); e.stopPropagation();
      const items = readBag();
      if (!items.length) { alert("Your bag is empty."); return; }
      const buyer = getBuyer();
      const totals = computeTotals(items);
      await openPaywayCheckout({ amount: totals.total, items, buyer });
    });
    button.__paywayWired = true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Only attach to a dedicated PayWay button to avoid side-effects.
    // Change 'purchaseBtn' if your button uses a different id.
    wire(document.getElementById("purchaseBtn"));
  });
})();