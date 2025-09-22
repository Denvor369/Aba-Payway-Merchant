
/*! cta.dupfix.js
 * Keeps exactly ONE Add-to-Cart button per product section.
 * - On product cards (.product-card): remove extra .cta2/.cta if duplicates appear.
 * - On product detail pages (.pd-actions): keep only the first CTA (Uiverse preferred).
 * Include AFTER any CTA injector scripts.
 */
(function(){
  'use strict';
  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function uniqIn(container, candidates){
    var nodes = [];
    candidates.forEach(function(sel){
      nodes = nodes.concat($$(sel, container));
    });
    if (nodes.length <= 1) return;
    // Prefer Uiverse button if present
    var keep = nodes.find(function(n){ return n.classList && n.classList.contains('btn-add2'); }) || nodes[0];
    nodes.forEach(function(n){
      if (n !== keep) { try { n.remove(); } catch(_){ n.style.display='none'; } }
    });
  }

  function run(){
    // Product detail actions
    $$('.pd-actions').forEach(function(sec){
      uniqIn(sec, ['.button.btn-add2', '.cta', 'button']);
    });

    // Product cards (listing)
    $$('.product-card').forEach(function(card){
      uniqIn(card, ['.cta2 .button.btn-add2', '.cta2', '.cta']);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // In case injectors re-run or content changes
  if ('MutationObserver' in window){
    var mo = new MutationObserver(function(){ run(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
