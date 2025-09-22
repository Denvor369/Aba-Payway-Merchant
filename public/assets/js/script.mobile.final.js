
/*! script.mobile.final.js
 * Drop-in patch that:
 *  1) Ensures every .product-card has a .cta container.
 *  2) Forces CTA to be visible/clickable on touch devices (no hover).
 *  3) Adds a safe-click fallback on phones (uses window.app.addToCart if available).
 * Load this AFTER your original script.js.
 */
(function(){
  'use strict';

  var isTouchLike = (function(){
    try {
      return (window.matchMedia && window.matchMedia('(hover: none)').matches) || ('ontouchstart' in window);
    } catch (e) { return ('ontouchstart' in window); }
  })();

  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function ensureCtaContainers(){
    $$('.product-card').forEach(function(card){
      if (!card.querySelector('.cta')) {
        var el = document.createElement('div');
        el.className = 'cta';
        card.appendChild(el);
      }
    });
  }

  function forceCtaVisible(){
    if (!isTouchLike) return;
    $$('.product-card .cta').forEach(function(el){
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
      el.style.transform = 'none';
      el.style.position = 'static';
      el.style.zIndex = '3';
      // ensure it has some text if empty and not in qty mode
      if (!el.querySelector('.qty-controls') && !el.textContent.trim()) {
        el.textContent = 'Add to Cart';
      }
    });
  }

  function addToCartViaApp(card){
    try {
      var id = card && card.getAttribute('data-id');
      if (!id) return false;
      if (window.app && typeof window.app.addToCart === 'function') {
        window.app.addToCart(String(id), 1);
        return true;
      }
    } catch(e){}
    return false;
  }

  function attachClickFallbacks(){
    // 1) Click on the CTA itself
    document.addEventListener('click', function(e){
      var cta = e.target.closest && e.target.closest('.product-card .cta');
      if (!cta) return;
      var hasQty = !!cta.querySelector('.qty-controls');
      if (hasQty) return;
      if (!isTouchLike) return; // desktop already works

      var card = cta.closest('.product-card');
      if (!card) return;
      // Prevent navigation glitches
      e.preventDefault();
      e.stopImmediatePropagation();
      // Rely on site's addToCart if available
      addToCartViaApp(card);
    }, true);

    // 2) Tap anywhere inside the card (except on links/qty controls) to add
    document.addEventListener('click', function(e){
      if (!isTouchLike) return;
      var card = e.target.closest && e.target.closest('.product-card');
      if (!card) return;
      // ignore clicks on interactive elements
      if (e.target.closest('a, button, .qty-controls, input, select, textarea')) return;

      var cta = card.querySelector('.cta');
      if (cta && !cta.querySelector('.qty-controls')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        // trigger site's handler if present
        if (!addToCartViaApp(card)) {
          // fall back: simulate a click on CTA (some sites bind to it)
          try { cta.click(); } catch(_){}
        }
      }
    }, true);
  }

  // Watch for DOM changes (if the grid rerenders)
  var mo;
  function observe(){
    if (!('MutationObserver' in window)) return;
    mo = new MutationObserver(function(){
      ensureCtaContainers();
      forceCtaVisible();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function(){
    ensureCtaContainers();
    forceCtaVisible();
    attachClickFallbacks();
    observe();
  });

})();
