// payway-guard-auto.js — Drop-in, auto-detect fields & button
(function () {
  function $(id){ return document.getElementById(id); }
  // Try both common button ids
  var btn = $("paywayBtn") || $("purchaseBtn");
  if (!btn) return; // if no button, do nothing

  // Prefer real address field if present; otherwise fall back to 'note' (present in your file) then province-input
  var addr = $("address") || $("note") || $("province-input");

  // Required set
  var required = [
    {el: $("name"),   id: "name"},
    {el: $("phone"),  id: "phone"},
    {el: addr,        id: addr ? addr.id : "address"}
  ].filter(function(x){ return !!x.el; });

  function ready(){
    return required.every(function(x){
      var v = (x.el.value || "").trim();
      return v.length > 0;
    });
  }
  function sync(){
    var ok = ready();
    btn.disabled = !ok;
    btn.setAttribute("aria-disabled", String(!ok));
  }

  // Keep it updated while user types/selects
  required.forEach(function(x){
    ["input","change"].forEach(function(evt){
      x.el.addEventListener(evt, sync);
    });
  });

  // In case the page swaps elements later (SPA behavior), keep syncing
  var mo = new MutationObserver(sync);
  mo.observe(document.documentElement, {subtree:true, childList:true, attributes:true, characterData:false});

  // Initial state
  sync();

  // Extra guard
  btn.addEventListener("click", function(e){
    if (!ready()){
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
