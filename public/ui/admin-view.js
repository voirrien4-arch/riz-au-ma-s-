// ui/admin-view.js - Admin panel for user/site management

import { getAdminConfig, setAdminConfig, getAllUsers, toggleBan, setUnlimitedCredits, giveCredits } from '../state.js';
import { showToast } from './toast-view.js';
import { CONFIG } from '../config.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;
let onCloseCb = null;

async function renderAdmin(container, onClose) {
  onCloseCb = onClose;
  const users = await getAllUsers();
  const cfg = await getAdminConfig();

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto py-6" id="adminOverlay">
      <div class="w-full max-w-3xl mx-4 rounded-2xl border border-amber-500/20 bg-slate-900 shadow-2xl animate-slide-up">
        <div class="flex items-center justify-between p-5 border-b border-amber-500/20 bg-amber-500/5 rounded-t-2xl">
          <h2 class="text-lg font-bold text-amber-400">🛡️ ${t('admin.title')}</h2>
          <button id="closeAdmin" class="text-slate-400 hover:text-white p-1 transition" aria-label="${t('admin.close')}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex border-b border-white/10 px-5 overflow-x-auto">
          <button class="admin-tab py-3 px-4 text-sm font-medium text-amber-400 border-b-2 border-amber-400 whitespace-nowrap" data-tab="users">${t('admin.tab_users')}</button>
          <button class="admin-tab py-3 px-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition whitespace-nowrap" data-tab="settings">${t('admin.tab_settings')}</button>
          <button class="admin-tab py-3 px-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition whitespace-nowrap" data-tab="prompt">${t('admin.tab_prompt')}</button>
          <button class="admin-tab py-3 px-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition whitespace-nowrap" data-tab="danger">${t('admin.tab_danger')}</button>
          <button class="admin-tab py-3 px-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition whitespace-nowrap" data-tab="api">🔑 API</button>
        </div>

        <div id="adminTabContent" class="p-5 max-h-[60vh] overflow-y-auto">
          ${renderUsersTab(users)}
        </div>
      </div>
    </div>
  `;

  setupAdminEvents(container, cfg, users);
}

function renderUsersTab(users) {
  if (users.length === 0) return `<p class="text-slate-500 text-center py-8">${t('admin.no_users')}</p>`;

  return `
    <div class="space-y-2">
      ${users.map(u => `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-white">${u.username.slice(0, 2).toUpperCase()}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">${esc(u.username)}</p>
            <p class="text-xs text-slate-500">ID: ${u.promoCode} • ${t('admin.joined')}: ${new Date(u.createdAt).toLocaleDateString()}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs font-mono px-2 py-1 rounded-md ${u.unlimitedCredits ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}">
              ${u.unlimitedCredits ? '∞' : u.credits}
            </span>
            ${u.banned ? '<span class="text-xs px-2 py-1 rounded-md bg-red-500/20 text-red-400">BANNI</span>' : ''}
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button class="btn-admin-action btn-ban" data-user="${u.username}" title="${u.banned ? t('admin.unban') : t('admin.ban')}">
              ${u.banned ? '✅' : '🚫'}
            </button>
            <button class="btn-admin-action btn-unlimited" data-user="${u.username}" title="${t('admin.toggle_unlimited')}">
              ${u.unlimitedCredits ? '🔒' : '♾️'}
            </button>
            <button class="btn-admin-action btn-give" data-user="${u.username}" title="${t('admin.give_credits')}">
              💰
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSettingsTab(cfg) {
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">${t('admin.whatsapp_link')}</label>
        <input id="adminWhatsapp" type="url" value="${esc(cfg.whatsappLink || '')}" class="input-field" placeholder="https://whatsapp.com/channel/..." />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">${t('admin.admin_username')}</label>
        <input id="adminNewUser" type="text" value="${esc(cfg.adminUsername || 'admin')}" class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">${t('admin.admin_password')}</label>
        <input id="adminNewPass" type="password" value="" class="input-field" placeholder="${t('admin.keep_current')}" />
      </div>
      <button id="saveAdminSettings" class="btn-primary">${t('admin.save_settings')}</button>
    </div>
  `;
}

function renderPromptTab(cfg) {
  return `
    <div class="space-y-4">
      <p class="text-sm text-slate-400">${t('admin.prompt_description')}</p>
      <textarea id="adminPrompt" class="input-field font-mono text-xs" rows="15">${esc(cfg.systemPrompt || '')}</textarea>
      <button id="savePrompt" class="btn-primary">${t('admin.save_prompt')}</button>
    </div>
  `;
}

function renderDangerTab(cfg) {
  return `
    <div class="space-y-4">
      <div class="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
        <h4 class="text-sm font-bold text-red-400 mb-2">⚠️ ${t('admin.maintenance_mode')}</h4>
        <p class="text-xs text-slate-400 mb-3">${t('admin.maintenance_desc')}</p>
        <div class="flex gap-3">
          <button id="toggleMaintenance" class="${cfg.maintenanceMode ? 'btn-danger' : 'btn-primary'} text-sm">
            ${cfg.maintenanceMode ? '🟢 ' + t('admin.disable_maintenance') : '🔴 ' + t('admin.enable_maintenance')}
          </button>
        </div>
        <p class="text-xs text-slate-500 mt-2">${t('admin.current_status')}: ${cfg.maintenanceMode ? '🔴 ' + t('admin.active') : '🟢 ' + t('admin.inactive')}</p>
      </div>
    </div>
  `;
}

function renderApiTab(cfg) {
  return `
    <div class="space-y-4">
      <p class="text-sm text-slate-400">${t('admin.api_description')}</p>
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">${t('admin.api_key_label')}</label>
        <input id="adminApiKey" type="text" value="${esc(cfg.mistralApiKey || CONFIG.MISTRAL_API_KEY)}" class="input-field font-mono text-xs" placeholder="${t('admin.api_key_placeholder')}" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">${t('admin.model_label')}</label>
        <input id="adminModel" type="text" value="${esc(cfg.mistralModel || CONFIG.MISTRAL_MODEL)}" class="input-field font-mono text-xs" placeholder="${t('admin.model_placeholder')}" />
      </div>
      <button id="saveApiSettings" class="btn-primary">${t('admin.save_api')}</button>
    </div>
  `;
}

function setupAdminEvents(container, cfg, users) {
  const overlay = container.querySelector('#adminOverlay');
  const tabContent = container.querySelector('#adminTabContent');
  const tabs = container.querySelectorAll('.admin-tab');

  container.querySelector('#closeAdmin')?.addEventListener('click', () => {
    container.innerHTML = '';
    if (onCloseCb) onCloseCb();
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      container.innerHTML = '';
      if (onCloseCb) onCloseCb();
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('text-amber-400', 'border-amber-400', 'border-b-2'); t.classList.add('text-slate-400'); });
      tab.classList.add('text-amber-400', 'border-amber-400', 'border-b-2');
      tab.classList.remove('text-slate-400');

      const name = tab.dataset.tab;
      if (name === 'users') {
        tabContent.innerHTML = renderUsersTab(users);
        bindUserActions(container, tabContent, cfg);
      } else if (name === 'settings') {
        tabContent.innerHTML = renderSettingsTab(cfg);
        bindSettingsActions(container, cfg);
      } else if (name === 'prompt') {
        tabContent.innerHTML = renderPromptTab(cfg);
        bindPromptActions(container, cfg);
      } else if (name === 'danger') {
        tabContent.innerHTML = renderDangerTab(cfg);
        bindDangerActions(container, cfg);
      } else if (name === 'api') {
        tabContent.innerHTML = renderApiTab(cfg);
        bindApiActions(container, cfg);
      }
    });
  });

  bindUserActions(container, tabContent, cfg);
}

function bindUserActions(container, tabContent, cfg) {
  tabContent.querySelectorAll('.btn-ban').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.user;
      const banned = await toggleBan(username);
      showToast(banned ? t('admin.user_banned', { user: username }) : t('admin.user_unbanned', { user: username }), 'success');
      const users = await getAllUsers();
      tabContent.innerHTML = renderUsersTab(users);
      bindUserActions(container, tabContent, cfg);
    });
  });

  tabContent.querySelectorAll('.btn-unlimited').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.user;
      const allUsers = await getAllUsers();
      const user = allUsers.find(u => u.username === username);
      const newValue = !(user?.unlimitedCredits);
      await setUnlimitedCredits(username, newValue);
      showToast(newValue ? t('admin.unlimited_granted', { user: username }) : t('admin.unlimited_removed', { user: username }), 'success');
      const users = await getAllUsers();
      tabContent.innerHTML = renderUsersTab(users);
      bindUserActions(container, tabContent, cfg);
    });
  });

  tabContent.querySelectorAll('.btn-give').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.user;
      const amount = prompt(t('admin.how_many_credits'));
      if (!amount || isNaN(amount) || parseInt(amount) < 1) return;
      await giveCredits(username, parseInt(amount));
      showToast(t('admin.credits_given', { amount, user: username }), 'success');
      const users = await getAllUsers();
      tabContent.innerHTML = renderUsersTab(users);
      bindUserActions(container, tabContent, cfg);
    });
  });
}

function bindSettingsActions(container, cfg) {
  container.querySelector('#saveAdminSettings')?.addEventListener('click', async () => {
    cfg.whatsappLink = container.querySelector('#adminWhatsapp').value.trim();
    const newUser = container.querySelector('#adminNewUser').value.trim();
    const newPass = container.querySelector('#adminNewPass').value;

    if (newUser) cfg.adminUsername = newUser;
    if (newPass && newPass.length >= 4) cfg.adminPassword = newPass;

    await setAdminConfig(cfg);
    showToast(t('admin.settings_saved'), 'success');
  });
}

function bindPromptActions(container, cfg) {
  container.querySelector('#savePrompt')?.addEventListener('click', async () => {
    cfg.systemPrompt = container.querySelector('#adminPrompt').value;
    await setAdminConfig(cfg);
    showToast(t('admin.prompt_saved'), 'success');
  });
}

function bindDangerActions(container, cfg) {
  container.querySelector('#toggleMaintenance')?.addEventListener('click', async () => {
    cfg.maintenanceMode = !cfg.maintenanceMode;
    await setAdminConfig(cfg);
    showToast(cfg.maintenanceMode ? t('admin.maintenance_on') : t('admin.maintenance_off'), 'warning');
    const tabContent = container.querySelector('#adminTabContent');
    tabContent.innerHTML = renderDangerTab(cfg);
    bindDangerActions(container, cfg);
  });
}

function bindApiActions(container, cfg) {
  container.querySelector('#saveApiSettings')?.addEventListener('click', async () => {
    const newKey = container.querySelector('#adminApiKey').value.trim();
    const newModel = container.querySelector('#adminModel').value.trim();
    if (newKey) cfg.mistralApiKey = newKey;
    if (newModel) cfg.mistralModel = newModel;
    await setAdminConfig(cfg);
    showToast(t('admin.api_saved'), 'success');
  });
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export { renderAdmin };
