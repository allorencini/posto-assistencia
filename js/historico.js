import {
  getPessoas, getChamadas, getPresencasByChamada, getPresencasByPessoa,
  getCestas, deleteCesta, savePresenca
} from './db.js';

const content = document.getElementById('historico-content');
let currentView = 'por-data';
let currentFilter = 'todos';
let expandedDatas = new Set(); // chamada IDs expandidos no accordion
let editingData = null;        // chamada ID em modo edição
let editState = {};            // { pessoaId: { presente, id } } para a chamada em edição
let searchTerm = '';
let expandedPessoa = null;

const GRUPOS = [
  { value: 'evangelizacao', label: 'Evangelização', plural: 'Evangelização' },
  { value: 'mocidade', label: 'Mocidade', plural: 'Mocidade' },
  { value: 'adulto', label: 'Adulto', plural: 'Adultos' },
  { value: 'gestante', label: 'Gestante', plural: 'Gestantes' },
];

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadHistorico() {
  if (currentView === 'por-data') await renderPorData();
  else if (currentView === 'por-pessoa') await renderPorPessoa();
  else await renderCestas();
}

// ─── Por Data ────────────────────────────────────────────────────────────────

async function renderPorData() {
  const [chamadas, todasPessoas] = await Promise.all([getChamadas(), getPessoas()]);
  chamadas.sort((a, b) => b.data.localeCompare(a.data));

  const pessoaMap = {};
  for (const p of todasPessoas) pessoaMap[p.id] = p;

  let html = renderTabs();
  html += renderSearch();
  html += renderFilterPills();

  if (chamadas.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>Nenhuma chamada registrada ainda.</p>
      </div>
    `;
    content.innerHTML = html;
    attachHistoricoEvents();
    return;
  }

  for (const chamada of chamadas) {
    const presencas = await getPresencasByChamada(chamada.id);
    const isExpanded = expandedDatas.has(chamada.id);
    const isEditing = editingData === chamada.id;
    const open = isExpanded || isEditing;

    const filtered = currentFilter === 'todos'
      ? presencas
      : presencas.filter(pr => pessoaMap[pr.pessoa_id]?.grupo === currentFilter);

    const presentes = filtered.filter(p => p.presente).length;
    const total = filtered.length;

    html += `
      <div class="card" style="margin-top:12px;padding:0;overflow:hidden;">
        <div class="historico-card-header" data-chamada="${chamada.id}"
          style="display:flex;justify-content:space-between;align-items:center;
                 padding:14px 16px;cursor:pointer;gap:10px;">
          <div style="font-size:17px;font-weight:600;flex:1;">${formatDateBR(chamada.data)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span style="font-size:14px;color:var(--green);">${presentes}/${total}</span>
            <button class="btn-editar-chamada" data-chamada="${chamada.id}"
              style="padding:6px 12px;font-size:13px;border-radius:6px;
                     border:1px solid ${isEditing ? 'var(--green)' : 'var(--border)'};
                     background:var(--bg-nav);
                     color:${isEditing ? 'var(--green)' : 'var(--text-primary)'};
                     cursor:pointer;white-space:nowrap;">
              ${isEditing ? '✓ Editando' : 'Editar'}
            </button>
            <span style="color:var(--text-muted);font-size:14px;">${open ? '▴' : '▾'}</span>
          </div>
        </div>
    `;

    if (open) {
      html += `<div style="padding:0 16px 14px;border-top:1px solid var(--border);">`;

      if (isEditing) {
        const filteredPessoas = todasPessoas
          .filter(p => currentFilter === 'todos' || p.grupo === currentFilter)
          .filter(p => !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => a.nome.localeCompare(b.nome));

        if (filteredPessoas.length === 0) {
          html += `<p style="color:var(--text-muted);font-size:14px;padding-top:12px;">Nenhuma pessoa encontrada.</p>`;
        } else {
          html += `<div style="margin-top:10px;">`;
          for (const pessoa of filteredPessoas) {
            const state = editState[pessoa.id] || { presente: false, id: null };
            html += `
              <div class="presence-row" style="margin-bottom:6px;">
                <div class="presence-info">
                  <div class="presence-name">${escapeHtml(pessoa.nome)}</div>
                </div>
                <button class="presence-btn ${state.presente ? 'present' : 'absent'} edit-hist-btn"
                  data-pessoa="${pessoa.id}" data-chamada="${chamada.id}"
                  style="min-width:90px;padding:10px 12px;font-size:13px;">
                  ${state.presente ? 'PRESENTE' : 'FALTA'}
                </button>
              </div>
            `;
          }
          html += `</div>`;
        }

        html += `
          <button class="btn btn-secondary concluir-edicao" data-chamada="${chamada.id}"
            style="margin-top:10px;width:100%;">
            Concluir edição
          </button>
        `;
      } else {
        const searchFiltered = searchTerm
          ? filtered.filter(pr => pessoaMap[pr.pessoa_id]?.nome.toLowerCase().includes(searchTerm.toLowerCase()))
          : filtered;

        if (searchFiltered.length === 0) {
          html += `<p style="color:var(--text-muted);font-size:14px;padding-top:12px;">Nenhum registro encontrado.</p>`;
        } else {
          html += `<div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:10px;">`;
          for (const pr of searchFiltered) {
            const pessoa = pessoaMap[pr.pessoa_id];
            if (!pessoa) continue;
            html += `
              <span style="
                font-size:13px;padding:4px 10px;border-radius:12px;
                background:${pr.presente ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'};
                color:${pr.presente ? 'var(--green)' : 'var(--red)'};
              ">${escapeHtml(pessoa.nome)}</span>
            `;
          }
          html += `</div>`;
        }
      }

      html += `</div>`;
    }

    html += `</div>`;
  }

  content.innerHTML = html;
  attachHistoricoEvents();
}

// ─── Por Pessoa ───────────────────────────────────────────────────────────────

async function renderPorPessoa() {
  const [pessoas, chamadas] = await Promise.all([getPessoas(), getChamadas()]);

  let html = renderTabs();
  html += renderSearch();
  html += renderFilterPills();

  if (pessoas.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>Nenhuma pessoa cadastrada ainda.</p>
      </div>
    `;
    content.innerHTML = html;
    attachHistoricoEvents();
    return;
  }

  let filtered = currentFilter === 'todos' ? pessoas : pessoas.filter(p => p.grupo === currentFilter);
  if (searchTerm) {
    filtered = filtered.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const grouped = {};
  for (const g of GRUPOS) grouped[g.value] = [];
  for (const p of filtered) {
    if (grouped[p.grupo]) grouped[p.grupo].push(p);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  const totalChamadas = chamadas.length;
  let hasAny = false;

  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (list.length === 0) continue;
    hasAny = true;
    html += `<div class="group-label">${g.plural}</div>`;

    for (const pessoa of list) {
      const presencas = await getPresencasByPessoa(pessoa.id);
      const presentes = presencas.filter(p => p.presente).length;
      const pct = totalChamadas > 0 ? Math.round((presentes / totalChamadas) * 100) : 0;
      const colorClass = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';

      html += `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:17px;">${escapeHtml(pessoa.nome)}</div>
          <div style="text-align:right;">
            <div class="ranking-count ${colorClass}" style="font-size:16px;">${presentes}/${totalChamadas}</div>
            <div style="font-size:12px;color:var(--text-muted);">${pct}%</div>
          </div>
        </div>
      `;
    }
  }

  if (!hasAny) {
    html += `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>Nenhuma pessoa encontrada.</p>
      </div>
    `;
  }

  content.innerHTML = html;
  attachHistoricoEvents();
}

// ─── Cestas ───────────────────────────────────────────────────────────────────

async function renderCestas() {
  const [pessoas, cestas] = await Promise.all([getPessoas(), getCestas()]);

  let html = renderTabs();
  html += renderSearch();
  html += renderFilterPills();

  const pessoaMap = {};
  for (const p of pessoas) pessoaMap[p.id] = p;

  const grouped = {};
  for (const c of cestas) {
    const pessoa = pessoaMap[c.pessoa_id];
    if (!pessoa) continue;
    if (currentFilter !== 'todos' && pessoa.grupo !== currentFilter) continue;
    if (searchTerm && !pessoa.nome.toLowerCase().includes(searchTerm.toLowerCase())) continue;
    if (!grouped[c.pessoa_id]) grouped[c.pessoa_id] = { pessoa, items: [] };
    grouped[c.pessoa_id].items.push(c);
  }

  const list = Object.values(grouped);

  if (list.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">🧺</div>
        <p>Nenhuma cesta entregue ainda.</p>
      </div>
    `;
    content.innerHTML = html;
    attachHistoricoEvents();
    return;
  }

  for (const g of list) g.items.sort((a, b) => b.data.localeCompare(a.data));
  list.sort((a, b) => b.items[0].data.localeCompare(a.items[0].data));

  for (const g of list) {
    const total = g.items.length;
    const ultima = formatDateBR(g.items[0].data);
    const isExpanded = expandedPessoa === g.pessoa.id;

    html += `
      <div class="card cesta-card" data-pessoa="${g.pessoa.id}">
        <div class="cesta-header" data-toggle="${g.pessoa.id}">
          <div style="flex:1;min-width:0;">
            <div style="font-size:17px;font-weight:500;">${escapeHtml(g.pessoa.nome)}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Última: ${ultima}</div>
          </div>
          <div class="cesta-badge" style="margin-right:8px;">🧺 ${total}</div>
          <div style="color:var(--text-muted);font-size:18px;">${isExpanded ? '▴' : '▾'}</div>
        </div>
        ${isExpanded ? `
          <div class="cesta-dates">
            ${g.items.map(c => `
              <div class="cesta-date-row">
                <span>${formatDateBR(c.data)}</span>
                <button class="cesta-remove" data-cesta-id="${c.id}" title="Remover">✕</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  content.innerHTML = html;
  attachHistoricoEvents();
}

// ─── Helpers de render ────────────────────────────────────────────────────────

function renderTabs() {
  return `
    <div class="tab-bar">
      <button class="tab-btn ${currentView === 'por-data' ? 'active' : ''}" data-view="por-data">Por Data</button>
      <button class="tab-btn ${currentView === 'por-pessoa' ? 'active' : ''}" data-view="por-pessoa">Por Pessoa</button>
      <button class="tab-btn ${currentView === 'cestas' ? 'active' : ''}" data-view="cestas">Cestas</button>
    </div>
  `;
}

function renderSearch() {
  return `
    <input type="text" class="search-input" id="historico-search"
      placeholder="Buscar por nome..." value="${escapeHtml(searchTerm)}"
      style="margin-bottom:4px;">
  `;
}

function renderFilterPills() {
  return `
    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${currentFilter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.plural}</button>
      `).join('')}
    </div>
  `;
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

function attachHistoricoEvents() {
  // Tabs
  content.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      expandedPessoa = null;
      loadHistorico();
    });
  });

  // Search
  document.getElementById('historico-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    loadHistorico();
  });

  // Filter pills
  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadHistorico();
    });
  });

  // Accordion header (toggle expand, não entra em edit)
  content.querySelectorAll('.historico-card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Não expandir se clicou no botão Editar
      if (e.target.closest('.btn-editar-chamada')) return;
      const chamadaId = header.dataset.chamada;
      if (expandedDatas.has(chamadaId)) {
        expandedDatas.delete(chamadaId);
      } else {
        expandedDatas.add(chamadaId);
      }
      loadHistorico();
    });
  });

  // Botão Editar — entra/sai do modo edição e carrega estado
  content.querySelectorAll('.btn-editar-chamada').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const chamadaId = btn.dataset.chamada;

      if (editingData === chamadaId) {
        editingData = null;
        editState = {};
      } else {
        editingData = chamadaId;
        expandedDatas.add(chamadaId);

        const [presencas, pessoas] = await Promise.all([
          getPresencasByChamada(chamadaId),
          getPessoas(),
        ]);
        editState = {};
        for (const pr of presencas) {
          editState[pr.pessoa_id] = { presente: pr.presente, id: pr.id };
        }
        // Pessoas sem registro ficam com id: null, presente: false (não salvas até serem tocadas)
      }

      loadHistorico();
    });
  });

  // Toggle de presença no modo edição — auto-save individual
  content.querySelectorAll('.edit-hist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pessoaId = btn.dataset.pessoa;
      const chamadaId = btn.dataset.chamada;

      if (!editState[pessoaId]) editState[pessoaId] = { presente: false, id: null };
      const state = editState[pessoaId];

      btn.disabled = true;
      state.presente = !state.presente;
      btn.className = `presence-btn ${state.presente ? 'present' : 'absent'} edit-hist-btn`;
      btn.textContent = state.presente ? 'PRESENTE' : 'FALTA';
      btn.style.minWidth = '90px';
      btn.style.padding = '10px 12px';
      btn.style.fontSize = '13px';

      // Salva se marcou presente ou se já existia (atualiza falta)
      if (state.presente || state.id !== null) {
        const saved = await savePresenca({
          chamada_id: chamadaId,
          pessoa_id: pessoaId,
          presente: state.presente,
        });
        state.id = saved.id;
      }

      btn.disabled = false;
    });
  });

  // Concluir edição
  content.querySelectorAll('.concluir-edicao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingData = null;
      editState = {};
      loadHistorico();
    });
  });

  // Cestas accordion
  content.querySelectorAll('.cesta-header[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.toggle;
      expandedPessoa = expandedPessoa === id ? null : id;
      loadHistorico();
    });
  });

  content.querySelectorAll('.cesta-remove[data-cesta-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Remover esta entrega de cesta?')) return;
      await deleteCesta(btn.dataset.cestaId);
      loadHistorico();
    });
  });
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'historico') {
    editingData = null;
    editState = {};
    loadHistorico();
  }
});
