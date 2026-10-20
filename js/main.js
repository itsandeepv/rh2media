/* ==========================================================================
   RH2 Media — main.js (vanilla JS, no libraries)
   ========================================================================== */

/* ==========================================================================
   CONFIG — EDIT YOUR BUSINESS DETAILS HERE
   --------------------------------------------------------------------------
   These values are applied at runtime to every element marked with
   data-config="…" (text) or data-config-href="…" (links).
   The same details are also written in the static HTML (look for
   <!-- EDIT: --> comments) so search engines can read them without JS.
   Update both places, or run a find-and-replace across the project.
   ========================================================================== */
const CONFIG = {
  phoneDisplay: '+91 88825 80503',         // primary number, shown on screen
  phoneTel: '+918882580503',               // primary number, used in tel: links (no spaces/dashes)
  phone2Display: '+91 93112 61955',        // secondary number, shown on screen
  phone2Tel: '+919311261955',             // secondary number, used in tel: links
  whatsapp: '918882580503',               // WhatsApp (primary): country code + number, digits only
  whatsappMessage: "Hi RH2 Media, I'd like a free consultation.",
  email: 'hello@rh2media.in',
  address: 'Palam Colony, New Delhi - 110077',
  social: {
    instagram: 'https://www.instagram.com/',  // TODO: add your profile URLs
    facebook: 'https://www.facebook.com/',
    linkedin: 'https://www.linkedin.com/',
    youtube: 'https://www.youtube.com/',
    x: 'https://x.com/',
  },

  /* CONTACT FORM → EMAIL (no backend / no API needed) ----------------------
     Forms are emailed to the admin through EmailJS (https://www.emailjs.com),
     called with a plain fetch — no SDK, no server code.
     TODO — one-time setup (≈10 minutes, full steps in README → "Contact form email"):
       1. Create a free EmailJS account.
       2. Email Services → Add New Service → "SMTP server" (enter your SMTP
          host, port, username, password) — or Gmail / Outlook / Zoho.
       3. Email Templates → Create → paste /emailjs/admin-notification.html
          (and optionally /emailjs/auto-reply.html as the Auto-Reply).
       4. Copy the three IDs below. In Account → Security, restrict the
          allowed domain to your website.
     Until these are filled in, forms show a clear "not connected yet"
     message with phone/WhatsApp alternatives — never a fake success.
     ---------------------------------------------------------------------- */
  emailjs: {
    serviceId: '',   // e.g. 'service_ab12cd3'
    templateId: '',  // e.g. 'template_x9y8z7'
    publicKey: '',   // Account → General → Public Key
  },
};

/* ========================================================================== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Apply CONFIG ---------- */
function applyConfig() {
  const text = { phone: CONFIG.phoneDisplay, phone2: CONFIG.phone2Display, email: CONFIG.email, address: CONFIG.address };
  // Only touch the DOM when a value actually differs (avoids needless style/layout work)
  $$('[data-config]').forEach((el) => {
    const v = text[el.dataset.config];
    if (v && el.textContent !== v) el.textContent = v;
  });
  const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
  const hrefs = { tel: `tel:${CONFIG.phoneTel}`, tel2: `tel:${CONFIG.phone2Tel}`, mailto: `mailto:${CONFIG.email}`, whatsapp: wa, ...CONFIG.social };
  $$('[data-config-href]').forEach((el) => {
    const v = hrefs[el.dataset.configHref];
    if (v && el.getAttribute('href') !== v) el.setAttribute('href', v);
  });
  const year = String(new Date().getFullYear());
  $$('[data-year]').forEach((el) => { if (el.textContent !== year) el.textContent = year; });
}

/* ---------- Header: transparent → solid ---------- */
function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  const forceSolid = document.body.hasAttribute('data-solid-header');
  const update = () => header.classList.toggle('is-solid', forceSolid || window.scrollY > 24);
  requestAnimationFrame(update); // don't force a synchronous layout during start-up
  window.addEventListener('scroll', update, { passive: true });
}

/* ---------- Services dropdown (keyboard accessible) ---------- */
function initDropdown() {
  $$('[data-dropdown]').forEach((dd) => {
    const toggle = $('[data-dropdown-toggle]', dd);
    const panel = $('[data-dropdown-panel]', dd);
    const items = () => $$('a', panel);
    let hoverTimer;

    const open = (focusFirst = false) => {
      dd.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      $('svg', toggle).style.transform = 'rotate(180deg)';
      if (focusFirst) items()[0]?.focus();
    };
    const close = (returnFocus = false) => {
      dd.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      $('svg', toggle).style.transform = '';
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => (dd.classList.contains('is-open') ? close() : open()));
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(true); }
    });
    panel.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    });
    dd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dd.classList.contains('is-open')) close(true);
    });
    dd.addEventListener('focusout', (e) => {
      if (!dd.contains(e.relatedTarget)) close();
    });
    // Hover intent for mouse users
    dd.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(hoverTimer);
      open();
    });
    dd.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      hoverTimer = setTimeout(() => close(), 180);
    });
    document.addEventListener('click', (e) => {
      if (!dd.contains(e.target)) close();
    });
  });
}

/* ---------- Mobile drawer (focus-trapped) ---------- */
function initDrawer() {
  const drawer = $('[data-drawer]');
  const overlay = $('[data-drawer-overlay]');
  const openBtn = $('[data-drawer-open]');
  if (!drawer || !openBtn) return;
  const focusables = () => $$('a[href], button:not([disabled])', drawer);

  const open = () => {
    drawer.inert = false;
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => focusables()[0]?.focus(), 50);
  };
  const close = () => {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    drawer.inert = true;
    openBtn.focus();
  };

  openBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  $$('[data-drawer-close]', drawer).forEach((b) => b.addEventListener('click', close));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => drawer.classList.contains('is-open') && close()));
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const f = focusables();
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => {
    if (m.matches && drawer.classList.contains('is-open')) close();
  });
}

/* ---------- Scroll reveal (staggered) ---------- */
function initReveal() {
  $$('[data-reveal-stagger]').forEach((group) => {
    const step = Number(group.dataset.revealStagger) || 90;
    $$(':scope > [data-reveal]', group).forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * step}ms`));
  });
  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reducedMotion.matches) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Count-up stats (only when visible) ---------- */
function initCountUp() {
  const els = $$('[data-count]');
  if (!els.length) return;
  const format = (el, n) => {
    const dec = Number(el.dataset.decimals || 0);
    const v = n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    el.textContent = `${el.dataset.prefix || ''}${v}${el.dataset.suffix || ''}`;
  };
  const run = (el) => {
    const target = Number(el.dataset.count);
    if (reducedMotion.matches) return format(el, target);
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      format(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  els.forEach((el) => format(el, 0));
  if (!('IntersectionObserver' in window)) return els.forEach(run);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Tabs (WAI-ARIA, arrow keys) ---------- */
function initTabs() {
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });
}

/* ---------- Accordion (one open at a time) ---------- */
function initAccordion() {
  $$('[data-accordion]').forEach((root) => {
    const btns = $$('[data-acc-btn]', root);
    const set = (btn, open) => {
      btn.setAttribute('aria-expanded', String(open));
      document.getElementById(btn.getAttribute('aria-controls'))?.classList.toggle('is-open', open);
    };
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const willOpen = btn.getAttribute('aria-expanded') !== 'true';
        btns.forEach((b) => set(b, false));
        if (willOpen) set(btn, true);
      });
    });
  });
}

/* ---------- Testimonial slider (swipe + autoplay) ---------- */
function initSlider() {
  $$('[data-slider]').forEach((root) => {
    const track = $('[data-slider-track]', root);
    const slides = $$('[data-slide]', track);
    const prev = $('[data-slider-prev]', root);
    const next = $('[data-slider-next]', root);
    const dotsWrap = $('[data-slider-dots]', root);
    let index = 0;
    let perView = 1;
    let timer = null;
    let paused = false;

    const maxIndex = () => Math.max(0, slides.length - perView);
    const measure = () => {
      perView = Math.max(1, Math.round(track.parentElement.clientWidth / slides[0].getBoundingClientRect().width));
      buildDots();
      go(Math.min(index, maxIndex()), false);
    };
    const buildDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (let i = 0; i <= maxIndex(); i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'slider-dot';
        b.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
        b.addEventListener('click', () => { go(i); restart(); });
        dotsWrap.append(b);
      }
    };
    const go = (i, animate = true) => {
      index = (i + maxIndex() + 1) % (maxIndex() + 1);
      track.style.transitionDuration = animate ? '' : '0ms';
      track.style.transform = `translateX(-${slides[index].offsetLeft}px)`;
      slides.forEach((s, n) => {
        const visible = n >= index && n < index + perView;
        s.setAttribute('aria-hidden', String(!visible));
        s.inert = !visible;
      });
      $$('.slider-dot', dotsWrap || root).forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      if (reducedMotion.matches || paused || timer) return;
      timer = setInterval(() => go(index + 1), 6000);
    };
    const restart = () => { stop(); start(); };

    prev?.addEventListener('click', () => { go(index - 1); restart(); });
    next?.addEventListener('click', () => { go(index + 1); restart(); });
    root.addEventListener('mouseenter', () => { paused = true; stop(); });
    root.addEventListener('mouseleave', () => { paused = false; start(); });
    root.addEventListener('focusin', () => { paused = true; stop(); });
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { paused = false; start(); } });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });

    // Swipe (pointer events)
    let startX = null;
    let deltaX = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX; deltaX = 0;
      stop();
    });
    track.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      deltaX = e.clientX - startX;
      if (Math.abs(deltaX) > 6) {
        track.style.transitionDuration = '0ms';
        track.style.transform = `translateX(${-slides[index].offsetLeft + deltaX}px)`;
      }
    });
    const end = () => {
      if (startX === null) return;
      const threshold = 50;
      if (deltaX < -threshold) go(index + 1);
      else if (deltaX > threshold) go(index - 1);
      else go(index);
      startX = null;
      if (!paused) start();
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('pointerleave', end);

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
    measure();
    start();
  });
}

/* ---------- Back to top ---------- */
function initToTop() {
  const btn = $('[data-to-top]');
  if (!btn) return;
  const update = () => btn.classList.toggle('is-visible', window.scrollY > 600);
  update();
  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    $('#main')?.focus({ preventScroll: true });
  });
}

/* ---------- Forms: validation + real POST ---------- */
const validators = {
  required: (v) => v.trim().length > 0,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  // Indian mobile: 10 digits starting 6–9, optional +91 / 0 prefix
  phone: (v) => /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')),
};
const messages = {
  required: 'This field is required.',
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid 10-digit Indian mobile number.',
};

function validateField(field) {
  const rules = [];
  if (field.required) rules.push('required');
  if (field.type === 'email') rules.push('email');
  if (field.dataset.validate === 'phone') rules.push('phone');
  const value = field.value || '';
  let error = '';
  for (const r of rules) {
    if (r !== 'required' && !value.trim()) continue;
    if (!validators[r](value)) { error = field.dataset.msg || messages[r]; break; }
  }
  const errEl = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid', String(Boolean(error)));
  if (errEl) {
    errEl.textContent = error;
    errEl.hidden = !error;
  }
  return !error;
}

function initForms() {
  $$('form[data-form]').forEach((form) => {
    const status = $('[data-form-status]', form);
    const submit = $('[type="submit"]', form);
    const fields = $$('input, select, textarea', form).filter((f) => f.type !== 'hidden' && f.name !== 'botcheck');

    fields.forEach((f) => {
      f.addEventListener('blur', () => f.value && validateField(f));
      f.addEventListener('input', () => f.getAttribute('aria-invalid') === 'true' && validateField(f));
    });

    const showStatus = (state, html) => {
      if (!status) return;
      status.hidden = false;
      status.dataset.state = state;
      status.innerHTML = html;
      status.focus();
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const results = fields.map(validateField);
      if (results.includes(false)) {
        fields[results.indexOf(false)].focus();
        return;
      }

      const waLink = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
      const fallback = `Please call <a class="underline" href="tel:${CONFIG.phoneTel}">${CONFIG.phoneDisplay}</a>, email <a class="underline" href="mailto:${CONFIG.email}">${CONFIG.email}</a> or <a class="underline" href="${waLink}" target="_blank" rel="noopener">message us on WhatsApp</a>.`;

      const { serviceId, templateId, publicKey } = CONFIG.emailjs;
      if (!serviceId || !templateId || !publicKey) {
        // TODO: fill CONFIG.emailjs (top of this file) to make forms live.
        showStatus('error', `<strong>This form isn't connected yet.</strong> Your message has not been sent. ${fallback}`);
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      if (data.botcheck) return; // honeypot: bots fill hidden fields
      delete data.botcheck;
      const digits = String(data.phone || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      // These names match the {{placeholders}} in /emailjs/*.html
      const params = {
        name: data.name || '',
        email: data.email || '',
        reply_to: data.email || '',
        phone: digits ? `+91 ${digits}` : '',
        phone_link: digits ? `tel:+91${digits}` : '',
        whatsapp_link: digits ? `https://wa.me/91${digits}` : '',
        service: data.service || 'Not specified',
        budget: data.budget || 'Not specified',
        message: data.message || '—',
        form_name: data.form || 'Website form',
        page_url: location.href,
        submitted_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST',
      };

      submit.disabled = true;
      const label = submit.innerHTML;
      submit.innerHTML = 'Sending…';
      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: params }),
        });
        if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text().catch(() => '')}`);
        form.reset();
        fields.forEach((f) => f.removeAttribute('aria-invalid'));
        showStatus('success', "<strong>Thank you — we've got your enquiry.</strong> Our team will get back to you within one working day.");
      } catch (err) {
        console.error('[RH2 form]', err);
        showStatus('error', `<strong>Sorry, something went wrong and your message wasn't sent.</strong> ${fallback}`);
      } finally {
        submit.disabled = false;
        submit.innerHTML = label;
      }
    });
  });
}

/* ---------- Blog listing: filter chips + search + pagination ---------- */
function initBlogList() {
  const root = $('[data-blog-list]');
  if (!root) return;
  const cards = $$('[data-post]', root);
  const chips = $$('[data-filter]');
  const search = $('[data-blog-search]');
  const empty = $('[data-blog-empty]');
  const pager = $('[data-pagination]');
  const count = $('[data-blog-count]');
  const perPage = Number(root.dataset.perPage) || 6;
  let category = 'all';
  let query = '';
  let page = 1;

  const render = () => {
    const matches = cards.filter((c) => {
      const okCat = category === 'all' || c.dataset.category === category;
      const okQ = !query || c.textContent.toLowerCase().includes(query);
      return okCat && okQ;
    });
    const pages = Math.max(1, Math.ceil(matches.length / perPage));
    page = Math.min(page, pages);
    cards.forEach((c) => (c.hidden = true));
    matches.slice((page - 1) * perPage, page * perPage).forEach((c) => (c.hidden = false));
    if (empty) empty.hidden = matches.length > 0;
    if (count) count.textContent = `${matches.length} article${matches.length === 1 ? '' : 's'}`;
    if (!pager) return;
    pager.innerHTML = '';
    const mk = (label, target, opts = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'page-btn';
      b.innerHTML = label;
      if (opts.aria) b.setAttribute('aria-label', opts.aria);
      if (opts.current) b.setAttribute('aria-current', 'page');
      b.disabled = Boolean(opts.disabled);
      b.addEventListener('click', () => { page = target; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      pager.append(b);
    };
    mk('<svg class="size-4" aria-hidden="true"><use href="#i-chevron-l"/></svg>', page - 1, { aria: 'Previous page', disabled: page === 1 });
    for (let i = 1; i <= pages; i++) mk(String(i), i, { aria: `Page ${i}`, current: i === page });
    mk('<svg class="size-4" aria-hidden="true"><use href="#i-chevron-r"/></svg>', page + 1, { aria: 'Next page', disabled: page === pages });
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      category = chip.dataset.filter;
      page = 1;
      render();
    });
  });
  search?.addEventListener('input', () => { query = search.value.trim().toLowerCase(); page = 1; render(); });
  render();
}

/* ---------- Article: table of contents from h2s ---------- */
function initToc() {
  const toc = $('[data-toc]');
  const article = $('[data-article]');
  if (!toc || !article) return;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const heads = $$('h2', article);
  if (!heads.length) { toc.closest('[data-toc-wrap]')?.remove(); return; }
  const ol = document.createElement('ol');
  ol.className = 'grid';
  heads.forEach((h) => {
    if (!h.id) h.id = slug(h.textContent);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    ol.append(li);
  });
  toc.append(ol);
  const links = $$('a', toc);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l.hash === `#${e.target.id}`));
    });
  }, { rootMargin: '0px 0px -70% 0px' });
  heads.forEach((h) => io.observe(h));
}

/* ---------- Share buttons ---------- */
function initShare() {
  $$('[data-share]').forEach((btn) => {
    const url = encodeURIComponent($('link[rel="canonical"]')?.href || location.href);
    const title = encodeURIComponent(document.title);
    const targets = {
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      x: `https://x.com/intent/post?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    const type = btn.dataset.share;
    if (targets[type]) {
      btn.setAttribute('href', targets[type]);
      return;
    }
    if (type === 'copy') {
      btn.addEventListener('click', async () => {
        const label = $('[data-share-label]', btn);
        try {
          await navigator.clipboard.writeText(decodeURIComponent(url));
          if (label) label.textContent = 'Link copied';
        } catch {
          if (label) label.textContent = 'Copy failed';
        }
        setTimeout(() => label && (label.textContent = 'Copy link'), 2000);
      });
    }
  });
}

/* ---------- Map: load Google Maps iframe on request (faster, more private) ---------- */
function initMap() {
  $$('[data-map]').forEach((wrap) => {
    const btn = $('[data-map-load]', wrap);
    const tpl = $('[data-map-template]', wrap);
    btn?.addEventListener('click', () => {
      wrap.append(tpl.content.cloneNode(true));
      btn.closest('div.absolute')?.remove();
      $('iframe', wrap)?.focus();
    });
  });
}

/* ---------- Boot ---------- */
// Critical, above-the-fold behaviour runs immediately; the rest waits for idle
// time so the first paint and first input stay fast.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initReveal();
  initCountUp();
  initDropdown();
  initDrawer();
  initTabs();
  initAccordion();
  initForms();
  initBlogList();
  idle(() => {
    applyConfig();
    initToTop();
    initSlider();
    initToc();
    initShare();
    initMap();
  });
});
