/* ============================================================
   CHR — Form handler (Web3Forms + fallback mailto)
   - AJAX POST vers Web3Forms
   - Honeypot anti-bot
   - Test "trop rapide" anti-bot
   - Fallback mailto si erreur réseau
   ============================================================ */
(function () {
  'use strict';

  const WEB3FORMS_KEY  = 'b0ec94bf-ceed-4d06-af40-bb6db01ab0cc';
  const FALLBACK_EMAIL = 'chr.controle@gmail.com';
  const MIN_FILL_MS = 1500;

  function buildPayload(form, kind) {
    const fd = new FormData(form);
    const get = (k) => (fd.get(k) || '').toString().trim();
    return {
      id: 'lead_' + Date.now(),
      date: new Date().toISOString(),
      kind,
      nom: get('name') || get('nom'),
      structure: get('company') || get('structure'),
      email: get('email'),
      telephone: get('phone') || get('telephone'),
      sujet: get('subject') || '',
      adresse: get('address') || get('commune') || '',
      message: get('message') || get('notes') || get('precisions') || '',
      etablissement: '',
      equipements: '',
      urgence: '',
      commune: get('address') || '',
      precisions: get('message') || get('notes') || '',
      estimation_min: 0,
      estimation_max: 0,
      status: 'nouveau'
    };
  }

  function injectHoneypot(form) {
    if (form.querySelector('input[name="_honey_chr"]')) return;
    const honey = document.createElement('input');
    honey.type = 'text';
    honey.name = '_honey_chr';
    honey.tabIndex = -1;
    honey.autocomplete = 'off';
    honey.setAttribute('aria-hidden', 'true');
    honey.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    form.appendChild(honey);
  }

  function showStatus(form, message, isError) {
    let status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }
    status.textContent = message;
    status.dataset.state = isError ? 'error' : 'success';
  }

  function showSuccess(form, kind) {
    const wrap = form.closest('.form-wrap') || form.parentElement;
    if (!wrap) return;
    const html = `
      <div class="form-success" role="status" aria-live="polite">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <h3>Demande envoyée</h3>
        <p>Merci ! Nous revenons vers vous sous 24 h ouvrées avec un devis ou un créneau d'intervention.</p>
        <p style="font-size:13px;color:var(--steel);margin-top:18px">Pour toute urgence&nbsp;: <a href="tel:0692868068" style="color:var(--red-incendie);font-weight:600">0692 86 80 68</a></p>
      </div>`;
    wrap.innerHTML = html;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function fallbackMailto(payload) {
    const subj = encodeURIComponent(
      payload.kind === 'devis' ? `Demande de devis — ${payload.nom || ''}` : `Demande contact CHR — ${payload.nom || ''}`
    );
    const lines = [
      `Nom : ${payload.nom}`,
      `Société : ${payload.structure || '-'}`,
      `Téléphone : ${payload.telephone}`,
      `E-mail : ${payload.email}`,
      payload.sujet ? `Objet : ${payload.sujet}` : '',
      payload.adresse ? `Adresse du site : ${payload.adresse}` : '',
      '',
      'Message :',
      payload.message || '-'
    ].filter(Boolean);
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subj}&body=${body}`;
  }

  function attachForm(form, kind) {
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    const t0 = Date.now();
    injectHoneypot(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"], .form-submit');
      if (btn) { btn.disabled = true; btn.dataset.originalText = btn.dataset.originalText || btn.textContent; btn.textContent = 'Envoi en cours…'; }

      // Validation HTML5
      if (!form.checkValidity()) {
        form.reportValidity();
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Envoyer'; }
        return;
      }

      // Anti-bot : trop rapide
      if (Date.now() - t0 < MIN_FILL_MS) {
        showStatus(form, 'Erreur de soumission. Réessayez.', true);
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Envoyer'; }
        return;
      }

      // Honeypot
      const honey = form.querySelector('input[name="_honey_chr"]');
      if (honey && honey.value) {
        // Bot détecté — feindre le succès sans envoyer
        showSuccess(form, kind);
        return;
      }

      const payload = buildPayload(form, kind);

      // POST Web3Forms
      const body = JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: kind === 'devis' ? `Demande de devis CHR — ${payload.nom}` : `Demande contact CHR — ${payload.nom}`,
        from_name: 'CHR · Formulaire site',
        Nom: payload.nom || '',
        Société: payload.structure || '',
        Email: payload.email || '',
        Téléphone: payload.telephone || '',
        ...(payload.sujet   && { Objet: payload.sujet }),
        ...(payload.adresse && { 'Adresse du site': payload.adresse }),
        Message: payload.message || '',
        botcheck: ''
      });

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body
        });
        const json = await res.json().catch(() => ({}));
        if (json && json.success) {
          showSuccess(form, kind);
        } else {
          throw new Error(json.message || 'Erreur Web3Forms');
        }
      } catch (err) {
        showStatus(form, 'Connexion impossible. Nous ouvrons votre client mail pour finaliser l\'envoi.', true);
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Envoyer'; }
        setTimeout(() => fallbackMailto(payload), 600);
      }
    });
  }

  /* ---- Quantités dynamiques par équipement ---- */
  function initEquipQty() {
    const group = document.getElementById('equipCheckgroup');
    const wrap  = document.getElementById('equipQtyWrap');
    const rows  = document.getElementById('equipQtyRows');
    if (!group || !wrap || !rows) return;

    function updateQty() {
      const checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(cb => cb.dataset.label); // skip "Je ne sais pas"

      if (checked.length === 0) {
        wrap.hidden = true;
        rows.innerHTML = '';
        return;
      }

      wrap.hidden = false;

      // Sync rows: add missing, remove extra
      const existing = new Set(Array.from(rows.querySelectorAll('[data-equip]')).map(r => r.dataset.equip));
      const current  = new Set(checked.map(cb => cb.value));

      // Remove unchecked
      existing.forEach(val => {
        if (!current.has(val)) {
          const el = rows.querySelector(`[data-equip="${val}"]`);
          if (el) el.remove();
        }
      });

      // Add new
      checked.forEach(cb => {
        if (!existing.has(cb.value)) {
          const row = document.createElement('div');
          row.className = 'equip-qty-row';
          row.dataset.equip = cb.value;
          row.innerHTML = `
            <span class="equip-qty-row-label">${cb.dataset.label}</span>
            <input type="number" name="qty_${cb.value}" min="1" max="999"
              placeholder="—" class="equip-qty-input"
              aria-label="Quantité ${cb.dataset.label}">`;
          rows.appendChild(row);
        }
      });
    }

    group.addEventListener('change', updateQty);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const path = (location.pathname || '').toLowerCase();
    const isDevis = path.endsWith('devis-en-ligne.html') || path.endsWith('/devis-en-ligne') || path.endsWith('/devis-en-ligne/');
    const isContact = path.endsWith('contact.html') || path.endsWith('/contact') || path.endsWith('/contact/');
    document.querySelectorAll('form#contact-form, form[data-chr-form]').forEach((f) => {
      const kind = f.dataset.chrForm || (isDevis ? 'devis' : (isContact ? 'contact' : 'contact'));
      attachForm(f, kind);
    });
    initEquipQty();
  });
})();
