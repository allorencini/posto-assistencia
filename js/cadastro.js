import { getPessoas, savePessoa, deletePessoa, getPessoa } from './db.js';

const content = document.getElementById('cadastro-content');
let currentFilter = 'todos';

const GRUPOS = [
  { value: 'crianca', label: 'Crianca' },
  { value: 'jovem', label: 'Jovem' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'gravida', label: 'Gravida' },
];

function render(pessoas, filter) {
  const filtered = filter === 'todos'
    ? pessoas
    : pessoas.filter(p => p.grupo === filter);

  const grouped = {};
  for (const g of GRUPOS) grouped[g.value] = [];
  for (const p of filtered) {
    if (grouped[p.grupo]) grouped[p.grupo].push(p);
  }

  // Sort each group alphabetically
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  let html = `
    <button class="btn btn-primary" id="btn-add-pessoa" style="margin-bottom:16px;">
      + CADASTRAR PESSOA
    </button>

    <input type="text" class="search-input" id="search-pessoas"
      placeholder="Buscar por nome...">

    <div class="group-filter">
      <button class="filter-pill ${filter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${filter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.label}s</button>
      `).join('')}
    </div>
  `;

  let totalCount = 0;
  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (filter !== 'todos' && filter !== g.value) continue;
    if (list.length === 0) continue;

    totalCount += list.length;
    html += `<div class="group-label">${g.label}s (${list.length})</div>`;
    for (const p of list) {
      html += `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:17px;font-weight:500;">${escapeHtml(p.nome)}</div>
            ${p.telefone ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(p.telefone)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-icon" data-edit="${p.id}" title="Editar" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✏️</button>
            <button class="btn-icon" data-delete="${p.id}" title="Excluir" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">🗑️</button>
          </div>
        </div>
      `;
    }
  }

  if (totalCount === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">👥</div>
        <p>Nenhuma pessoa cadastrada${filter !== 'todos' ? ' neste grupo' : ''}.</p>
      </div>
    `;
  }

  content.innerHTML = html;
  attachEvents();
}

function attachEvents() {
  // Add button
  document.getElementById('btn-add-pessoa')?.addEventListener('click', () => showForm());

  // Search
  document.getElementById('search-pessoas')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#cadastro-content .card').forEach(card => {
      const name = card.querySelector('div > div')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(term) ? '' : 'none';
    });
  });

  // Filter pills
  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadPage();
    });
  });

  // Edit buttons
  content.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => showForm(btn.dataset.edit));
  });

  // Delete buttons
  content.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.delete));
  });
}

function showForm(editId = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Editar' : 'Cadastrar'} Pessoa</h2>
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" class="form-input" id="form-nome" placeholder="Nome completo" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Grupo *</label>
        <select class="form-input" id="form-grupo">
          ${GRUPOS.map(g => `<option value="${g.value}">${g.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="tel" class="form-input" id="form-telefone" placeholder="(opcional)">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="form-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="form-save">SALVAR</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // If editing, fill form
  if (editId) {
    getPessoa(editId).then(p => {
      if (!p) return;
      document.getElementById('form-nome').value = p.nome;
      document.getElementById('form-grupo').value = p.grupo;
      document.getElementById('form-telefone').value = p.telefone || '';
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('form-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('form-save').addEventListener('click', async () => {
    const nome = document.getElementById('form-nome').value.trim();
    const grupo = document.getElementById('form-grupo').value;
    const telefone = document.getElementById('form-telefone').value.trim();

    if (!nome) {
      document.getElementById('form-nome').style.borderColor = 'var(--red)';
      return;
    }

    const pessoa = editId ? await getPessoa(editId) : {};
    pessoa.nome = nome;
    pessoa.grupo = grupo;
    pessoa.telefone = telefone || null;

    await savePessoa(pessoa);
    overlay.remove();
    loadPage();
  });
}

function confirmDelete(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Confirmar exclusao</h2>
      <p style="color:var(--text-secondary);margin-bottom:8px;">Tem certeza que deseja excluir esta pessoa? O historico de presenca sera mantido.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="del-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="del-confirm" style="background:var(--red);">EXCLUIR</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('del-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('del-confirm').addEventListener('click', async () => {
    await deletePessoa(id);
    overlay.remove();
    loadPage();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadPage() {
  const pessoas = await getPessoas();
  render(pessoas, currentFilter);
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'cadastro') loadPage();
});

// Initial load
loadPage();
