// ai-service.js - AI model integration via Mistral API with streaming

import { CONFIG, DEFAULT_SYSTEM_PROMPT } from './config.js';
import { getAdminConfig } from './state.js';

async function getSystemPrompt() {
  const cfg = await getAdminConfig();
  return cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT;
}

async function getMistralConfig() {
  const cfg = await getAdminConfig();
  return {
    apiKey: cfg.mistralApiKey || CONFIG.MISTRAL_API_KEY,
    model: cfg.mistralModel || CONFIG.MISTRAL_MODEL,
    endpoint: CONFIG.MISTRAL_ENDPOINT,
  };
}

async function sendMessageStream(userMessage, history, onToken) {
  const systemPrompt = await getSystemPrompt();
  const mistral = await getMistralConfig();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(mistral.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistral.apiKey}`,
      },
      body: JSON.stringify({
        model: mistral.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Mistral API error:', response.status, errBody);
      return { success: false, error: errorMsg(response.status, errBody) };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            if (onToken) onToken(delta, fullContent);
          }
        } catch {}
      }
    }

    if (!fullContent) {
      return { success: false, error: "L'IA n'a pas généré de réponse. Réessaie." };
    }

    return { success: true, content: fullContent };
  } catch (err) {
    clearTimeout(timeout);
    console.error('Mistral API fetch error:', err);
    if (err.name === 'AbortError') {
      return { success: false, error: 'La requête a pris trop de temps (60s). Réessaie avec un message plus court.' };
    }
    return { success: false, error: errorMsg(0, err?.message || String(err)) };
  }
}

function errorMsg(status, body) {
  if (status === 401) return "Clé API invalide. Contacte l'administrateur.";
  if (status === 429) return 'Trop de requêtes. Réessaie dans quelques secondes.';
  if (status === 500 || status === 503) return "Le serveur IA est temporairement indisponible. Réessaie.";
  const m = String(body || '');
  if (m.includes('timeout') || m.includes('Timeout')) return 'La requête a pris trop de temps. Réessaie.';
  if (m.includes('network') || m.includes('fetch') || m.includes('Failed')) return 'Erreur réseau. Vérifie ta connexion internet.';
  if (m.includes('quota') || m.includes('credit') || m.includes('limit')) return "Limite API atteinte. Contacte l'administrateur.";
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

export { sendMessageStream, getSystemPrompt };
