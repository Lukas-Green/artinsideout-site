
(function () {
  'use strict';

  var cfg = window.AIO_STORE;
  if (!cfg || !cfg.products || !cfg.products.length) return;

  
  var ALLOWED = /^(buy\.stripe\.com|checkout\.stripe\.com|pay\.stripe\.com|squareup\.com|square\.link|gumroad\.com|[a-z0-9-]+\.gumroad\.com|[a-z0-9-]+\.squareup\.com)$/i;

  
  var cards = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-sku]'),
    function (card) {
      var sku = card.getAttribute('data-sku');
      if (!sku) return;
      if (Object.prototype.hasOwnProperty.call(cards, sku)) { cards[sku] = null; return; }
      cards[sku] = card;
    }
  );

  function buyLink(p, url) {
    var a = document.createElement('a');
    a.className = 'buy';
    a.href = url.href;
    a.rel = 'noopener noreferrer';
    a.referrerPolicy = 'no-referrer';
    a.target = '_blank';
    a.setAttribute('data-sku', p.sku);
    a.innerHTML = 'Buy &middot; $' + p.price +
      ' <span class="arw" aria-hidden="true">&rarr;</span>';
    
    a.setAttribute('aria-label',
      'Buy ' + (p.title || p.sku) + ', $' + p.price + ', opens the checkout in a new tab');
    return a;
  }

  var wired = 0, skipped = [];

  cfg.products.forEach(function (p) {
    if (!p.checkout) { skipped.push(p.sku + ' (no checkout url)'); return; }

    var card = cards[p.sku];
    if (!card) { skipped.push(p.sku + ' (no card with that sku on this page)'); return; }

    
    var url;
    try { url = new URL(p.checkout, window.location.href); } catch (e) { url = null; }
    if (!url || url.protocol !== 'https:') {
      skipped.push(p.sku + ' (checkout url is not https, refused)');
      return;
    }
    
    if (!ALLOWED.test(url.hostname)) {
      skipped.push(p.sku + ' (checkout host ' + url.hostname + ' is not a checkout provider, refused)');
      return;
    }

    var a = buyLink(p, url);

    
    var soon = card.querySelector('.soon');
    if (soon) soon.remove();

    if (card.classList.contains('kid')) {
      card.appendChild(a);
    } else {
      var row = card.querySelector('.row');
      if (!row) { skipped.push(p.sku + ' (card has no price row)'); return; }
      row.appendChild(a);
    }
    wired++;
  });

  
  if (window.console && skipped.length) {
    console.info('[store] ' + wired + ' product(s) wired, ' + skipped.length +
      ' left as ordering-opens-soon:\n  ' + skipped.join('\n  '));
  }

  
  var b = cfg.bulk;
  if (wired && b && b.enabled && b.mailto) {
    var host = document.querySelector('#kids .kids');
    if (host && host.parentNode) {
      var box = document.createElement('div');
      box.className = 'bulk';
      var h3 = document.createElement('h3');
      h3.textContent = b.heading;
      var p = document.createElement('p');
      p.textContent = b.body;
      var link = document.createElement('a');
      link.className = 'btn btn--ghost';
      link.href = 'mailto:' + b.mailto + '?subject=' + encodeURIComponent(b.subject || '');
      link.innerHTML = 'Ask about a bulk order <span class="arw" aria-hidden="true">&rarr;</span>';
      box.appendChild(h3); box.appendChild(p); box.appendChild(link);
      host.parentNode.insertBefore(box, host.nextSibling);
    }
  }
})();
