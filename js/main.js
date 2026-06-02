/* CHR — main.js (refonte premium)
   Header scroll, menu mobile, reveal observer, FAQ */

(() => {
  'use strict';

  /* Header scroll state */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Menu mobile */
  const hamburger = document.querySelector('.nav-hamburger');
  const drawer = document.querySelector('.nav-mobile');
  const drawerClose = document.querySelector('.nav-mobile-close');
  let overlay = document.querySelector('.nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
  }
  const openDrawer = () => {
    drawer?.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
  };
  const closeDrawer = () => {
    drawer?.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
  };
  hamburger?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  /* Reveal observer (étendu : .reveal, .reveal-left, .reveal-right, .reveal-scale) */
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* FAQ search — filtrage instantané */
  const faqSearch = document.querySelector('.faq-search');
  if (faqSearch) {
    const clearBtn = document.querySelector('.faq-search-clear');
    const empty = document.querySelector('.faq-search-empty');
    const allItems = Array.from(document.querySelectorAll('.faq-item'));
    const allTitles = Array.from(document.querySelectorAll('.faq-section-title'));

    const norm = (s) => (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');

    const filter = (q) => {
      const query = norm(q.trim());
      let visibleCount = 0;
      const groupCounts = new Map();

      allItems.forEach(item => {
        const text = norm(item.textContent);
        const match = !query || text.includes(query);
        item.classList.toggle('faq-hidden', !match);
        if (match) {
          visibleCount++;
          const group = item.closest('.faq-list');
          if (group) groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
        }
        if (query && match) item.open = true;
        if (!query) item.open = false;
      });

      allTitles.forEach(title => {
        const list = title.nextElementSibling;
        if (!list || !list.classList.contains('faq-list')) return;
        const count = groupCounts.get(list) || 0;
        title.style.display = (query && count === 0) ? 'none' : '';
      });

      if (empty) empty.classList.toggle('show', !!query && visibleCount === 0);
      if (clearBtn) clearBtn.classList.toggle('show', !!query);
    };

    let raf = null;
    faqSearch.addEventListener('input', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => filter(faqSearch.value));
    });
    clearBtn?.addEventListener('click', () => {
      faqSearch.value = '';
      faqSearch.focus();
      filter('');
    });
  }

  /* FAQ details auto-close siblings (optional behavior) */
  document.querySelectorAll('.faq-list[data-single] .faq-item').forEach(d => {
    d.addEventListener('toggle', () => {
      if (d.open) {
        d.parentElement.querySelectorAll('.faq-item').forEach(o => { if (o !== d) o.open = false; });
      }
    });
  });

  /* Year auto */
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  /* Mobile floating CTA bar — injected on all pages except the quote form */
  (() => {
    const path = location.pathname.toLowerCase();
    if (path.endsWith('devis-en-ligne.html') || path.endsWith('/devis-en-ligne')) return;
    if (document.querySelector('.mobile-cta-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-cta-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Actions rapides');
    bar.innerHTML = `
      <a href="tel:0692868068" class="mobile-cta-bar-btn mobile-cta-bar-call" aria-label="Appeler CHR au 0692 86 80 68">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        Appeler
      </a>
      <a href="devis-en-ligne.html" class="mobile-cta-bar-btn mobile-cta-bar-quote">
        Demander un devis
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    `;
    document.body.appendChild(bar);
  })();

  /* Smooth anchor */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* Reviews carousel */
  const reviewsTrack = document.getElementById('reviewsTrack');
  if (reviewsTrack) {
    const cards = reviewsTrack.querySelectorAll('.review-card');
    let idx = 0;
    const getStep = () => {
      const card = cards[0];
      if (!card) return 340;
      const gap = parseInt(getComputedStyle(reviewsTrack).gap) || 20;
      return card.offsetWidth + gap;
    };
    const goTo = (i) => {
      idx = Math.max(0, Math.min(i, cards.length - 1));
      reviewsTrack.style.transform = `translateX(-${idx * getStep()}px)`;
    };
    document.getElementById('reviewsNext')?.addEventListener('click', () => goTo(idx + 1));
    document.getElementById('reviewsPrev')?.addEventListener('click', () => goTo(idx - 1));
  }

})();
