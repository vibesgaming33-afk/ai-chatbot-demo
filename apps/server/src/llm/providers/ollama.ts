import type { ChatMessage, LLMProvider } from '../types.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

export class OllamaProvider implements LLMProvider {
  async chat(messages: ChatMessage[]): Promise<string> {
    const userLast = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const systemPrefix = messages.find(m => m.role === 'system')?.content ?? '';
    const prompt = [systemPrefix, userLast].filter(Boolean).join('\n\n');

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 256 }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { response?: string };
    return (data.response ?? '').trim() || 'Maaf, aku lagi blank 😅';
  }
}
