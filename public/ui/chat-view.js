// ui/chat-view.js - Main chat interface with message rendering and streaming

import { sendMessageStream } from '../ai-service.js';
import { useCredit, getCreditsRemaining, addMessage, createConversation } from '../state.js';
import { setActiveConvId, refreshConversations } from './sidebar-view.js';
import { showToast } from './toast-view.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

let chatContainer = null;
let currentConv = null;
let isSending = false;

function initChatView(container) {
  chatContainer = container;
  renderEmpty();
}

function renderEmpty() {
  if (!chatContainer) return;
  currentConv = null;
  chatContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
        <span class="text-3xl font-black bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">GN</span>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">${t('chat.welcome_title')}</h2>
      <p class="text-slate-400 text-sm max-w-sm">${t('chat.welcome_subtitle')}</p>
      <div class="grid grid-cols-2 gap-3 mt-8 max-w-sm w-full">
        ${chatSuggestions().map(s => `
          <button class="suggestion-btn text-left p-3 rounded-xl border border-white/10 hover:border-amber-500/30 hover:bg-white/5 transition text-sm text-slate-300">
            <span class="block text-xs mb-1">${s.icon}</span>
            <span>${s.text}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  chatContainer.querySelectorAll('.suggestion-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const input = document.querySelector('#chatInput');
      if (input) {
        input.value = chatSuggestions()[i].prompt;
        input.focus();
      }
    });
  });
}

function chatSuggestions() {
  return [
    { icon: '💻', text: t('chat.suggest_1'), prompt: t('chat.suggest_1_prompt') },
    { icon: '🎨', text: t('chat.suggest_2'), prompt: t('chat.suggest_2_prompt') },
    { icon: '📊', text: t('chat.suggest_3'), prompt: t('chat.suggest_3_prompt') },
    { icon: '🔧', text: t('chat.suggest_4'), prompt: t('chat.suggest_4_prompt') },
  ];
}

async function loadConversation(conv) {
  if (!conv) {
    renderEmpty();
    return;
  }
  currentConv = conv;
  setActiveConvId(conv.id);
  renderMessages(conv.messages);
}

function renderMessages(messages) {
  if (!chatContainer) return;

  chatContainer.innerHTML = `
    <div class="flex flex-col h-full">
      <div id="messageArea" class="flex-1 overflow-y-auto px-4 py-6 space-y-6" role="log" aria-live="polite"></div>
    </div>
  `;

  if (!messages || messages.length === 0) return;

  const area = chatContainer.querySelector('#messageArea');
  messages.forEach(m => appendMessageToDOM(area, m));
  area.scrollTop = area.scrollHeight;
}

function appendMessageToDOM(area, msg) {
  const wrapper = document.createElement('div');
  wrapper.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`;

  if (msg.role === 'user') {
    wrapper.innerHTML = `
      <div class="max-w-[80%] md:max-w-[70%]">
        <div class="msg-user rounded-2xl rounded-br-md px-4 py-3">
          <p class="text-sm whitespace-pre-wrap break-words">${esc(msg.content)}</p>
        </div>
      </div>
    `;
  } else {
    wrapper.innerHTML = `
      <div class="max-w-[85%] md:max-w-[75%] flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="text-xs font-bold bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">G</span>
        </div>
        <div class="msg-assistant rounded-2xl rounded-tl-md px-4 py-3 flex-1">
          <div class="text-sm whitespace-pre-wrap break-words">${formatAssistantText(msg.content)}</div>
        </div>
      </div>
    `;
  }

  area.appendChild(wrapper);
}

function appendMessage(role, content) {
  const area = chatContainer?.querySelector('#messageArea');
  if (!area) return;
  appendMessageToDOM(area, { role, content });
  area.scrollTop = area.scrollHeight;
}

async function handleSend(text) {
  if (!text.trim() || isSending) return;

  const credits = await getCreditsRemaining();
  if (credits <= 0) {
    showToast(t('error.no_credits'), 'warning', 5000);
    return;
  }

  if (!currentConv) {
    currentConv = await createConversation();
    setActiveConvId(currentConv.id);
    await refreshConversations();
    renderMessages([]);
  }

  isSending = true;

  // Disable send button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  appendMessage('user', text);
  await addMessage(currentConv.id, 'user', text);

  const credited = await useCredit();
  if (!credited) {
    showToast(t('error.no_credits'), 'warning', 5000);
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  const history = currentConv.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

  // Create streaming bubble
  const area = chatContainer?.querySelector('#messageArea');
  let streamingEl = null;

  if (area) {
    const wrapper = document.createElement('div');
    wrapper.id = 'streamingBubble';
    wrapper.className = 'flex justify-start animate-slide-up';
    wrapper.innerHTML = `
      <div class="max-w-[85%] md:max-w-[75%] flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="text-xs font-bold bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">G</span>
        </div>
        <div class="msg-assistant rounded-2xl rounded-tl-md px-4 py-3 flex-1">
          <div id="streamingContent" class="text-sm whitespace-pre-wrap break-words">
            <span class="typing-dot w-2 h-2 rounded-full bg-amber-400/60 inline-block"></span>
            <span class="typing-dot w-2 h-2 rounded-full bg-amber-400/60 inline-block" style="animation-delay:0.2s"></span>
            <span class="typing-dot w-2 h-2 rounded-full bg-amber-400/60 inline-block" style="animation-delay:0.4s"></span>
          </div>
        </div>
      </div>
    `;
    area.appendChild(wrapper);
    streamingEl = wrapper.querySelector('#streamingContent');
    area.scrollTop = area.scrollHeight;
  }

  const result = await sendMessageStream(text, history.slice(0, -1), (token, full) => {
    if (streamingEl) {
      streamingEl.innerHTML = formatAssistantText(full);
      const a = chatContainer?.querySelector('#messageArea');
      if (a) a.scrollTop = a.scrollHeight;
    }
  });

  document.getElementById('streamingBubble')?.remove();

  if (result.success) {
    appendMessage('assistant', result.content);
    await addMessage(currentConv.id, 'assistant', result.content);
  } else {
    const errText = result.error || t('error.ai_generic');
    appendMessage('assistant', '⚠️ ' + errText);
    await addMessage(currentConv.id, 'assistant', '⚠️ ' + errText);
  }

  isSending = false;
  if (sendBtn) sendBtn.disabled = false;
  await refreshConversations();

  const creditsDisplay = document.querySelector('#creditsCount');
  if (creditsDisplay) {
    const remaining = await getCreditsRemaining();
    creditsDisplay.textContent = remaining >= 999999 ? '∞' : remaining;
  }
}

function formatAssistantText(text) {
  let html = esc(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const label = lang || 'code';
    return `<div class="code-block my-2 rounded-xl overflow-hidden"><div class="code-header flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10"><span class="text-xs text-slate-400 font-mono">${esc(label)}</span><button class="copy-code text-xs text-slate-500 hover:text-amber-400 transition px-2 py-0.5" data-code="${encodeURIComponent(code)}">Copier</button></div><pre class="p-3 overflow-x-auto"><code class="text-xs font-mono text-cyan-200">${code}</code></pre></div>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="inline-code px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 text-xs font-mono">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export { initChatView, loadConversation, handleSend, renderEmpty };