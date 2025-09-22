
// payway-guard-robust.js — drop-in, auto-detects fields & button
(function(){
  function byId(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function norm(t){ return (t||"").replace(/\s+/g," ").trim().toLowerCase(); }

  // 1) Find the purchase button
  function findButton(){
    // Common ids
    var ids = ["paywayBtn","purchaseBtn","btnPurchase","purchase-with-aba"];
    for (var i=0;i<ids.length;i++){
      var b = byId(ids[i]);
      if (b) return b;
    }
    // Buttons with likely text
    var candidates = qsa('button, a[role="button"], input[type="button"], input[type="submit"]');
    var wanted = ["purchase with aba","purchase","pay with aba","aba"];
    for (var j=0;j<candidates.length;j++){
      var el = candidates[j];
      var text = norm(el.innerText || el.value || el.getAttribute("aria-label") || "");
      if (!text) continue;
      for (var k=0;k<wanted.length;k++){
        if (text.indexOf(wanted[k]) !== -1) return el;
      }
    }
    return null;
  }

  // 2) Find the 3 required fields: name, phone, address-like
  function findName(){
    return byId("name") || qs('input[name="name"]') || qs('input[autocomplete="name"]');
  }
  function findPhone(){
    return byId("phone") || qs('input[type="tel"]') || qs('input[name*="phone" i]');
  }
  function findAddress(){
    // various common ids, then any element with address-ish placeholder/label
    var ids = ["address","addr","street","note","province-input","province","shipping-address"];
    for (var i=0;i<ids.length;i++){
      var el = byId(ids[i]);
      if (el) return el;
    }
    // placeholder or aria-label contains keywords
    var candidates = qsa('input, textarea, select');
    var keys = ["address","house","street","village","commune","district","province","note"];
    for (var j=0;j<candidates.length;j++){
      var el2 = candidates[j];
      var ph = norm(el2.getAttribute("placeholder"));
      var al = norm(el2.getAttribute("aria-label"));
      var nm = norm(el2.getAttribute("name"));
      var id = norm(el2.id);
      var bag = [ph,al,nm,id].join(" ");
      for (var k=0;k<keys.length;k++){
        if (bag.indexOf(keys[k]) !== -1) return el2;
      }
    }
    return null;
  }

  function ready(fields){
    return fields.every(function(el){
      if (!el) return false;
      var v = (el.value || "").trim();
      return v.length > 0;
    });
  }
  function setup(){
    var btn = findButton();
    var nameEl = findName();
    var phoneEl = findPhone();
    var addrEl = findAddress();

    // If anything missing, don't break the page — just exit quietly.
    if (!btn || !nameEl || !phoneEl || !addrEl) {
      // Helpful diagnostics for developers (no alert for users)
      // Uncomment for debugging:
      // console.debug("[payway-guard-robust] btn:", !!btn, "name:", !!nameEl, "phone:", !!phoneEl, "addr:", !!addrEl);
      return;
    }

    var fields = [nameEl, phoneEl, addrEl];

    function sync(){
      var ok = ready(fields);
      btn.disabled = !ok;
      btn.setAttribute("aria-disabled", String(!ok));
    }

    // Initial + live updates
    sync();
    fields.forEach(function(el){
      ["input","change"].forEach(function(evt){
        el.addEventListener(evt, sync);
      });
    });

    // Extra protection on click
    btn.addEventListener("click", function(e){
      if (!ready(fields)){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // In case dynamic DOM updates replace inputs/button
    var mo = new MutationObserver(function(){ 
      // if nodes changed, re-evaluate values
      sync();
    });
    mo.observe(document.documentElement, {subtree:true, childList:true, attributes:false});
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
