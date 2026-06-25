// fingerprint.js - Browser fingerprinting to prevent multi-account abuse

async function generateFingerprint() {
  const parts = [];

  parts.push(navigator.userAgent || '');
  parts.push(navigator.language || '');
  parts.push((navigator.languages || []).join(','));
  parts.push(String(navigator.hardwareConcurrency || ''));
  parts.push(String(navigator.maxTouchPoints || ''));
  parts.push(String(navigator.deviceMemory || ''));
  parts.push(`${screen.width}x${screen.height}`);
  parts.push(String(screen.colorDepth));
  parts.push(String(window.devicePixelRatio));
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Gold-noir-FP', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('print', 4, 35);
    parts.push(c.toDataURL());
  } catch { parts.push('no-canvas'); }

  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        parts.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
        parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch { parts.push('no-webgl'); }

  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    parts.push(String(ac.sampleRate));
    ac.close();
  } catch { parts.push('no-audio'); }

  return await sha256(parts.join('|||'));
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export { generateFingerprint };