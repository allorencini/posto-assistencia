import {
  getPessoas, getChamadas, getPresencasByChamada, getPresencasByPessoa
} from './db.js';

const content = document.getElementById('historico-content');
let currentView = 'por-data'; // 'por-data' or 'por-pessoa'
let currentFilter = 'todos';

const GRUPOS = [
  { value: 'crianca', label: 'Crianca' },
  { value: 'jovem', label: 'Jovem' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'gravida', label: 'Gravida' },
];

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

async function loadHistorico() {
  if (currentView === 'por-data') {
    await renderPorData();
  } else {
    await renderPorPessoa();
  }
}

async function renderPorData() {
  const chamadas = await getChamadas();
  chamadas.sort((a, b) => b.data.localeCompare(a.data)); // newest first

  let html = renderTabs();
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
    const pessoas = await getPessoas();
    const pessoaMap = {};
    for (const p of pessoas) pessoaMap[p.id] = p;

    // Filter by group
    const filteredPresencas = currentFilter === 'todos'
      ? presencas
      : presencas.filter(pr => pessoaMap[pr.pessoa_id]?.grupo === currentFilter);

    const presentes = filteredPresencas.filter(p => p.presente).length;
    const total = filteredPresencas.length;

    html += `
      <div class="card" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:17px;font-weight:600;">${formatDateBR(chamada.data)}</div>
          <div style="font-size:14px;color:var(--green);">${presentes}/${total} presentes</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${filteredPresencas.map(pr => {
            const pessoa = pessoaMap[pr.pessoa_id];
            if (!pessoa) return '';
            return `<span style="
              font-size:13px; padding:4px 10px; border-radius:12px;
              background:${pr.presente ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'};
              color:${pr.presente ? 'var(--green)' : 'var(--red)'};
            ">${escapeHtml(pessoa.nome)}</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  attachHistoricoEvents();
}

async function renderPorPessoa() {
  const pessoas = await getPessoas();
  const chamadas = await getChamadas();

  let html = renderTabs();
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

  const totalChamadas = chamadas.length;

  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (list.length === 0) continue;

    html += `<div class="group-label">${g.label}s</div>`;

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

  content.innerHTML = html;
  attachHistoricoEvents();
}

function renderTabs() {
  return `
    <div class="tab-bar">
      <button class="tab-btn ${currentView === 'por-data' ? 'active' : ''}" data-view="por-data">Por Data</button>
      <button class="tab-btn ${currentView === 'por-pessoa' ? 'active' : ''}" data-view="por-pessoa">Por Pessoa</button>
    </div>
  `;
}

function renderFilterPills() {
  return `
    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${currentFilter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.label}s</button>
      `).join('')}
    </div>
  `;
}

function attachHistoricoEvents() {
  content.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      loadHistorico();
    });
  });

  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadHistorico();
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
  if (e.detail.page === 'historico') loadHistorico();
});
