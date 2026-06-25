// ui/login-view.js - Login / Register page with captcha, promo code, admin access

import { register, login, adminLogin, getFingerprint } from '../state.js';
import { generateCaptchaText, renderCaptcha } from '../captcha.js';
import { showToast } from './toast-view.js';
import { CONFIG } from '../config.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

let currentCaptcha = '';
let onSuccess = null;
let onAdminSuccess = null;

function renderLoginView(container, successCb, adminSuccessCb) {
  onSuccess = successCb;
  onAdminSuccess = adminSuccessCb;
  currentCaptcha = generateCaptchaText();

  container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div class="w-full max-w-md animate-fade-in">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 mb-4 shadow-lg shadow-amber-500/10">
            <span class="text-3xl font-black bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">GN</span>
          </div>
          <h1 class="text-2xl font-bold text-white">${CONFIG.SITE_NAME}</h1>
          <p class="text-slate-400 text-sm mt-1">${t('login.tagline')}</p>
        </div>

        <div class="flex mb-6 bg-slate-800/60 rounded-xl p-1 border border-white/5">
          <button id="tabLogin" class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition tab-active">${t('login.tab_login')}</button>
          <button id="tabRegister" class="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-400 transition">${t('login.tab_register')}</button>
        </div>

        <form id="loginForm" class="space-y-4">
          <div>
            <label for="loginUser" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.username')}</label>
            <input id="loginUser" type="text" required autocomplete="username" placeholder="${t('login.username_placeholder')}" class="input-field" />
          </div>
          <div>
            <label for="loginPass" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.password')}</label>
            <input id="loginPass" type="password" required autocomplete="current-password" placeholder="${t('login.password_placeholder')}" class="input-field" />
          </div>
          <div>
            <label for="captchaInput" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.captcha_label')}</label>
            <div class="flex gap-3 items-center">
              <canvas id="captchaCanvas" width="180" height="40" class="rounded-lg border border-white/10 cursor-pointer flex-shrink-0"></canvas>
              <button type="button" id="refreshCaptcha" class="text-slate-400 hover:text-white p-2 transition" title="${t('login.refresh_captcha')}">🔄</button>
            </div>
            <input id="captchaInput" type="text" required autocomplete="off" placeholder="${t('login.captcha_placeholder')}" class="input-field mt-2" maxlength="6" />
          </div>
          <button type="submit" id="loginBtn" class="btn-primary w-full">
            <span id="loginBtnText">${t('login.login_btn')}</span>
          </button>
        </form>

        <form id="registerForm" class="space-y-4 hidden">
          <div>
            <label for="regUser" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.username')}</label>
            <input id="regUser" type="text" required autocomplete="off" placeholder="${t('login.username_placeholder')}" class="input-field" minlength="3" />
          </div>
          <div>
            <label for="regPass" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.password')}</label>
            <input id="regPass" type="password" required autocomplete="new-password" placeholder="${t('login.password_placeholder')}" class="input-field" minlength="4" />
          </div>
          <div>
            <label for="regPromo" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.promo_label')} <span class="text-slate-500">(${t('login.promo_optional')})</span></label>
            <input id="regPromo" type="text" autocomplete="off" placeholder="${t('login.promo_placeholder')}" class="input-field" />
          </div>
          <div>
            <label for="captchaRegInput" class="block text-sm font-medium text-slate-300 mb-1.5">${t('login.captcha_label')}</label>
            <div class="flex gap-3 items-center">
              <canvas id="captchaRegCanvas" width="180" height="40" class="rounded-lg border border-white/10 cursor-pointer flex-shrink-0"></canvas>
              <button type="button" id="refreshRegCaptcha" class="text-slate-400 hover:text-white p-2 transition" title="${t('login.refresh_captcha')}">🔄</button>
            </div>
            <input id="captchaRegInput" type="text" required autocomplete="off" placeholder="${t('login.captcha_placeholder')}" class="input-field mt-2" maxlength="6" />
          </div>
          <button type="submit" id="regBtn" class="btn-primary w-full">
            <span id="regBtnText">${t('login.register_btn')}</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-white/5">
          <button id="adminToggle" class="text-xs text-slate-500 hover:text-amber-400 transition w-full text-center">${t('login.admin_access')}</button>
          <form id="adminForm" class="space-y-3 hidden mt-4">
            <div>
              <label for="adminUser" class="block text-sm font-medium text-amber-400 mb-1.5">🔒 ${t('login.admin_username')}</label>
              <input id="adminUser" type="text" autocomplete="off" class="input-field" />
            </div>
            <div>
              <label for="adminPass" class="block text-sm font-medium text-amber-400 mb-1.5">🔒 ${t('login.admin_password')}</label>
              <input id="adminPass" type="password" autocomplete="off" class="input-field" />
            </div>
            <button type="submit" class="btn-admin w-full">${t('login.admin_login')}</button>
          </form>
        </div>

        <div class="mt-6 text-center">
          <p class="text-xs text-slate-600">${CONFIG.SITE_NAME} v${CONFIG.VERSION} • ${t('login.by')} ${CONFIG.CREATOR} (${CONFIG.CREATOR_ALIAS})</p>
        </div>
      </div>
    </div>
  `;

  setupLoginEvents(container);
}

function setupLoginEvents(container) {
  const loginForm = container.querySelector('#loginForm');
  const regForm = container.querySelector('#registerForm');
  const adminForm = container.querySelector('#adminForm');
  const tabLogin = container.querySelector('#tabLogin');
  const tabRegister = container.querySelector('#tabRegister');
  const adminToggle = container.querySelector('#adminToggle');

  const canvas1 = container.querySelector('#captchaCanvas');
  const canvas2 = container.querySelector('#captchaRegCanvas');
  if (canvas1) renderCaptcha(canvas1, currentCaptcha);
  if (canvas2) renderCaptcha(canvas2, currentCaptcha);

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('tab-active');
    tabRegister.classList.remove('tab-active');
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    adminForm.classList.add('hidden');
    refreshCaptcha(container);
  });

  tabRegister?.addEventListener('click', () => {
    tabRegister.classList.add('tab-active');
    tabLogin.classList.remove('tab-active');
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    adminForm.classList.add('hidden');
    refreshCaptcha(container);
  });

  adminToggle?.addEventListener('click', () => {
    adminForm.classList.toggle('hidden');
  });

  container.querySelector('#refreshCaptcha')?.addEventListener('click', () => refreshCaptcha(container));
  container.querySelector('#refreshRegCaptcha')?.addEventListener('click', () => refreshCaptcha(container));
  canvas1?.addEventListener('click', () => refreshCaptcha(container));
  canvas2?.addEventListener('click', () => refreshCaptcha(container));

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const captchaVal = container.querySelector('#captchaInput').value.trim();
    if (captchaVal !== currentCaptcha) {
      showToast(t('error.captcha_wrong'), 'error');
      refreshCaptcha(container);
      return;
    }

    const btn = container.querySelector('#loginBtn');
    const btnText = container.querySelector('#loginBtnText');
    btn.disabled = true;
    btnText.textContent = t('login.loading');

    const result = await login(
      container.querySelector('#loginUser').value,
      container.querySelector('#loginPass').value
    );

    if (result.success) {
      showToast(t('login.welcome_back'), 'success');
      onSuccess(result.user);
    } else {
      showToast(result.error, 'error');
      btn.disabled = false;
      btnText.textContent = t('login.login_btn');
      refreshCaptcha(container);
    }
  });

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const captchaVal = container.querySelector('#captchaRegInput').value.trim();
    if (captchaVal !== currentCaptcha) {
      showToast(t('error.captcha_wrong'), 'error');
      refreshCaptcha(container);
      return;
    }

    const btn = container.querySelector('#regBtn');
    const btnText = container.querySelector('#regBtnText');
    btn.disabled = true;
    btnText.textContent = t('login.loading');

    const result = await register(
      container.querySelector('#regUser').value,
      container.querySelector('#regPass').value,
      container.querySelector('#regPromo').value
    );

    if (result.success) {
      showToast(t('login.account_created'), 'success');
      onSuccess(result.user);
    } else {
      if (result.code === 224) {
        showToast(t('error.224'), 'error', 5000);
      } else {
        showToast(result.error, 'error');
      }
      btn.disabled = false;
      btnText.textContent = t('login.register_btn');
      refreshCaptcha(container);
    }
  });

  adminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await adminLogin(
      container.querySelector('#adminUser').value,
      container.querySelector('#adminPass').value
    );

    if (result.success) {
      showToast(t('admin.login_success'), 'success');
      onAdminSuccess();
    } else {
      showToast(result.error, 'error');
    }
  });
}

function refreshCaptcha(container) {
  currentCaptcha = generateCaptchaText();
  const c1 = container.querySelector('#captchaCanvas');
  const c2 = container.querySelector('#captchaRegCanvas');
  if (c1) renderCaptcha(c1, currentCaptcha);
  if (c2) renderCaptcha(c2, currentCaptcha);
}

export { renderLoginView };