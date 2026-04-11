// Navigation
const pages = ['cadastro', 'chamada', 'historico', 'ranking', 'estoque'];
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

  // Start sync engine
  const { initSync } = await import('./sync.js');
  initSync();

  // Navigate to initial page
  handleHash();
  if (!window.location.hash) navigateTo('cadastro');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}

init();

// Export for modules
export { navigateTo };
