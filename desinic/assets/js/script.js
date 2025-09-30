'use strict';

(() => {
  /* ========= Helpers ========= */
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const cssn = (name, el = document.documentElement, fb = 0) => {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fb;
  };
  const on = (t, type, fn, opt) => t && t.addEventListener(type, fn, opt);

  /* ========= Scroll en recarga / hash (no forzar top salvo #hash) ========= */
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  const clearHashOnFirstPaint = () => {
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
      window.scrollTo(0, 0);
    }
  };
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', clearHashOnFirstPaint, { once: true })
    : clearHashOnFirstPaint();

  /* ========= Navbar / Overlay / Header sticky ========= */
  const header   = $('[data-header]');
  const navbar   = $('[data-navbar]');
  const overlay  = $('[data-overlay]');
  const openBtn  = $('[data-nav-open-btn]');
  const closeBtn = $('[data-nav-close-btn]');
  const goTopBtn = $('[data-go-top]');

  /* --- helpers de pintado del logo --- */
  function paintLogoObject(obj, color){
    const doc = obj && obj.contentDocument;
    if (!doc) return;
    doc.documentElement.style.setProperty('--stroke', color);
    doc.querySelectorAll('.oval').forEach(el => el.style.stroke = color);
  }
  function paintInlineLogo(host, color){
    const svg = host && (host.matches?.('svg') ? host : host.querySelector?.('svg'));
    if (!svg) return;
    svg.querySelectorAll('.oval').forEach(el => el.style.stroke = color);
  }

  /* Inyecta logo.html dentro del contenedor móvil si está vacío */
  function ensureMobileLogo(){
    const holder = $('#brandLogoMobile');
    if (!holder) return;
    const already = holder.querySelector('object.brand-logo');
    if (already) return;

    const obj = document.createElement('object');
    obj.setAttribute('data', './logo.html'); // ajusta si tu ruta real es distinta
    obj.setAttribute('type', 'text/html');
    obj.setAttribute('class', 'brand-logo');
    obj.setAttribute('aria-label', 'Logo animado');
    obj.addEventListener('load', () => repaintBrand(), { once:true });
    holder.appendChild(obj);
  }

  /* Devuelve el color que debe tener la marca ahora mismo */
  function currentBrandColor(){
    const brandBlue = getComputedStyle(document.documentElement)
                      .getPropertyValue('--st-patricks-blue').trim() || '#1860AE';
    const white = '#fff';
    const scrolled = header?.classList.contains('active');
    const menuOpen = header?.classList.contains('menu-open');
    if (menuOpen) return brandBlue;      // Menú abierto: SIEMPRE azul
    return scrolled ? brandBlue : white; // Menú cerrado: arriba blanco, con scroll azul
  }

  /* Pinta logo (desktop y móvil) + wordmark */
  function repaintBrand(){
    const color = currentBrandColor();

    // <object> del logo (desktop + móvil)
    const objects = $$('object.brand-logo');
    objects.forEach(obj => {
      if (obj?.contentDocument) paintLogoObject(obj, color);
      else obj?.addEventListener('load', () => paintLogoObject(obj, color), { once:true });
    });

    // variantes inline (por si existieran)
    $$('#brandLogo svg, #brandLogoMobile svg').forEach(svg => paintInlineLogo(svg, color));

    // texto “GROWTH NATIVE” (desktop + móvil + fallback .logo.brand)
    [
      ...$$('#brandLogo .brand-text'),
      ...$$('.navbar-top .brand-text'),
      ...$$('.logo.brand .brand-text'),
      ...$$('.logo.brand')
    ].forEach(el => { el.style.color = color; });
  }

  /* Abrir/cerrar menú móvil */
  function openNav(){
    navbar?.classList.add('active');
    overlay?.classList.add('active');
    header?.classList.add('menu-open'); // fuerza azul marca
    ensureMobileLogo();
    repaintBrand();
    setTimeout(repaintBrand, 0);        // por si el <object> tarda en montar su DOM
  }
  function closeNav(){
    navbar?.classList.remove('active');
    overlay?.classList.remove('active');
    header?.classList.remove('menu-open');
    repaintBrand();
  }

  on(openBtn,  'click', openNav);
  on(closeBtn, 'click', closeNav);
  on(overlay,  'click', closeNav);
  $$('[data-navbar-link]').forEach(a => on(a, 'click', closeNav));
  on(window, 'keydown', e => (e.key === 'Escape') && closeNav());

  /* Sticky + color al hacer scroll */
  on(window, 'scroll', () => {
    const active = window.scrollY >= 400;
    header?.classList.toggle('active', active);
    goTopBtn?.classList.toggle('active', active);
    repaintBrand();
  }, { passive: true });

  /* Primer pintado */
  on(document, 'DOMContentLoaded', () => { ensureMobileLogo(); repaintBrand(); }, { once:true });
  on(window, 'load', repaintBrand, { once:true });
  on(window, 'resize', () => setTimeout(repaintBrand, 60), { passive:true });

  /* ========= Smooth scroll con offset de header ========= */
  on(document, 'click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    const headerH = header?.offsetHeight || 0;
    const y = target.getBoundingClientRect().top + window.pageYOffset - headerH - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  /* ========= Dropdown de Servicios ========= */
  (function dropdown() {
    const toggles = $$('.navbar .dropdown-toggle');
    const closeAll = () => $$('.navbar .has-dropdown.open').forEach(li => li.classList.remove('open'));
    toggles.forEach(btn => on(btn, 'click', (e) => {
      e.preventDefault();
      const li = btn.closest('.has-dropdown');
      const open = li.classList.contains('open');
      closeAll(); if (!open) li.classList.add('open');
    }));
    on(document, 'click', e => { if (!e.target.closest('.navbar .has-dropdown')) closeAll(); });
    $$('.navbar .dropdown .dropdown-link').forEach(a => on(a, 'click', closeAll));
  }());

  /* ========= Formulario de contacto ========= */
  (function contactForm(){
    const form    = $('#contact-form'); if (!form) return;
    const rgpd    = $('#rgpd');
    const sendBtn = $('#sendBtn');
    const fb      = $('#contact-feedback');
    const serviceFromQuery = new URLSearchParams(location.search).get('service') || '';
    const serviceField = $('#serviceField');
    const messageEl = $('#message');

    if (serviceField && !serviceField.value) serviceField.value = serviceFromQuery;
    if (serviceFromQuery && messageEl && !messageEl.value.trim()) {
      messageEl.value = `[Interés: ${serviceFromQuery}] `;
    }
    const toggleBtn = () => { if (sendBtn && rgpd) sendBtn.disabled = !rgpd.checked; };
    on(rgpd, 'change', toggleBtn); toggleBtn();

    on(form, 'submit', async (e) => {
      e.preventDefault();
      form.classList.add('was-validated');
      if (fb) { fb.style.display = 'none'; fb.className = ''; }
      if (!form.checkValidity()) {
        if (fb){ fb.textContent = 'Revisa los campos marcados en rojo.'; fb.classList.add('error'); fb.style.display='block'; }
        return;
      }
      const data = new FormData(form);
      if (data.get('_hp')) return;
      const endpoint = data.get('_endpoint');
      const serviceValue = (data.get('service')?.toString().trim()) || serviceFromQuery;
      const payload = {
        name:    (data.get('name')    || '').toString().trim(),
        email:   (data.get('email')   || '').toString().trim(),
        phone:   (data.get('phone')   || '').toString().trim(),
        company: (data.get('company') || '').toString().trim(),
        message: (data.get('message') || '').toString().trim(),
        service: serviceValue || '',
        source:  'levantiq-contacto'
      };
      try {
        const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw 0;
        if (fb){ fb.textContent='¡Gracias! Hemos recibido tu mensaje.'; fb.classList.add('success'); fb.style.display='block'; }
        form.reset(); toggleBtn();
        if (serviceFromQuery && messageEl) messageEl.value = `[Interés: ${serviceFromQuery}] `;
        if (serviceField) serviceField.value = serviceFromQuery;
        if (typeof gtag === 'function') gtag('event','lead_submit',{ form: form.id||'contacto', service: serviceValue||'(none)' });
      } catch {
        if (fb){ fb.textContent='Hubo un problema al enviar. Inténtalo de nuevo.'; fb.classList.add('error'); fb.style.display='block'; }
      }
    });
  }());

  /* ========= Carrusel ========= */
  (function carousel(){
    const roots = $$('.carousel'); if (!roots.length) return;

    roots.forEach(root => {
      const track     = $('.carousel-track', root);
      const originals = $$('.carousel-slide', root);
      const prevBtn   = $('.carousel-btn.prev', root);
      const nextBtn   = $('.carousel-btn.next', root);
      if (!track || !originals.length) return;

      const container = root.closest('.container');
      const toggleBtn = container ? $('[data-view-toggle]', container) : null;
      track.style.scrollBehavior = 'auto';
      track.style.webkitOverflowScrolling = 'auto';
      track.style.overflowX = 'scroll';

      const GAP = parseFloat(getComputedStyle(track).gap || '24') || 24;

      function cloneUntilWideEnough(){
        if (track.dataset.cloned === '1') return;
        const visible = track.clientWidth || root.clientWidth || 0;
        let current = track.scrollWidth;
        while (current < visible * 3 + 400) {
          originals.forEach(sl => {
            const c = sl.cloneNode(true);
            c.setAttribute('aria-hidden','true');
            track.appendChild(c);
          });
          current = track.scrollWidth;
        }
        track.dataset.cloned = '1';
      }

      let period = 0;
      function measurePeriod(){
        const slides = $$('.carousel-slide', track);
        const first  = originals[0];
        const firstClone = slides.find((s,i) => i>0 && s.getAttribute('aria-hidden') === 'true');
        period = (first && firstClone) ? Math.max(0, firstClone.offsetLeft - first.offsetLeft) : 0;
        if (!period){
          period = originals.reduce((acc, sl, i) => acc + sl.getBoundingClientRect().width + (i<originals.length-1?GAP:0), 0);
        }
      }
      const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const clamp     = x => Math.min(Math.max(0, x), maxScroll());
      const wrapBy    = x => {
        const stride = Math.max(1, Math.min(period || 1, Math.max(1, maxScroll())));
        return clamp(((x % stride) + stride) % stride);
      };

      let speed = 1.0, rafId = 0, paused = false;
      const tick = () => {
        if (!paused && period > 0 && !root.classList.contains('is-grid')) {
          track.scrollLeft = wrapBy(track.scrollLeft + speed);
        }
        rafId = requestAnimationFrame(tick);
      };
      const start = () => !rafId && (rafId = requestAnimationFrame(tick));
      const stop  = () => rafId && (cancelAnimationFrame(rafId), rafId = 0);

      const RESUME = 4000; let resumeTimer = 0;
      const pause = () => { paused = true; if (resumeTimer) clearTimeout(resumeTimer); };
      const resumeAfter = (d=RESUME) => { if (resumeTimer) clearTimeout(resumeTimer); resumeTimer = setTimeout(()=>{paused=false;resumeTimer=0;}, d); };

      function centerTo(targetCenter){
        const slides = $$('.carousel-slide', track);
        let bestC = 0, bestD = Infinity;
        slides.forEach(sl => {
          const c = sl.offsetLeft + sl.offsetWidth/2;
          const d = Math.abs(c - targetCenter);
          if (d < bestD){ bestD = d; bestC = c; }
        });
        return wrapBy(bestC - track.clientWidth/2);
      }
      function jump(dir){
        if (!period || root.classList.contains('is-grid')) return;
        pause();
        const w = originals[0].getBoundingClientRect().width || (track.clientWidth * .9);
        const step = w + GAP;
        const center = track.scrollLeft + track.clientWidth/2;
        track.scrollLeft = centerTo(center + dir*step);
        resumeAfter();
      }
      on(prevBtn, 'click', () => jump(-1));
      on(nextBtn, 'click', () => jump(+1));

      function setGrid(onGrid){
        root.classList.add('switching');
        if (onGrid) paused = true;
        root.classList.toggle('is-grid', onGrid);
        if (!onGrid){
          track.scrollLeft = 0; measurePeriod(); paused = false;
          setTimeout(scrollToHeading, 320);
        }
        if (toggleBtn){
          toggleBtn.setAttribute('aria-pressed', String(onGrid));
          const icon = $('ion-icon', toggleBtn);
          icon && icon.setAttribute('name', onGrid ? 'albums-outline' : 'grid-outline');
          toggleBtn.title = onGrid ? 'Volver al carrusel' : 'Ver todos';
        }
        setTimeout(()=>root.classList.remove('switching'), 300);
      }
      on(toggleBtn, 'click', () => setGrid(!root.classList.contains('is-grid')));

      let rt; on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(()=>{ stop(); track.scrollLeft=0; measurePeriod(); start(); },150); }, { passive:true });

      const scrollToHeading = () => {
        const t = $('#ia-servicios') || $('#servicios-web') || $('#servicios-mkt') ||
                  $$('.section-title.underline').find(h2 => /cómo lo hacemos/i.test(h2.textContent.trim()));
        if (!t) return;
        const headerH = header?.offsetHeight || 0;
        const y = t.getBoundingClientRect().top + window.pageYOffset - headerH - 16;
        window.scrollTo({ top: y, behavior: 'smooth' });
      };

      const init = () => { cloneUntilWideEnough(); measurePeriod(); start(); };
      (document.readyState === 'complete') ? init() : on(window, 'load', init);
    });
  }());

  /* ========= Contadores ========= */
  (function counters(){
    const els = $$('.counter'); if (!els.length) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function animate(el, to, {prefix='', suffix='', duration=1200} = {}){
      if (reduce){ el.textContent = `${prefix}${to}${suffix}`; return; }
      const startTime = performance.now();
      const loop = (now) => {
        const p = Math.min(1, (now - startTime) / duration);
        const val = Math.round(to * easeOutCubic(p));
        el.textContent = `${prefix}${val}${suffix}`;
        if (p < 1) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    const section = $('#about-ia') || document;
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)){
        els.forEach(el => animate(el, parseInt(el.dataset.target || '0', 10), {
          prefix: el.dataset.prefix || '', suffix: el.dataset.suffix || '', duration: 1300
        }));
        obs.disconnect();
      }
    }, { threshold: .35 });
    io.observe(section);
  }());

  /* ========= Servicios: Dispersión → Orden ========= */
  (function servicesScatter(){
    const root = $('#services .service-list'); if (!root) return;
    const cards = $$('.service-card', root);  if (!cards.length) return;
    const rand = (a,b) => Math.random()*(b-a)+a;
    const dirs = [
      { x:[-140,-80],  y:[-60,60] },
      { x:[  80,140],  y:[-60,60] },
      { x:[ -60, 60],  y:[-160,-90] },
      { x:[ -60, 60],  y:[  90,160] }
    ];
    cards.forEach((c,i) => {
      const d = dirs[Math.floor(rand(0, dirs.length))];
      c.style.setProperty('--tx', `${rand(d.x[0], d.x[1])}px`);
      c.style.setProperty('--ty', `${rand(d.y[0], d.y[1])}px`);
      c.style.setProperty('--rot', `${rand(-8,8)}deg`);
      c.style.setProperty('--scale', (rand(.92,1.08)).toFixed(3));
      c.style.setProperty('--dur', `${rand(1.4,2.0).toFixed(3)}s`);
      c.style.setProperty('--delay', `${(i*rand(.08,.16)).toFixed(3)}s`);
      c.style.setProperty('--ease', 'cubic-bezier(.22,.8,.2,1)');
    });
    root.classList.add('scatter');
    const target = $('#services .section-title') || root;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some(e=>e.isIntersecting)) return;
      root.classList.add('in');
      const total = Math.max(...cards.map(c => {
        const d = parseFloat(getComputedStyle(c).getPropertyValue('--dur')) || 1;
        const l = parseFloat(getComputedStyle(c).getPropertyValue('--delay')) || 0;
        return d + l;
      }));
      setTimeout(()=>root.classList.remove('scatter'), total*1000 + 60);
      io.disconnect();
    }, { threshold:.25 });
    io.observe(target);
  }());

  /* ========= HERO: entrada + typing del título + revelado ========= */
  (function heroIntro(){
    const hero    = $('.hero'); if (!hero) return;
    const titleEl = $('.hero .hero-title'); if (!titleEl) return;

    const wrapChars = (el) => {
      if (el.dataset.typed === '1') return;
      const text = el.textContent; el.textContent = '';
      const frag = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = text[i];
        frag.appendChild(s);
      }
      el.appendChild(frag);
      el.dataset.typed = '1';
    };

    const typeTitle = (el) => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const chars = $$('.char', el); if (!chars.length) return;
      if (reduce){ chars.forEach(c => c.classList.add('on')); return; }
      const step = cssn('--hero-typing-speed', document.documentElement, 36);
      let i = 0;
      (function tick(){
        chars[i].classList.add('on');
        if (++i < chars.length) setTimeout(tick, step);
      })();
    };

    const revealRest = () => { hero.classList.add('text-reveal'); };
    wrapChars(titleEl);

    const start = () => {
      if (hero.dataset.variant === 'swap') hero.classList.add('alt');
      hero.classList.add('pre');
      requestAnimationFrame(() => {
        void hero.offsetWidth;
        hero.classList.add('in');
        hero.classList.remove('pre');

        const moveDur = cssn('--hero-dur', document.querySelector('.hero') || document.documentElement, 0.95);
        const moveMs  = Math.max(0, moveDur * 1000);

        const ratio     = Math.min(1, Math.max(0, cssn('--hero-type-delay-ratio', document.documentElement, 0.35)));
        const typeDelay = Math.max(60, Math.round(moveMs * ratio));
        setTimeout(() => { typeTitle(titleEl); }, typeDelay);
        setTimeout(() => { revealRest(); }, moveMs + 90);
      });
    };

    (document.readyState === 'loading')
      ? on(document, 'DOMContentLoaded', start, { once:true })
      : start();
  }());

  /* === ABOUT · animar <strong> desde posiciones aleatorias === */
  (() => {
    const section = document.querySelector('#about');
    if (!section) return;
    const strongs = Array.from(section.querySelectorAll('.about-text strong'));
    if (!strongs.length) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    strongs.forEach(s => {
      const rx = (Math.random()*120 - 60).toFixed(1) + 'vw';
      const ry = (Math.random()*80  - 40).toFixed(1) + 'vh';
      const rot = (Math.random()*24 - 12).toFixed(1) + 'deg';
      s.style.setProperty('--from-x', rx);
      s.style.setProperty('--from-y', ry);
      s.style.setProperty('--rot',    rot);
    });

    const io = new IntersectionObserver((entries, obs) => {
      if (!entries.some(e => e.isIntersecting)) return;
      const base = 120;
      strongs.forEach(s => {
        const jitter = Math.random() * 420;
        const delay  = reduce ? 0 : base + jitter;
        setTimeout(() => s.classList.add('in'), delay);
      });
      obs.disconnect();
    }, { threshold: 0.35 });

    io.observe(section);
  })();

  /* === FEATURES · entrada escalonada + delays aleatorios === */
  (() => {
    const section = document.querySelector('#features');
    if (!section) return;

    const cards = Array.from(section.querySelectorAll('.features-card'));
    if (!cards.length) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver((entries, obs) => {
      if (!entries.some(e => e.isIntersecting)) return;

      cards.forEach((card, i) => {
        const base   = 80 * i;
        const jitter = Math.random() * 220;
        const delay  = reduce ? 0 : base + jitter;
        card.style.transitionDelay = `${delay}ms`;
        card.classList.add('in');
      });

      obs.disconnect();
    }, { threshold: 0.35 });

    io.observe(section);
  })();

})();
