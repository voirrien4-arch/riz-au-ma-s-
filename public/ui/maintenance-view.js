// ui/maintenance-view.js - Under construction / maintenance page with admin access

import { CONFIG } from '../config.js';
import { adminLogin, setCurrentUser, getAdminConfig, setAdminConfig, refreshDailyCredits } from '../state.js';
import { showToast } from './toast-view.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

let onAdminSuccessCb = null;

function renderMaintenance(container, onAdminSuccess) {
  onAdminSuccessCb = onAdminSuccess;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      <div class="text-center px-6 max-w-md animate-fade-in py-8">
        <!-- Logo -->
        <div class="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <span class="text-3xl font-black bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">GN</span>
        </div>

        <!-- Animated construction icon -->
        <div class="text-6xl mb-6 animate-bounce">🚧</div>

        <h1 class="text-2xl font-bold text-white mb-3">${t('maintenance.title')}</h1>
        <p class="text-slate-400 text-base leading-relaxed mb-2">${t('maintenance.message')}</p>
        <p class="text-slate-500 text-sm mb-8">${CONFIG.SITE_NAME} — ${t('maintenance.subtitle')}</p>

        <!-- Animated progress bar -->
        <div class="mx-auto max-w-xs mb-8">
          <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-500 to-cyan-500 rounded-full animate-maintenance-bar"></div>
          </div>
        </div>

        <!-- WhatsApp channel link -->
        <a href="${CONFIG.WHATSAPP_CHANNEL}" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 transition text-sm font-medium mb-4">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          ${t('maintenance.whatsapp_follow')}
        </a>

        <!-- Admin Access Toggle -->
        <div class="mt-4">
          <button id="maintenanceAdminToggle" class="text-xs text-slate-600 hover:text-amber-400 transition px-4 py-2 rounded-lg hover:bg-white/5">
            🔒 ${t('login.admin_access')}
          </button>
        </div>

        <!-- Admin Login Panel (hidden by default) -->
        <div id="maintenanceAdminPanel" class="hidden mt-6 max-w-xs mx-auto">
          <div class="p-5 rounded-2xl border border-amber-500/20 bg-slate-900/80 backdrop-blur-sm text-left animate-slide-up">
            <h3 class="text-sm font-bold text-amber-400 mb-4 text-center">🛡️ ${t('admin.title')}</h3>
            <div class="space-y-3">
              <div>
                <label for="maintAdminUser" class="block text-xs font-medium text-slate-400 mb-1">${t('login.admin_username')}</label>
                <input id="maintAdminUser" type="text" autocomplete="off" class="input-field text-sm" placeholder="admin" />
              </div>
              <div>
                <label for="maintAdminPass" class="block text-xs font-medium text-slate-400 mb-1">${t('login.admin_password')}</label>
                <input id="maintAdminPass" type="password" autocomplete="off" class="input-field text-sm" placeholder="••••••" />
              </div>
              <button id="maintAdminLogin" class="btn-admin w-full text-sm">${t('login.admin_login')}</button>
              <p id="maintAdminError" class="text-xs text-red-400 text-center hidden"></p>
            </div>
          </div>
        </div>

        <!-- Quick Maintenance Control (shown after admin login) -->
        <div id="maintenanceControl" class="hidden mt-6 max-w-xs mx-auto">
          <div class="p-5 rounded-2xl border border-amber-500/20 bg-slate-900/80 backdrop-blur-sm text-left animate-slide-up">
            <h3 class="text-sm font-bold text-amber-400 mb-4 text-center">⚙️ ${t('admin.maintenance_mode')}</h3>

            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-3">
              <span class="text-sm text-slate-300">${t('admin.current_status')}</span>
              <span id="maintStatus" class="text-sm font-bold text-red-400">🔴 ${t('admin.active')}</span>
            </div>

            <div class="space-y-2">
              <button id="maintToggle" class="btn-primary w-full text-sm">
                🟢 ${t('admin.disable_maintenance')}
              </button>
              <button id="maintOpenAdmin" class="btn-admin w-full text-sm">
                🛡️ ${t('maintenance.open_admin')}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <p class="text-xs text-slate-700 mt-8">${CONFIG.SITE_NAME} v${CONFIG.VERSION} • ${CONFIG.CREATOR} (${CONFIG.CREATOR_ALIAS})</p>
      </div>
    </div>
  `;

  setupMaintenanceEvents(container);
}

function setupMaintenanceEvents(container) {
  const toggleBtn = container.querySelector('#maintenanceAdminToggle');
  const panel = container.querySelector('#maintenanceAdminPanel');
  const loginBtn = container.querySelector('#maintAdminLogin');

  // Toggle admin login form
  toggleBtn?.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  // Admin login
  loginBtn?.addEventListener('click', async () => {
    const username = container.querySelector('#maintAdminUser').value.trim();
    const password = container.querySelector('#maintAdminPass').value;
    const errorEl = container.querySelector('#maintAdminError');

    if (!username || !password) {
      errorEl.textContent = t('error.wrong_credentials');
      errorEl.classList.remove('hidden');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '...';

    const result = await adminLogin(username, password);

    if (result.success) {
      showToast(t('admin.login_success'), 'success');
      errorEl.classList.add('hidden');

      // Show quick control panel, hide login form
      panel.classList.add('hidden');
      toggleBtn.classList.add('hidden');

      const controlPanel = container.querySelector('#maintenanceControl');
      controlPanel.classList.remove('hidden');

      await renderControlStatus(container);
      setupControlEvents(container);
    } else {
      errorEl.textContent = result.error || t('error.wrong_credentials');
      errorEl.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.textContent = t('login.admin_login');
    }
  });

  // Enter key on password field
  container.querySelector('#maintAdminPass')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginBtn?.click();
    }
  });
}

async function renderControlStatus(container) {
  const cfg = await getAdminConfig();
  const statusEl = container.querySelector('#maintStatus');
  const toggleBtn = container.querySelector('#maintToggle');

  if (cfg.maintenanceMode) {
    statusEl.className = 'text-sm font-bold text-red-400';
    statusEl.textContent = '🔴 ' + t('admin.active');
    toggleBtn.className = 'btn-primary w-full text-sm';
    toggleBtn.textContent = '🟢 ' + t('admin.disable_maintenance');
  } else {
    statusEl.className = 'text-sm font-bold text-emerald-400';
    statusEl.textContent = '🟢 ' + t('admin.inactive');
    toggleBtn.className = 'btn-danger w-full text-sm';
    toggleBtn.textContent = '🔴 ' + t('admin.enable_maintenance');
  }
}

function setupControlEvents(container) {
  const toggleBtn = container.querySelector('#maintToggle');
  const openAdminBtn = container.querySelector('#maintOpenAdmin');

  toggleBtn?.addEventListener('click', async () => {
    const cfg = await getAdminConfig();
    cfg.maintenanceMode = !cfg.maintenanceMode;
    await setAdminConfig(cfg);

    if (cfg.maintenanceMode) {
      showToast(t('admin.maintenance_on'), 'warning');
      await renderControlStatus(container);
      setupControlEvents(container);
    } else {
      showToast(t('admin.maintenance_off'), 'success');
      // Maintenance disabled — reload to show normal login
      setTimeout(() => location.reload(), 800);
    }
  });

  openAdminBtn?.addEventListener('click', () => {
    if (onAdminSuccessCb) {
      onAdminSuccessCb();
    }
  });
}

export { renderMaintenance };