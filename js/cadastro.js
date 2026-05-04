import {
  getPessoas, savePessoa, deletePessoa, getPessoa, getAllPessoas,
  getItens, getItem, saveItem, deleteItem,
  getFamilias, getFamilia, saveFamilia, deleteFamilia
} from './db.js';

const content = document.getElementById('cadastro-content');
let currentSubtab = 'pessoas'; // 'pessoas' | 'itens' | 'familias'
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
      <button class="tab-btn ${currentSubtab === 'familias' ? 'active' : ''}" data-subtab="familias">Famílias</button>
    </div>
  `;
}

// === Pessoas ===

function renderPessoas(pessoas, filter, familias = []) {
  const familiaMap = {};
  for (const f of familias) familiaMap[f.id] = f;

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
      const badges = [];
      if (p.rua) badges.push('<span class="pessoa-badge" title="Endereco">📍</span>');
      if (p.visitada && p.apta_cesta === true) badges.push('<span class="pessoa-badge apta" title="Apta cesta">✅</span>');
      else if (p.visitada && p.apta_cesta === false) badges.push('<span class="pessoa-badge nao-apta" title="Nao apta">❌</span>');
      else if (!p.visitada) badges.push('<span class="pessoa-badge pendente" title="Aguardando visita">⏳</span>');
      html += `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:17px;font-weight:500;">${escapeHtml(p.nome)}</span>
              <span style="display:flex;gap:2px;font-size:14px;">${badges.join('')}</span>
            </div>
            ${p.telefone ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(p.telefone)}</div>` : ''}
            ${p.familia_id ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px;">👨‍👩‍👧 ${escapeHtml(familiaMap[p.familia_id]?.nome || '')}</div>` : ''}
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

// === Familias ===

function renderFamilias(familias, pessoas) {
  let html = renderSubtabs();
  html += `
    <button class="btn btn-primary" id="btn-add-familia" style="margin-bottom:16px;">
      + CADASTRAR FAMÍLIA
    </button>
  `;

  if (familias.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">👨‍👩‍👧</div>
        <p>Nenhuma família cadastrada.</p>
      </div>
    `;
    content.innerHTML = html;
    attachEvents();
    return;
  }

  for (const familia of familias) {
    const membros = pessoas.filter(p => p.familia_id === familia.id);
    const nomes = membros.map(p => p.nome).join(', ') || 'Sem membros';
    html += `
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:17px;font-weight:500;">👨‍👩‍👧 ${escapeHtml(familia.nome)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(nomes)}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-icon" data-edit-familia="${familia.id}" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✏️</button>
          <button class="btn-icon" data-delete-familia="${familia.id}" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">🗑️</button>
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  attachEvents();
}

function showFamiliaForm(editId = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Editar' : 'Cadastrar'} Família</h2>
      <div class="form-group">
        <label>Nome da família *</label>
        <input type="text" class="form-input" id="form-familia-nome" placeholder="Ex: Silva, Oliveira..." autocomplete="off">
      </div>
      <div class="form-group">
        <label>Adicionar membros</label>
        <input type="text" class="form-input" id="familia-busca" placeholder="Buscar pessoa...">
        <div id="familia-busca-resultados" style="background:#111827;border:1px solid #333;border-radius:8px;margin-top:4px;display:none;max-height:140px;overflow-y:auto;"></div>
      </div>
      <div class="form-group">
        <label id="familia-membros-label">Membros (0)</label>
        <div id="familia-membros-lista"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="familia-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="familia-save">SALVAR</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Força uppercase em tempo real no campo nome da família
  const famNomeInput = document.getElementById('form-familia-nome');
  famNomeInput.addEventListener('input', () => {
    const pos = famNomeInput.selectionStart;
    famNomeInput.value = famNomeInput.value.toUpperCase();
    famNomeInput.setSelectionRange(pos, pos);
  });

  let membros = [];

  function renderMembros() {
    const lista = document.getElementById('familia-membros-lista');
    document.getElementById('familia-membros-label').textContent = `Membros (${membros.length})`;
    if (membros.length === 0) {
      lista.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:8px 0;">Nenhum membro adicionado.</div>';
      return;
    }
    lista.innerHTML = membros.map(m => `
      <div style="background:#111827;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:14px;">${escapeHtml(m.nome)}</span>
        <button data-remove-membro="${m.id}" style="background:transparent;color:var(--red);border:none;font-size:18px;cursor:pointer;padding:4px;">✕</button>
      </div>
    `).join('');
    lista.querySelectorAll('[data-remove-membro]').forEach(btn => {
      btn.addEventListener('click', () => {
        membros = membros.filter(m => m.id !== btn.dataset.removeMembro);
        renderMembros();
      });
    });
  }
  renderMembros();

  const buscaInput = document.getElementById('familia-busca');
  const resultados = document.getElementById('familia-busca-resultados');

  async function showResultados(term) {
    const todas = await getPessoas();
    const matches = todas.filter(p =>
      (!term || p.nome.toLowerCase().includes(term)) && !membros.find(m => m.id === p.id)
    ).slice(0, 10);
    if (matches.length === 0) { resultados.style.display = 'none'; return; }
    resultados.style.display = '';
    resultados.innerHTML = matches.map(p => `
      <div data-pick-pessoa="${p.id}" data-pick-nome="${escapeHtml(p.nome)}"
        style="padding:10px 14px;cursor:pointer;color:#fff;font-size:14px;border-bottom:1px solid #222;">
        ${escapeHtml(p.nome)}
      </div>
    `).join('');
    resultados.querySelectorAll('[data-pick-pessoa]').forEach(item => {
      item.addEventListener('click', () => {
        membros.push({ id: item.dataset.pickPessoa, nome: item.dataset.pickNome });
        renderMembros();
        buscaInput.value = '';
        resultados.style.display = 'none';
      });
    });
  }

  buscaInput.addEventListener('input', () => {
    const term = buscaInput.value.toLowerCase().trim();
    if (!term) { resultados.style.display = 'none'; return; }
    showResultados(term);
  });


  if (editId) {
    Promise.all([getFamilia(editId), getPessoas()]).then(([familia, todas]) => {
      if (!familia) return;
      document.getElementById('form-familia-nome').value = familia.nome;
      membros = todas.filter(p => p.familia_id === editId).map(p => ({ id: p.id, nome: p.nome }));
      renderMembros();
    });
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('familia-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('familia-save').addEventListener('click', async () => {
    const nome = document.getElementById('form-familia-nome').value.trim().toUpperCase();
    if (!nome) {
      document.getElementById('form-familia-nome').style.borderColor = 'var(--red)';
      return;
    }

    const familia = editId ? await getFamilia(editId) : {};
    familia.nome = nome;
    const saved = await saveFamilia(familia);

    const todasPessoas = await getAllPessoas();
    const membroIds = new Set(membros.map(m => m.id));

    for (const p of todasPessoas) {
      const eraMembroAntes = p.familia_id === saved.id;
      const eMembroAgora = membroIds.has(p.id);
      if (eraMembroAntes && !eMembroAgora) {
        p.familia_id = null;
        await savePessoa(p);
      } else if (!eraMembroAntes && eMembroAgora) {
        p.familia_id = saved.id;
        await savePessoa(p);
      }
    }

    overlay.remove();
    window.showToast(editId ? 'Família atualizada!' : 'Família cadastrada!');
    loadPage();
  });
}

function confirmDeleteFamilia(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Confirmar exclusao</h2>
      <p style="color:var(--text-secondary);margin-bottom:8px;">Excluir esta família? Os membros não serão apagados.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="familia-del-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="familia-del-confirm" style="background:var(--red);">EXCLUIR</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('familia-del-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('familia-del-confirm').addEventListener('click', async () => {
    await deleteFamilia(id);
    overlay.remove();
    window.showToast('Família removida.');
    loadPage();
  });
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

  // Famílias
  document.getElementById('btn-add-familia')?.addEventListener('click', () => showFamiliaForm());
  content.querySelectorAll('[data-edit-familia]').forEach(btn => {
    btn.addEventListener('click', () => showFamiliaForm(btn.dataset.editFamilia));
  });
  content.querySelectorAll('[data-delete-familia]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteFamilia(btn.dataset.deleteFamilia));
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

      <div class="form-section-label">Endereco</div>
      <div class="form-group">
        <label>Rua</label>
        <input type="text" class="form-input" id="form-rua" placeholder="(opcional)">
      </div>
      <div style="display:flex;gap:8px;">
        <div class="form-group" style="flex:1;">
          <label>Numero</label>
          <input type="text" class="form-input" id="form-numero" placeholder="N">
        </div>
        <div class="form-group" style="flex:2;">
          <label>Complemento</label>
          <input type="text" class="form-input" id="form-complemento" placeholder="Apto, bloco...">
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <div class="form-group" style="flex:2;">
          <label>Bairro</label>
          <input type="text" class="form-input" id="form-bairro" placeholder="(opcional)">
        </div>
        <div class="form-group" style="flex:1;">
          <label>CEP</label>
          <input type="text" class="form-input" id="form-cep" placeholder="00000-000" maxlength="9">
        </div>
      </div>

      <div class="form-section-label">Visita Assistente Social</div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="form-visitada"> Visitada pela assistente social
        </label>
      </div>
      <div id="visita-fields" style="display:none;">
        <div class="form-group">
          <label>Apta para cesta?</label>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" name="apta_cesta" value="sim"> Sim</label>
            <label class="radio-label"><input type="radio" name="apta_cesta" value="nao"> Nao</label>
          </div>
        </div>
        <div id="obs-field" style="display:none;">
          <div class="form-group">
            <label>Observacao</label>
            <textarea class="form-input" id="form-visita-obs" rows="2" placeholder="Motivo..."></textarea>
          </div>
        </div>
      </div>

      <div class="form-section-label">Família</div>
      <div class="form-group">
        <label>Família (opcional)</label>
        <select class="form-input" id="form-pessoa-familia">
          <option value="">— Sem família —</option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="form-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="form-save">SALVAR</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Força uppercase em tempo real no campo nome
  const nomeInput = document.getElementById('form-nome');
  nomeInput.addEventListener('input', () => {
    const pos = nomeInput.selectionStart;
    nomeInput.value = nomeInput.value.toUpperCase();
    nomeInput.setSelectionRange(pos, pos);
  });

  // Carregar famílias no select
  getFamilias().then(familias => {
    const sel = document.getElementById('form-pessoa-familia');
    for (const f of familias) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.nome;
      sel.appendChild(opt);
    }
  });

  // CEP mask
  const cepInput = document.getElementById('form-cep');
  cepInput.addEventListener('input', () => {
    let v = cepInput.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    cepInput.value = v;
  });

  // Visitada toggle
  const visitadaCheck = document.getElementById('form-visitada');
  const visitaFields = document.getElementById('visita-fields');
  visitadaCheck.addEventListener('change', () => {
    visitaFields.style.display = visitadaCheck.checked ? '' : 'none';
  });

  // Apta cesta radio toggle
  const obsField = document.getElementById('obs-field');
  overlay.querySelectorAll('input[name="apta_cesta"]').forEach(radio => {
    radio.addEventListener('change', () => {
      obsField.style.display = radio.value === 'nao' && radio.checked ? '' : 'none';
    });
  });

  if (editId) {
    getPessoa(editId).then(p => {
      if (!p) return;
      document.getElementById('form-nome').value = p.nome;
      document.getElementById('form-grupo').value = p.grupo;
      document.getElementById('form-telefone').value = p.telefone || '';
      document.getElementById('form-rua').value = p.rua || '';
      document.getElementById('form-numero').value = p.numero || '';
      document.getElementById('form-complemento').value = p.complemento || '';
      document.getElementById('form-bairro').value = p.bairro || '';
      document.getElementById('form-cep').value = p.cep || '';
      if (p.visitada) {
        visitadaCheck.checked = true;
        visitaFields.style.display = '';
        if (p.apta_cesta === true) {
          overlay.querySelector('input[name="apta_cesta"][value="sim"]').checked = true;
        } else if (p.apta_cesta === false) {
          overlay.querySelector('input[name="apta_cesta"][value="nao"]').checked = true;
          obsField.style.display = '';
        }
        document.getElementById('form-visita-obs').value = p.visita_obs || '';
      }
      document.getElementById('form-pessoa-familia').value = p.familia_id || '';
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('form-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('form-save').addEventListener('click', async () => {
    const nome = document.getElementById('form-nome').value.trim().toUpperCase();
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
    pessoa.rua = document.getElementById('form-rua').value.trim() || null;
    pessoa.numero = document.getElementById('form-numero').value.trim() || null;
    pessoa.complemento = document.getElementById('form-complemento').value.trim() || null;
    pessoa.bairro = document.getElementById('form-bairro').value.trim() || null;
    pessoa.cep = document.getElementById('form-cep').value.trim() || null;
    pessoa.visitada = visitadaCheck.checked;
    const aptaRadio = overlay.querySelector('input[name="apta_cesta"]:checked');
    pessoa.apta_cesta = pessoa.visitada && aptaRadio ? aptaRadio.value === 'sim' : null;
    pessoa.visita_obs = pessoa.visitada && pessoa.apta_cesta === false
      ? document.getElementById('form-visita-obs').value.trim() || null
      : null;
    const familiaId = document.getElementById('form-pessoa-familia').value;
    pessoa.familia_id = familiaId || null;

    await savePessoa(pessoa);
    overlay.remove();
    window.showToast(editId ? 'Pessoa atualizada!' : 'Pessoa cadastrada!');
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
    window.showToast('Pessoa removida.');
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

  // Força uppercase em tempo real no campo nome do item
  const itemNomeInput = document.getElementById('form-item-nome');
  itemNomeInput.addEventListener('input', () => {
    const pos = itemNomeInput.selectionStart;
    itemNomeInput.value = itemNomeInput.value.toUpperCase();
    itemNomeInput.setSelectionRange(pos, pos);
  });

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
    const nome = document.getElementById('form-item-nome').value.trim().toUpperCase();
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
    window.showToast(editId ? 'Item atualizado!' : 'Item cadastrado!');
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
    window.showToast('Item removido.');
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
    const [pessoas, familias] = await Promise.all([getPessoas(), getFamilias()]);
    renderPessoas(pessoas, currentFilter, familias);
  } else if (currentSubtab === 'itens') {
    const itens = await getItens();
    renderItens(itens);
  } else {
    const [familias, pessoas] = await Promise.all([getFamilias(), getPessoas()]);
    renderFamilias(familias, pessoas);
  }
}

// Load on page enter
window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'cadastro') loadPage();
});

// Initial load
loadPage();
