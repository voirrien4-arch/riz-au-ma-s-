// ui/settings-view.js - Settings panel (profile, theme, links)

import { getSession, getAdminConfig } from '../state.js';
import { CONFIG } from '../config.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;
let onCloseCb = null;

async function renderSettings(container, onClose) {
  onCloseCb = onClose;
  const session = await getSession();
  const user = session.user;
  const adminCfg = await getAdminConfig();

  if (!user) return;

  const isDark = document.documentElement.classList.contains('dark') ||
    !document.documentElement.classList.contains('light');

  container.innerHTML = `
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" id="settingsOverlay">
      <div class="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl animate-slide-up">
        <div class="flex items-center justify-between p-5 border-b border-white/10">
          <h2 class="text-lg font-bold text-white">⚙️ ${t('settings.title')}</h2>
          <button id="closeSettings" class="text-slate-400 hover:text-white p-1 transition" aria-label="${t('settings.close')}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-5 border-b border-white/10">
          <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">👤 ${t('settings.profile')}</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span class="text-sm text-slate-400">${t('settings.username')}</span>
              <span class="text-sm font-semibold text-white">${user.username}</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span class="text-sm text-slate-400">${t('settings.credits')}</span>
              <span class="text-sm font-bold ${user.unlimitedCredits ? 'text-amber-400' : 'text-emerald-400'}">${user.unlimitedCredits ? '∞ ' + t('settings.unlimited') : user.credits}</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span class="text-sm text-slate-400">${t('settings.promo_code')}</span>
              <button id="copyPromo" class="text-sm font-mono font-bold text-amber-400 hover:text-amber-300 transition" title="${t('settings.copy')}">${user.promoCode}</button>
            </div>
            <p class="text-xs text-slate-500">${t('settings.share_promo')}</p>
          </div>
        </div>

        <div class="p-5 border-b border-white/10">
          <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">🎨 ${t('settings.appearance')}</h3>
          <div class="flex gap-3">
            <button id="themeDark" class="flex-1 py-3 rounded-xl border-2 ${isDark ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20'} transition text-sm font-medium text-slate-200">
              🌙 ${t('settings.dark')}
            </button>
            <button id="themeLight" class="flex-1 py-3 rounded-xl border-2 ${!isDark ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20'} transition text-sm font-medium text-slate-200">
              ☀️ ${t('settings.light')}
            </button>
          </div>
        </div>

        <div class="p-5 border-b border-white/10">
          <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">🔗 ${t('settings.links')}</h3>
          <div class="space-y-2">
            <a href="${adminCfg.whatsappLink || CONFIG.WHATSAPP_CHANNEL}" target="_blank" rel="noopener"
              class="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <span class="text-lg">📢</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-white">${t('settings.whatsapp_channel')}</p>
                <p class="text-xs text-slate-500">${t('settings.follow_updates')}</p>
              </div>
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <span class="text-lg">👤</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-white">${CONFIG.CREATOR}</p>
                <p class="text-xs text-slate-500">${CONFIG.CREATOR_ALIAS} • WhatsApp: ${CONFIG.CONTACT_WHATSAPP}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <span class="text-lg">🤝</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-white">${t('settings.partners')}</p>
                <p class="text-xs text-slate-500">${CONFIG.PARTNERS.join(' • ')}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="p-5">
          <p class="text-xs text-center text-slate-600">${CONFIG.SITE_NAME} v${CONFIG.VERSION}</p>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#closeSettings')?.addEventListener('click', () => {
    container.innerHTML = '';
    if (onCloseCb) onCloseCb();
  });

  container.querySelector('#copyPromo')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(user.promoCode);
      const btn = container.querySelector('#copyPromo');
      btn.textContent = '✓ ' + t('settings.copied');
      setTimeout(() => { btn.textContent = user.promoCode; }, 2000);
    } catch {}
  });

  container.querySelector('#settingsOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      container.innerHTML = '';
      if (onCloseCb) onCloseCb();
    }
  });

  container.querySelector('#themeDark')?.addEventListener('click', () => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    localStorage.setItem('gold_noir_theme', 'dark');
    renderSettings(container, onCloseCb);
  });

  container.querySelector('#themeLight')?.addEventListener('click', () => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    localStorage.setItem('gold_noir_theme', 'light');
    renderSettings(container, onCloseCb);
  });
}

export { renderSettings };