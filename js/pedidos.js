import {
  getPedidos, getPedido, savePedido, deletePedido,
  getPessoas, getFamilias
} from './db.js';

const content = document.getElementById('pedidos-content');
let currentFilter = 'pendente'; // 'todos' | 'pendente' | 'atendido'

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

async function loadPedidos() {
  const [pedidos, pessoas, familias] = await Promise.all([
    getPedidos(), getPessoas(), getFamilias()
  ]);

  const pessoaMap = {};
  for (const p of pessoas) pessoaMap[p.id] = p;
  const familiaMap = {};
  for (const f of familias) familiaMap[f.id] = f;

  renderPedidos(pedidos, pessoaMap, familiaMap);
}

function renderPedidos(pedidos, pessoaMap, familiaMap) {
  const filtered = currentFilter === 'todos'
    ? pedidos
    : pedidos.filter(p => p.status === currentFilter);

  filtered.sort((a, b) => (b.solicitado_em || '').localeCompare(a.solicitado_em || ''));

  const totalPendentes = pedidos.filter(p => p.status === 'pendente').length;
  const totalAtendidos = pedidos.filter(p => p.status === 'atendido').length;

  let html = `
    <button class="btn btn-primary" id="btn-add-pedido" style="margin-bottom:16px;">
      + NOVO PEDIDO
    </button>

    <div class="group-filter">
      <button class="filter-pill ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos (${pedidos.length})</button>
      <button class="filter-pill ${currentFilter === 'pendente' ? 'active' : ''}" data-filter="pendente">Pendentes (${totalPendentes})</button>
      <button class="filter-pill ${currentFilter === 'atendido' ? 'active' : ''}" data-filter="atendido">Atendidos (${totalAtendidos})</button>
    </div>
  `;

  if (filtered.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">🎁</div>
        <p>Nenhum pedido ${currentFilter === 'pendente' ? 'pendente' : currentFilter === 'atendido' ? 'atendido' : 'cadastrado'}.</p>
      </div>
    `;
    content.innerHTML = html;
    attachEvents();
    return;
  }

  for (const pedido of filtered) {
    const pessoa = pedido.pessoa_id ? pessoaMap[pedido.pessoa_id] : null;
    const familia = pedido.familia_id ? familiaMap[pedido.familia_id] : null;
    const titulo = familia
      ? `👨‍👩‍👧 Família ${escapeHtml(familia.nome)}`
      : pessoa
        ? `👤 ${escapeHtml(pessoa.nome)}`
        : '<em style="color:var(--text-muted);">— sem destinatário —</em>';

    const isPendente = pedido.status === 'pendente';
    const statusBadge = isPendente
      ? '<span class="status-badge pendente">Pendente</span>'
      : `<span class="status-badge atendido">Atendido em ${formatDateBR(pedido.atendido_em)}</span>`;

    const qtdTxt = pedido.quantidade > 1 ? ` (${pedido.quantidade})` : '';

    html += `
      <div class="card pedido-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="min-width:0;flex:1;">
            <div style="font-size:15px;color:var(--text-muted);margin-bottom:4px;">${titulo}</div>
            <div style="font-size:17px;font-weight:600;">${escapeHtml(pedido.item)}${qtdTxt}</div>
            ${pedido.observacao ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${escapeHtml(pedido.observacao)}</div>` : ''}
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">Solicitado em ${formatDateBR(pedido.solicitado_em)}</div>
            <div style="margin-top:8px;">${statusBadge}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${isPendente ? `<button class="btn-icon" data-atender-pedido="${pedido.id}" title="Marcar atendido" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✅</button>` : ''}
            <button class="btn-icon" data-edit-pedido="${pedido.id}" title="Editar" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">✏️</button>
            <button class="btn-icon" data-delete-pedido="${pedido.id}" title="Excluir" style="font-size:20px;background:none;border:none;cursor:pointer;padding:8px;">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  attachEvents();
}

function attachEvents() {
  document.getElementById('btn-add-pedido')?.addEventListener('click', () => showPedidoForm());

  content.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentFilter = pill.dataset.filter;
      loadPedidos();
    });
  });

  content.querySelectorAll('[data-atender-pedido]').forEach(btn => {
    btn.addEventListener('click', () => atenderPedido(btn.dataset.atenderPedido));
  });

  content.querySelectorAll('[data-edit-pedido]').forEach(btn => {
    btn.addEventListener('click', () => showPedidoForm(btn.dataset.editPedido));
  });

  content.querySelectorAll('[data-delete-pedido]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeletePedido(btn.dataset.deletePedido));
  });
}

function showPedidoForm(editId = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${editId ? 'Editar' : 'Novo'} Pedido</h2>

      <div class="form-group">
        <label>Destinatário</label>
        <div class="radio-group">
          <label class="radio-label"><input type="radio" name="dest-tipo" value="pessoa" checked> Pessoa</label>
          <label class="radio-label"><input type="radio" name="dest-tipo" value="familia"> Família</label>
        </div>
      </div>

      <div class="form-group">
        <label id="dest-label">Pessoa *</label>
        <input type="text" class="form-input" id="dest-busca" placeholder="Buscar..." autocomplete="off">
        <div id="dest-resultados" style="background:#111827;border:1px solid #333;border-radius:8px;margin-top:4px;display:none;max-height:140px;overflow-y:auto;"></div>
        <div id="dest-selecionado" style="margin-top:6px;display:none;background:#111827;border-radius:8px;padding:10px 14px;font-size:14px;color:#fff;"></div>
      </div>

      <div class="form-group">
        <label>Item solicitado *</label>
        <input type="text" class="form-input" id="form-item" placeholder="Ex: Colchão, Geladeira, Roupa de cama..." autocomplete="off">
      </div>

      <div class="form-group" style="max-width:140px;">
        <label>Quantidade</label>
        <input type="number" class="form-input" id="form-qtd" value="1" min="1">
      </div>

      <div class="form-group">
        <label>Observação</label>
        <textarea class="form-input" id="form-obs" rows="2" placeholder="(opcional)"></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="form-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="form-save">SALVAR</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let destTipo = 'pessoa';
  let destId = null;
  let destNome = '';

  const buscaInput = document.getElementById('dest-busca');
  const resultados = document.getElementById('dest-resultados');
  const selecionado = document.getElementById('dest-selecionado');
  const destLabel = document.getElementById('dest-label');

  function clearSelecionado() {
    destId = null;
    destNome = '';
    selecionado.style.display = 'none';
    selecionado.innerHTML = '';
    buscaInput.style.display = '';
  }

  function showSelecionado() {
    selecionado.style.display = '';
    selecionado.innerHTML = `${destTipo === 'familia' ? '👨‍👩‍👧' : '👤'} ${escapeHtml(destNome)} <button id="dest-trocar" style="float:right;background:transparent;color:var(--text-muted);border:none;cursor:pointer;font-size:13px;">trocar</button>`;
    buscaInput.style.display = 'none';
    document.getElementById('dest-trocar').addEventListener('click', () => {
      clearSelecionado();
      buscaInput.value = '';
      buscaInput.focus();
    });
  }

  overlay.querySelectorAll('input[name="dest-tipo"]').forEach(radio => {
    radio.addEventListener('change', () => {
      destTipo = radio.value;
      destLabel.textContent = destTipo === 'familia' ? 'Família *' : 'Pessoa *';
      buscaInput.placeholder = destTipo === 'familia' ? 'Buscar família...' : 'Buscar pessoa...';
      clearSelecionado();
      buscaInput.value = '';
      resultados.style.display = 'none';
    });
  });

  buscaInput.addEventListener('input', async () => {
    const term = buscaInput.value.toLowerCase().trim();
    if (!term) { resultados.style.display = 'none'; return; }

    const fetchFn = destTipo === 'familia' ? getFamilias : getPessoas;
    const list = await fetchFn();
    const matches = list
      .filter(x => x.nome.toLowerCase().includes(term))
      .slice(0, 6);

    if (matches.length === 0) { resultados.style.display = 'none'; return; }

    resultados.style.display = '';
    resultados.innerHTML = matches.map(x => `
      <div data-pick-id="${x.id}" data-pick-nome="${escapeHtml(x.nome)}"
        style="padding:10px 14px;cursor:pointer;color:#fff;font-size:14px;border-bottom:1px solid #222;">
        ${destTipo === 'familia' ? '👨‍👩‍👧' : '👤'} ${escapeHtml(x.nome)}
      </div>
    `).join('');
    resultados.querySelectorAll('[data-pick-id]').forEach(item => {
      item.addEventListener('click', () => {
        destId = item.dataset.pickId;
        destNome = item.dataset.pickNome;
        showSelecionado();
        buscaInput.value = '';
        resultados.style.display = 'none';
      });
    });
  });

  if (editId) {
    Promise.all([getPedido(editId), getPessoas(), getFamilias()]).then(([pedido, pessoas, familias]) => {
      if (!pedido) return;
      document.getElementById('form-item').value = pedido.item || '';
      document.getElementById('form-qtd').value = pedido.quantidade || 1;
      document.getElementById('form-obs').value = pedido.observacao || '';

      if (pedido.familia_id) {
        const fam = familias.find(f => f.id === pedido.familia_id);
        if (fam) {
          destTipo = 'familia';
          destId = fam.id;
          destNome = fam.nome;
          overlay.querySelector('input[name="dest-tipo"][value="familia"]').checked = true;
          destLabel.textContent = 'Família *';
          showSelecionado();
        }
      } else if (pedido.pessoa_id) {
        const p = pessoas.find(x => x.id === pedido.pessoa_id);
        if (p) {
          destId = p.id;
          destNome = p.nome;
          showSelecionado();
        }
      }
    });
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('form-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('form-save').addEventListener('click', async () => {
    const item = document.getElementById('form-item').value.trim();
    const qtd = parseInt(document.getElementById('form-qtd').value, 10) || 1;
    const obs = document.getElementById('form-obs').value.trim();

    if (!destId) {
      buscaInput.style.borderColor = 'var(--red)';
      window.showToast('Selecione um destinatário.', 'error');
      return;
    }
    if (!item) {
      document.getElementById('form-item').style.borderColor = 'var(--red)';
      return;
    }

    const pedido = editId ? await getPedido(editId) : {};
    pedido.item = item;
    pedido.quantidade = Math.max(1, qtd);
    pedido.observacao = obs || null;
    pedido.pessoa_id = destTipo === 'pessoa' ? destId : null;
    pedido.familia_id = destTipo === 'familia' ? destId : null;

    await savePedido(pedido);
    overlay.remove();
    window.showToast(editId ? 'Pedido atualizado!' : 'Pedido cadastrado!');
    loadPedidos();
  });
}

async function atenderPedido(id) {
  const pedido = await getPedido(id);
  if (!pedido) return;
  pedido.status = 'atendido';
  pedido.atendido_em = todayStr();
  await savePedido(pedido);
  window.showToast('Pedido marcado como atendido!');
  loadPedidos();
}

function confirmDeletePedido(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Confirmar exclusão</h2>
      <p style="color:var(--text-secondary);margin-bottom:8px;">Excluir este pedido?</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="del-cancel">CANCELAR</button>
        <button class="btn btn-primary" id="del-confirm" style="background:var(--red);">EXCLUIR</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('del-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('del-confirm').addEventListener('click', async () => {
    await deletePedido(id);
    overlay.remove();
    window.showToast('Pedido removido.');
    loadPedidos();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

window.addEventListener('page-enter', (e) => {
  if (e.detail.page === 'pedidos') loadPedidos();
});
