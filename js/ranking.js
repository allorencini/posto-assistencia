import { getPessoas, getChamadas, getAllPresencas, getCestas, saveCesta, getFamilias } from './db.js';

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

  const [pessoas, chamadas, allPresencas, cestas, familias] = await Promise.all([
    getPessoas(), getChamadas(), getAllPresencas(), getCestas(), getFamilias()
  ]);

  const chamadasInRange = chamadas.filter(c => c.data >= dateFrom && c.data <= dateTo);
  const chamadaIds = new Set(chamadasInRange.map(c => c.id));
  const totalChamadas = chamadasInRange.length;
  const hoje = todayStr();

  // Presença individual
  const presencaCount = {};
  for (const p of allPresencas) {
    if (!chamadaIds.has(p.chamada_id) || !p.presente) continue;
    presencaCount[p.pessoa_id] = (presencaCount[p.pessoa_id] || 0) + 1;
  }

  // Cestas individuais
  const cestasInfo = {};
  for (const c of cestas) {
    const info = cestasInfo[c.pessoa_id] || { total: 0, datas: new Set() };
    info.total += 1;
    info.datas.add(c.data);
    cestasInfo[c.pessoa_id] = info;
  }

  // Membros por família
  const familyMembers = {};
  for (const p of pessoas) {
    if (!p.familia_id) continue;
    if (!familyMembers[p.familia_id]) familyMembers[p.familia_id] = [];
    familyMembers[p.familia_id].push(p);
  }

  const entries = [];

  // Entradas de família
  for (const familia of familias) {
    const members = familyMembers[familia.id];
    if (!members || members.length === 0) continue;

    if (currentFilter !== 'todos') {
      const hasMatch = members.some(m => m.grupo === currentFilter);
      if (!hasMatch) continue;
    }

    const memberIds = new Set(members.map(m => m.id));
    let famPresencas = 0;
    for (const chamadaId of chamadaIds) {
      const anyPresent = allPresencas.some(p =>
        p.chamada_id === chamadaId && memberIds.has(p.pessoa_id) && p.presente
      );
      if (anyPresent) famPresencas++;
    }

    const famDatas = new Set();
    for (const c of cestas) {
      if (memberIds.has(c.pessoa_id)) famDatas.add(c.data);
    }

    entries.push({
      type: 'familia',
      id: familia.id,
      nome: familia.nome,
      members,
      presencas: famPresencas,
      pct: totalChamadas > 0 ? Math.round((famPresencas / totalChamadas) * 100) : 0,
      cestasTotal: famDatas.size,
      recebeuHoje: famDatas.has(hoje),
    });
  }

  // Entradas individuais (sem família)
  const pessoasSemFamilia = pessoas.filter(p => !p.familia_id);
  const filteredIndividuais = currentFilter === 'todos'
    ? pessoasSemFamilia
    : pessoasSemFamilia.filter(p => p.grupo === currentFilter);

  for (const p of filteredIndividuais) {
    const info = cestasInfo[p.id] || { total: 0, datas: new Set() };
    entries.push({
      type: 'individual',
      id: p.id,
      nome: p.nome,
      presencas: presencaCount[p.id] || 0,
      pct: totalChamadas > 0 ? Math.round(((presencaCount[p.id] || 0) / totalChamadas) * 100) : 0,
      cestasTotal: info.total,
      recebeuHoje: info.datas.has(hoje),
    });
  }

  entries.sort((a, b) => b.pct - a.pct || a.nome.localeCompare(b.nome));
  renderRanking(entries, totalChamadas);
}

function renderRanking(entries, totalChamadas) {
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

  if (entries.length === 0) {
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

  entries.forEach((entry, i) => {
    html += entry.type === 'familia'
      ? renderFamiliaRow(i + 1, entry, totalChamadas)
      : renderRankingRow(i + 1, entry, totalChamadas);
  });

  content.innerHTML = html;
  attachRankingEvents();
}

function renderFamiliaRow(position, familia, totalChamadas) {
  const colorClass = familia.pct >= 80 ? 'high' : familia.pct >= 50 ? 'mid' : 'low';
  const memberNames = familia.members.map(m => m.nome.split(' ')[0]).join(' · ');
  const cestaBadge = familia.cestasTotal > 0
    ? `<div class="cesta-badge">🧺 ${familia.cestasTotal} ${familia.cestasTotal !== 1 ? 'entregas' : 'entrega'}</div>`
    : '';
  const btnCesta = familia.recebeuHoje
    ? `<button class="btn-cesta done" disabled>Entregue hoje</button>`
    : `<button class="btn-cesta-familia" data-familia="${familia.id}" data-familia-nome="${escapeHtml(familia.nome)}">Entregar cesta família</button>`;

  return `
    <div class="ranking-row familia">
      <div class="ranking-row-top">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
          <div class="ranking-pos">${position}</div>
          <div>
            <div class="ranking-name">👨‍👩‍👧 ${escapeHtml(familia.nome)}</div>
            <div class="ranking-familia-members">${escapeHtml(memberNames)}</div>
          </div>
        </div>
        <div class="ranking-stats">
          <div class="ranking-count ${colorClass}">${familia.presencas}/${totalChamadas}</div>
          <div class="ranking-pct">${familia.pct}%</div>
        </div>
      </div>
      <div class="ranking-row-bottom">
        ${cestaBadge}
        ${btnCesta}
      </div>
    </div>
  `;
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
          <div class="ranking-name">👤 ${escapeHtml(pessoa.nome)}</div>
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
      window.showToast('Cesta registrada!');
      setTimeout(() => loadRanking(), 600);
    });
  });

  content.querySelectorAll('.btn-cesta-familia[data-familia]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const familiaId = btn.dataset.familia;
      const familiaNome = btn.dataset.familiaNome;
      btn.disabled = true;
      btn.textContent = 'Entregando...';

      const todas = await getPessoas();
      const membros = todas.filter(p => p.familia_id === familiaId);
      for (const membro of membros) {
        await saveCesta({ pessoa_id: membro.id, data: todayStr() });
      }

      btn.textContent = 'Entregue!';
      btn.classList.add('done');
      window.showToast(`Cesta entregue para família ${familiaNome}!`);
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
