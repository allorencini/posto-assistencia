import {
  getPessoas, getChamadaByData, saveChamada,
  getPresencasByChamada, savePresencasBatch
} from './db.js';

const content = document.getElementById('chamada-content');
let currentDate = todayStr();
let currentFilter = 'todos';
let chamadaState = {}; // { pessoaId: { presente: bool, presencaId: uuid } }
let currentChamada = null;

const GRUPOS = [
  { value: 'crianca', label: 'Crianca' },
  { value: 'jovem', label: 'Jovem' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'gravida', label: 'Gravida' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateBR(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

async function loadChamada() {
  const pessoas = await getPessoas();

  // Check if chamada exists for this date
  currentChamada = await getChamadaByData(currentDate);
  chamadaState = {};

  if (currentChamada) {
    // Load existing presences
    const presencas = await getPresencasByChamada(currentChamada.id);
    for (const p of presencas) {
      chamadaState[p.pessoa_id] = { presente: p.presente, id: p.id };
    }
  }

  // Initialize missing people as absent
  for (const p of pessoas) {
    if (!chamadaState[p.id]) {
      chamadaState[p.id] = { presente: false, id: null };
    }
  }

  renderChamada(pessoas);
}

function renderChamada(pessoas) {
  const filtered = currentFilter === 'todos'
    ? pessoas
    : pessoas.filter(p => p.grupo === currentFilter);

  const grouped = {};
  for (const g of GRUPOS) grouped[g.value] = [];
  for (const p of filtered) {
    if (grouped[p.grupo]) grouped[p.grupo].push(p);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  const totalPresent = Object.values(chamadaState).filter(s => s.presente).length;
  const totalPeople = Object.keys(chamadaState).length;

  let html = `
    <div class="date-picker">
      <input type="date" class="date-input" id="chamada-date" value="${currentDate}">
    </div>

    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${currentFilter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.label}s</button>
      `).join('')}
    </div>

    <div class="counter">Presentes: <strong>${totalPresent}</strong> / ${totalPeople} cadastrados</div>
  `;

  let hasAny = false;
  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (currentFilter !== 'todos' && currentFilter !== g.value) continue;
    if (list.length === 0) continue;

    hasAny = true;
    html += `<div class="group-label">${g.label}s (${list.length})</div>`;

    for (const p of list) {
      const state = chamadaState[p.id];
      const isPresent = state?.presente || false;
      html += `
        <div class="presence-row">
          <div class="presence-name">${escapeHtml(p.nome)}</div>
          <button class="presence-btn ${isPresent ? 'present' : 'absent'}"
                  data-pessoa="${p.id}">
            ${isPresent ? 'PRESENTE' : 'FALTA'}
          </button>
        </div>
      `;
    }
  }

  if (!hasAny) {
    html += `
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>Nenhuma pessoa cadastrada. Cadastre pessoas primeiro.</p>
      </div>
    `;
  } else {
    html += `
      <button class="btn btn-primary" id="btn-salvar-chamada" style="margin-top:16px;">
        SALVAR CHAMADA
      </button>
    `;
  }

  content.innerHTML = html;
  attachChamadaEvents();
}

function attachChamadaEvents() {
  // Date change
  document.getElementById('chamada-date')?.addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadChamada();
  });

  // Filter pills
  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      currentFilter = pill.dataset.filter;
      const pessoas = await getPessoas();
      renderChamada(pessoas);
    });
  });

  // Presence toggle buttons
  content.querySelectorAll('.presence-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pessoaId = btn.dataset.pessoa;
      const state = chamadaState[pessoaId];
      state.presente = !state.presente;

      // Update button visually (instant feedback)
      btn.className = `presence-btn ${state.presente ? 'present' : 'absent'}`;
      btn.textContent = state.presente ? 'PRESENTE' : 'FALTA';

      // Update counter
      const totalPresent = Object.values(chamadaState).filter(s => s.presente).length;
      const totalPeople = Object.keys(chamadaState).length;
      const counter = content.querySelector('.counter');
      if (counter) counter.innerHTML = `Presentes: <strong>${totalPresent}</strong> / ${totalPeople} cadastrados`;
    });
  });

  // Save button
  document.getElementById('btn-salvar-chamada')?.addEventListener('click', salvarChamada);
}

async function salvarChamada() {
  // Create or reuse chamada for this date
  if (!currentChamada) {
    currentChamada = await saveChamada({ data: currentDate });
  }

  // Build presencas array
  const presencas = Object.entries(chamadaState).map(([pessoaId, state]) => ({
    id: state.id || crypto.randomUUID(),
    chamada_id: currentChamada.id,
    pessoa_id: pessoaId,
    presente: state.presente,
  }));

  await savePresencasBatch(presencas);

  // Update local state with saved IDs
  for (const p of presencas) {
    chamadaState[p.pessoa_id].id = p.id;
  }

  // Visual feedback
  const btn = document.getElementById('btn-salvar-chamada');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = 'SALVO!';
    btn.style.background = 'var(--green)';
    btn.style.color = '#000';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'chamada') loadChamada();
});
