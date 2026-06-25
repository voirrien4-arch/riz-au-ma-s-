// main.js - Application bootstrap

import { initI18n } from './i18n.js';
import { getAdminConfig, refreshDailyCredits, getSession, setCurrentUser } from './state.js';
import { CONFIG } from './config.js';
import { renderLoginView } from './ui/login-view.js';
import { initHeader } from './ui/header-view.js';
import { initSidebar, refreshConversations } from './ui/sidebar-view.js';
import { initChatView, loadConversation, handleSend, renderEmpty } from './ui/chat-view.js';
import { renderSettings } from './ui/settings-view.js';
import { renderMaintenance } from './ui/maintenance-view.js';

window.CONFIG = CONFIG;

// ─── Theme ───
function applyTheme() {
  const saved = localStorage.getItem('gold_noir_theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved === 'dark');
  document.documentElement.classList.toggle('light', saved === 'light');
  document.documentElement.style.colorScheme = saved;
}

// ─── Textarea auto-resize ───
function setupTextarea() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chatForm')?.requestSubmit();
    }
  });
}

// ─── Sidebar toggle (mobile) ───
let sidebarOpen = false;

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open', sidebarOpen);
  if (overlay) overlay.classList.toggle('hidden', !sidebarOpen);
}

// ─── Screen transitions ───
function showLoginScreen() {
  const loginScreen = document.getElementById('loginScreen');
  const mainApp = document.getElementById('mainApp');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (mainApp) mainApp.classList.add('hidden');
  document.body.classList.remove('app-active');

  renderLoginView(loginScreen, async (user) => {
    localStorage.setItem('gold_noir_session', JSON.stringify({ user }));
    showMainApp();
  }, () => {
    showMainApp(true);
  });
}

async function showMainApp(isAdmin = false) {
  const loginScreen = document.getElementById('loginScreen');
  const mainApp = document.getElementById('mainApp');
  if (loginScreen) {
    loginScreen.classList.add('hidden');
    loginScreen.innerHTML = '';
  }
  if (mainApp) mainApp.classList.remove('hidden');
  document.body.classList.add('app-active');

  // Header
  const header = document.getElementById('appHeader');
  if (header) {
    initHeader(header, {
      onSettings: () => renderSettings(document.getElementById('modalContainer'), () => {}),
      onLogout: async () => {
        localStorage.removeItem('gold_noir_session');
        setCurrentUser(null);
        document.getElementById('modalContainer').innerHTML = '';
        showLoginScreen();
      },
      onToggleSidebar: toggleSidebar,
    });
  }

  // Sidebar
  const sidebarContent = document.getElementById('sidebarContent');
  if (sidebarContent) {
    await initSidebar(sidebarContent, (conv) => {
      if (conv) {
        loadConversation(conv);
      } else {
        renderEmpty();
      }
      if (window.innerWidth < 1024) {
        sidebarOpen = false;
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.add('hidden');
      }
    });
  }

  // Chat
  const chatArea = document.getElementById('chatArea');
  if (chatArea) initChatView(chatArea);

  setupTextarea();

  // Chat form submit
  const chatForm = document.getElementById('chatForm');
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    await handleSend(text);
  });

  // Sidebar overlay
  document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);

  // Copy code buttons (delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-code');
    if (!btn) return;
    const code = decodeURIComponent(btn.dataset.code || '');
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = '✓ Copié';
      setTimeout(() => { btn.textContent = 'Copier'; }, 2000);
    }).catch(() => {});
  });

  // Admin panel
  if (isAdmin) {
    const { renderAdmin } = await import('./ui/admin-view.js');
    renderAdmin(document.getElementById('modalContainer'), () => {});
  }

  await updateCreditsDisplay();
}

async function updateCreditsDisplay() {
  const el = document.getElementById('creditsCount');
  if (!el) return;
  const session = await getSession();
  const user = session.user;
  if (!user) return;
  const { getCreditsRemaining } = await import('./state.js');
  const credits = await getCreditsRemaining();
  el.textContent = user.unlimitedCredits || credits >= 999999 ? '∞' : credits;
}

// ─── Boot ───
async function boot() {
  try {
    await initI18n('fr');
    applyTheme();
    const cfg = await getAdminConfig();
    const savedSession = localStorage.getItem('gold_noir_session');
    let user = null;

    if (savedSession) {
      try {
        const data = JSON.parse(savedSession);
        setCurrentUser(data.user);
        user = data.user;
      } catch {}
    }

    if (cfg.maintenanceMode) {
      // Show maintenance page with admin login capability
      const container = document.getElementById('loginScreen') || document.body;
      const mainApp = document.getElementById('mainApp');
      if (container) container.classList.remove('hidden');
      if (mainApp) mainApp.classList.add('hidden');
      document.body.classList.remove('app-active');

      renderMaintenance(container, async () => {
        // Admin clicked "Open admin panel" — go to main app as admin
        await showMainApp(true);
      });
      return;
    }

    if (user) {
      await refreshDailyCredits();
      showMainApp();
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error('Boot error:', err);
    showLoginScreen();
  }
}

document.addEventListener('DOMContentLoaded', boot);