// ui/header-view.js - Top bar with user info, credits, and action buttons

import { getCreditsRemaining, getSession } from '../state.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

let headerEl = null;
let callbacks = {};

function initHeader(container, cbs) {
  headerEl = container;
  callbacks = cbs;
  renderHeader();
}

async function renderHeader() {
  if (!headerEl) return;
  const session = await getSession();
  const user = session.user;
  if (!user) return;

  const credits = await getCreditsRemaining();
  const unlimited = user.unlimitedCredits || credits >= 999999;

  headerEl.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-lg">
      <div class="flex items-center gap-3">
        <button id="sidebarToggle" class="lg:hidden p-2 rounded-lg hover:bg-white/5 transition text-slate-400" aria-label="${t('header.toggle_sidebar')}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center">
            <span class="text-xs font-black bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">G</span>
          </div>
          <span class="text-sm font-bold text-white hidden sm:inline">${window.CONFIG?.SITE_NAME || 'Gold-noir AI'}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${unlimited ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/20'}">
          <span class="text-xs">${unlimited ? '♾️' : '🪙'}</span>
          <span id="creditsCount" class="text-xs font-bold ${unlimited ? 'text-amber-400' : 'text-emerald-400'}">${unlimited ? '∞' : credits}</span>
        </div>
        <button id="settingsBtn" class="p-2 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-white" title="${t('header.settings')}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
        <button id="logoutBtn" class="p-2 rounded-lg hover:bg-red-500/10 transition text-slate-400 hover:text-red-400" title="${t('header.logout')}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </div>
  `;

  headerEl.querySelector('#settingsBtn')?.addEventListener('click', () => callbacks.onSettings?.());
  headerEl.querySelector('#logoutBtn')?.addEventListener('click', () => callbacks.onLogout?.());
  headerEl.querySelector('#sidebarToggle')?.addEventListener('click', () => callbacks.onToggleSidebar?.());
}

export { initHeader, renderHeader };