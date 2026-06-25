// ui/sidebar-view.js - Conversation history sidebar

import { getConversations, createConversation, deleteConversation } from '../state.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

let conversations = [];
let activeConvId = null;
let onSelectCb = null;
let sidebarEl = null;

async function initSidebar(container, onSelect) {
  sidebarEl = container;
  onSelectCb = onSelect;
  conversations = await getConversations();
  renderSidebar();
}

function renderSidebar() {
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="p-3">
        <button id="newConvBtn" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 hover:border-amber-500/30 hover:bg-white/5 transition text-sm font-medium text-slate-200">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>${t('sidebar.new_chat')}</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5" id="convList"></div>
    </div>
  `;

  const list = sidebarEl.querySelector('#convList');

  if (conversations.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8 px-3">
        <p class="text-slate-500 text-sm">${t('sidebar.empty')}</p>
      </div>
    `;
  } else {
    conversations.forEach(conv => {
      const el = document.createElement('div');
      el.className = `group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition text-sm ${conv.id === activeConvId ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`;
      el.dataset.id = conv.id;
      el.innerHTML = `
        <svg class="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        <span class="flex-1 truncate">${esc(conv.title)}</span>
        <button class="delete-conv opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition flex-shrink-0" data-id="${conv.id}" title="${t('sidebar.delete')}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.delete-conv')) return;
        selectConversation(conv.id);
      });
      list.appendChild(el);
    });

    list.querySelectorAll('.delete-conv').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await deleteConversation(id);
        conversations = conversations.filter(c => c.id !== id);
        if (activeConvId === id) activeConvId = null;
        renderSidebar();
        if (onSelectCb) onSelectCb(null);
      });
    });
  }

  sidebarEl.querySelector('#newConvBtn')?.addEventListener('click', async () => {
    const conv = await createConversation();
    conversations.unshift(conv);
    selectConversation(conv.id);
  });
}

async function selectConversation(id) {
  activeConvId = id;
  conversations = await getConversations();
  renderSidebar();
  const conv = conversations.find(c => c.id === id);
  if (onSelectCb) onSelectCb(conv);
}

function setActiveConvId(id) {
  activeConvId = id;
}

async function refreshConversations() {
  conversations = await getConversations();
  renderSidebar();
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export { initSidebar, renderSidebar, setActiveConvId, refreshConversations };