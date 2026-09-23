
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  
  var burger = document.querySelector('.burger');
  var links = document.getElementById('nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.getAttribute('data-open') === 'true';
      links.setAttribute('data-open', String(!open));
      burger.setAttribute('aria-expanded', String(!open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.getAttribute('data-open') === 'true') {
        links.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  if (links) {
    var anchors = Array.prototype.slice.call(links.querySelectorAll('a'));

    anchors.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var page = href.split('#')[0].split('/').pop().toLowerCase() || file;
      if (page === file) { a.setAttribute('aria-current', 'page'); }
    });

    if (hasIO) {
      
      var local = anchors.filter(function (a) {
        var href = a.getAttribute('href') || '';
        if (href.indexOf('#') < 0) { return false; }
        var page = href.split('#')[0].split('/').pop().toLowerCase();
        return (page === '' || page === file);
      });
      var targets = local.map(function (a) {
        return document.getElementById(a.getAttribute('href').split('#')[1]);
      });
      if (targets.some(Boolean)) {
        var navIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) { return; }
            var i = targets.indexOf(entry.target);
            if (i < 0) { return; }
            local.forEach(function (a, j) {
              if (j === i) { a.setAttribute('aria-current', 'true'); }
              else if (a.getAttribute('aria-current') === 'true') {
                a.removeAttribute('aria-current');
              }
            });
          });
        }, { rootMargin: '-45% 0px -45% 0px' });
        targets.forEach(function (t) { if (t) { navIO.observe(t); } });
      }
    }
  }

  
  function wrapWords(node, counter) {
    var parts = node.textContent.split(/(\s+)/);
    var frag = document.createDocumentFragment();
    parts.forEach(function (chunk) {
      if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return; }
      var w = document.createElement('span');
      w.className = 'w';
      var inner = document.createElement('i');
      inner.style.setProperty('--i', counter.n++);
      inner.textContent = chunk;
      w.appendChild(inner);
      frag.appendChild(w);
    });
    node.parentNode.replaceChild(frag, node);
  }

  document.querySelectorAll('.paint').forEach(function (el) {
    var counter = { n: 0 };
    var textNodes = [];
    
    (function walk(parent) {
      Array.prototype.forEach.call(parent.childNodes, function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) { textNodes.push(n); }
        else if (n.nodeType === 1 && !n.classList.contains('mark')) { walk(n); }
      });
    })(el);
    textNodes.forEach(function (n) { wrapWords(n, counter); });
    var mark = el.querySelector('.mark');
    if (mark) { mark.style.setProperty('--i', counter.n); }
  });

  
  var animated = document.querySelectorAll('.paint, .rise, .settle, .hang');
  if (animated.length) {
    if (reduced || !hasIO) {
      animated.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
      animated.forEach(function (el) { io.observe(el); });

      
      window.setTimeout(function () {
        document.querySelectorAll('.paint:not(.in), .rise:not(.in), .settle:not(.in), .hang:not(.in)')
          .forEach(function (el) { el.classList.add('in'); });
      }, 4000);
    }
  }

  
  var drifters = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));
  if (drifters.length && !reduced) {
    var ticking = false;
    var update = function () {
      var vh = window.innerHeight;
      drifters.forEach(function (el) {
        var box = el.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) { return; }
        var p = 1 - (box.top + box.height) / (vh + box.height);
        el.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
      });
      ticking = false;
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  
  
  if (fine && !reduced) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var b = card.getBoundingClientRect();
        card.style.setProperty('--tx', (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
        card.style.setProperty('--ty', (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
      }, { passive: true });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--tx', 0);
        card.style.setProperty('--ty', 0);
      }, { passive: true });
    });
  }

  
  var form = document.getElementById('notify-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var body = [
        'A message from the Art Inside Out website.',
        '',
        'Name: ' + (data.get('name') || 'not given'),
        'Email: ' + (data.get('email') || 'not given'),
        'What they are after: ' + (data.get('about') || 'not given')
      ].join('\n');

      document.getElementById('notify-text').value = body;
      document.getElementById('notify-result').hidden = false;

      window.location.href = 'mailto:kirk@artinside-out.com'
        + '?subject=' + encodeURIComponent('Art Inside Out, from the website')
        + '&body=' + encodeURIComponent(body);
    });

    var copy = document.getElementById('notify-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var box = document.getElementById('notify-text');
        box.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(box.value).then(function () {
            copy.textContent = 'Copied';
          }, function () {
            copy.textContent = ok ? 'Copied' : 'Select the text above and copy it';
          });
        } else {
          copy.textContent = ok ? 'Copied' : 'Select the text above and copy it';
        }
      });
    }
  }

})();
