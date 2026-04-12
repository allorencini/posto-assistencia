import { getPessoas, getChamadas, getAllPresencas, getCestas, saveCesta } from './db.js';

const content = document.getElementById('ranking-content');
let currentFilter = 'todos';
let dateFrom = '';
let dateTo = '';

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

function threeMonthsAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function formatDateShortBR(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`;
}

async function loadRanking() {
  if (!dateFrom) dateFrom = threeMonthsAgoStr();
  if (!dateTo) dateTo = todayStr();

  const pessoas = await getPessoas();
  const chamadas = await getChamadas();
  const allPresencas = await getAllPresencas();
  const cestas = await getCestas();

  // Filter chamadas by date range
  const chamadasInRange = chamadas.filter(c => c.data >= dateFrom && c.data <= dateTo);
  const chamadaIds = new Set(chamadasInRange.map(c => c.id));
  const totalChamadas = chamadasInRange.length;

  // Count presences per person in range
  const presencaCount = {};
  for (const p of allPresencas) {
    if (!chamadaIds.has(p.chamada_id)) continue;
    if (!p.presente) continue;
    presencaCount[p.pessoa_id] = (presencaCount[p.pessoa_id] || 0) + 1;
  }

  // Aggregate cestas per person: total count + dates set
  const hoje = todayStr();
  const cestasInfo = {};
  for (const c of cestas) {
    const info = cestasInfo[c.pessoa_id] || { total: 0, datas: new Set() };
    info.total += 1;
    info.datas.add(c.data);
    cestasInfo[c.pessoa_id] = info;
  }

  // Filter pessoas
  const filtered = currentFilter === 'todos'
    ? pessoas
    : pessoas.filter(p => p.grupo === currentFilter);

  // Build ranking data
  const rankingData = filtered.map(p => {
    const info = cestasInfo[p.id] || { total: 0, datas: new Set() };
    return {
      ...p,
      presencas: presencaCount[p.id] || 0,
      pct: totalChamadas > 0 ? Math.round(((presencaCount[p.id] || 0) / totalChamadas) * 100) : 0,
      cestasTotal: info.total,
      recebeuHoje: info.datas.has(hoje),
    };
  });

  renderRanking(rankingData, totalChamadas);
}

function renderRanking(rankingData, totalChamadas) {
  let html = `
    <div class="date-picker">
      <div style="flex:1;position:relative;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-align:center;">De</div>
        <button class="date-input" style="width:100%;cursor:pointer;font-weight:600;">${formatDateShortBR(dateFrom)}</button>
        <input type="date" id="ranking-from" value="${dateFrom}"
          style="position:absolute;bottom:0;left:0;width:100%;height:48px;opacity:0;cursor:pointer;">
      </div>
      <div style="flex:1;position:relative;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-align:center;">Ate</div>
        <button class="date-input" style="width:100%;cursor:pointer;font-weight:600;">${formatDateShortBR(dateTo)}</button>
        <input type="date" id="ranking-to" value="${dateTo}"
          style="position:absolute;bottom:0;left:0;width:100%;height:48px;opacity:0;cursor:pointer;">
      </div>
    </div>

    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${currentFilter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.plural}</button>
      `).join('')}
    </div>

    <div class="counter">${totalChamadas} semana${totalChamadas !== 1 ? 's' : ''} no periodo</div>
  `;

  if (rankingData.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">🏆</div>
        <p>Nenhum dado de presenca no periodo selecionado.</p>
      </div>
    `;
    content.innerHTML = html;
    attachRankingEvents();
    return;
  }

  if (currentFilter === 'todos') {
    // Grouped by type
    for (const g of GRUPOS) {
      const groupData = rankingData
        .filter(p => p.grupo === g.value)
        .sort((a, b) => b.presencas - a.presencas || a.nome.localeCompare(b.nome));

      if (groupData.length === 0) continue;

      html += `<div class="group-label">${g.plural}</div>`;
      groupData.forEach((p, i) => {
        html += renderRankingRow(i + 1, p, totalChamadas);
      });
    }
  } else {
    // Single group, sorted by presences
    const sorted = rankingData.sort((a, b) => b.presencas - a.presencas || a.nome.localeCompare(b.nome));
    sorted.forEach((p, i) => {
      html += renderRankingRow(i + 1, p, totalChamadas);
    });
  }

  content.innerHTML = html;
  attachRankingEvents();
}

function renderRankingRow(position, pessoa, totalChamadas) {
  const colorClass = pessoa.pct >= 80 ? 'high' : pessoa.pct >= 50 ? 'mid' : 'low';
  const cestaBadge = pessoa.cestasTotal > 0
    ? `<div class="cesta-badge" title="${pessoa.cestasTotal} cesta${pessoa.cestasTotal !== 1 ? 's' : ''} recebida${pessoa.cestasTotal !== 1 ? 's' : ''}">🧺 ${pessoa.cestasTotal}</div>`
    : '';
  const btnCesta = pessoa.recebeuHoje
    ? `<button class="btn-cesta done" disabled>Entregue hoje</button>`
    : `<button class="btn-cesta" data-pessoa="${pessoa.id}">Entregar cesta</button>`;
  return `
    <div class="ranking-row">
      <div class="ranking-row-top">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
          <div class="ranking-pos">${position}</div>
          <div class="ranking-name">${escapeHtml(pessoa.nome)}</div>
        </div>
        <div class="ranking-stats">
          <div class="ranking-count ${colorClass}">${pessoa.presencas}/${totalChamadas}</div>
          <div class="ranking-pct">${pessoa.pct}%</div>
        </div>
      </div>
      <div class="ranking-row-bottom">
        ${cestaBadge}
        ${btnCesta}
      </div>
    </div>
  `;
}

function attachRankingEvents() {
  document.getElementById('ranking-from')?.addEventListener('change', (e) => {
    dateFrom = e.target.value;
    loadRanking();
  });

  document.getElementById('ranking-to')?.addEventListener('change', (e) => {
    dateTo = e.target.value;
    loadRanking();
  });

  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadRanking();
    });
  });

  content.querySelectorAll('.btn-cesta[data-pessoa]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pessoaId = btn.dataset.pessoa;
      btn.disabled = true;
      btn.textContent = 'Entregando...';
      await saveCesta({ pessoa_id: pessoaId, data: todayStr() });
      btn.textContent = 'Entregue!';
      btn.classList.add('done');
      setTimeout(() => loadRanking(), 600);
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
  if (e.detail.page === 'ranking') loadRanking();
});
