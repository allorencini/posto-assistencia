import {
  getPessoas, savePessoa, deletePessoa, getPessoa,
  getItens, getItem, saveItem, deleteItem
} from './db.js';

const content = document.getElementById('cadastro-content');
let currentSubtab = 'pessoas'; // 'pessoas' | 'itens'
let currentFilter = 'todos';

const GRUPOS = [
  { value: 'evangelizacao', label: 'Evangelização', plural: 'Evangelização' },
  { value: 'mocidade', label: 'Mocidade', plural: 'Mocidade' },
  { value: 'adulto', label: 'Adulto', plural: 'Adultos' },
  { value: 'gestante', label: 'Gestante', plural: 'Gestantes' },
];

const CATEGORIAS = [
  { value: 'alimento-doacao', label: 'Alimento (Doação)' },
  { value: 'alimento-interno', label: 'Alimento (Uso Interno)' },
  { value: 'limpeza', label: 'Limpeza' },
];

function renderSubtabs() {
  return `
    <div class="tab-bar">
      <button class="tab-btn ${currentSubtab === 'pessoas' ? 'active' : ''}" data-subtab="pessoas">Pessoas</button>
      <button class="tab-btn ${currentSubtab === 'itens' ? 'active' : ''}" data-subtab="itens">Itens</button>
    </div>
  `;
}

// === Pessoas ===

function renderPessoas(pessoas, filter) {
  const filtered = filter === 'todos'
    ? pessoas
    : pessoas.filter(p => p.grupo === filter);

  const grouped = {};
  for (const g of GRUPOS) grouped[g.value] = [];
  for (const p of filtered) {
    if (grouped[p.grupo]) grouped[p.grupo].push(p);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  let html = renderSubtabs();
  html += `
    <button class="btn btn-primary" id="btn-add-pessoa" style="margin-bottom:16px;">
      + CADASTRAR PESSOA
    </button>

    <input type="text" class="search-input" id="search-pessoas"
      placeholder="Buscar por nome...">

    <div class="group-filter">
      <button class="filter-pill ${filter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
      ${GRUPOS.map(g => `
        <button class="filter-pill ${filter === g.value ? 'active' : ''}" data-filter="${g.value}">${g.plural}</button>
      `).join('')}
    </div>
  `;

  let totalCount = 0;
  for (const g of GRUPOS) {
    const list = grouped[g.value];
    if (filter !== 'todos' && filter !== g.value) continue;
    if (list.length === 0) continue;

    totalCount += list.length;
    html += `<div class="group-label">${g.plural} (${list.length})</div>`;
    for (const p of list) {
      html += `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:17px;font-weight:500;">${escapeHtml(p.nome)}</div>
            ${p.telefone ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(p.telefone)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-icon" data-edit-pessoa="${p.id}" title="Editar" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✏️</button>
            <button class="btn-icon" data-delete-pessoa="${p.id}" title="Excluir" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">🗑️</button>
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

// === Itens ===

function renderItens(itens) {
  const grouped = { 'alimento-doacao': [], 'alimento-interno': [], limpeza: [] };
  for (const i of itens) {
    if (grouped[i.categoria]) grouped[i.categoria].push(i);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  let html = renderSubtabs();
  html += `
    <button class="btn btn-primary" id="btn-add-item" style="margin-bottom:16px;">
      + CADASTRAR ITEM
    </button>

    <input type="text" class="search-input" id="search-itens"
      placeholder="Buscar item...">
  `;

  let totalCount = 0;
  for (const cat of CATEGORIAS) {
    const list = grouped[cat.value];
    if (list.length === 0) continue;

    totalCount += list.length;
    html += `<div class="group-label">${cat.label} (${list.length})</div>`;
    for (const item of list) {
      html += `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:17px;font-weight:500;">${escapeHtml(item.nome)}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Quantidade: ${item.quantidade || 0}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-icon" data-edit-item="${item.id}" title="Editar" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✏️</button>
            <button class="btn-icon" data-delete-item="${item.id}" title="Excluir" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">🗑️</button>
          </div>
        </div>
      `;
    }
  }

  if (totalCount === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>Nenhum item cadastrado.</p>
      </div>
    `;
  }

  content.innerHTML = html;
  attachEvents();
}

function attachEvents() {
  // Subtab switch
  content.querySelectorAll('.tab-btn[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSubtab = btn.dataset.subtab;
      currentFilter = 'todos';
      loadPage();
    });
  });

  // Pessoas
  document.getElementById('btn-add-pessoa')?.addEventListener('click', () => showPessoaForm());

  document.getElementById('search-pessoas')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#cadastro-content .card').forEach(card => {
      const name = card.querySelector('div > div')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(term) ? '' : 'none';
    });
  });

  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadPage();
    });
  });

  content.querySelectorAll('[data-edit-pessoa]').forEach(btn => {
    btn.addEventListener('click', () => showPessoaForm(btn.dataset.editPessoa));
  });
  content.querySelectorAll('[data-delete-pessoa]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeletePessoa(btn.dataset.deletePessoa));
  });

  // Itens
  document.getElementById('btn-add-item')?.addEventListener('click', () => showItemForm());

  document.getElementById('search-itens')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#cadastro-content .card').forEach(card => {
      const name = card.querySelector('div > div')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(term) ? '' : 'none';
    });
  });

  content.querySelectorAll('[data-edit-item]').forEach(btn => {
    btn.addEventListener('click', () => showItemForm(btn.dataset.editItem));
  });
  content.querySelectorAll('[data-delete-item]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteItem(btn.dataset.deleteItem));
  });
}

function showPessoaForm(editId = null) {
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

function confirmDeletePessoa(id) {
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

function showItemForm(editId = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Editar' : 'Cadastrar'} Item</h2>
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" class="form-input" id="form-item-nome" placeholder="Ex: Arroz, Sabao" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Categoria *</label>
        <select class="form-input" id="form-item-categoria">
          ${CATEGORIAS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="item-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="item-save">SALVAR</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  if (editId) {
    getItem(editId).then(i => {
      if (!i) return;
      document.getElementById('form-item-nome').value = i.nome;
      document.getElementById('form-item-categoria').value = i.categoria;
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('item-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('item-save').addEventListener('click', async () => {
    const nome = document.getElementById('form-item-nome').value.trim();
    const categoria = document.getElementById('form-item-categoria').value;

    if (!nome) {
      document.getElementById('form-item-nome').style.borderColor = 'var(--red)';
      return;
    }

    const item = editId ? await getItem(editId) : { quantidade: 0 };
    item.nome = nome;
    item.categoria = categoria;

    await saveItem(item);
    overlay.remove();
    loadPage();
  });
}

function confirmDeleteItem(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Confirmar exclusao</h2>
      <p style="color:var(--text-secondary);margin-bottom:8px;">Tem certeza que deseja excluir este item? Ele desaparecera do Estoque.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="item-del-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="item-del-confirm" style="background:var(--red);">EXCLUIR</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('item-del-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('item-del-confirm').addEventListener('click', async () => {
    await deleteItem(id);
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
  if (currentSubtab === 'pessoas') {
    const pessoas = await getPessoas();
    renderPessoas(pessoas, currentFilter);
  } else {
    const itens = await getItens();
    renderItens(itens);
  }
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'cadastro') loadPage();
});

// Initial load
loadPage();
