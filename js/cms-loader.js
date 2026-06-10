/* ============================================================
   CHR — CMS Loader
   Charge le contenu depuis data/content.json et applique
   les changements au DOM.
   ============================================================ */
(function () {

  // ── Config Sanity (lecture publique, sans token) ──
  var SANITY_PROJECT = 'dhe4ywjr';
  var SANITY_DATASET = 'production';

  // Charge contact + accueil depuis Sanity via l'API CDN publique.
  // Retourne { contact, accueil } ou null si indisponible.
  async function loadFromSanity() {
    var query = '*[_type in ["contact","accueil"]]';
    var url = 'https://' + SANITY_PROJECT + '.apicdn.sanity.io/v2021-06-07/data/query/'
      + SANITY_DATASET + '?query=' + encodeURIComponent(query);
    try {
      var res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      var data = await res.json();
      var out = {};
      (data.result || []).forEach(function (doc) {
        if (doc._type === 'contact') out.contact = doc;
        if (doc._type === 'accueil') out.accueil = doc;
      });
      return out;
    } catch (e) {
      return null;
    }
  }

  // Fusionne les valeurs Sanity (non vides) dans le contenu de base.
  // Sanity ne gère QUE contact + textes d'accueil ; le reste vient de content.json.
  function mergeSanity(base, sanity) {
    if (!base) base = {};
    if (!sanity) return base;

    if (sanity.contact) {
      base.contact = base.contact || {};
      ['phone', 'phoneRaw', 'email', 'address', 'whatsapp', 'hours'].forEach(function (k) {
        if (sanity.contact[k]) base.contact[k] = sanity.contact[k];
      });
    }
    if (sanity.accueil) {
      var a = sanity.accueil;
      base.hero = base.hero || {};
      ['title_line1', 'title_line2', 'title_highlight', 'description'].forEach(function (k) {
        if (a[k]) base.hero[k] = a[k];
      });
      base.je_suis = base.je_suis || {};
      if (a.profil_title) base.je_suis.title = a.profil_title;
      if (a.profil_intro) base.je_suis.intro = a.profil_intro;
    }
    return base;
  }

  async function loadContent() {
    // 1. Base = content.json (source de secours, jamais cassante)
    var base = null;
    try {
      var res = await fetch('data/content.json', { cache: 'no-store' });
      if (res.ok) base = await res.json();
    } catch (e) {}

    // 2. Enrichit avec Sanity si disponible ; sinon on garde la base telle quelle
    var sanity = await loadFromSanity();
    return mergeSanity(base, sanity);
  }

  function applyContent(content) {
    if (!content) return;

    // ── MENU : remplace les liens nav ──
    if (Array.isArray(content.menu)) {
      const menus = [
        document.querySelectorAll('.nav-links li'),
        document.querySelectorAll('.nav-mobile > a')
      ];
      menus.forEach((set) => {
        if (!set || !set.length) return;
        const isMobileFlat = set === menus[1];
        // Pour le menu desktop : <li><a>
        // Pour le menu mobile : <a>
        set.forEach((node, i) => {
          const item = content.menu[i];
          if (!item) return;
          const a = isMobileFlat ? node : node.querySelector('a');
          if (!a) return;
          a.textContent = item.label;
          if (item.url) a.setAttribute('href', item.url);
        });
      });
    }

    // ── CONTACT : tel / email / adresse / horaires ──
    if (content.contact) {
      const c = content.contact;

      // Téléphone affiché (multiples occurrences)
      if (c.phone) {
        document.querySelectorAll('[data-cms="phone"]').forEach((el) => {
          el.textContent = c.phone;
        });
      }
      if (c.phoneRaw) {
        // Liens tel:
        document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
          a.setAttribute('href', 'tel:' + c.phoneRaw);
        });
      }
      if (c.email) {
        document.querySelectorAll('[data-cms="email"]').forEach((el) => {
          el.textContent = c.email;
        });
        document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
          a.setAttribute('href', 'mailto:' + c.email);
          if (a.children.length === 0) a.textContent = c.email;
        });
      }
      if (c.address) {
        document.querySelectorAll('[data-cms="address"]').forEach((el) => {
          el.textContent = c.address;
        });
      }
      if (c.whatsapp) {
        document.querySelectorAll('a[href*="wa.me"]').forEach((a) => {
          a.setAttribute('href', 'https://wa.me/' + c.whatsapp);
        });
      }
      if (c.hours) {
        document.querySelectorAll('[data-cms="hours"]').forEach((el) => {
          el.textContent = c.hours;
        });
      }
    }

    // ── HERO : titre et description ──
    if (content.hero) {
      const h = content.hero;
      const h1 = document.querySelector('[data-cms="hero.title"]');
      if (h1 && (h.title_line1 || h.title_line2)) {
        const highlight = (h.title_highlight || '').trim();
        function buildLine(txt) {
          if (!highlight || !txt.includes(highlight)) return escapeText(txt);
          return escapeText(txt).replace(escapeText(highlight), `<span class="red">${escapeText(highlight)}</span>`);
        }
        const lines = [h.title_line1, h.title_line2, h.title_line3].filter(Boolean);
        h1.innerHTML = lines.map(buildLine).join('&nbsp;<br>');
      }
      const desc = document.querySelector('[data-cms="hero.description"]');
      if (desc && h.description) desc.textContent = h.description;
    }

    // ── JE SUIS : cartes profil ──
    if (content.je_suis) {
      const js = content.je_suis;
      const titleEl = document.querySelector('[data-cms="je_suis.title"]');
      const introEl = document.querySelector('[data-cms="je_suis.intro"]');
      if (titleEl && js.title) titleEl.textContent = js.title;
      if (introEl && js.intro) introEl.textContent = js.intro;

      const grid = document.querySelector('[data-cms-je-suis]');
      if (grid && Array.isArray(js.cards) && js.cards.length > 0) {
        const icons = [
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a3 3 0 016 0v4"/></svg>'
        ];
        grid.innerHTML = js.cards.map((card, i) => `
          <div class="js-card reveal">
            <div class="js-card-icon">${icons[i % icons.length]}</div>
            <h3>${escapeText(card.title || '')}</h3>
            <p>${escapeText(card.description || '')}</p>
            <a href="${escapeText(card.url || '#')}" class="js-card-cta">${escapeText(card.cta || 'En savoir plus')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
          </div>
        `).join('');
      }
    }

    // ── FAQ : questions / réponses ──
    if (Array.isArray(content.faq) && content.faq.length > 0) {
      const faqList = document.querySelector('.faq-list[data-single]');
      if (faqList) {
        faqList.innerHTML = content.faq.slice(0, 4).map((item) => `
          <details class="faq-item">
            <summary>${escapeText(item.question || '')}</summary>
            <div class="faq-body">${escapeText(item.answer || '')}</div>
          </details>
        `).join('');
      }
    }

    // ── BLOG : articles ──
    if (content.blog) {
      const blog = content.blog;
      const section = document.querySelector('[data-cms-blog]');
      if (section && blog.visible && Array.isArray(blog.posts) && blog.posts.length > 0) {
        section.style.display = '';
        const titleEl = section.querySelector('[data-cms="blog.section_title"]');
        const introEl = section.querySelector('[data-cms="blog.section_intro"]');
        if (titleEl && blog.section_title) titleEl.textContent = blog.section_title;
        if (introEl && blog.section_intro) introEl.textContent = blog.section_intro;
        const grid = document.getElementById('blogGrid');
        if (grid) {
          const posts = blog.posts.slice(0, 3);
          grid.innerHTML = posts.map((post) => `
            <article class="blog-card">
              ${post.image ? `<div class="blog-card-media"><img src="${escapeText(post.image)}" alt="${escapeText(post.title || '')}" loading="lazy"></div>` : ''}
              <div class="blog-card-body">
                ${post.date ? `<div class="blog-card-date">${escapeText(post.date)}</div>` : ''}
                <h3>${escapeText(post.title || '')}</h3>
                <p>${escapeText(post.excerpt || '')}</p>
                ${post.url && post.url !== '#' ? `<a href="${escapeText(post.url)}" class="blog-card-link">Lire la suite <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg></a>` : ''}
              </div>
            </article>
          `).join('');
        }
      }
    }

    // ── SERVICES : cartes prestations ──
    if (Array.isArray(content.services)) {
      const cards = document.querySelectorAll('.presta-card');
      cards.forEach((card, i) => {
        const svc = content.services[i];
        if (!svc) return;
        const titleEl = card.querySelector('h3');
        const descEl = card.querySelector('p');
        const normEl = card.querySelector('.presta-card-norm');
        const imgEl = card.querySelector('.presta-card-media img');
        const linkEl = card.querySelector('.presta-card-link');
        const priceEl = card.querySelector('.price');
        if (titleEl) titleEl.textContent = svc.title;
        if (descEl) descEl.textContent = svc.description;
        if (normEl) normEl.textContent = svc.norm;
        if (imgEl && svc.image) imgEl.setAttribute('src', svc.image);
        if (linkEl && svc.id) linkEl.setAttribute('href', 'services.html#' + svc.id);
        if (priceEl && svc.price) priceEl.innerHTML = svc.price;
      });

      // Page services.html : sections détail
      content.services.forEach((svc) => {
        const section = document.getElementById(svc.id);
        if (!section) return;
        const t = section.querySelector('h2, h3');
        const d = section.querySelector('.service-detail-body p, p');
        const n = section.querySelector('.service-detail-norm');
        const img = section.querySelector('.service-detail-visual img');
        if (t) t.textContent = svc.title;
        if (d) d.textContent = svc.description;
        if (n) n.textContent = svc.norm;
        if (img && svc.image) img.setAttribute('src', svc.image);
      });

      // Footer : liens services
      const footerSvcLinks = document.querySelectorAll('.footer-col ul li a[href*="services.html#"]');
      footerSvcLinks.forEach((a, i) => {
        const svc = content.services[i];
        if (!svc) return;
        a.setAttribute('href', 'services.html#' + svc.id);
        a.textContent = svc.title + (svc.norm ? ' ' + svc.norm : '');
      });
    }
  }

  // ── UTILS ──
  function escapeText(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── INIT ──
  document.addEventListener('DOMContentLoaded', async () => {
    const content = await loadContent();
    applyContent(content);
  });
})();
