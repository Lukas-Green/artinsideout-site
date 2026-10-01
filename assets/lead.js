

(function () {
  'use strict';

  var CFG = window.AIO_LEAD || { endpoint: '', fallbackTo: 'info@artinside-out.com' };

  var INTEREST_LABEL = {
    program: 'Bring the program to a facility or organisation',
    books: 'Books',
    classes: 'Classes or a workshop',
    speaking: 'Speaking or an event',
    mural: 'A mural or commissioned artwork',
    reading: 'A school reading',
    other: 'Something else'
  };

  function byId(id, root) { return (root || document).getElementById(id); }

  function setStatus(form, kind, msg) {
    var box = form.querySelector('[data-lead-status]');
    if (!box) return;
    box.hidden = false;
    box.className = 'lead-status lead-status--' + kind;
    box.textContent = msg;
    
    box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }

  function plainText(v) {
    return [
      'A message from the Art Inside Out website.',
      '',
      'Name: ' + (v.name || 'not given'),
      'Email: ' + (v.email || 'not given'),
      'Wants: ' + (INTEREST_LABEL[v.interest] || INTEREST_LABEL.other),
      '',
      v.note || ''
    ].join('\n').trim();
  }

  
  function mailtoFallback(form, v) {
    var body = plainText(v);
    var out = form.querySelector('[data-lead-copy]');
    var wrap = form.querySelector('[data-lead-fallback]');
    if (out) out.value = body;
    if (wrap) wrap.hidden = false;

    window.location.href = 'mailto:' + (CFG.fallbackTo || 'info@artinside-out.com')
      + '?subject=' + encodeURIComponent('Art Inside Out, from the website')
      + '&body=' + encodeURIComponent(body);

    setStatus(form, 'warn',
      'Your email app should have opened. If it did not, nothing has been sent yet. '
      + 'Copy the message below and send it to us yourself.');
  }

  
  var TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    + '?render=explicit&onload=aioTurnstileReady';
  var pending = [];

  function loadTurnstile() {
    if (!CFG.turnstileSitekey || !CFG.endpoint) return;
    if (document.querySelector('script[data-aio-turnstile]')) return;
    window.aioTurnstileReady = function () {
      var q = pending; pending = [];
      for (var i = 0; i < q.length; i++) q[i]();
    };
    var s = document.createElement('script');
    s.src = TS_SRC;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-aio-turnstile', '');
    document.head.appendChild(s);
  }

  function mountCheck(form, state) {
    if (!CFG.turnstileSitekey || !CFG.endpoint) return;
    var slot = document.createElement('div');
    slot.className = 'lead-check';
    var btnRow = form.querySelector('button[type="submit"]');
    btnRow = btnRow ? btnRow.closest('p') || btnRow : null;
    if (btnRow) form.insertBefore(slot, btnRow); else form.appendChild(slot);

    function render() {
      try {
        state.widgetId = window.turnstile.render(slot, {
          sitekey: CFG.turnstileSitekey,
          action: 'lead',
          size: 'flexible',
          callback: function (t) { state.token = t; },
          'expired-callback': function () { state.token = ''; },
          'error-callback': function () { state.token = ''; }
        });
      } catch (e) { state.widgetId = null; }
    }
    if (window.turnstile && window.turnstile.render) render(); else pending.push(render);
  }

  function resetCheck(state) {
    state.token = '';
    if (state.widgetId != null && window.turnstile) {
      try { window.turnstile.reset(state.widgetId); } catch (e) {  }
    }
  }

  function showFallback(form, v) {
    var wrap = form.querySelector('[data-lead-fallback]');
    var out = form.querySelector('[data-lead-copy]');
    if (out) out.value = plainText(v);
    if (wrap) wrap.hidden = false;
  }

  function wire(form) {
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn ? btn.innerHTML : '';
    var busy = false;
    var check = { token: '', widgetId: null };
    mountCheck(form, check);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;

      var data = new FormData(form);
      var v = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        interest: String(data.get('interest') || 'other'),
        note: String(data.get('note') || '').trim(),
        source: form.getAttribute('data-lead-source') || 'unknown',
        
        company: String(data.get('company') || '')
      };

      if (!v.name) { setStatus(form, 'error', 'Please add your name.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) {
        setStatus(form, 'error', 'That email address does not look right.'); return;
      }

      if (!CFG.endpoint) { mailtoFallback(form, v); return; }

      if (CFG.turnstileSitekey) {
        if (!check.token) {
          setStatus(form, 'warn', check.widgetId == null
            ? 'Our spam check could not load, which can happen with some blockers. '
              + 'Your message is below. Please email it to us directly.'
            : 'One moment, the spam check above is still finishing. '
              + 'Try again in a few seconds.');
          if (check.widgetId == null) showFallback(form, v);
          return;
        }
        v['cf-turnstile-response'] = check.token;
      }

      busy = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      setStatus(form, 'info', 'Sending your message.');

      fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v)
      })
        .then(function (r) { return r.json().catch(function () { return {}; })
          .then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); })
        .then(function (res) {
          
          if (res.status === 429 && res.body.error === 'daily limit') {
            setStatus(form, 'warn',
              'The form has taken all the messages it can for today. Your '
              + 'message is below. Please email it to us directly and we will '
              + 'pick it up.');
            showFallback(form, v);
            return;
          }
          if (res.status === 429) {
            setStatus(form, 'warn',
              'That is a few messages in a short time, so this one was held. '
              + 'Give it a little while and try again, or email us directly.');
            showFallback(form, v);
            return;
          }
          if (res.status === 403 && res.body.error === 'verification failed') {
            setStatus(form, 'warn',
              'The spam check did not go through. It has been reset, so please '
              + 'press send again. If it keeps failing, email us directly.');
            showFallback(form, v);
            return;
          }
          if (!res.ok || !res.body.ok) throw new Error(res.body.error || 'failed');
          form.querySelectorAll('input, textarea, select').forEach(function (el) {
            if (el.type !== 'hidden') el.value = '';
          });
          
          setStatus(form, 'good',
            'Thank you. Your message came through, and someone will reply to '
            + 'you directly.');
        })
        .catch(function () {
          
          setStatus(form, 'error',
            'That did not send, and we would rather tell you than lose your message. '
            + 'Please email us directly and we will pick it up.');
          var wrap = form.querySelector('[data-lead-fallback]');
          var out = form.querySelector('[data-lead-copy]');
          if (out) out.value = plainText(v);
          if (wrap) wrap.hidden = false;
        })
        .then(function () {
          
          resetCheck(check);
          busy = false;
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('[data-lead-form]');
    if (forms.length) loadTurnstile();
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
