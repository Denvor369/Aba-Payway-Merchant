// payway-guard-min.js — minimal + strict
(function(){
  function $(id){ return document.getElementById(id); }
  var btn = $("paywayBtn") || $("purchaseBtn");
  var nameEl = $("name");
  var phoneEl = $("phone");
  var addrEl = $("address") || $("province-input"); // strict: no #note

  // If anything missing, do nothing (avoid breaking your page)
  if (!btn || !nameEl || !phoneEl || !addrEl) return;

  function filled(el){ return !!(el && el.value && el.value.trim().length > 0); }
  function sync(){ btn.disabled = !(filled(nameEl) && filled(phoneEl) && filled(addrEl)); }

  // initial + live updates
  sync();
  ["input","change"].forEach(function(evt){
    nameEl.addEventListener(evt, sync);
    phoneEl.addEventListener(evt, sync);
    addrEl.addEventListener(evt, sync);
  });

  // hard guard
  btn.addEventListener("click", function(e){
    if (btn.disabled){ e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
