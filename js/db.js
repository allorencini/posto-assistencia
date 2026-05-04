const DB_NAME = 'presenca-db';
const DB_VERSION = 5;
let db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const transaction = e.target.transaction;

      // pessoas store
      if (!db.objectStoreNames.contains('pessoas')) {
        const store = db.createObjectStore('pessoas', { keyPath: 'id' });
        store.createIndex('grupo', 'grupo', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
        store.createIndex('familia_id', 'familia_id', { unique: false });
      } else {
        const pessoasStore = transaction.objectStore('pessoas');
        if (!pessoasStore.indexNames.contains('familia_id')) {
          pessoasStore.createIndex('familia_id', 'familia_id', { unique: false });
        }
      }

      // chamadas store
      if (!db.objectStoreNames.contains('chamadas')) {
        const store = db.createObjectStore('chamadas', { keyPath: 'id' });
        store.createIndex('data', 'data', { unique: true });
      }

      // presencas store
      if (!db.objectStoreNames.contains('presencas')) {
        const store = db.createObjectStore('presencas', { keyPath: 'id' });
        store.createIndex('chamada_id', 'chamada_id', { unique: false });
        store.createIndex('pessoa_id', 'pessoa_id', { unique: false });
        store.createIndex('chamada_pessoa', ['chamada_id', 'pessoa_id'], { unique: true });
      }

      // sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // cestas store (v2)
      if (!db.objectStoreNames.contains('cestas')) {
        const store = db.createObjectStore('cestas', { keyPath: 'id' });
        store.createIndex('pessoa_id', 'pessoa_id', { unique: false });
        store.createIndex('data', 'data', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
      }

      // itens store (v3)
      if (!db.objectStoreNames.contains('itens')) {
        const store = db.createObjectStore('itens', { keyPath: 'id' });
        store.createIndex('categoria', 'categoria', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
      }

      // familias store (v4)
      if (!db.objectStoreNames.contains('familias')) {
        const store = db.createObjectStore('familias', { keyPath: 'id' });
        store.createIndex('nome', 'nome', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
      }

      // pedidos store (v5) — donation requests
      if (!db.objectStoreNames.contains('pedidos')) {
        const store = db.createObjectStore('pedidos', { keyPath: 'id' });
        store.createIndex('pessoa_id', 'pessoa_id', { unique: false });
        store.createIndex('familia_id', 'familia_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('ativo', 'ativo', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

// Generic transaction helper
function tx(storeName, mode = 'readonly') {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// Generic get all from store
function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = tx(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic get by key
function getByKey(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = tx(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic put (insert or update)
function put(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = tx(storeName, 'readwrite').put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic delete
function del(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = tx(storeName, 'readwrite').delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all by index value
function getAllByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const store = tx(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Pessoas ===
export function getPessoas() {
  return getAll('pessoas').then(list => list.filter(p => p.ativo !== false));
}

export function getAllPessoas() {
  return getAll('pessoas');
}

export function getPessoa(id) {
  return getByKey('pessoas', id);
}

export function savePessoa(pessoa) {
  if (!pessoa.id) pessoa.id = crypto.randomUUID();
  if (!pessoa.criado_em) pessoa.criado_em = new Date().toISOString();
  pessoa.atualizado_em = new Date().toISOString();
  if (pessoa.ativo === undefined) pessoa.ativo = true;
  return atomicUpsert('pessoas', pessoa);
}

export function deletePessoa(id) {
  return getPessoa(id).then(pessoa => {
    if (!pessoa) return;
    pessoa.ativo = false;
    pessoa.atualizado_em = new Date().toISOString();
    return atomicUpsert('pessoas', pessoa);
  });
}

// === Chamadas ===
export function getChamadas() {
  return getAll('chamadas');
}

export function getChamadaByData(data) {
  return getAllByIndex('chamadas', 'data', data).then(list => list[0] || null);
}

export function saveChamada(chamada) {
  // ID determinístico baseado na data — garante que dois dispositivos criando
  // a chamada do mesmo dia gerem registros idênticos, sem conflito de UUID.
  if (!chamada.id) chamada.id = `chamada-${chamada.data}`;
  if (!chamada.criado_em) chamada.criado_em = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chamadas', 'sync_queue'], 'readwrite');
    transaction.objectStore('chamadas').put(chamada);
    transaction.objectStore('sync_queue').put({
      table: 'chamadas',
      operation: 'upsert',
      data: chamada,
      timestamp: Date.now(),
    });
    transaction.oncomplete = () => resolve(chamada);
    transaction.onerror = () => reject(transaction.error);
  });
}

// === Presencas ===
export function getPresencasByChamada(chamadaId) {
  return getAllByIndex('presencas', 'chamada_id', chamadaId);
}

export function getPresencasByPessoa(pessoaId) {
  return getAllByIndex('presencas', 'pessoa_id', pessoaId);
}

export function getAllPresencas() {
  return getAll('presencas');
}

export function savePresenca(presenca) {
  // ID determinístico: garante que dois dispositivos criando a presença do mesmo
  // par (chamada+pessoa) gerem o mesmo ID, evitando duplicatas no IndexedDB após sync.
  if (!presenca.id) presenca.id = `presenca-${presenca.chamada_id}-${presenca.pessoa_id}`;
  if (!presenca.criado_em) presenca.criado_em = new Date().toISOString();
  presenca.atualizado_em = new Date().toISOString();
  return atomicUpsert('presencas', presenca);
}

export function savePresencasBatch(presencas) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['presencas', 'sync_queue'], 'readwrite');
    const store = transaction.objectStore('presencas');
    const syncStore = transaction.objectStore('sync_queue');

    for (const p of presencas) {
      if (!p.id) p.id = crypto.randomUUID();
      if (!p.criado_em) p.criado_em = new Date().toISOString();
      p.atualizado_em = new Date().toISOString();
      store.put(p);
      syncStore.put({
        table: 'presencas',
        operation: 'upsert',
        data: p,
        timestamp: Date.now()
      });
    }

    transaction.oncomplete = () => resolve(presencas);
    transaction.onerror = () => reject(transaction.error);
  });
}

// === Cestas ===
export function getCestas() {
  return getAll('cestas').then(list => list.filter(c => c.ativo !== false));
}

export function getAllCestas() {
  return getAll('cestas');
}

export function getCestasByPessoa(pessoaId) {
  return getAllByIndex('cestas', 'pessoa_id', pessoaId).then(list => list.filter(c => c.ativo !== false));
}

export function saveCesta(cesta) {
  if (!cesta.id) cesta.id = crypto.randomUUID();
  if (!cesta.criado_em) cesta.criado_em = new Date().toISOString();
  cesta.atualizado_em = new Date().toISOString();
  if (cesta.ativo === undefined) cesta.ativo = true;
  return atomicUpsert('cestas', cesta);
}

export function deleteCesta(id) {
  return getByKey('cestas', id).then(cesta => {
    if (!cesta) return;
    cesta.ativo = false;
    cesta.atualizado_em = new Date().toISOString();
    return atomicUpsert('cestas', cesta);
  });
}

// === Itens (estoque) ===
export function getItens() {
  return getAll('itens').then(list => list.filter(i => i.ativo !== false));
}

export function getItem(id) {
  return getByKey('itens', id);
}

export function saveItem(item) {
  if (!item.id) item.id = crypto.randomUUID();
  if (!item.criado_em) item.criado_em = new Date().toISOString();
  item.atualizado_em = new Date().toISOString();
  if (item.ativo === undefined) item.ativo = true;
  item.quantidade = Math.max(0, parseInt(item.quantidade, 10) || 0);
  return atomicUpsert('itens', item);
}

export function updateItemQuantidade(id, novaQtd) {
  return getByKey('itens', id).then(item => {
    if (!item) return null;
    item.quantidade = Math.max(0, parseInt(novaQtd, 10) || 0);
    item.atualizado_em = new Date().toISOString();
    return atomicUpsert('itens', item);
  });
}

export function deleteItem(id) {
  return getByKey('itens', id).then(item => {
    if (!item) return;
    item.ativo = false;
    item.atualizado_em = new Date().toISOString();
    return atomicUpsert('itens', item);
  });
}

// === Familias ===
export function getFamilias() {
  return getAll('familias').then(list => list.filter(f => f.ativo !== false));
}

export function getFamilia(id) {
  return getByKey('familias', id);
}

export function saveFamilia(familia) {
  if (!familia.id) familia.id = crypto.randomUUID();
  if (!familia.criado_em) familia.criado_em = new Date().toISOString();
  familia.atualizado_em = new Date().toISOString();
  if (familia.ativo === undefined) familia.ativo = true;
  return atomicUpsert('familias', familia);
}

export function deleteFamilia(id) {
  return getFamilia(id).then(familia => {
    if (!familia) return;
    familia.ativo = false;
    familia.atualizado_em = new Date().toISOString();
    return atomicUpsert('familias', familia);
  });
}

export function getPessoasByFamilia(familiaId) {
  return getAllByIndex('pessoas', 'familia_id', familiaId);
}

// === Pedidos (doações) ===
export function getPedidos() {
  return getAll('pedidos').then(list => list.filter(p => p.ativo !== false));
}

export function getPedido(id) {
  return getByKey('pedidos', id);
}

export function savePedido(pedido) {
  if (!pedido.id) pedido.id = crypto.randomUUID();
  if (!pedido.criado_em) pedido.criado_em = new Date().toISOString();
  pedido.atualizado_em = new Date().toISOString();
  if (pedido.ativo === undefined) pedido.ativo = true;
  if (!pedido.status) pedido.status = 'pendente';
  if (!pedido.solicitado_em) pedido.solicitado_em = new Date().toISOString().slice(0, 10);
  return atomicUpsert('pedidos', pedido);
}

export function deletePedido(id) {
  return getPedido(id).then(pedido => {
    if (!pedido) return;
    pedido.ativo = false;
    pedido.atualizado_em = new Date().toISOString();
    return atomicUpsert('pedidos', pedido);
  });
}

export async function deleteChamada(chamadaId) {
  const presencas = await getPresencasByChamada(chamadaId);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chamadas', 'presencas', 'sync_queue'], 'readwrite');
    const chamadaStore = transaction.objectStore('chamadas');
    const presencasStore = transaction.objectStore('presencas');
    const syncStore = transaction.objectStore('sync_queue');

    chamadaStore.delete(chamadaId);
    syncStore.put({ table: 'chamadas', operation: 'delete', data: { id: chamadaId }, timestamp: Date.now() });

    for (const p of presencas) {
      presencasStore.delete(p.id);
      syncStore.put({ table: 'presencas', operation: 'delete', data: { id: p.id }, timestamp: Date.now() });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// === Sync Queue ===
// Grava dado no store e na sync_queue em uma única transação atômica.
// Se qualquer um falhar, ambos são revertidos — sem registros locais órfãos.
function atomicUpsert(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName, 'sync_queue'], 'readwrite');
    transaction.objectStore(storeName).put(data);
    transaction.objectStore('sync_queue').put({
      table: storeName,
      operation: 'upsert',
      data,
      timestamp: Date.now(),
    });
    transaction.oncomplete = () => resolve(data);
    transaction.onerror = () => reject(transaction.error);
  });
}

function addToSyncQueue(table, operation, data) {
  return put('sync_queue', {
    table,
    operation,
    data,
    timestamp: Date.now()
  });
}

export function getSyncQueue() {
  return getAll('sync_queue');
}

export function clearSyncQueueItem(id) {
  return del('sync_queue', id);
}

export function clearAllSyncQueue() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const request = transaction.objectStore('sync_queue').clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// === Bulk import (for sync from server) ===
// Upsert condicional: só sobrescreve se a versão do servidor for igual ou mais nova
// que a versão local. Protege dados locais não sincronizados de serem apagados pelo pull.
export function bulkPut(storeName, items) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    for (const item of items) {
      const getReq = store.get(item.id);
      getReq.onsuccess = () => {
        const local = getReq.result;
        const localTs = local?.atualizado_em ?? '';
        const serverTs = item.atualizado_em ?? '';
        // Só sobrescreve se não existe localmente ou se o servidor tem versão mais nova/igual
        if (!local || serverTs >= localTs) {
          store.put(item);
        }
      };
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
