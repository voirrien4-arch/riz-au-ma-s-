// captcha.js - CAPTCHA verification to prevent bots

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const LEN = 6;

function generateCaptchaText() {
  let s = '';
  for (let i = 0; i < LEN; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

function renderCaptcha(canvas, text) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${rnd()},${rnd()},${rnd()},0.3)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(${rnd()},${rnd()},${rnd()},0.4)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  const colors = ['#d4af37', '#00ff88', '#ff6b6b', '#4ecdc4', '#a55eea'];
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    ctx.translate(20 + i * 28, h / 2);
    ctx.rotate((Math.random() - 0.5) * 0.4);
    ctx.font = `bold ${20 + Math.random() * 8}px monospace`;
    ctx.fillStyle = colors[i % colors.length];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text[i], 0, (Math.random() - 0.5) * 6);
    ctx.restore();
  }
}

function rnd() { return Math.floor(Math.random() * 256); }

export { generateCaptchaText, renderCaptcha };
