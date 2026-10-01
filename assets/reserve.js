
(function () {
  'use strict';

  var cfg = window.AIO_RESERVE;
  if (!cfg || !cfg.endpoint) return;              

  
  var ENDPOINT = String(cfg.endpoint);
  var SAFE = /^https:\/\//i.test(ENDPOINT) ||
             /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(ENDPOINT);
  if (!SAFE) return;

  var TITLES = {};                                
  var cards = [];

  
  var all = document.querySelectorAll('[data-sku]');
  for (var i = 0; i < all.length; i++) {
    var card = all[i];
    var sku = (card.getAttribute('data-sku') || '').trim();
    if (!sku) continue;

    
    if (card.querySelector('.buy, [data-store-buy]')) continue;

    var soon = card.querySelector('.soon');
    if (!soon) continue;

    var titleEl = card.querySelector('b') || card.querySelector('h3');
    TITLES[sku] = titleEl ? titleEl.textContent.trim() : sku;
    cards.push({ card: card, sku: sku, soon: soon });
  }
  if (!cards.length) return;

  
  cards.forEach(function (c) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reserve-btn';
    btn.textContent = 'Reserve a copy';
    btn.setAttribute('data-sku', c.sku);
    btn.setAttribute('aria-haspopup', 'dialog');
    c.soon.parentNode.replaceChild(btn, c.soon);
    btn.addEventListener('click', function () { open(c.sku); });
  });

  
  var dlg, form, statusEl, lastFocus;

  function build() {
    dlg = document.createElement('div');
    dlg.className = 'rsv-back';
    dlg.hidden = true;
    dlg.innerHTML =
      '<div class="rsv" role="dialog" aria-modal="true" aria-labelledby="rsv-h">' +
        '<button type="button" class="rsv-x" aria-label="Close">&times;</button>' +
        '<h2 id="rsv-h">Reserve a copy</h2>' +
        '<p class="rsv-sub" id="rsv-sub"></p>' +
        '<form novalidate>' +
          '<label for="rsv-name">Your name</label>' +
          '<input id="rsv-name" name="name" type="text" autocomplete="name" required maxlength="80">' +

          '<label for="rsv-email">Email</label>' +
          '<input id="rsv-email" name="email" type="email" autocomplete="email" required maxlength="120">' +

          '<label for="rsv-qty">How many copies</label>' +
          '<input id="rsv-qty" name="qty" type="number" min="1" max="500" value="1" required>' +

          '<fieldset class="rsv-who">' +
            '<legend>This is for</legend>' +
            '<label class="rsv-r"><input type="radio" name="who" value="myself" checked> Myself or a gift</label>' +
            '<label class="rsv-r"><input type="radio" name="who" value="school"> A school, library or facility</label>' +
          '</fieldset>' +

          '<label for="rsv-note">Anything we should know <span class="rsv-opt">(optional)</span></label>' +
          '<textarea id="rsv-note" name="note" rows="2" maxlength="400"></textarea>' +

          '<p class="rsv-fine">We will email you to arrange payment and delivery. ' +
            'No card details are taken on this site, and we do not ask for your address until ' +
            'your books are ready to post.</p>' +

          '<div class="rsv-act">' +
            '<button type="submit" class="rsv-go">Send reservation</button>' +
            '<span class="rsv-status" role="status" aria-live="polite"></span>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(dlg);

    form = dlg.querySelector('form');
    statusEl = dlg.querySelector('.rsv-status');

    dlg.querySelector('.rsv-x').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function (e) {
      if (!dlg.hidden && e.key === 'Escape') close();
    });
    form.addEventListener('submit', submit);
  }

  function open(sku) {
    if (!dlg) build();
    lastFocus = document.activeElement;
    form.reset();
    form.setAttribute('data-sku', sku);
    dlg.querySelector('#rsv-sub').textContent = TITLES[sku] || '';
    statusEl.textContent = '';
    statusEl.className = 'rsv-status';
    dlg.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    dlg.querySelector('#rsv-name').focus();
  }

  function close() {
    if (!dlg) return;
    dlg.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var qty = parseInt(form.qty.value, 10);

    if (!name) return fail('Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('That email does not look right.');
    if (!(qty >= 1 && qty <= 500)) return fail('Choose between 1 and 500 copies.');

    var payload = {
      sku: form.getAttribute('data-sku'),
      title: TITLES[form.getAttribute('data-sku')] || '',
      name: name,
      email: email,
      qty: qty,
      who: (form.querySelector('input[name=who]:checked') || {}).value || 'myself',
      note: form.note.value.trim().slice(0, 400),
      page: location.pathname
    };

    var go = form.querySelector('.rsv-go');
    go.disabled = true;
    statusEl.className = 'rsv-status';
    statusEl.textContent = 'Sending…';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        form.innerHTML = '<p class="rsv-done"><b>Thank you.</b> Your reservation is in. ' +
          'We will email you at <b>' + esc(email) + '</b> to arrange payment and delivery. ' +
          'Nothing has been charged.</p>';
      })
      .catch(function () {
        go.disabled = false;
        fail('That did not send. Please email kirk@artinside-out.com and we will sort it out.');
      });
  }

  function fail(msg) {
    statusEl.className = 'rsv-status is-bad';
    statusEl.textContent = msg;
    return false;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
