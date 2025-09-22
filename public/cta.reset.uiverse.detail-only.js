/*! cta.reset.uiverse.detail-only.js
 * Styles ONLY the product detail page CTA (.pd-actions) with the Uiverse button (#c84bd6).
 * Leaves listing/grid product cards alone so script.js can manage qty controls.
 * Uses the same storage key ('bag') as script.js so counts stay in sync.
 */
(function(){
  'use strict';

  var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };
  var $ = function(sel, root){ return (root||document).querySelector(sel); };

  var BAG_KEY = 'bag'; // match main script.js

  function loadBag(){ try { return JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); } catch(e){ return []; } }
  function saveBag(b){ try { localStorage.setItem(BAG_KEY, JSON.stringify(b||[])); } catch(e){} }
  function clamp(n, lo, hi){ n = +n||0; return Math.max(lo, Math.min(hi, n)); }

  function ensureAppRenders(){
    if (!window.app) return;
    try { window.app.renderMiniCart && window.app.renderMiniCart(); } catch(_){}
    try { window.app.renderBadges && window.app.renderBadges(); } catch(_){}
    try { window.app.renderCheckout && window.app.renderCheckout(); } catch(_){}
    try { window.app.renderProductControls && window.app.renderProductControls(); } catch(_){}
  }

  function addToCart(id, qty, title, price){
    id = String(id||'').trim(); if (!id) return;
    qty = clamp(qty||1, 1, 99);
    if (window.app && typeof window.app.addToCart === 'function'){
      window.app.addToCart(id, qty);
      ensureAppRenders();
      return;
    }
    var bag = loadBag();
    var i = bag.findIndex(function(x){ return String(x.id) === id; });
    if (i === -1){
      bag.push({ id: id, title: title||id, price: +price||0, qty: qty });
    } else {
      bag[i].qty = clamp((+bag[i].qty||0) + qty, 1, 99);
    }
    saveBag(bag);
    ensureAppRenders();
  }

  function getDataFromContext(ctx){
    // Prefer nearest product-card
    var card = ctx.closest && ctx.closest('.product-card');
    if (card) {
      return {
        id: card.getAttribute('data-id') || '',
        price: parseFloat(card.getAttribute('data-price') || '0') || 0,
        title: card.getAttribute('data-title') || (card.querySelector('.product-title') && card.querySelector('.product-title').textContent.trim()) || ''
      };
    }
    // Fallback: page-level dataset on .pd-wrap
    var wrap = $('.pd-wrap');
    return {
      id: (wrap && wrap.getAttribute('data-id')) || '',
      price: parseFloat((wrap && wrap.getAttribute('data-price')) || '0') || 0,
      title: (wrap && (wrap.getAttribute('data-title') || wrap.getAttribute('data-title-kh'))) || document.title || ''
    };
  }

  function buildAddBtn(text){
    var wrap = document.createElement('div');
    wrap.className = 'cta2';
    wrap.innerHTML = ''
      + '<button type="button" class="button btn-add2" aria-label="'+ (text||'Add to Cart') +'">'
      + '  <svg viewBox="0 0 16 16" class="bi bi-cart-check" height="24" width="24" xmlns="http://www.w3.org/2000/svg" fill="#fff" aria-hidden="true">'
      + '    <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"></path>'
      + '    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>'
      + '  </svg>'
      + '  <span class="text">'+ (text||'Add to Cart') +'</span>'
      + '</button>';
    return wrap;
  }

  function replacePdActionCta(){
    // Only operate inside .pd-actions (product detail primary CTA)
    $$('.pd-actions').forEach(function(sec){
      $$('.cta2, .btn-add2', sec).forEach(function(n){ try { n.remove(); } catch(_){ n.style.display='none'; } });
      var old = sec.querySelector('.cta, .add-and-gos, button');
      var text = (old && old.textContent && old.textContent.trim()) || 'Add to Cart';
      if (old) { try { old.remove(); } catch(_){ old.style.display='none'; } }
      sec.appendChild(buildAddBtn(text));
    });
  }

  function delegate(){
    document.addEventListener('click', function(e){
      var add = e.target.closest && e.target.closest('.pd-actions .btn-add2');
      if (!add) return;
      e.preventDefault();
      var ctx = add.closest('.pd-actions') || add;
      var data = getDataFromContext(ctx);
      addToCart(data.id, 1, data.title, data.price);
    }, true);
  }

  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function(){
    replacePdActionCta();  // ONLY detail CTA
    delegate();
  });
})();
