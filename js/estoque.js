import { getItens, updateItemQuantidade } from './db.js';

const content = document.getElementById('estoque-content');
let currentFilter = 'todos'; // 'todos' | 'alimento' | 'limpeza'

const CATEGORIAS = [
  { value: 'alimento', label: 'Alimentos' },
  { value: 'limpeza', label: 'Limpeza' },
];

async function loadEstoque() {
  const itens = await getItens();
  render(itens);
}

function render(itens) {
  const filtered = currentFilter === 'todos'
    ? itens
    : itens.filter(i => i.categoria === currentFilter);

  const grouped = { alimento: [], limpeza: [] };
  for (const i of filtered) {
    if (grouped[i.categoria]) grouped[i.categoria].push(i);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  let html = `
    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${CATEGORIAS.map(c => `
        <button class="filter-pill ${currentFilter === c.value ? 'active' : ''}" data-filter="${c.value}">${c.label}</button>
      `).join('')}
    </div>
  `;

  let totalCount = 0;
  for (const cat of CATEGORIAS) {
    const list = grouped[cat.value];
    if (list.length === 0) continue;

    totalCount += list.length;
    html += `<div class="group-label">${cat.label} (${list.length})</div>`;

    for (const item of list) {
      const qtd = item.quantidade || 0;
      html += `
        <div class="estoque-row" data-item="${item.id}">
          <div class="estoque-nome">${escapeHtml(item.nome)}</div>
          <div class="qtd-controls">
            <button class="qtd-btn" data-action="dec" data-id="${item.id}">−</button>
            <input type="number" class="qtd-input" data-id="${item.id}" value="${qtd}" min="0" inputmode="numeric">
            <button class="qtd-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>
      `;
    }
  }

  if (totalCount === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>Nenhum item cadastrado.<br>Va em <strong>Cadastros &gt; Itens</strong> para adicionar.</p>
      </div>
    `;
  }

  content.innerHTML = html;
  attachEvents();
}

function attachEvents() {
  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadEstoque();
    });
  });

  content.querySelectorAll('.qtd-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const input = content.querySelector(`.qtd-input[data-id="${id}"]`);
      if (!input) return;

      const current = parseInt(input.value, 10) || 0;
      const novo = action === 'inc' ? current + 1 : Math.max(0, current - 1);
      input.value = novo;

      await updateItemQuantidade(id, novo);
    });
  });

  content.querySelectorAll('.qtd-input').forEach(input => {
    input.addEventListener('change', async () => {
      const id = input.dataset.id;
      let novo = parseInt(input.value, 10);
      if (isNaN(novo) || novo < 0) novo = 0;
      input.value = novo;
      await updateItemQuantidade(id, novo);
    });

    input.addEventListener('focus', () => input.select());
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'estoque') loadEstoque();
});
