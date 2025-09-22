
/*! cta.reset.uiverse.js
 * Replacement CTA that renders a Uiverse-style button (#c84bd6) on product cards.
 * Keep functionality: on click, adds to cart and swaps to qty controls.
 * Include ONLY on main/products pages, after your core scripts.
 */
(function(){
  'use strict';
  // Disable this helper if the main app script is loaded to avoid double-CTAs
  if (window.__shopScriptLoaded || window.app) {
    try { console.info('[cta.uiverse] disabled — main app controls CTAs'); } catch(_) {}
    return;
  }


  var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };
  var $ = function(sel, root){ return (root||document).querySelector(sel); };

  var BAG_KEY = 'bag';
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

  function changeQty(id, delta){
    id = String(id||'').trim(); if (!id) return;
    if (window.app && (window.app.changeQtyById || window.app.changeQty)){
      if (window.app.changeQtyById) window.app.changeQtyById(id, delta);
      else window.app.changeQty($('.product-card[data-id="'+CSS.escape(id)+'"]'), delta);
      ensureAppRenders(); return;
    }
    var bag = loadBag();
    var i = bag.findIndex(function(x){ return String(x.id) === id; });
    if (i !== -1){
      bag[i].qty = clamp((+bag[i].qty||0) + delta, 0, 99);
      if (bag[i].qty === 0) bag.splice(i, 1);
      saveBag(bag); ensureAppRenders();
    } else if (delta > 0){
      bag.push({ id: id, title: id, price: 0, qty: 1 }); saveBag(bag); ensureAppRenders();
    }
  }

  function getCardData(card){
    var id = card.getAttribute('data-id') || '';
    var price = card.getAttribute('data-price');
    if (price == null){
      var pEl = card.querySelector('[data-price], .product-price, .price');
      if (pEl){
        var txt = (pEl.dataset && pEl.dataset.price) || pEl.textContent || '0';
        price = parseFloat(String(txt).replace(/[^\d.]/g, '')) || 0;
      } else { price = 0; }
    } else { price = parseFloat(price) || 0; }
    var title = card.getAttribute('data-title') || (card.querySelector('.product-title') && card.querySelector('.product-title').textContent.trim()) || id;
    return { id: id, price: price, title: title };
  }

  function buildAddBtn(){
    var wrap = document.createElement('div');
    wrap.className = 'cta2';
    wrap.innerHTML = ''
      + '<button type="button" class="button btn-add2" aria-label="Add to Cart">'
      + '  <svg viewBox="0 0 16 16" class="bi bi-cart-check" height="24" width="24" xmlns="http://www.w3.org/2000/svg" fill="#fff" aria-hidden="true">'
      + '    <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"></path>'
      + '    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>'
      + '  </svg>'
      + '  <span class="text">Add to Cart</span>'
      + '</button>';
    return wrap;
  }

  function buildQty(qty){
    var wrap = document.createElement('div');
    wrap.className = 'cta2';
    wrap.innerHTML = [
      '<div class="qty2" role="group" aria-label="Quantity">',
      '  <button type="button" class="qbtn2 minus" aria-label="Decrease">−</button>',
      '  <span class="qnum2" aria-live="polite">', String(qty||1) ,'</span>',
      '  <button type="button" class="qbtn2 plus" aria-label="Increase">+</button>',
      '</div>'
    ].join('');
    return wrap;
  }

  function replaceCtas(){
    $$('.product-card').forEach(function(card){
      $$('.cta, .product-cta, .add-to-cart', card).forEach(function(n){ n.parentNode && n.parentNode.removeChild(n); });
      var data = getCardData(card);
      var bag = loadBag();
      var cur = bag.find(function(x){ return String(x.id) === String(data.id); });
      var node = cur ? buildQty(cur.qty) : buildAddBtn();
      card.appendChild(node);
      card.classList.add('cta2-mounted');
    });
  }

  function delegate(){
    document.addEventListener('click', function(e){
      var add = e.target.closest && e.target.closest('.cta2 .btn-add2');
      if (add){
        e.preventDefault();
        var card = add.closest('.product-card');
        if (!card) return;
        var data = getCardData(card);
        addToCart(data.id, 1, data.title, data.price);
        var wrap = add.closest('.cta2');
        var next = buildQty(1);
        wrap.replaceWith(next);
        return;
      }
      var qbtn = e.target.closest && e.target.closest('.cta2 .qbtn2');
      if (qbtn){
        e.preventDefault();
        var card2 = qbtn.closest('.product-card');
        if (!card2) return;
        var data2 = getCardData(card2);
        var qtyEl = qbtn.parentNode.querySelector('.qnum2');
        var qtyVal = parseInt(qtyEl.textContent, 10) || 1;
        if (qbtn.classList.contains('plus')){
          changeQty(data2.id, +1);
          qtyEl.textContent = String(qtyVal + 1);
        } else {
          changeQty(data2.id, -1);
          var q = qtyVal - 1;
          if (q <= 0){
            var holder = qbtn.closest('.cta2');
            holder.replaceWith(buildAddBtn());
          } else {
            qtyEl.textContent = String(q);
          }
        }
      }
    }, true);
  }

  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function(){
    replaceCtas();
    delegate();
  });
})();
