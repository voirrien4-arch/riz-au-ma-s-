// i18n.js - Standalone i18n module (replaces miniappsAI.i18n)

const LOCALES = {};

async function loadLocale(lang) {
  if (LOCALES[lang]) return LOCALES[lang];
  try {
    const resp = await fetch(`/locales/${lang}.json`);
    if (!resp.ok) throw new Error('Not found');
    LOCALES[lang] = await resp.json();
    return LOCALES[lang];
  } catch {
    return null;
  }
}

function flattenObj(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(result, flattenObj(obj[key], full));
    } else {
      result[full] = obj[key];
    }
  }
  return result;
}

let flatKeys = {};
let currentLocale = 'fr';

async function initI18n(locale = 'fr') {
  currentLocale = locale;
  const data = await loadLocale(locale);
  if (data) {
    flatKeys = flattenObj(data);
  }
  // Expose global t function
  window.miniappI18n = {
    t(key, values) {
      let str = flatKeys[key] ?? key;
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
      }
      return str;
    },
    getContext() {
      return { resolvedLocale: currentLocale, dir: 'ltr', availableLocales: ['fr'], canChangeLocale: false };
    },
    setLocale(code) {
      return initI18n(code);
    }
  };
}

export { initI18n };