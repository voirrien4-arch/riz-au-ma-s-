// storage.js - localStorage wrapper replacing miniappsAI.storage
// Async-compatible API with same shape as miniappsAI.storage

const appStorage = {
  async getItem(key) {
    try {
      return localStorage.getItem('gn_' + key);
    } catch { return null; }
  },
  async setItem(key, value, opts) {
    try {
      localStorage.setItem('gn_' + key, value);
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  async removeItem(key) {
    try {
      localStorage.removeItem('gn_' + key);
    } catch {}
  }
};

export { appStorage };