import {
  getPessoas, getChamadaByData, saveChamada,
  getPresencasByChamada, savePresenca,
  getChamadas, getAllPresencas
} from './db.js';

const content = document.getElementById('chamada-content');
let currentDate = todayStr();
let currentFilter = 'todos';
let currentSearch = '';
let chamadaState = {}; // { pessoaId: { presente: bool, presencaId: uuid } }
let currentChamada = null;
let _chamadaCreating = null; // Promise lock para evitar criação dupla em cliques simultâneos
let historicoMap = {}; // { pessoaId: ['P'|'F'|'-', ...] } — oldest to newest, last 4 chamadas before currentDate

const GRUPOS = [
  { value: 'evangelizacao', label: 'Evangelização', plural: 'Evangelização' },
  { value: 'mocidade', label: 'Mocidade', plural: 'Mocidade' },
  { value: 'adulto', label: 'Adulto', plural: 'Adultos' },
  { value: 'gestante', label: 'Gestante', plural: 'Gestantes' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatDateBR(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`;
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

  // Reset lock ao trocar de data ou recarregar
  _chamadaCreating = null;

  // Initialize missing people as absent
  for (const p of pessoas) {
    if (!chamadaState[p.id]) {
      chamadaState[p.id] = { presente: false, id: null };
    }
  }

  await computeHistorico();

  renderChamada(pessoas);
}

async function computeHistorico() {
  const [allChamadas, allPresencas] = await Promise.all([getChamadas(), getAllPresencas()]);

  const previous = allChamadas
    .filter(c => c.data < currentDate)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 4)
    .reverse(); // oldest to newest

  const presencaIndex = {};
  for (const p of allPresencas) {
    presencaIndex[`${p.chamada_id}:${p.pessoa_id}`] = p.presente;
  }

  historicoMap = {};
  for (const pessoaId of Object.keys(chamadaState)) {
    historicoMap[pessoaId] = previous.map(chamada => {
      const present = presencaIndex[`${chamada.id}:${pessoaId}`];
      if (present === undefined) return '-';
      return present ? 'P' : 'F';
    });
  }
}

function renderChamada(pessoas) {
  const searchTerm = currentSearch.toLowerCase();
  const filtered = pessoas
    .filter(p => currentFilter === 'todos' || p.grupo === currentFilter)
    .filter(p => !searchTerm || p.nome.toLowerCase().includes(searchTerm));

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
    <div class="date-picker" style="position:relative;">
      <button class="date-input" id="chamada-date-btn" style="width:100%;cursor:pointer;font-weight:600;">
        ${formatDateBR(currentDate)}
      </button>
      <input type="date" class="date-input" id="chamada-date" value="${currentDate}"
        style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;">
    </div>

    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${currentFilter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.plural}</button>
      `).join('')}
    </div>

    <input type="text" class="search-input" id="search-chamada"
      placeholder="Buscar por nome..." value="${escapeHtml(currentSearch)}">

    <div class="counter">Presentes: <strong>${totalPresent}</strong> / ${totalPeople} cadastrados</div>
  `;

  let hasAny = false;
  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (currentFilter !== 'todos' && currentFilter !== g.value) continue;
    if (list.length === 0) continue;

    hasAny = true;
    html += `<div class="group-label">${g.plural} (${list.length})</div>`;

    for (const p of list) {
      const state = chamadaState[p.id];
      const isPresent = state?.presente || false;
      const hist = historicoMap[p.id] || [];
      const histHtml = hist.length === 0 ? '' : `
        <div class="presence-historico">
          ${hist.map(h => {
            const cls = h === 'P' ? 'hist-p' : h === 'F' ? 'hist-f' : 'hist-none';
            return `<span class="hist-badge ${cls}">${h}</span>`;
          }).join('')}
        </div>
      `;
      html += `
        <div class="presence-row">
          <div class="presence-info">
            <div class="presence-name">${escapeHtml(p.nome)}</div>
            ${histHtml}
          </div>
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
  }

  content.innerHTML = html;
  attachChamadaEvents();
}

function attachChamadaEvents() {
  // Date change
  document.getElementById('chamada-date')?.addEventListener('change', (e) => {
    currentDate = e.target.value;
    currentSearch = '';
    loadChamada();
  });

  // Search
  document.getElementById('search-chamada')?.addEventListener('input', async (e) => {
    currentSearch = e.target.value;
    const pessoas = await getPessoas();
    renderChamada(pessoas);
  });

  // Filter pills
  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      currentFilter = pill.dataset.filter;
      const pessoas = await getPessoas();
      renderChamada(pessoas);
    });
  });

  // Presence toggle buttons — save individual presença on each click
  content.querySelectorAll('.presence-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pessoaId = btn.dataset.pessoa;
      const state = chamadaState[pessoaId];

      // Disable first para evitar duplo clique antes de qualquer await
      btn.disabled = true;
      state.presente = !state.presente;

      // Instant visual feedback
      btn.className = `presence-btn ${state.presente ? 'present' : 'absent'}`;
      btn.textContent = state.presente ? 'PRESENTE' : 'FALTA';

      // Update counter
      const totalPresent = Object.values(chamadaState).filter(s => s.presente).length;
      const totalPeople = Object.keys(chamadaState).length;
      const counter = content.querySelector('.counter');
      if (counter) counter.innerHTML = `Presentes: <strong>${totalPresent}</strong> / ${totalPeople} cadastrados`;

      // Lock compartilhado: se dois toggles simultâneos chegarem aqui antes da chamada
      // ser criada, apenas uma criação acontece — a outra aguarda a mesma Promise.
      if (!currentChamada) {
        if (!_chamadaCreating) {
          _chamadaCreating = getChamadaByData(currentDate).then(existing => {
            currentChamada = existing || null;
            if (!currentChamada) return saveChamada({ data: currentDate });
          }).then(created => {
            if (created) currentChamada = created;
          });
        }
        await _chamadaCreating;
      }

      const presenca = {
        chamada_id: currentChamada.id,
        pessoa_id: pessoaId,
        presente: state.presente,
      };
      const saved = await savePresenca(presenca);
      state.id = saved.id;

      btn.disabled = false;
    });
  });
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
