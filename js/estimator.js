/* ============================================================
   CHR — Estimateur de devis + calendrier d'échéances
   ============================================================ */
(function () {
  // Email destinataire (FormSubmit nécessite une 1ère validation par email)
  const FORMSUBMIT_EMAIL = 'chr.controle@gmail.com';

  let content = null;

  // Données de fallback garantissant le fonctionnement des outils
  const FALLBACK = {
    services: [
      { id: 'disconnecteurs', title: 'Disconnecteurs', norm: 'EN 1717', price_min: 90, price_max: 180, price_unit: 'par disconnecteur', frequency_months: 12 },
      { id: 'bi-pi', title: 'Bouches et poteaux incendie', norm: 'NFS 62-200', price_min: 110, price_max: 220, price_unit: 'par poteau / bouche', frequency_months: 12 },
      { id: 'colonnes', title: 'Colonnes sèches', norm: 'NFS 62-201', price_min: 180, price_max: 380, price_unit: 'par colonne', frequency_months: 12 },
      { id: 'ria', title: 'RIA - Robinets incendie armés', norm: 'NFS 62-202', price_min: 80, price_max: 160, price_unit: 'par RIA', frequency_months: 12 }
    ],
    estimator: { base_fee_min: 80, base_fee_max: 150, urgency_multipliers: { routine: 1.0, soon: 1.15, urgent: 1.45 } }
  };

  // ── LOAD CONTENT ──
  async function loadContent() {
    try {
      const res = await fetch('data/content.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.services) && data.services.length > 0) return data;
      }
    } catch (e) {}
    return FALLBACK;
  }

  // ── HELPERS ──
  const fmtEur = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── CALENDRIER ──
  function initCalendar(services) {
    const select = document.getElementById('cal-equipment');
    const date = document.getElementById('cal-date');
    const compute = document.getElementById('cal-compute');
    const result = document.getElementById('cal-result');
    const nextDate = document.getElementById('cal-next-date');
    const nextMeta = document.getElementById('cal-next-meta');
    if (!select || !compute) return;

    // Populate dropdown
    services.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title} (${s.norm})`;
      opt.dataset.frequency = s.frequency_months || 12;
      select.appendChild(opt);
    });

    compute.addEventListener('click', () => {
      const equipId = select.value;
      const lastDate = date.value;
      if (!equipId || !lastDate) {
        alert("Veuillez sélectionner un équipement et la date du dernier contrôle.");
        return;
      }
      const service = services.find((s) => s.id === equipId);
      const months = service.frequency_months || 12;
      const last = new Date(lastDate);
      const next = new Date(last);
      next.setMonth(next.getMonth() + months);

      const today = new Date();
      const diffMs = next - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      nextDate.textContent = fmtDate(next);
      let metaText = '';
      if (diffDays < 0) {
        metaText = `⚠ Échéance dépassée depuis ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}. Risque de non-conformité.`;
        nextMeta.classList.add('cal-overdue');
      } else if (diffDays < 60) {
        metaText = `À planifier rapidement · dans ${diffDays} jour${diffDays > 1 ? 's' : ''}.`;
        nextMeta.classList.add('cal-soon');
      } else {
        const months = Math.round(diffDays / 30);
        metaText = `Dans ${months} mois (${diffDays} jours).`;
        nextMeta.classList.remove('cal-overdue', 'cal-soon');
      }
      nextMeta.textContent = metaText;
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // ── ESTIMATEUR ──
  const state = {
    estab: '',
    equipments: [], // [{id, title, norm}]
    volumes: {},    // { id: number }
    urgency: '',
    services: [],
    estimator: { base_fee_min: 80, base_fee_max: 150, urgency_multipliers: { routine: 1.0, soon: 1.15, urgent: 1.45 } },
    estimation: { min: 0, max: 0 }
  };

  function initEstimator(content) {
    state.services = content.services || [];
    if (content.estimator) state.estimator = { ...state.estimator, ...content.estimator };

    // Step 2 : Equipments checkboxes
    const equipContainer = document.getElementById('estEquipments');
    state.services.forEach((s) => {
      const label = document.createElement('label');
      label.className = 'est-option';
      label.innerHTML = `
        <input type="checkbox" value="${s.id}">
        <span><strong>${s.title}</strong><span class="est-option-meta">${s.norm} · ${s.price_unit || ''}</span></span>
      `;
      equipContainer.appendChild(label);
    });

    // Step 1 : Estab radios
    document.querySelectorAll('input[name="estab"]').forEach((r) => {
      r.addEventListener('change', () => {
        state.estab = r.value;
        toggleNext(1, true);
      });
    });

    // Step 2 : equipments
    equipContainer.addEventListener('change', () => {
      const checked = equipContainer.querySelectorAll('input[type="checkbox"]:checked');
      state.equipments = Array.from(checked).map((c) => {
        const s = state.services.find((sv) => sv.id === c.value);
        return { id: s.id, title: s.title, norm: s.norm, price_min: s.price_min, price_max: s.price_max, price_unit: s.price_unit };
      });
      toggleNext(2, state.equipments.length > 0);
    });

    // Step 3 : volumes (rendu dynamique en arrivant)
    // Step 4 : urgency
    document.querySelectorAll('input[name="urgency"]').forEach((r) => {
      r.addEventListener('change', () => {
        state.urgency = r.value;
        toggleNext(4, true);
        computeEstimation();
      });
    });

    // Navigation
    document.querySelectorAll('.btn-est-next').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = parseInt(btn.dataset.next, 10);
        if (next === 3) renderVolumes();
        if (next === 5) {
          computeEstimation();
          updateResultDisplay();
        }
        goToStep(next);
      });
    });
    document.querySelectorAll('.btn-est-prev').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prev = parseInt(btn.dataset.prev, 10);
        goToStep(prev);
      });
    });

    // Form submit
    const form = document.getElementById('estForm');
    if (form) form.addEventListener('submit', handleSubmit);
  }

  function goToStep(n) {
    document.querySelectorAll('.est-step').forEach((s) => {
      s.classList.toggle('active', parseInt(s.dataset.step, 10) === n);
    });
    document.getElementById('estCurrentStep').textContent = n;
    document.getElementById('estProgressBar').style.width = (n / 5) * 100 + '%';
    // Scroll au top de l'estimateur
    document.getElementById('estimateur').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleNext(stepNum, enable) {
    const step = document.querySelector(`.est-step[data-step="${stepNum}"]`);
    if (!step) return;
    const next = step.querySelector('.btn-est-next');
    if (next) next.disabled = !enable;
  }

  function renderVolumes() {
    const container = document.getElementById('estVolumes');
    container.innerHTML = '';
    if (state.equipments.length === 0) {
      container.innerHTML = '<p class="est-help">Aucun équipement sélectionné. Revenez à l\'étape précédente.</p>';
      return;
    }
    state.equipments.forEach((eq) => {
      const row = document.createElement('div');
      row.className = 'est-volume-row';
      row.innerHTML = `
        <div class="est-volume-info">
          <strong>${eq.title}</strong>
          <span>${eq.price_unit}</span>
        </div>
        <input type="number" min="1" max="999" value="${state.volumes[eq.id] || 1}" data-id="${eq.id}" class="est-volume-input">
      `;
      container.appendChild(row);
    });
    container.querySelectorAll('.est-volume-input').forEach((inp) => {
      inp.addEventListener('input', () => {
        const id = inp.dataset.id;
        const v = Math.max(1, parseInt(inp.value, 10) || 1);
        state.volumes[id] = v;
      });
      // init state
      state.volumes[inp.dataset.id] = parseInt(inp.value, 10) || 1;
    });
  }

  function computeEstimation() {
    const baseMin = state.estimator.base_fee_min || 80;
    const baseMax = state.estimator.base_fee_max || 150;
    const mult = state.estimator.urgency_multipliers[state.urgency] || 1.0;

    let totalMin = baseMin;
    let totalMax = baseMax;

    state.equipments.forEach((eq) => {
      const qty = state.volumes[eq.id] || 1;
      totalMin += qty * (eq.price_min || 100);
      totalMax += qty * (eq.price_max || 200);
    });

    totalMin = Math.round(totalMin * mult);
    totalMax = Math.round(totalMax * mult);

    state.estimation = { min: totalMin, max: totalMax };
  }

  function updateResultDisplay() {
    const amount = document.getElementById('estAmount');
    if (!amount) return;
    if (state.estimation.min === 0) {
      amount.textContent = '— € HT';
      return;
    }
    amount.textContent = `${fmtEur(state.estimation.min)} – ${fmtEur(state.estimation.max)} HT`;
  }

  // ── SUBMISSION ──
  function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const data = new FormData(form);
    const lead = {
      id: 'lead_' + Date.now(),
      date: new Date().toISOString(),
      nom: data.get('nom'),
      structure: data.get('structure'),
      email: data.get('email'),
      telephone: data.get('telephone'),
      commune: data.get('commune'),
      precisions: data.get('precisions'),
      etablissement: state.estab,
      equipements: state.equipments.map((e) => `${e.title} (${state.volumes[e.id] || 1})`).join(', '),
      urgence: state.urgency,
      estimation_min: state.estimation.min,
      estimation_max: state.estimation.max,
      status: 'nouveau'
    };

    // Build email body for FormSubmit
    const reponses = `
Type d'établissement : ${lead.etablissement}
Équipements : ${lead.equipements}
Urgence : ${lead.urgence}
Structure : ${lead.structure || '-'}
Commune : ${lead.commune || '-'}
Précisions : ${lead.precisions || '-'}
Estimation : ${fmtEur(lead.estimation_min)} – ${fmtEur(lead.estimation_max)} HT
    `.trim();
    document.getElementById('estFormReponses').value = reponses;
    document.getElementById('estFormEstimation').value = `${fmtEur(lead.estimation_min)} – ${fmtEur(lead.estimation_max)} HT`;

    // Send via FormSubmit (no signup required, just confirms via email on first send)
    const fd = new FormData();
    fd.append('nom', lead.nom);
    fd.append('email', lead.email);
    fd.append('telephone', lead.telephone);
    fd.append('structure', lead.structure || '');
    fd.append('commune', lead.commune || '');
    fd.append('precisions', lead.precisions || '');
    fd.append('etablissement', lead.etablissement);
    fd.append('equipements', lead.equipements);
    fd.append('urgence', lead.urgence);
    fd.append('estimation', `${fmtEur(lead.estimation_min)} - ${fmtEur(lead.estimation_max)} HT`);
    fd.append('_subject', `Nouveau devis — ${lead.nom} (${lead.etablissement})`);
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');

    fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`, {
      method: 'POST',
      body: fd
    })
      .then((r) => r.json())
      .then(() => {
        showSuccess();
      })
      .catch(() => {
        // En cas d'erreur réseau, on affiche le succès et on ouvre le client mail en fallback
        showSuccess();
        const subject = encodeURIComponent(`Nouveau devis — ${lead.nom} (${lead.etablissement})`);
        const body = encodeURIComponent(`${reponses}\n\nNom : ${lead.nom}\nEmail : ${lead.email}\nTel : ${lead.telephone}`);
        window.open(`mailto:${FORMSUBMIT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
      });
  }

  function showSuccess() {
    document.getElementById('estForm').hidden = true;
    document.getElementById('estResult').hidden = true;
    document.getElementById('estSuccess').hidden = false;
    document.getElementById('estimateur').scrollIntoView({ behavior: 'smooth' });
  }

  // ── INIT ──
  document.addEventListener('DOMContentLoaded', async () => {
    content = await loadContent();
    initCalendar(content.services);
    initEstimator(content);
  });
})();
