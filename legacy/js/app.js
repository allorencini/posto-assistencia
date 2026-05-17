// Toast notifications
window.showToast = function(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 2500);
};

// Navigation
const pages = ['cadastro', 'chamada', 'historico', 'ranking', 'estoque', 'pedidos'];
let currentPage = 'cadastro';

function navigateTo(page) {
  if (!pages.includes(page)) return;
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  window.location.hash = page;
  // Trigger page load
  window.dispatchEvent(new CustomEvent('page-enter', { detail: { page } }));
}

// Nav button clicks
document.querySelector('.bottom-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn) navigateTo(btn.dataset.page);
});

// Hash routing
function handleHash() {
  const hash = window.location.hash.slice(1);
  if (pages.includes(hash)) navigateTo(hash);
}
window.addEventListener('hashchange', handleHash);

// Init
async function init() {
  // Import modules after DB is ready
  const { initDB } = await import('./db.js');
  await initDB();

  await import('./cadastro.js');
  await import('./chamada.js');
  await import('./historico.js');
  await import('./ranking.js');
  await import('./estoque.js');
  await import('./pedidos.js');

  // Start sync engine
  const { initSync } = await import('./sync.js');
  initSync();

  // Navigate to initial page
  handleHash();
  if (!window.location.hash) navigateTo('cadastro');

  // Register service worker com auto-update:
  // Ao abrir o app, força verificação de nova versão. Se uma nova SW ativar
  // (skipWaiting já está no sw.js), o controllerchange dispara o reload automático.
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.update(); // força checagem mesmo dentro do cache TTL de 24h

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

init();

// Export for modules
export { navigateTo };
