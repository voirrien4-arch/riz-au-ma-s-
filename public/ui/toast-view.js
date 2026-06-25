// ui/toast-view.js - Toast notification system

let container = null;

function ensureContainer() {
  if (container) return;
  container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
  document.body.appendChild(container);
}

function showToast(message, type = 'info', ms = 3500) {
  ensureContainer();

  const colors = {
    info: 'bg-blue-600/90 border-blue-400/40',
    success: 'bg-emerald-600/90 border-emerald-400/40',
    error: 'bg-red-600/90 border-red-400/40',
    warning: 'bg-amber-600/90 border-amber-400/40',
  };
  const icons = { info: '💡', success: '✅', error: '❌', warning: '⚠️' };

  const el = document.createElement('div');
  el.className = `pointer-events-auto ${colors[type] || colors.info} border text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm transform transition-all duration-300 translate-x-[120%] opacity-0 max-w-xs`;
  el.innerHTML = `<span class="mr-2">${icons[type] || '💡'}</span><span>${esc(message)}</span>`;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.remove('translate-x-[120%]', 'opacity-0'));

  setTimeout(() => {
    el.classList.add('translate-x-[120%]', 'opacity-0');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export { showToast };