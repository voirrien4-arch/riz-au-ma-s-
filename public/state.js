// state.js - Application state management with localStorage

import { CONFIG, DEFAULT_SYSTEM_PROMPT } from './config.js';
import { generateFingerprint } from './fingerprint.js';
import { appStorage } from './storage.js';

const t = (k, v) => window.miniappI18n?.t(k, v) ?? k;

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GN-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function storageGet(key) {
  try {
    const raw = await appStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function storageSet(key, val) {
  await appStorage.setItem(key, JSON.stringify(val));
}

async function getUserRegistry() {
  return (await storageGet('user_registry')) || {};
}

async function saveUserRegistry(reg) {
  await storageSet('user_registry', reg);
}

let currentSession = { user: null, fingerprint: null };

async function getSession() {
  return currentSession;
}

async function setCurrentUser(user) {
  currentSession.user = user;
}

async function getFingerprint() {
  if (!currentSession.fingerprint) {
    currentSession.fingerprint = await generateFingerprint();
  }
  return currentSession.fingerprint;
}

async function register(username, password, promoCode) {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || cleanUser.length < 3) return { error: t('error.username_short') };
  if (!password || password.length < 4) return { error: t('error.password_short') };

  const registry = await getUserRegistry();
  if (registry[cleanUser]) return { error: t('error.username_taken') };

  const fp = await getFingerprint();
  const fpUsers = Object.entries(registry).filter(([, u]) => u.fingerprint === fp && !u.banned);
  if (fpUsers.length > 0) {
    return { error: 'Erreur 224', code: 224 };
  }

  const pwHash = await sha256(password + 'gold_noir_salt_' + cleanUser);

  let referredBy = null;
  if (promoCode && promoCode.trim()) {
    const code = promoCode.trim().toUpperCase();
    const referrer = Object.entries(registry).find(([, u]) => u.promoCode === code && !u.banned);
    if (!referrer) return { error: t('error.invalid_promo') };
    if (referrer[0] === cleanUser) return { error: t('error.self_promo') };
    referredBy = referrer[0];
    referrer[1].credits = (referrer[1].credits || 0) + CONFIG.REFERRER_BONUS;
    registry[referrer[0]] = referrer[1];
  }

  const user = {
    username: cleanUser,
    pwHash,
    fingerprint: fp,
    credits: CONFIG.CREDITS_PER_DAY + (referredBy ? CONFIG.REFERRED_BONUS : 0),
    unlimitedCredits: false,
    promoCode: generatePromoCode(),
    referredBy,
    createdAt: Date.now(),
    banned: false,
    lastCreditDate: todayKey(),
  };

  registry[cleanUser] = user;
  await saveUserRegistry(registry);
  currentSession.user = user;
  return { success: true, user };
}

async function login(username, password) {
  const cleanUser = username.trim().toLowerCase();
  const registry = await getUserRegistry();
  const user = registry[cleanUser];

  if (!user) return { error: t('error.user_not_found') };
  if (user.banned) return { error: t('error.banned'), banned: true };

  const pwHash = await sha256(password + 'gold_noir_salt_' + cleanUser);
  if (pwHash !== user.pwHash) return { error: t('error.wrong_password') };

  currentSession.user = user;
  return { success: true, user };
}

async function adminLogin(username, password) {
  const cfg = await getAdminConfig();
  const u = cfg.adminUsername || 'admin';
  const p = cfg.adminPassword || 'admin123';

  if (username.trim().toLowerCase() === u && password === p) {
    return { success: true, isAdmin: true };
  }
  return { error: t('error.wrong_credentials') };
}

async function refreshDailyCredits() {
  const user = currentSession.user;
  if (!user) return;

  const today = todayKey();
  if (user.lastCreditDate !== today) {
    user.credits = user.unlimitedCredits ? 999999 : CONFIG.CREDITS_PER_DAY;
    user.lastCreditDate = today;
    await saveCurrentUser();
  }
}

async function useCredit() {
  const user = currentSession.user;
  if (!user) return false;

  await refreshDailyCredits();
  if (user.unlimitedCredits) return true;
  if (user.credits <= 0) return false;

  user.credits--;
  await saveCurrentUser();
  return true;
}

async function getCreditsRemaining() {
  await refreshDailyCredits();
  return currentSession.user?.unlimitedCredits ? 999999 : (currentSession.user?.credits || 0);
}

async function saveCurrentUser() {
  if (!currentSession.user) return;
  const registry = await getUserRegistry();
  registry[currentSession.user.username] = currentSession.user;
  await saveUserRegistry(registry);
}

async function getConversations() {
  if (!currentSession.user) return [];
  const all = (await storageGet('conversations')) || {};
  return (all[currentSession.user.username] || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

async function createConversation() {
  const conv = {
    id: generateId(),
    title: t('chat.new_conversation'),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const all = (await storageGet('conversations')) || {};
  if (!all[currentSession.user.username]) all[currentSession.user.username] = [];
  all[currentSession.user.username].unshift(conv);
  await storageSet('conversations', all);
  return conv;
}

async function addMessage(convId, role, content) {
  const all = (await storageGet('conversations')) || {};
  const convs = all[currentSession.user.username] || [];
  const conv = convs.find(c => c.id === convId);
  if (!conv) return null;

  conv.messages.push({ role, content, timestamp: Date.now() });
  conv.updatedAt = Date.now();

  if (conv.messages.filter(m => m.role === 'user').length === 1 && role === 'user') {
    conv.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }

  await storageSet('conversations', all);
  return conv;
}

async function deleteConversation(convId) {
  const all = (await storageGet('conversations')) || {};
  const convs = all[currentSession.user.username] || [];
  all[currentSession.user.username] = convs.filter(c => c.id !== convId);
  await storageSet('conversations', all);
}

async function getAdminConfig() {
  return (await storageGet('admin_config')) || {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    maintenanceMode: false,
    whatsappLink: CONFIG.WHATSAPP_CHANNEL,
    adminUsername: 'admin',
    adminPassword: 'admin123',
    mistralApiKey: CONFIG.MISTRAL_API_KEY,
    mistralModel: CONFIG.MISTRAL_MODEL,
  };
}

async function setAdminConfig(cfg) {
  await storageSet('admin_config', cfg);
}

async function getAllUsers() {
  const registry = await getUserRegistry();
  return Object.values(registry).map(u => ({
    username: u.username,
    credits: u.credits,
    unlimitedCredits: u.unlimitedCredits,
    banned: u.banned,
    createdAt: u.createdAt,
    promoCode: u.promoCode,
    referredBy: u.referredBy,
    fingerprint: u.fingerprint?.slice(0, 12) + '...',
  }));
}

async function toggleBan(username) {
  const registry = await getUserRegistry();
  const u = registry[username];
  if (!u) return false;
  u.banned = !u.banned;
  await saveUserRegistry(registry);
  return u.banned;
}

async function setUnlimitedCredits(username, unlimited) {
  const registry = await getUserRegistry();
  const u = registry[username];
  if (!u) return false;
  u.unlimitedCredits = unlimited;
  if (unlimited) u.credits = 999999;
  await saveUserRegistry(registry);
  return true;
}

async function giveCredits(username, amount) {
  const registry = await getUserRegistry();
  const u = registry[username];
  if (!u) return false;
  u.credits = (u.credits || 0) + amount;
  await saveUserRegistry(registry);
  return true;
}

export {
  register, login, adminLogin, getSession, setCurrentUser,
  getFingerprint, useCredit, getCreditsRemaining, refreshDailyCredits,
  getConversations, createConversation, addMessage, deleteConversation,
  getAdminConfig, setAdminConfig,
  getAllUsers, toggleBan, setUnlimitedCredits, giveCredits,
  todayKey, generateId, currentSession
};