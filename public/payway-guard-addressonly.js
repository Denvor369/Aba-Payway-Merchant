// payway-guard-addressonly.js — Require ONLY Name, Phone, Address
// Address = #address if present, otherwise #province-input.
// Never uses #note (additional box).
(function(){
  function $(id){ return document.getElementById(id); }
  function findButton(){
    return $("paywayBtn") || $("purchaseBtn") || document.querySelector('button, a[role="button"], input[type="submit"], input[type="button"]');
  }
  var btn = findButton();
  if (!btn) return;

  var nameEl  = $("name")  || document.querySelector('input[name="name"]');
  var phoneEl = $("phone") || document.querySelector('input[type="tel"], input[name*="phone" i]');
  // Address rule: prefer #address; else #province-input; NEVER #note
  var addrEl  = $("address") || $("province-input");

  if (!nameEl || !phoneEl || !addrEl){
    // If address truly doesn't exist, fail safe: don't block the button.
    return;
  }

  function filled(el){
    if (!el) return false;
    // handle selects too
    var v = (el.value || "").toString().trim();
    return v.length > 0;
  }
  function ready(){
    return filled(nameEl) && filled(phoneEl) && filled(addrEl);
  }
  function sync(){
    var ok = ready();
    btn.disabled = !ok;
    btn.setAttribute("aria-disabled", String(!ok));
  }

  // initial + live updates
  sync();
  [nameEl, phoneEl, addrEl].forEach(function(el){
    ["input","change"].forEach(function(evt){
      el.addEventListener(evt, sync);
    });
  });

  // hard guard on click
  btn.addEventListener("click", function(e){
    if (!ready()){
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
